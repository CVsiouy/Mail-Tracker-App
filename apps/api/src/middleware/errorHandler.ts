import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { appConfig } from "../config/env.js";
import { logger } from "../logger.js";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: err.flatten(),
    });
    return;
  }

  const status = typeof err === "object" && err && "status" in err && typeof err.status === "number" ? err.status : 500;
  logger.error({ err, path: req.path, method: req.method }, "request failed");

  if (appConfig.nodeEnv === "production") {
    res.status(status >= 400 && status < 600 ? status : 500).json({ error: "Internal server error" });
    return;
  }

  const message = err instanceof Error ? err.message : "Unknown error";
  res.status(status >= 400 && status < 600 ? status : 500).json({ error: message });
};
