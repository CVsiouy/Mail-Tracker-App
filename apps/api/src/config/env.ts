import { config as loadDotenv } from "dotenv";
import { z } from "zod";
import { resolveDotEnvPath } from "./findDotEnv.js";

const envFile = resolveDotEnvPath();
if (envFile) {
  loadDotenv({ path: envFile, override: false });
}

const envSchema = z.object({
  NODE_ENV: z.preprocess(
    (v) => (v === "production" || v === "test" || v === "development" ? v : "development"),
    z.enum(["development", "test", "production"]),
  ),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(5080),
  API_HOST: z.string().default("0.0.0.0"),
  API_AUTH_SHARED_SECRET: z.string().optional(),
  CORS_ORIGINS: z
    .string()
    .optional()
    .transform((s) =>
      s
        ?.split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  AZURE_OPENAI_ENDPOINT: z.string().optional(),
  AZURE_OPENAI_API_KEY: z.string().optional(),
  AZURE_OPENAI_DEPLOYMENT: z.string().optional(),
  AZURE_OPENAI_API_VERSION: z.string().default("2024-10-21"),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_DATABASE_URL: z
    .string()
    .optional()
    .transform((s) => (s?.trim() ? s.trim() : undefined)),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const data = parsed.data;

export type AppConfig = {
  nodeEnv: "development" | "test" | "production";
  port: number;
  host: string;
  apiAuth: { sharedSecret: string | undefined; enabled: boolean };
  corsOrigins: string[] | undefined;
  azureOpenAi: {
    endpoint: string | undefined;
    apiKey: string | undefined;
    deployment: string | undefined;
    apiVersion: string;
    isConfigured: boolean;
  };
  firebase: {
    projectId: string | undefined;
    clientEmail: string | undefined;
    privateKey: string | undefined;
    databaseUrl: string | undefined;
    isConfigured: boolean;
  };
  /** Where `.env` was loaded from, if any. */
  envFilePath: string | undefined;
};

export const appConfig: AppConfig = {
  nodeEnv: data.NODE_ENV,
  port: data.API_PORT,
  host: data.API_HOST,
  apiAuth: {
    sharedSecret: data.API_AUTH_SHARED_SECRET?.trim() || undefined,
    enabled: Boolean(data.API_AUTH_SHARED_SECRET?.trim()),
  },
  corsOrigins: data.CORS_ORIGINS?.length ? data.CORS_ORIGINS : undefined,
  azureOpenAi: {
    endpoint: data.AZURE_OPENAI_ENDPOINT?.trim() || undefined,
    apiKey: data.AZURE_OPENAI_API_KEY?.trim() || undefined,
    deployment: data.AZURE_OPENAI_DEPLOYMENT?.trim() || undefined,
    apiVersion: data.AZURE_OPENAI_API_VERSION,
    isConfigured: Boolean(
      data.AZURE_OPENAI_ENDPOINT?.trim() &&
        data.AZURE_OPENAI_API_KEY?.trim() &&
        data.AZURE_OPENAI_DEPLOYMENT?.trim(),
    ),
  },
  firebase: {
    projectId: data.FIREBASE_PROJECT_ID?.trim() || undefined,
    clientEmail: data.FIREBASE_CLIENT_EMAIL?.trim() || undefined,
    privateKey: data.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim() || undefined,
    databaseUrl: data.FIREBASE_DATABASE_URL?.trim() || undefined,
    isConfigured: Boolean(
      data.FIREBASE_PROJECT_ID?.trim() &&
        data.FIREBASE_CLIENT_EMAIL?.trim() &&
        data.FIREBASE_PRIVATE_KEY?.trim() &&
        data.FIREBASE_DATABASE_URL?.trim(),
    ),
  },
  envFilePath: envFile,
};
