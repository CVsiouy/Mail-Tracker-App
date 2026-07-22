import { Router } from "express";
import { z, ZodError } from "zod";
import { registerPushRequestSchema } from "@mailtracker/shared";
import { logger } from "../logger.js";
import { getPrisma } from "../db/client.js";
import { appConfig } from "../config/env.js";
import { sendFcmTestNotification } from "../services/firebaseAdmin.js";

export const pushRouter = Router();

/**
 * POST /push/register
 * Stores an FCM token for the authenticated user in Postgres.
 */
pushRouter.post("/register", async (req, res, next) => {
  try {
    const db = getPrisma();
    if (!db) {
      res.status(503).json({ error: "Database is not configured" });
      return;
    }
    const userId = req.auth!.userId;
    const body = registerPushRequestSchema.parse(req.body);

    await db.pushToken.upsert({
      where: { userId_token: { userId, token: body.fcmToken } },
      create: { userId, token: body.fcmToken, platform: body.platform },
      update: { platform: body.platform },
    });

    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

/**
 * POST /push/test
 * Sends a test FCM notification (requires Firebase to be configured for FCM).
 */
pushRouter.post("/test", async (req, res, next) => {
  try {
    if (!appConfig.firebase.isConfigured) {
      res.status(503).json({ error: "Firebase (FCM) is not configured" });
      return;
    }
    const schema = z.object({
      token: z.string().min(1),
      title: z.string().optional(),
      body: z.string().optional(),
    });
    const body = schema.parse(req.body);
    await sendFcmTestNotification(body);
    res.json({ ok: true });
  } catch (e) {
    if (e instanceof ZodError) {
      next(e);
      return;
    }
    logger.warn({ err: e }, "push test failed");
    res.status(502).json({ error: "Failed to send test push (check token and FCM setup)" });
  }
});
