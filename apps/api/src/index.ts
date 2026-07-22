import { createServer } from "node:http";
import { appConfig } from "./config/env.js";
import { createApp } from "./app.js";
import { logger } from "./logger.js";
import { startWorker, stopWorker } from "./services/jobs/scheduler.js";
import { disconnectPrisma } from "./db/client.js";

const app = createApp();
const server = createServer(app);

server.listen(appConfig.port, appConfig.host, () => {
  logger.info(
    {
      host: appConfig.host,
      port: appConfig.port,
      nodeEnv: appConfig.nodeEnv,
      envFile: appConfig.envFilePath ?? "(none — using process env only)",
      db: appConfig.database.isConfigured ? "postgres" : "not-configured",
      google: appConfig.google.isConfigured ? "configured" : "dev-bypass",
      azureOpenAi: appConfig.azureOpenAi.isConfigured ? "configured" : "stub",
      worker: appConfig.worker.enabled ? "on" : "off",
    },
    "Mail Tracker API listening",
  );

  startWorker();
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutting down");
  stopWorker();
  server.close();
  await disconnectPrisma().catch(() => undefined);
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
