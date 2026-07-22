import Constants from "expo-constants";

export type MobileEnv = {
  mailtrackerApiBaseUrl: string;
  gmailOAuthClientIdAndroid: string;
  gmailOAuthClientIdIos: string;
  gmailOAuthClientId: string;
  gmailRedirectUri: string;
};

/**
 * Single place that reads Expo `extra` (populated from root `.env` via
 * `app.config.js`). NOTE: the Gmail OAuth *client secret* is intentionally NOT
 * exposed to the client — shipping a secret in a mobile bundle is insecure, and
 * the server no longer needs the client to send one (auth is a verified session
 * JWT).
 */
export function getMobileEnv(): MobileEnv {
  const extra = Constants.expoConfig?.extra as Partial<MobileEnv> | undefined;
  return {
    mailtrackerApiBaseUrl: extra?.mailtrackerApiBaseUrl ?? "http://localhost:5080",
    gmailOAuthClientIdAndroid: extra?.gmailOAuthClientIdAndroid ?? "",
    gmailOAuthClientIdIos: extra?.gmailOAuthClientIdIos ?? "",
    gmailOAuthClientId: extra?.gmailOAuthClientId ?? "",
    gmailRedirectUri: extra?.gmailRedirectUri ?? "com.mailtracker.app:/oauth2redirect",
  };
}
