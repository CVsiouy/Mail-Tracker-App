import { Router } from "express";
import { z } from "zod";
import type { EmailRecord, InboxPage, AiStatus } from "@mailtracker/shared";
import { getPrisma } from "../db/client.js";
import { summarizeInbox } from "../services/insights.js";

export const emailsRouter = Router();

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  /** Opaque cursor: ISO timestamp of the last item from the previous page. */
  cursor: z.string().optional(),
  category: z.string().optional(),
});

function toRecord(e: {
  messageId: string;
  threadId: string | null;
  fromAddr: string;
  fromName: string | null;
  subject: string;
  snippet: string;
  category: string;
  aiStatus: string;
  aiConfidence: number | null;
  aiReason: string | null;
  receivedAt: Date;
  isUnread: boolean;
  hasAttachment: boolean;
}): EmailRecord {
  return {
    messageId: e.messageId,
    threadId: e.threadId,
    from: e.fromAddr,
    fromName: e.fromName,
    subject: e.subject,
    snippet: e.snippet,
    category: e.category,
    aiStatus: e.aiStatus as AiStatus,
    aiConfidence: e.aiConfidence,
    aiReason: e.aiReason,
    receivedAtMs: e.receivedAt.getTime(),
    isUnread: e.isUnread,
    hasAttachment: e.hasAttachment,
  };
}

/**
 * GET /emails?limit=&cursor=&category=
 * Returns the authenticated user's inbox from Postgres, newest first, paged by
 * a `receivedAt` cursor.
 */
emailsRouter.get("/", async (req, res, next) => {
  try {
    const db = getPrisma();
    if (!db) {
      res.status(503).json({ error: "Database is not configured" });
      return;
    }
    const userId = req.auth!.userId;
    const { limit, cursor, category } = listQuerySchema.parse(req.query);

    const rows = await db.email.findMany({
      where: {
        userId,
        ...(category ? { category } : {}),
        ...(cursor ? { receivedAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { receivedAt: "desc" },
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1]!.receivedAt.toISOString() : null;

    const result: InboxPage = { emails: page.map(toRecord), nextCursor };
    res.json(result);
  } catch (e) {
    next(e);
  }
});

/**
 * GET /insights
 * Aggregates the user's recent emails and produces an AI (or local) summary.
 */
emailsRouter.get("/insights", async (req, res, next) => {
  try {
    const db = getPrisma();
    if (!db) {
      res.status(503).json({ error: "Database is not configured" });
      return;
    }
    const userId = req.auth!.userId;

    const rows = await db.email.findMany({
      where: { userId },
      orderBy: { receivedAt: "desc" },
      take: 100,
    });

    const out = await summarizeInbox({
      emails: rows.map((e) => ({
        messageId: e.messageId,
        from: e.fromAddr,
        subject: e.subject,
        snippet: e.snippet,
        category: e.category,
      })),
    });
    res.json(out);
  } catch (e) {
    next(e);
  }
});
