import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExpoConfig } from "expo/config";

const here = dirname(fileURLToPath(import.meta.url));
const rootEnv = resolve(here, "../../.env");
if (existsSync(rootEnv)) {
  loadDotenv({ path: rootEnv, override: false });
}

const config: ExpoConfig = {
  name: "Mail Tracker",
  slug: "mail-tracker",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  scheme: "mailtracker",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.mailtracker.app",
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#0B1220",
    },
    package: "com.mailtracker.app",
  },
  extra: {
    mailtrackerApiBaseUrl: process.env.MAILTRACKER_API_BASE_URL ?? "http://localhost:5080",
  },
};

export default config;
