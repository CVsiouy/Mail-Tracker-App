import type { PrismaClient } from "@prisma/client";
import pLimit from "p-limit";
import { appConfig } from "../../config/env.js";
import { logger } from "../../logger.js";
import { getPrisma } from "../../db/client.js";
import { categorizeEmail } from "../categorizer.js";

const MAX_ATTEMPTS = 5;

interface ClaimedJob {
  id: bigint;
  user_id: string;
  message_id: string;
  attempts: number;
}

/**
 * Claims up to `batchSize` queued jobs atomically using
 * `FOR UPDATE SKIP LOCKED`, so multiple worker instances (or replicas) never
 * pick the same job. Claimed rows are flipped to `running` in the same query.
 */
async function claimJobs(db: PrismaClient, batchSize: number): Promise<ClaimedJob[]> {
  return db.$queryRawUnsafe<ClaimedJob[]>(
    `
    UPDATE categorization_jobs
       SET status = 'running', locked_at = now()
     WHERE id IN (
       SELECT id FROM categorization_jobs
        WHERE status = 'queued' AND run_after <= now()
        ORDER BY id
        FOR UPDATE SKIP LOCKED
        LIMIT $1
     )
    RETURNING id, user_id, message_id, attempts
    `,
    batchSize,
  );
}

async function processJob(db: PrismaClient, job: ClaimedJob): Promise<void> {
  const email = await db.email.findUnique({
    where: { userId_messageId: { userId: job.user_id, messageId: job.message_id } },
  });

  if (!email) {
    // The email vanished (e.g. deleted). Drop the job.
    await db.categorizationJob.delete({ where: { id: job.id } }).catch(() => undefined);
    return;
  }

  try {
    const result = await categorizeEmail({
      messageId: email.messageId,
      from: email.fromName ? `${email.fromName} <${email.fromAddr}>` : email.fromAddr,
      subject: email.subject,
      snippet: email.snippet,
    });

    await db.email.update({
      where: { userId_messageId: { userId: job.user_id, messageId: job.message_id } },
      data: {
        category: result.category,
        aiConfidence: result.confidence,
        aiReason: result.reason,
        aiStatus: "done",
      },
    });
    await db.categorizationJob.update({
      where: { id: job.id },
      data: { status: "done", lastError: null },
    });
  } catch (e) {
    const attempts = job.attempts + 1;
    const message = e instanceof Error ? e.message : String(e);
    if (attempts >= MAX_ATTEMPTS) {
      await db.categorizationJob.update({
        where: { id: job.id },
        data: { status: "failed", attempts, lastError: message },
      });
      await db.email.update({
        where: { userId_messageId: { userId: job.user_id, messageId: job.message_id } },
        data: { aiStatus: "failed" },
      });
      logger.error({ jobId: String(job.id), err: e }, "Categorization job permanently failed");
    } else {
      // Exponential backoff: 2^attempts seconds.
      const backoffMs = 2 ** attempts * 1000;
      await db.categorizationJob.update({
        where: { id: job.id },
        data: {
          status: "queued",
          attempts,
          lastError: message,
          runAfter: new Date(Date.now() + backoffMs),
        },
      });
      logger.warn({ jobId: String(job.id), attempts }, "Categorization job retrying");
    }
  }
}

let timer: NodeJS.Timeout | null = null;
let ticking = false;

async function tick(): Promise<void> {
  if (ticking) return; // prevent overlapping ticks
  ticking = true;
  try {
    const db = getPrisma();
    if (!db) return;
    const jobs = await claimJobs(db, appConfig.worker.batchSize);
    if (jobs.length === 0) return;

    const limit = pLimit(4);
    await Promise.all(jobs.map((j) => limit(() => processJob(db, j))));
  } catch (e) {
    logger.error({ err: e }, "Worker tick failed");
  } finally {
    ticking = false;
  }
}

/** Starts the in-process categorization worker (no-op if disabled or DB unset). */
export function startWorker(): void {
  if (!appConfig.worker.enabled) {
    logger.info("Categorization worker disabled (WORKER_ENABLED=false)");
    return;
  }
  if (!appConfig.database.isConfigured) {
    logger.warn("Categorization worker not started — database not configured");
    return;
  }
  if (timer) return;
  logger.info({ pollMs: appConfig.worker.pollMs }, "Starting categorization worker");
  timer = setInterval(() => {
    void tick();
  }, appConfig.worker.pollMs);
  // Do not keep the event loop alive solely for the worker.
  timer.unref?.();
}

export function stopWorker(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
