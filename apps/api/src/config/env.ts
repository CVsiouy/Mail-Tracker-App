import { config as loadDotenv } from "dotenv";
import { z } from "zod";
import { resolveDotEnvPath } from "./findDotEnv.js";

const envFile = resolveDotEnvPath();
if (envFile) {
  loadDotenv({ path: envFile, override: false });
}

const boolish = (fallback: boolean) =>
  z.preprocess((v) => {
    if (typeof v !== "string") return fallback;
    const s = v.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(s)) return true;
    if (["0", "false", "no", "off"].includes(s)) return false;
    return fallback;
  }, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.preprocess(
    (v) => (v === "production" || v === "test" || v === "development" ? v : "development"),
    z.enum(["development", "test", "production"]),
  ),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(5080),
  API_HOST: z.string().default("0.0.0.0"),
  CORS_ORIGINS: z
    .string()
    .optional()
    .transform((s) =>
      s
        ?.split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    ),

  // Database (Postgres)
  DATABASE_URL: z
    .string()
    .optional()
    .transform((s) => (s?.trim() ? s.trim() : undefined)),

  // Session / auth
  SESSION_JWT_SECRET: z.string().default("dev-session-secret-change-me"),
  // 32-byte key encoded as base64 (used for AES-256-GCM of the Gmail refresh token).
  TOKEN_ENC_KEY: z.string().default("IU5yHPYrOhAuOoXQwAV3Gepd1Dxm7hhffud8qyrZfAQ="),
  // When true (and not production), /auth/google accepts an UNSIGNED Google ID
  // token so the app can be exercised locally without a real Google project.
  DEV_TRUST_UNVERIFIED_GOOGLE: boolish(true),

  // Google OAuth (server-side ID-token verification + Gmail token refresh)
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),

  // Azure OpenAI
  AZURE_OPENAI_ENDPOINT: z.string().optional(),
  AZURE_OPENAI_API_KEY: z.string().optional(),
  AZURE_OPENAI_DEPLOYMENT: z.string().optional(),
  AZURE_OPENAI_API_VERSION: z.string().default("2024-10-21"),

  // Firebase (push only — retired from the data path)
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  // Background worker
  WORKER_ENABLED: boolish(true),
  WORKER_POLL_MS: z.coerce.number().int().min(250).max(60_000).default(3000),
  WORKER_BATCH_SIZE: z.coerce.number().int().min(1).max(100).default(10),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const data = parsed.data;

// --- Production safety guard: the dev auth bypass must never run in prod. ---
if (data.NODE_ENV === "production" && data.DEV_TRUST_UNVERIFIED_GOOGLE) {
  console.error(
    "FATAL: DEV_TRUST_UNVERIFIED_GOOGLE=true is not allowed when NODE_ENV=production. " +
      "This flag disables Google ID-token signature verification. Set it to false.",
  );
  process.exit(1);
}

// Decode + validate the token-encryption key (must be exactly 32 bytes).
function decodeEncKey(b64: string): Buffer {
  const buf = Buffer.from(b64, "base64");
  if (buf.length !== 32) {
    console.error(
      `FATAL: TOKEN_ENC_KEY must decode to exactly 32 bytes (got ${buf.length}). ` +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    );
    process.exit(1);
  }
  return buf;
}
const tokenEncKey = decodeEncKey(data.TOKEN_ENC_KEY);

export type AppConfig = {
  nodeEnv: "development" | "test" | "production";
  port: number;
  host: string;
  corsOrigins: string[] | undefined;
  database: { url: string | undefined; isConfigured: boolean };
  auth: {
    sessionJwtSecret: string;
    tokenEncKey: Buffer;
    devTrustUnverifiedGoogle: boolean;
  };
  google: {
    clientId: string | undefined;
    clientSecret: string | undefined;
    /** True when server-side Google verification + Gmail token refresh can work. */
    isConfigured: boolean;
  };
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
    isConfigured: boolean;
  };
  worker: { enabled: boolean; pollMs: number; batchSize: number };
  envFilePath: string | undefined;
};

const googleConfigured = Boolean(
  data.GOOGLE_OAUTH_CLIENT_ID?.trim() && data.GOOGLE_OAUTH_CLIENT_SECRET?.trim(),
);

export const appConfig: AppConfig = {
  nodeEnv: data.NODE_ENV,
  port: data.API_PORT,
  host: data.API_HOST,
  corsOrigins: data.CORS_ORIGINS?.length ? data.CORS_ORIGINS : undefined,
  database: {
    url: data.DATABASE_URL,
    isConfigured: Boolean(data.DATABASE_URL),
  },
  auth: {
    sessionJwtSecret: data.SESSION_JWT_SECRET,
    tokenEncKey,
    devTrustUnverifiedGoogle: data.DEV_TRUST_UNVERIFIED_GOOGLE,
  },
  google: {
    clientId: data.GOOGLE_OAUTH_CLIENT_ID?.trim() || undefined,
    clientSecret: data.GOOGLE_OAUTH_CLIENT_SECRET?.trim() || undefined,
    isConfigured: googleConfigured,
  },
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
    isConfigured: Boolean(
      data.FIREBASE_PROJECT_ID?.trim() &&
        data.FIREBASE_CLIENT_EMAIL?.trim() &&
        data.FIREBASE_PRIVATE_KEY?.trim(),
    ),
  },
  worker: {
    enabled: data.WORKER_ENABLED,
    pollMs: data.WORKER_POLL_MS,
    batchSize: data.WORKER_BATCH_SIZE,
  },
  envFilePath: envFile,
};
