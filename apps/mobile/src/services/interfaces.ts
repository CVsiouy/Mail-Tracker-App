import type {
  CategorizeEmailRequest,
  CategorizeEmailResponse,
  EmailRecord,
  InboxPage,
  InsightsResponse,
  SessionResponse,
  SwipeDecision,
} from "@mailtracker/shared";

export type { SwipeDecision } from "@mailtracker/shared";

// ============================================================================
// Google OAuth (on-device)
// ============================================================================

export interface IAuthService {
  /** Initiate Google OAuth (PKCE) and return the raw Google auth result. */
  authorize(): Promise<GoogleAuthResult | null>;
  /** Refresh the Google access token using the Google refresh token. */
  refresh(refreshToken: string): Promise<GoogleAuthResult | null>;
  /** Revoke and clear on-device Google state. */
  signOut(): Promise<void>;
}

/** Raw result from the on-device Google OAuth flow. */
export interface GoogleAuthResult {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  accessTokenExpirationDate: string;
  scopes: string[];
}

// ============================================================================
// Session token store (our own JWT session — NOT Gmail tokens)
// ============================================================================

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  /** Epoch ms when the access token expires. */
  accessTokenExpiresAtMs: number;
}

export interface ISessionStore {
  save(session: StoredSession): Promise<void>;
  get(): Promise<StoredSession | null>;
  clear(): Promise<void>;
  getAccessToken(): Promise<string | null>;
}

// ============================================================================
// Mail Tracker API — the user is derived server-side from the session, so no
// method takes a `userId`.
// ============================================================================

export interface IMailTrackerApi {
  /** Exchange a Google ID token (+ optional Gmail refresh token) for a session. */
  loginWithGoogle(idToken: string, gmailRefreshToken?: string): Promise<SessionResponse>;
  refreshSession(refreshToken: string): Promise<SessionResponse>;
  logout(refreshToken: string): Promise<void>;

  /** Trigger a server-side sync of the user's inbox. */
  runSync(): Promise<{ synced: number; enqueued: number; source: string }>;
  /** Read the inbox from the server (Postgres-backed). */
  getInbox(cursor?: string, category?: string, limit?: number): Promise<InboxPage>;
  getInsights(): Promise<InsightsResponse>;

  recordSwipe(messageId: string, decision: SwipeDecision, atMs: number): Promise<void>;
  categorizeEmail(request: CategorizeEmailRequest): Promise<CategorizeEmailResponse>;
  categorizeBatch(requests: CategorizeEmailRequest[]): Promise<CategorizeEmailResponse[]>;
  registerPushToken(fcmToken: string, platform: "ios" | "android"): Promise<void>;
}

// ============================================================================
// Local email model (mirrors the server EmailRecord for the UI + SQLite cache)
// ============================================================================

export type EmailMeta = EmailRecord;

// ============================================================================
// Email Store (SQLite local cache)
// ============================================================================

export interface IEmailStore {
  init(): Promise<void>;
  saveEmails(emails: EmailMeta[]): Promise<void>;
  getEmails(limit?: number, offset?: number): Promise<EmailMeta[]>;
  getEmail(messageId: string): Promise<EmailMeta | null>;
  updateEmail(messageId: string, updates: Partial<EmailMeta>): Promise<void>;
  deleteEmail(messageId: string): Promise<void>;
  clearAll(): Promise<void>;
  getCount(): Promise<number>;
}

// ============================================================================
// Push
// ============================================================================

export interface IPushService {
  register(): Promise<string | null>;
  onTokenRefresh(callback: (token: string) => void): void;
  onNotification(callback: (notification: PushNotification) => void): void;
}

export interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, string>;
}
