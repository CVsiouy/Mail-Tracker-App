import type { RequestHandler } from "express";
import { verifyAccessToken } from "../services/auth/session.js";

/**
 * Authenticates a request from the `Authorization: Bearer <accessToken>` header.
 * On success sets `req.auth = { userId, email }`; the user id is derived from the
 * verified token ONLY and is never taken from the request body — this makes
 * cross-user access structurally impossible.
 */
export function createRequireAuthMiddleware(options: {
  skip: (path: string) => boolean;
}): RequestHandler {
  return async (req, res, next) => {
    if (options.skip(req.path)) {
      next();
      return;
    }

    const header = req.get("authorization");
    if (!header || !header.toLowerCase().startsWith("bearer ")) {
      res.status(401).json({ error: "Missing bearer token" });
      return;
    }

    const token = header.slice(7).trim();
    const claims = await verifyAccessToken(token);
    if (!claims) {
      res.status(401).json({ error: "Invalid or expired access token" });
      return;
    }

    req.auth = { userId: claims.sub, email: claims.email };
    next();
  };
}
