import * as SecureStore from "expo-secure-store";
import type { ISessionStore, StoredSession } from "../interfaces.js";

const SESSION_KEY = "mailtracker_session";

/**
 * Secure storage for OUR session (access JWT + opaque refresh token). Backed by
 * Keychain (iOS) / Keystore (Android). Note: Gmail tokens are NOT stored here —
 * they live encrypted server-side. The device only ever holds our session.
 */
export class SecureSessionStore implements ISessionStore {
  async save(session: StoredSession): Promise<void> {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  }

  async get(): Promise<StoredSession | null> {
    const serialized = await SecureStore.getItemAsync(SESSION_KEY);
    if (!serialized) return null;
    try {
      return JSON.parse(serialized) as StoredSession;
    } catch {
      await this.clear();
      return null;
    }
  }

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }

  async getAccessToken(): Promise<string | null> {
    const session = await this.get();
    return session?.accessToken ?? null;
  }
}

export const sessionStore = new SecureSessionStore();
