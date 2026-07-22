import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OAuth2Client } from "google-auth-library";
import { appConfig } from "../../config/env.js";
import { logger } from "../../logger.js";
import { open as openSecret } from "../crypto/tokenCrypto.js";

/** A raw email as produced by a fetcher, before it is persisted. */
export interface FetchedEmail {
  messageId: string;
  threadId: string | null;
  fromAddr: string;
  fromName: string | null;
  subject: string;
  snippet: string;
  receivedAtMs: number;
  isUnread: boolean;
  hasAttachment: boolean;
}

export interface FetchResult {
  emails: FetchedEmail[];
  /** Latest Gmail historyId, for incremental sync next time (real client only). */
  historyId: string | null;
  source: "gmail" | "fixture";
}

export interface GmailFetcher {
  /** Fetch recent inbox messages. `sinceHistoryId` enables incremental sync. */
  fetchInbox(maxResults: number, sinceHistoryId?: string | null): Promise<FetchResult>;
}

export interface StoredGmailCreds {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  tag: Uint8Array;
}

// ---------------------------------------------------------------------------
// Fake fetcher — reads a checked-in fixture so the whole pipeline runs locally
// with no Google credentials.
// ---------------------------------------------------------------------------

let cachedFixture: FetchedEmail[] | null = null;

function loadFixture(): FetchedEmail[] {
  if (cachedFixture) return cachedFixture;
  // Resolve relative to this module so it works from both src (tsx) and dist.
  const here = dirname(fileURLToPath(import.meta.url));
  // dist/services/gmail -> ../../.. = dist ; fixtures live under <root>/src/fixtures
  // We copy fixtures into dist at build time, so try dist-local first, then src.
  const candidates = [
    join(here, "..", "..", "fixtures", "inbox.json"),
    join(here, "..", "..", "..", "src", "fixtures", "inbox.json"),
  ];
  for (const path of candidates) {
    try {
      const raw = readFileSync(path, "utf8");
      cachedFixture = JSON.parse(raw) as FetchedEmail[];
      return cachedFixture;
    } catch {
      // try next candidate
    }
  }
  logger.warn("Fixture inbox.json not found; FakeGmailFetcher will return no emails");
  cachedFixture = [];
  return cachedFixture;
}

export class FakeGmailFetcher implements GmailFetcher {
  async fetchInbox(maxResults: number): Promise<FetchResult> {
    const emails = loadFixture().slice(0, maxResults);
    return { emails, historyId: null, source: "fixture" };
  }
}

// ---------------------------------------------------------------------------
// Real fetcher — uses a stored (decrypted) Gmail refresh token to call the
// Gmail REST API server-side.
// ---------------------------------------------------------------------------

function parseFrom(fromHeader: string): { addr: string; name: string | null } {
  const match = fromHeader.match(/^\s*"?(.*?)"?\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1] || null, addr: match[2] };
  return { name: null, addr: fromHeader.trim() };
}

export class RealGmailFetcher implements GmailFetcher {
  private oauth: OAuth2Client;

  constructor(refreshToken: string) {
    this.oauth = new OAuth2Client(appConfig.google.clientId, appConfig.google.clientSecret);
    this.oauth.setCredentials({ refresh_token: refreshToken });
  }

  private async accessToken(): Promise<string> {
    const { token } = await this.oauth.getAccessToken();
    if (!token) throw new Error("Failed to obtain Gmail access token from refresh token");
    return token;
  }

  private async api<T>(path: string, token: string): Promise<T> {
    const res = await fetch(`https://www.googleapis.com/gmail/v1/users/me${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Gmail API ${path} -> ${res.status}`);
    return (await res.json()) as T;
  }

  async fetchInbox(maxResults: number): Promise<FetchResult> {
    const token = await this.accessToken();
    const list = await this.api<{
      messages?: Array<{ id: string; threadId: string }>;
    }>(`/messages?maxResults=${maxResults}&q=in:inbox`, token);

    const ids = list.messages ?? [];
    const emails: FetchedEmail[] = [];
    let latestHistoryId: string | null = null;

    for (const { id } of ids) {
      try {
        const msg = await this.api<{
          id: string;
          threadId: string;
          historyId?: string;
          internalDate?: string;
          labelIds?: string[];
          snippet?: string;
          payload?: { headers?: Array<{ name: string; value: string }> };
        }>(`/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, token);

        const headers = msg.payload?.headers ?? [];
        const getHeader = (n: string) =>
          headers.find((h) => h.name.toLowerCase() === n.toLowerCase())?.value ?? "";
        const { addr, name } = parseFrom(getHeader("From"));
        if (msg.historyId) latestHistoryId = msg.historyId;

        emails.push({
          messageId: msg.id,
          threadId: msg.threadId ?? null,
          fromAddr: addr,
          fromName: name,
          subject: getHeader("Subject"),
          snippet: msg.snippet ?? "",
          receivedAtMs: msg.internalDate ? Number(msg.internalDate) : Date.now(),
          isUnread: msg.labelIds?.includes("UNREAD") ?? false,
          hasAttachment: false,
        });
      } catch (e) {
        logger.warn({ err: e, id }, "Failed to fetch Gmail message");
      }
    }

    return { emails, historyId: latestHistoryId, source: "gmail" };
  }
}

/**
 * Returns the right fetcher for a user. Uses the real Gmail API when Google is
 * configured AND the user has a stored refresh token; otherwise falls back to
 * the fixture-backed fake so local development needs no credentials.
 */
export function getGmailFetcher(creds: StoredGmailCreds | null): GmailFetcher {
  if (appConfig.google.isConfigured && creds) {
    try {
      const refreshToken = openSecret(creds);
      return new RealGmailFetcher(refreshToken);
    } catch (e) {
      logger.error({ err: e }, "Failed to decrypt Gmail refresh token; using fixture fetcher");
    }
  }
  return new FakeGmailFetcher();
}
