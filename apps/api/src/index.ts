import { createServer } from "node:http";
import { appConfig } from "./config/env.js";

if (typeof globalThis.fetch !== "function") {
  // eslint-disable-next-line no-console
  console.error("Mail Tracker API requires Node.js 18+ (global fetch). Use Node 20 LTS per README.");
  process.exit(1);
}
import { createApp } from "./app.js";
import { logger } from "./logger.js";

const app = createApp();
const server = createServer(app);

server.listen(appConfig.port, appConfig.host, () => {
  logger.info(
    {
      host: appConfig.host,
      port: appConfig.port,
      nodeEnv: appConfig.nodeEnv,
      envFile: appConfig.envFilePath ?? "(none — using process env only)",
      apiAuth: appConfig.apiAuth.enabled ? "shared-secret" : "disabled",
    },
    "Mail Tracker API listening",
  );
});
