import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { PrismaClient } from "@prisma/client";
import type { SessionResponse, UserProfile } from "@mailtracker/shared";
import { appConfig } from "../../config/env.js";
import type { GoogleIdentity } from "./googleVerify.js";
import { seal } from "../crypto/tokenCrypto.js";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function secretKey(): Uint8Array {
  return new TextEncoder().encode(appConfig.auth.sessionJwtSecret);
}

export interface AccessTokenClaims extends JWTPayload {
  sub: string;
  email: string;
  typ: "access";
}

async function signAccessToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ email, typ: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(secretKey());
}

/** Verifies our own session access JWT. Returns claims or `null`. */
export async function verifyAccessToken(token: string): Promise<AccessTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.typ !== "access" || typeof payload.sub !== "string") return null;
    return payload as AccessTokenClaims;
  } catch {
    return null;
  }
}

function newOpaqueRefreshToken(): { token: string; hash: Uint8Array<ArrayBuffer> } {
  const token = randomBytes(32).toString("base64url");
  const hash = Uint8Array.from(createHash("sha256").update(token).digest());
  return { token, hash };
}

function hashRefreshToken(token: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(createHash("sha256").update(token).digest());
}

function toProfile(user: {
  id: string;
  email: string;
  name: string | null;
  photoUrl: string | null;
}): UserProfile {
  return { id: user.id, email: user.email, name: user.name, photoUrl: user.photoUrl };
}

/**
 * Logs a user in: upserts the User by Google `sub`, optionally seals + stores
 * the Gmail refresh token, and issues a fresh access + rotating refresh token.
 */
export async function loginWithGoogleIdentity(
  db: PrismaClient,
  identity: GoogleIdentity,
  gmailRefreshToken?: string,
  deviceId?: string,
): Promise<SessionResponse> {
  // Reconcile on BOTH natural keys: `googleSub` is the stable identity anchor,
  // but `email` is also unique. If a record already exists under either key,
  // update it in place — this avoids a unique-constraint failure when the same
  // email is seen (and keeps a single row per real user).
  const existing = await db.user.findFirst({
    where: { OR: [{ googleSub: identity.sub }, { email: identity.email }] },
  });

  const user = existing
    ? await db.user.update({
        where: { id: existing.id },
        data: {
          googleSub: identity.sub,
          email: identity.email,
          name: identity.name,
          photoUrl: identity.photoUrl,
          lastLoginAt: new Date(),
        },
      })
    : await db.user.create({
        data: {
          googleSub: identity.sub,
          email: identity.email,
          name: identity.name,
          photoUrl: identity.photoUrl,
          lastLoginAt: new Date(),
        },
      });

  if (gmailRefreshToken) {
    const sealed = seal(gmailRefreshToken);
    await db.gmailAccount.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        email: identity.email,
        refreshTokenCiphertext: sealed.ciphertext,
        refreshTokenNonce: sealed.nonce,
        refreshTokenTag: sealed.tag,
      },
      update: {
        email: identity.email,
        refreshTokenCiphertext: sealed.ciphertext,
        refreshTokenNonce: sealed.nonce,
        refreshTokenTag: sealed.tag,
      },
    });
  }

  return issueSession(db, user, deviceId);
}

async function issueSession(
  db: PrismaClient,
  user: { id: string; email: string; name: string | null; photoUrl: string | null },
  deviceId?: string,
): Promise<SessionResponse> {
  const accessToken = await signAccessToken(user.id, user.email);
  const { token: refreshToken, hash } = newOpaqueRefreshToken();

  await db.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: hash,
      deviceId: deviceId ?? null,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    user: toProfile(user),
  };
}

/**
 * Rotates a refresh token: validates the presented token, revokes it, and
 * issues a new access + refresh pair. Returns `null` when the token is unknown,
 * revoked, or expired.
 */
export async function refreshSession(
  db: PrismaClient,
  refreshToken: string,
): Promise<SessionResponse | null> {
  const hash = hashRefreshToken(refreshToken);
  const existing = await db.session.findUnique({
    where: { refreshTokenHash: hash },
    include: { user: true },
  });
  if (!existing || existing.revokedAt || existing.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  // Rotate: revoke the old session, mint a new one.
  await db.session.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });

  return issueSession(db, existing.user, existing.deviceId ?? undefined);
}

/** Revokes the session backing a refresh token (logout). Idempotent. */
export async function revokeSession(db: PrismaClient, refreshToken: string): Promise<void> {
  const hash = hashRefreshToken(refreshToken);
  await db.session.updateMany({
    where: { refreshTokenHash: hash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
