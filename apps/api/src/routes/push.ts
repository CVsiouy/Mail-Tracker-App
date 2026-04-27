import { createHash } from "node:crypto";
import { Router } from "express";
import { z, ZodError } from "zod";
import { logger } from "../logger.js";
import { getFirebaseDb, sendFcmTestNotification } from "../services/firebaseAdmin.js";

const registerSchema = z.object({
  userId: z.string().min(1),
  fcmToken: z.string().min(1),
  platform: z.string().min(1),
});

export const pushRouter = Router();

pushRouter.post("/register", async (req, res, next) => {
  try {
    const db = await getFirebaseDb();
    if (!db) {
      res.status(503).json({ error: "Firebase Realtime Database is not configured" });
      return;
    }
    const body = registerSchema.parse(req.body);
    const tokenHash = createHash("sha256").update(body.fcmToken).digest("hex").slice(0, 32);
    const now = Date.now();
    await db.ref(`users/${body.userId}/devices/${tokenHash}`).set({
      fcmToken: body.fcmToken,
      platform: body.platform,
      lastSeenMs: now,
    });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

pushRouter.post("/test", async (req, res, next) => {
  try {
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
