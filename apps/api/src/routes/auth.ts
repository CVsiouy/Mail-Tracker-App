import { Router } from "express";
import {
  googleLoginRequestSchema,
  refreshSessionRequestSchema,
  logoutRequestSchema,
} from "@mailtracker/shared";
import { getPrisma } from "../db/client.js";
import { verifyGoogleIdToken } from "../services/auth/googleVerify.js";
import {
  loginWithGoogleIdentity,
  refreshSession,
  revokeSession,
} from "../services/auth/session.js";

export const authRouter = Router();

/**
 * POST /auth/google
 * Body: { idToken, gmailRefreshToken?, deviceId? }
 * Verifies the Google ID token, upserts the user, optionally stores the Gmail
 * refresh token, and returns our own session (access + refresh).
 */
authRouter.post("/google", async (req, res, next) => {
  try {
    const db = getPrisma();
    if (!db) {
      res.status(503).json({ error: "Database is not configured" });
      return;
    }
    const body = googleLoginRequestSchema.parse(req.body);
    const identity = await verifyGoogleIdToken(body.idToken);
    if (!identity) {
      res.status(401).json({ error: "Invalid Google ID token" });
      return;
    }
    const session = await loginWithGoogleIdentity(
      db,
      identity,
      body.gmailRefreshToken,
      body.deviceId,
    );
    res.json(session);
  } catch (e) {
    next(e);
  }
});

/**
 * POST /auth/refresh
 * Body: { refreshToken }
 * Rotates the refresh token and returns a fresh session.
 */
authRouter.post("/refresh", async (req, res, next) => {
  try {
    const db = getPrisma();
    if (!db) {
      res.status(503).json({ error: "Database is not configured" });
      return;
    }
    const body = refreshSessionRequestSchema.parse(req.body);
    const session = await refreshSession(db, body.refreshToken);
    if (!session) {
      res.status(401).json({ error: "Invalid or expired refresh token" });
      return;
    }
    res.json(session);
  } catch (e) {
    next(e);
  }
});

/**
 * POST /auth/logout
 * Body: { refreshToken }
 * Revokes the session backing the refresh token.
 */
authRouter.post("/logout", async (req, res, next) => {
  try {
    const db = getPrisma();
    if (!db) {
      res.status(503).json({ error: "Database is not configured" });
      return;
    }
    const body = logoutRequestSchema.parse(req.body);
    await revokeSession(db, body.refreshToken);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
