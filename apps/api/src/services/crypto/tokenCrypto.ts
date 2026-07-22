import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { appConfig } from "../../config/env.js";

/**
 * AES-256-GCM sealing for secrets held at rest (the Gmail refresh token).
 *
 * The 32-byte key comes from `TOKEN_ENC_KEY` (base64) via env config. In
 * production this key should be wrapped by a real KMS; the seal/open interface
 * here isolates that future change.
 */

const ALGO = "aes-256-gcm";
const NONCE_BYTES = 12;

/**
 * Sealed columns are typed as plain `Uint8Array` so they line up with Prisma's
 * `Bytes` field type (`Uint8Array<ArrayBuffer>`) under strict TypeScript.
 */
export interface SealedSecret {
  ciphertext: Uint8Array<ArrayBuffer>;
  nonce: Uint8Array<ArrayBuffer>;
  tag: Uint8Array<ArrayBuffer>;
}

/**
 * Copy a Node Buffer into a standalone `Uint8Array<ArrayBuffer>`. `Uint8Array.from`
 * allocates a fresh ArrayBuffer-backed array, which is what Prisma's `Bytes`
 * field type requires (Node's `Buffer` is backed by `ArrayBufferLike`, which is
 * not assignable under strict TypeScript).
 */
function toBytes(buf: Buffer): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(buf);
}

export function seal(plaintext: string): SealedSecret {
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv(ALGO, appConfig.auth.tokenEncKey, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext: toBytes(ciphertext), nonce: toBytes(nonce), tag: toBytes(tag) };
}

/** Read-only view of a sealed secret — accepts bytes from any source (incl. DB rows). */
export interface SealedInput {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  tag: Uint8Array;
}

export function open(sealed: SealedInput): string {
  const decipher = createDecipheriv(ALGO, appConfig.auth.tokenEncKey, sealed.nonce);
  decipher.setAuthTag(sealed.tag);
  const plaintext = Buffer.concat([decipher.update(sealed.ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
