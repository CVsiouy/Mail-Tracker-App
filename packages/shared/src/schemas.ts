import { z } from "zod";
import { ALLOWED_AI_CATEGORIES } from "./allowedCategories.js";

// ============================================================================
// AI — categorization
// ============================================================================

export const categorizeEmailRequestSchema = z.object({
  messageId: z.string().min(1),
  from: z.string(),
  subject: z.string(),
  snippet: z.string(),
});

export type CategorizeEmailRequest = z.infer<typeof categorizeEmailRequestSchema>;

export const categorizeEmailResponseSchema = z.object({
  messageId: z.string(),
  category: z.string(),
  confidence: z.number(),
  reason: z.string().nullable(),
  available: z.boolean(),
});

export type CategorizeEmailResponse = z.infer<typeof categorizeEmailResponseSchema>;

// ============================================================================
// AI — insights
// ============================================================================

export const insightEmailItemSchema = z.object({
  messageId: z.string(),
  from: z.string(),
  subject: z.string(),
  snippet: z.string(),
  category: z.string(),
});

export const insightsRequestSchema = z.object({
  emails: z.array(insightEmailItemSchema),
});

export type InsightsRequest = z.infer<typeof insightsRequestSchema>;
export type InsightEmailItem = z.infer<typeof insightEmailItemSchema>;

export const insightsResponseSchema = z.object({
  summary: z.string(),
  highlights: z.array(z.string()),
  available: z.boolean(),
});

export type InsightsResponse = z.infer<typeof insightsResponseSchema>;

// ============================================================================
// Auth — Google login → server session
//
// The mobile client authenticates with Google (OAuth PKCE) on-device, then
// hands the server the Google ID token (and, optionally, the Gmail refresh
// token for server-side sync). The server verifies the ID token, derives the
// user identity from it, and issues its OWN session tokens. The client never
// sends a `userId` — identity is always derived server-side from the session,
// which makes cross-user access structurally impossible.
// ============================================================================

export const googleLoginRequestSchema = z.object({
  /** Google-issued OpenID Connect ID token (JWT). */
  idToken: z.string().min(1),
  /** Optional Gmail refresh token, forwarded once at login for server-side sync. */
  gmailRefreshToken: z.string().min(1).optional(),
  /** Optional device identifier for multi-device session tracking. */
  deviceId: z.string().optional(),
});

export type GoogleLoginRequest = z.infer<typeof googleLoginRequestSchema>;

export const refreshSessionRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshSessionRequest = z.infer<typeof refreshSessionRequestSchema>;

export const logoutRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

export type LogoutRequest = z.infer<typeof logoutRequestSchema>;

export const userProfileSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  photoUrl: z.string().nullable(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

export const sessionResponseSchema = z.object({
  /** Short-lived access JWT sent as `Authorization: Bearer`. */
  accessToken: z.string(),
  /** Opaque, rotating refresh token used to obtain a new access token. */
  refreshToken: z.string(),
  /** Access-token lifetime in seconds. */
  expiresIn: z.number(),
  user: userProfileSchema,
});

export type SessionResponse = z.infer<typeof sessionResponseSchema>;

// ============================================================================
// Email records (server-owned inbox, read from Postgres)
// ============================================================================

export type AiStatus = "pending" | "done" | "failed";

export const emailRecordSchema = z.object({
  messageId: z.string(),
  threadId: z.string().nullable(),
  from: z.string(),
  fromName: z.string().nullable(),
  subject: z.string(),
  snippet: z.string(),
  category: z.string(),
  aiStatus: z.enum(["pending", "done", "failed"]),
  aiConfidence: z.number().nullable(),
  aiReason: z.string().nullable(),
  receivedAtMs: z.number(),
  isUnread: z.boolean(),
  hasAttachment: z.boolean(),
});

export type EmailRecord = z.infer<typeof emailRecordSchema>;

export const inboxPageSchema = z.object({
  emails: z.array(emailRecordSchema),
  nextCursor: z.string().nullable(),
});

export type InboxPage = z.infer<typeof inboxPageSchema>;

// ============================================================================
// Sync / swipe / push — NOTE: no `userId` field. The server derives the user
// from the session on every request.
// ============================================================================

export const swipeDecisionSchema = z.enum(["archive", "keep", "trash", "star"]);
export type SwipeDecision = z.infer<typeof swipeDecisionSchema>;

export const syncSwipeRequestSchema = z.object({
  messageId: z.string().min(1),
  decision: swipeDecisionSchema,
  atMs: z.number().int(),
  deviceId: z.string().optional(),
});

export type SyncSwipeRequest = z.infer<typeof syncSwipeRequestSchema>;

export const registerPushRequestSchema = z.object({
  fcmToken: z.string().min(1),
  platform: z.enum(["ios", "android"]),
});

export type RegisterPushRequest = z.infer<typeof registerPushRequestSchema>;

export const syncRunResponseSchema = z.object({
  synced: z.number(),
  enqueued: z.number(),
  source: z.enum(["gmail", "fixture"]),
});

export type SyncRunResponse = z.infer<typeof syncRunResponseSchema>;

// ============================================================================
// Helpers
// ============================================================================

/** Runtime check for model-returned category strings. */
export function normalizeAiCategory(value: string | null | undefined): string {
  if (!value?.trim()) return "General";
  const match = ALLOWED_AI_CATEGORIES.find(
    (c: (typeof ALLOWED_AI_CATEGORIES)[number]) => c.toLowerCase() === value.trim().toLowerCase(),
  );
  return match ?? "General";
}
