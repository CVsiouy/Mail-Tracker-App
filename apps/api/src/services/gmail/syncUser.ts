import type { PrismaClient } from "@prisma/client";
import type { SyncRunResponse } from "@mailtracker/shared";
import { logger } from "../../logger.js";
import { getGmailFetcher, type StoredGmailCreds } from "./gmailClient.js";

/**
 * Runs a pull sync for one user: fetches recent inbox messages (real Gmail when
 * configured, otherwise the fixture), upserts them into `emails`, and enqueues a
 * categorization job for each message that is not yet categorized.
 */
export async function syncUser(
  db: PrismaClient,
  userId: string,
  maxResults = 50,
): Promise<SyncRunResponse> {
  const account = await db.gmailAccount.findUnique({ where: { userId } });

  const creds: StoredGmailCreds | null =
    account?.refreshTokenCiphertext && account.refreshTokenNonce && account.refreshTokenTag
      ? {
          ciphertext: account.refreshTokenCiphertext,
          nonce: account.refreshTokenNonce,
          tag: account.refreshTokenTag,
        }
      : null;

  await db.gmailAccount.upsert({
    where: { userId },
    create: { userId, email: "", syncStatus: "syncing" },
    update: { syncStatus: "syncing" },
  });

  const fetcher = getGmailFetcher(creds);

  try {
    const { emails, historyId, source } = await fetcher.fetchInbox(
      maxResults,
      account?.historyId,
    );

    let enqueued = 0;

    for (const e of emails) {
      // Upsert the email. On first insert ai_status is 'pending'; on update we
      // preserve any existing categorization.
      const existing = await db.email.findUnique({
        where: { userId_messageId: { userId, messageId: e.messageId } },
        select: { aiStatus: true },
      });

      await db.email.upsert({
        where: { userId_messageId: { userId, messageId: e.messageId } },
        create: {
          userId,
          messageId: e.messageId,
          threadId: e.threadId,
          fromAddr: e.fromAddr,
          fromName: e.fromName,
          subject: e.subject,
          snippet: e.snippet,
          receivedAt: new Date(e.receivedAtMs),
          isUnread: e.isUnread,
          hasAttachment: e.hasAttachment,
        },
        update: {
          fromAddr: e.fromAddr,
          fromName: e.fromName,
          subject: e.subject,
          snippet: e.snippet,
          receivedAt: new Date(e.receivedAtMs),
          isUnread: e.isUnread,
          hasAttachment: e.hasAttachment,
        },
      });

      // Enqueue a categorization job for anything not already done.
      if (!existing || existing.aiStatus !== "done") {
        await db.categorizationJob.upsert({
          where: { userId_messageId: { userId, messageId: e.messageId } },
          create: { userId, messageId: e.messageId, status: "queued" },
          update: {}, // leave an in-flight/queued job as-is
        });
        enqueued += 1;
      }
    }

    await db.gmailAccount.update({
      where: { userId },
      data: {
        syncStatus: "idle",
        lastSyncedAt: new Date(),
        historyId: historyId ?? account?.historyId ?? null,
      },
    });

    logger.info({ userId, synced: emails.length, enqueued, source }, "User sync complete");
    return { synced: emails.length, enqueued, source };
  } catch (e) {
    await db.gmailAccount
      .update({ where: { userId }, data: { syncStatus: "error" } })
      .catch(() => undefined);
    logger.error({ err: e, userId }, "User sync failed");
    throw e;
  }
}
