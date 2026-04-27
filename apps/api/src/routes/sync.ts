import { Router } from "express";
import { z } from "zod";
import { getFirebaseDb } from "../services/firebaseAdmin.js";

const emailMetaSchema = z.object({
  messageId: z.string().min(1),
  from: z.string(),
  subject: z.string(),
  snippet: z.string(),
  category: z.string(),
  receivedAtMs: z.number().int(),
  isUnread: z.boolean(),
  hasAttachment: z.boolean(),
});

const syncEmailsSchema = z.object({
  userId: z.string().min(1),
  emails: z.array(emailMetaSchema),
});

const syncSwipeSchema = z.object({
  userId: z.string().min(1),
  messageId: z.string().min(1),
  decision: z.enum(["archive", "keep", "trash", "star"]),
  atMs: z.number().int(),
  deviceId: z.string().optional(),
});

export const syncRouter = Router();

syncRouter.post("/emails", async (req, res, next) => {
  try {
    const db = await getFirebaseDb();
    if (!db) {
      res.status(503).json({ error: "Firebase Realtime Database is not configured" });
      return;
    }
    const { userId, emails } = syncEmailsSchema.parse(req.body);
    const updates: Record<string, unknown> = {};
    for (const e of emails) {
      updates[`users/${userId}/emails/${e.messageId}`] = {
        from: e.from,
        subject: e.subject,
        snippet: e.snippet,
        category: e.category,
        receivedAtMs: e.receivedAtMs,
        isUnread: e.isUnread,
        hasAttachment: e.hasAttachment,
      };
    }
    await db.ref().update(updates);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

syncRouter.post("/swipes", async (req, res, next) => {
  try {
    const db = await getFirebaseDb();
    if (!db) {
      res.status(503).json({ error: "Firebase Realtime Database is not configured" });
      return;
    }
    const body = syncSwipeSchema.parse(req.body);
    await db.ref(`users/${body.userId}/swipes/${body.messageId}`).set({
      decision: body.decision,
      atMs: body.atMs,
      deviceId: body.deviceId ?? null,
    });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
