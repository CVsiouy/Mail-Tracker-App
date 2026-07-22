const { config: loadDotenv } = require("dotenv");
const { existsSync } = require("fs");
const { resolve } = require("path");

// Load the root .env file in development
const rootEnv = resolve(__dirname, "../../.env");
if (existsSync(rootEnv)) {
  loadDotenv({ path: rootEnv, override: false });
}

module.exports = {
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
    gmailOAuthClientIdAndroid: process.env.GMAIL_OAUTH_CLIENT_ID_ANDROID ?? "",
    gmailOAuthClientIdIos: process.env.GMAIL_OAUTH_CLIENT_ID_IOS ?? "",
    gmailOAuthClientId: process.env.GMAIL_OAUTH_CLIENT_ID ?? "",
    // NOTE: the Gmail OAuth client secret is deliberately NOT bundled into the
    // app. PKCE does not require it on native, and shipping secrets in a mobile
    // binary is insecure.
    gmailRedirectUri: process.env.GMAIL_REDIRECT_URI ?? "com.mailtracker.app:/oauth2redirect",
  },
};
