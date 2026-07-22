import { authorize, refresh as refreshAuth, revoke } from "react-native-app-auth";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import type { GoogleAuthResult, IAuthService } from "../interfaces.js";
import { GMAIL_SCOPES } from "./gmailScopes.js";
import { getMobileEnv } from "../../config/env.js";

// Warm up the web browser for a faster OAuth flow.
WebBrowser.maybeCompleteAuthSession();

function getOAuthConfig() {
  const env = getMobileEnv();

  let clientId: string;
  if (Platform.OS === "android") {
    clientId = env.gmailOAuthClientIdAndroid || env.gmailOAuthClientId || "";
  } else {
    clientId = env.gmailOAuthClientIdIos || env.gmailOAuthClientId || "";
  }

  return {
    issuer: "https://accounts.google.com",
    clientId,
    redirectUrl: env.gmailRedirectUri || "com.mailtracker.app:/oauth2redirect",
    scopes: GMAIL_SCOPES,
    usePKCE: true,
    // `offline` + `prompt=consent` make Google return a refresh token that the
    // server can use for background sync.
    additionalParameters: {
      access_type: "offline",
      prompt: "consent" as const,
    },
  };
}

/**
 * Google OAuth service using react-native-app-auth. Produces the ID token and
 * (optionally) a Gmail refresh token, which are handed to our server to
 * establish a session — the device never keeps the Gmail tokens.
 */
export class GoogleAuthService implements IAuthService {
  async authorize(): Promise<GoogleAuthResult | null> {
    try {
      const result = await authorize(getOAuthConfig());
      return {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken || "",
        idToken: result.idToken || "",
        accessTokenExpirationDate: result.accessTokenExpirationDate,
        scopes: result.scopes || GMAIL_SCOPES,
      };
    } catch (error) {
      console.error("Google OAuth authorization failed:", error);
      return null;
    }
  }

  async refresh(refreshToken: string): Promise<GoogleAuthResult | null> {
    try {
      const result = await refreshAuth(getOAuthConfig(), { refreshToken });
      return {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken || refreshToken,
        idToken: result.idToken || "",
        accessTokenExpirationDate: result.accessTokenExpirationDate,
        // RefreshResult does not carry scopes; preserve the requested set.
        scopes: GMAIL_SCOPES,
      };
    } catch (error) {
      console.error("Google token refresh failed:", error);
      return null;
    }
  }

  async signOut(): Promise<void> {
    // Best-effort revocation is handled server-side; nothing required on-device
    // beyond clearing the stored session (done by the caller).
    void revoke;
  }
}

export const authService = new GoogleAuthService();
