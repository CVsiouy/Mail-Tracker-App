import { Router } from "express";
import { syncSwipeRequestSchema } from "@mailtracker/shared";
import { getPrisma } from "../db/client.js";
import { syncUser } from "../services/gmail/syncUser.js";

export const syncRouter = Router();

/**
 * POST /sync/run
 * Triggers a server-side pull sync for the authenticated user (reads Gmail —
 * or the fixture — into Postgres and enqueues categorization jobs).
 */
syncRouter.post("/run", async (req, res, next) => {
  try {
    const db = getPrisma();
    if (!db) {
      res.status(503).json({ error: "Database is not configured" });
      return;
    }
    const userId = req.auth!.userId;
    const result = await syncUser(db, userId);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

/**
 * POST /sync/swipes
 * Records a swipe decision. The user is derived from the session — the client
 * never supplies a userId.
 */
syncRouter.post("/swipes", async (req, res, next) => {
  try {
    const db = getPrisma();
    if (!db) {
      res.status(503).json({ error: "Database is not configured" });
      return;
    }
    const userId = req.auth!.userId;
    const body = syncSwipeRequestSchema.parse(req.body);

    await db.swipe.upsert({
      where: { userId_messageId: { userId, messageId: body.messageId } },
      create: {
        userId,
        messageId: body.messageId,
        decision: body.decision,
        swipedAt: new Date(body.atMs),
        deviceId: body.deviceId ?? null,
      },
      update: {
        decision: body.decision,
        swipedAt: new Date(body.atMs),
        deviceId: body.deviceId ?? null,
      },
    });

    // Reflect the decision on the cached email so the inbox stays consistent.
    if (body.decision === "archive" || body.decision === "trash") {
      await db.email
        .delete({ where: { userId_messageId: { userId, messageId: body.messageId } } })
        .catch(() => undefined);
    } else if (body.decision === "keep") {
      await db.email
        .update({
          where: { userId_messageId: { userId, messageId: body.messageId } },
          data: { isUnread: false },
        })
        .catch(() => undefined);
    }

    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
