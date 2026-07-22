import { OAuth2Client } from "google-auth-library";
import { appConfig } from "../../config/env.js";
import { logger } from "../../logger.js";

export interface GoogleIdentity {
  sub: string;
  email: string;
  name: string | null;
  photoUrl: string | null;
}

let client: OAuth2Client | null = null;
function getClient(): OAuth2Client {
  if (!client) client = new OAuth2Client(appConfig.google.clientId);
  return client;
}

/**
 * Base64url-decode without verifying the signature. DEV ONLY — used by the
 * dev bypass so the app can be exercised with an unsigned token locally.
 */
function decodeUnverified(idToken: string): GoogleIdentity | null {
  const parts = idToken.split(".");
  if (parts.length < 2) return null;
  try {
    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
    const p = JSON.parse(payloadJson) as {
      sub?: string;
      email?: string;
      name?: string;
      picture?: string;
    };
    if (!p.sub || !p.email) return null;
    return {
      sub: p.sub,
      email: p.email,
      name: p.name ?? null,
      photoUrl: p.picture ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Verifies a Google-issued OpenID Connect ID token and returns the identity.
 *
 * - When Google is configured, the token's signature and audience are verified.
 * - When Google is NOT configured and `DEV_TRUST_UNVERIFIED_GOOGLE` is on (never
 *   in production — enforced at env load), the token is decoded WITHOUT signature
 *   verification so local development needs no real Google project.
 *
 * Returns `null` when the token is invalid.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity | null> {
  if (appConfig.google.isConfigured) {
    try {
      const ticket = await getClient().verifyIdToken({
        idToken,
        audience: appConfig.google.clientId,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email) return null;
      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name ?? null,
        photoUrl: payload.picture ?? null,
      };
    } catch (e) {
      logger.warn({ err: e }, "Google ID token verification failed");
      return null;
    }
  }

  if (appConfig.auth.devTrustUnverifiedGoogle) {
    logger.warn("DEV_TRUST_UNVERIFIED_GOOGLE: accepting UNSIGNED Google ID token (dev only)");
    return decodeUnverified(idToken);
  }

  logger.error("Google is not configured and the dev bypass is disabled; cannot verify ID token");
  return null;
}
