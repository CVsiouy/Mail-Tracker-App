import type { Database } from "firebase-admin/database";
import { appConfig } from "../config/env.js";
import { logger } from "../logger.js";

let db: Database | null = null;
let initFailed = false;
let inflight: Promise<Database | null> | null = null;

/**
 * Lazily initializes Firebase Admin only when configured. Avoids loading `firebase-admin`
 * at process startup when Firebase is unused.
 */
export function getFirebaseDb(): Promise<Database | null> {
  if (!appConfig.firebase.isConfigured || initFailed) return Promise.resolve(null);
  if (db) return Promise.resolve(db);
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const admin = await import("firebase-admin");
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: appConfig.firebase.projectId!,
            clientEmail: appConfig.firebase.clientEmail!,
            privateKey: appConfig.firebase.privateKey!,
          }),
          databaseURL: appConfig.firebase.databaseUrl!,
        });
      }
      db = admin.database();
      logger.info("Firebase Admin initialized");
      return db;
    } catch (e) {
      initFailed = true;
      logger.error({ err: e }, "Firebase Admin init failed");
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export async function sendFcmTestNotification(input: {
  token: string;
  title?: string;
  body?: string;
}): Promise<void> {
  const database = await getFirebaseDb();
  if (!database) {
    throw new Error("Firebase is not configured");
  }
  const admin = await import("firebase-admin");
  await admin.messaging().send({
    token: input.token,
    notification: {
      title: input.title ?? "Mail Tracker",
      body: input.body ?? "Test notification",
    },
  });
}
