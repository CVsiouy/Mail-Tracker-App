import type { RequestHandler } from "express";
import { appConfig } from "../config/env.js";

export const API_SECRET_HEADER = "x-api-secret";

/**
 * Dev-time gate: require `X-Api-Secret` when `API_AUTH_SHARED_SECRET` is set.
 * Skips /health (mount health before this middleware or use skip list).
 */
export function createSharedSecretAuthMiddleware(options: {
  skip: (path: string) => boolean;
}): RequestHandler {
  return (req, res, next) => {
    if (!appConfig.apiAuth.enabled) {
      next();
      return;
    }
    if (options.skip(req.path)) {
      next();
      return;
    }
    const header = req.get(API_SECRET_HEADER);
    if (!header || header !== appConfig.apiAuth.sharedSecret) {
      res.status(401).json({ error: "Missing or invalid X-Api-Secret header" });
      return;
    }
    next();
  };
}
