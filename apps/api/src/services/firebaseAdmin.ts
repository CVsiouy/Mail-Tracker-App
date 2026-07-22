import { appConfig } from "../config/env.js";
import { logger } from "../logger.js";

let initialized = false;
let initFailed = false;

/**
 * Lazily initializes Firebase Admin (for FCM messaging ONLY — Firebase is no
 * longer on the data path; Postgres owns all app data). Returns true when
 * messaging is available.
 */
async function ensureFirebase(): Promise<boolean> {
  if (!appConfig.firebase.isConfigured || initFailed) return false;
  if (initialized) return true;
  try {
    const admin = await import("firebase-admin");
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: appConfig.firebase.projectId!,
          clientEmail: appConfig.firebase.clientEmail!,
          privateKey: appConfig.firebase.privateKey!,
        }),
      });
    }
    initialized = true;
    logger.info("Firebase Admin initialized (FCM messaging)");
    return true;
  } catch (e) {
    initFailed = true;
    logger.error({ err: e }, "Firebase Admin init failed");
    return false;
  }
}

export async function sendFcmTestNotification(input: {
  token: string;
  title?: string;
  body?: string;
}): Promise<void> {
  const ok = await ensureFirebase();
  if (!ok) throw new Error("Firebase (FCM) is not configured");
  const admin = await import("firebase-admin");
  await admin.messaging().send({
    token: input.token,
    notification: {
      title: input.title ?? "Mail Tracker",
      body: input.body ?? "Test notification",
    },
  });
}
