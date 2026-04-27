import { createRequire } from "node:module";
import type { IncomingMessage } from "node:http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import type { Options as PinoHttpOptions } from "pino-http";

const require = createRequire(import.meta.url);
const pinoHttp = require("pino-http") as (opts?: PinoHttpOptions) => express.RequestHandler;
import { appConfig } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { createSharedSecretAuthMiddleware } from "./middleware/sharedSecretAuth.js";
import { logger } from "./logger.js";
import { healthRouter } from "./routes/health.js";
import { aiRouter } from "./routes/ai.js";
import { syncRouter } from "./routes/sync.js";
import { pushRouter } from "./routes/push.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin:
        appConfig.corsOrigins && appConfig.corsOrigins.length > 0
          ? appConfig.corsOrigins
          : appConfig.nodeEnv === "production"
            ? false
            : true,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req: IncomingMessage) => req.url === "/health",
      },
    }),
  );

  app.use(healthRouter);

  const auth = createSharedSecretAuthMiddleware({
    skip: (path) => path === "/health",
  });
  app.use(auth);

  app.use("/ai", aiRouter);
  app.use("/sync", syncRouter);
  app.use("/push", pushRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use(errorHandler);
  return app;
}
