import axios, { isAxiosError, type AxiosInstance } from "axios";
import type {
  CategorizeEmailRequest,
  CategorizeEmailResponse,
  InboxPage,
  InsightsResponse,
  SessionResponse,
  SwipeDecision,
} from "@mailtracker/shared";
import type { IMailTrackerApi } from "../interfaces.js";
import { getMobileEnv } from "../../config/env.js";
import { sessionStore } from "../auth/tokenStore.js";

/**
 * Mail Tracker API client.
 *
 * Auth model: send our session access token as `Authorization: Bearer`. On a
 * 401 it transparently refreshes the session (once) using the stored refresh
 * token and retries. There is NO shared secret and NO Gmail token in the client.
 */
export class MailTrackerApiClient implements IMailTrackerApi {
  private client: AxiosInstance;
  private refreshing: Promise<SessionResponse | null> | null = null;

  constructor() {
    const env = getMobileEnv();
    const baseURL = env.mailtrackerApiBaseUrl.replace(/\/$/, "");

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: { "Content-Type": "application/json" },
    });

    // Attach the session access token.
    this.client.interceptors.request.use(async (config) => {
      const token = await sessionStore.getAccessToken();
      if (token && !config.headers["X-Skip-Auth"]) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
      delete config.headers["X-Skip-Auth"];
      return config;
    });

    // On 401, refresh once and retry.
    this.client.interceptors.response.use(
      (r) => r,
      async (error) => {
        if (!isAxiosError(error) || error.response?.status !== 401 || !error.config) {
          throw error;
        }
        const original = error.config as typeof error.config & { _retried?: boolean };
        if (original._retried) throw error;
        original._retried = true;

        const session = await this.ensureRefreshed();
        if (!session) throw error;
        original.headers = original.headers ?? {};
        original.headers["Authorization"] = `Bearer ${session.accessToken}`;
        return this.client.request(original);
      },
    );
  }

  /** De-duplicated refresh: concurrent 401s share one refresh call. */
  private async ensureRefreshed(): Promise<SessionResponse | null> {
    if (this.refreshing) return this.refreshing;
    this.refreshing = (async () => {
      const stored = await sessionStore.get();
      if (!stored?.refreshToken) return null;
      try {
        const session = await this.refreshSession(stored.refreshToken);
        await sessionStore.save({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          accessTokenExpiresAtMs: Date.now() + session.expiresIn * 1000,
        });
        return session;
      } catch {
        await sessionStore.clear();
        return null;
      } finally {
        this.refreshing = null;
      }
    })();
    return this.refreshing;
  }

  // --- Auth (these endpoints don't need a bearer token) ---

  async loginWithGoogle(idToken: string, gmailRefreshToken?: string): Promise<SessionResponse> {
    const res = await this.client.post<SessionResponse>(
      "/auth/google",
      { idToken, gmailRefreshToken },
      { headers: { "X-Skip-Auth": "1" } },
    );
    return res.data;
  }

  async refreshSession(refreshToken: string): Promise<SessionResponse> {
    const res = await this.client.post<SessionResponse>(
      "/auth/refresh",
      { refreshToken },
      { headers: { "X-Skip-Auth": "1" } },
    );
    return res.data;
  }

  async logout(refreshToken: string): Promise<void> {
    await this.client.post("/auth/logout", { refreshToken }, { headers: { "X-Skip-Auth": "1" } });
  }

  // --- Inbox ---

  async runSync(): Promise<{ synced: number; enqueued: number; source: string }> {
    const res = await this.client.post("/sync/run");
    return res.data;
  }

  async getInbox(cursor?: string, category?: string, limit = 50): Promise<InboxPage> {
    const res = await this.client.get<InboxPage>("/emails", {
      params: { cursor, category, limit },
    });
    return res.data;
  }

  async getInsights(): Promise<InsightsResponse> {
    const res = await this.client.get<InsightsResponse>("/emails/insights");
    return res.data;
  }

  async recordSwipe(messageId: string, decision: SwipeDecision, atMs: number): Promise<void> {
    await this.client.post("/sync/swipes", { messageId, decision, atMs });
  }

  // --- AI ---

  async categorizeEmail(request: CategorizeEmailRequest): Promise<CategorizeEmailResponse> {
    const res = await this.client.post<CategorizeEmailResponse>("/ai/categorize", request);
    return res.data;
  }

  async categorizeBatch(requests: CategorizeEmailRequest[]): Promise<CategorizeEmailResponse[]> {
    const res = await this.client.post<CategorizeEmailResponse[]>("/ai/categorize-batch", requests);
    return res.data;
  }

  async registerPushToken(fcmToken: string, platform: "ios" | "android"): Promise<void> {
    await this.client.post("/push/register", { fcmToken, platform });
  }
}

export const mailTrackerApi = new MailTrackerApiClient();
