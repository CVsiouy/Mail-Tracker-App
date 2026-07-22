import { Platform } from "react-native";
import type { IPushService, PushNotification } from "../interfaces.js";
import { mailTrackerApi } from "../api/mailTrackerApi.js";

/**
 * Push notification service (FCM).
 *
 * This is a thin placeholder: full delivery needs `@react-native-firebase/messaging`
 * (or `expo-notifications`) wired into a dev/production build. What IS real here
 * is registration against our backend — once a token is obtained it is stored in
 * Postgres via `POST /push/register` (user derived from the session, no userId
 * sent by the client).
 */
export class PushNotificationService implements IPushService {
  private registeredToken: string | null = null;

  async register(): Promise<string | null> {
    if (this.registeredToken) return this.registeredToken;
    try {
      // TODO: obtain a real FCM token via @react-native-firebase/messaging.
      // const token = await messaging().getToken();
      // this.registeredToken = token;
      // await mailTrackerApi.registerPushToken(token, Platform.OS === "ios" ? "ios" : "android");
      // return token;
      console.log("Push registration not yet wired to a native FCM provider");
      return null;
    } catch (error) {
      console.error("Failed to register for push notifications:", error);
      return null;
    }
  }

  /** Register an already-obtained FCM token with our backend. */
  async registerToken(token: string): Promise<void> {
    this.registeredToken = token;
    await mailTrackerApi.registerPushToken(token, Platform.OS === "ios" ? "ios" : "android");
  }

  onTokenRefresh(_callback: (token: string) => void): void {
    console.log("Token refresh listener not yet wired");
  }

  onNotification(_callback: (notification: PushNotification) => void): void {
    console.log("Notification listener not yet wired");
  }
}

export const pushNotificationService = new PushNotificationService();
