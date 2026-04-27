import pino from "pino";
import { appConfig } from "./config/env.js";

export const logger = pino({
  level: appConfig.nodeEnv === "production" ? "info" : "debug",
  redact: {
    paths: ["req.headers.authorization", "req.headers.x-api-secret"],
    remove: true,
  },
});
