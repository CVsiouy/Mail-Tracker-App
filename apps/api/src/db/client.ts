import { PrismaClient } from "@prisma/client";
import { appConfig } from "../config/env.js";
import { logger } from "../logger.js";

let prisma: PrismaClient | null = null;
let initFailed = false;

/**
 * Lazily creates the Prisma client the first time it is needed, mirroring the
 * lazy-init pattern used for Firebase. Returns `null` when the database is not
 * configured (`DATABASE_URL` unset) or a previous init attempt failed — callers
 * branch on `null` to degrade gracefully (e.g. a route returns 503).
 */
export function getPrisma(): PrismaClient | null {
  if (!appConfig.database.isConfigured || initFailed) return null;
  if (prisma) return prisma;
  try {
    prisma = new PrismaClient({
      datasources: { db: { url: appConfig.database.url } },
      log:
        appConfig.nodeEnv === "development"
          ? [{ level: "warn", emit: "stdout" }, { level: "error", emit: "stdout" }]
          : [{ level: "error", emit: "stdout" }],
    });
    logger.info("Prisma client initialized");
    return prisma;
  } catch (e) {
    initFailed = true;
    logger.error({ err: e }, "Prisma client init failed");
    return null;
  }
}

/**
 * Like {@link getPrisma} but throws when the database is unavailable. Use inside
 * request handlers that have already asserted DB availability, or where a 500 is
 * the right outcome.
 */
export function requirePrisma(): PrismaClient {
  const db = getPrisma();
  if (!db) throw new Error("Database is not configured (DATABASE_URL missing)");
  return db;
}

export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
