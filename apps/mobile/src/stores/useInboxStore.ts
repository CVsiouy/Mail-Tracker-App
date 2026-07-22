import { create } from "zustand";
import type { EmailMeta, SwipeDecision } from "../services/interfaces.js";
import { emailStore } from "../services/storage/emailStore.js";
import { mailTrackerApi } from "../services/api/mailTrackerApi.js";

interface SwipeResult {
  email: EmailMeta;
  decision: SwipeDecision;
}

interface InboxState {
  emails: EmailMeta[];
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasNextPage: boolean;
  nextCursor: string | null;
  swipeHistory: SwipeResult[];

  loadEmails: (forceRefresh?: boolean) => Promise<void>;
  loadMoreEmails: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Swipe the email at `index`. Optimistically removes it from the list. */
  swipeEmail: (
    index: number,
    decision: SwipeDecision,
    onSuccess?: () => void,
    onRollback?: () => void,
  ) => Promise<void>;
  undoSwipe: () => Promise<void>;
  clearError: () => void;
}

/**
 * Inbox store. The server owns the inbox (Postgres); the app READS it from
 * `GET /emails` and records swipe decisions via the API. A local SQLite cache
 * gives instant/offline first paint.
 */
export const useInboxStore = create<InboxState>((set, get) => ({
  emails: [],
  isLoading: false,
  isRefreshing: false,
  isLoadingMore: false,
  error: null,
  hasNextPage: true,
  nextCursor: null,
  swipeHistory: [],

  async loadEmails(forceRefresh = false) {
    set({ isLoading: true, error: null });
    try {
      // Instant paint from the local cache first (unless forcing a refresh).
      if (!forceRefresh) {
        await emailStore.init();
        const cached = await emailStore.getEmails(50);
        if (cached.length > 0) {
          set({ emails: cached, isLoading: false });
          void get().refresh(); // freshen in the background
          return;
        }
      }

      // Ask the server to sync from Gmail, then read the server-owned inbox.
      await mailTrackerApi.runSync().catch(() => undefined);
      const page = await mailTrackerApi.getInbox();

      await emailStore.init();
      await emailStore.saveEmails(page.emails);

      set({
        emails: page.emails,
        isLoading: false,
        hasNextPage: page.nextCursor !== null,
        nextCursor: page.nextCursor,
      });
    } catch (error) {
      console.error("Failed to load emails:", error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load emails",
      });
    }
  },

  async loadMoreEmails() {
    const { isLoadingMore, hasNextPage, nextCursor } = get();
    if (isLoadingMore || !hasNextPage || !nextCursor) return;

    set({ isLoadingMore: true });
    try {
      const page = await mailTrackerApi.getInbox(nextCursor);
      await emailStore.saveEmails(page.emails);
      set((state) => ({
        emails: [...state.emails, ...page.emails],
        isLoadingMore: false,
        hasNextPage: page.nextCursor !== null,
        nextCursor: page.nextCursor,
      }));
    } catch (error) {
      console.error("Failed to load more emails:", error);
      set({ isLoadingMore: false });
    }
  },

  async refresh() {
    set({ isRefreshing: true, error: null });
    try {
      await mailTrackerApi.runSync().catch(() => undefined);
      const page = await mailTrackerApi.getInbox();
      await emailStore.init();
      await emailStore.clearAll();
      await emailStore.saveEmails(page.emails);
      set({
        emails: page.emails,
        isRefreshing: false,
        hasNextPage: page.nextCursor !== null,
        nextCursor: page.nextCursor,
      });
    } catch (error) {
      console.error("Failed to refresh emails:", error);
      set({
        isRefreshing: false,
        error: error instanceof Error ? error.message : "Failed to refresh",
      });
    }
  },

  async swipeEmail(index, decision, onSuccess, onRollback) {
    const { emails, swipeHistory } = get();
    if (index < 0 || index >= emails.length) return;

    const email = emails[index];
    const previousEmails = [...emails];

    // Optimistically remove the swiped email from the list. The screen tracks
    // the deck by identity, so it does NOT also advance an index — this is the
    // fix for the old double-advance bug that skipped emails.
    const newEmails = emails.filter((_, i) => i !== index);
    set({
      emails: newEmails,
      swipeHistory: [...swipeHistory, { email, decision }],
    });

    try {
      await mailTrackerApi.recordSwipe(email.messageId, decision, Date.now());

      // Reflect on the local cache.
      if (decision === "archive" || decision === "trash") {
        await emailStore.deleteEmail(email.messageId);
      } else if (decision === "keep") {
        await emailStore.updateEmail(email.messageId, { isUnread: false });
      }

      onSuccess?.();
    } catch (error) {
      console.error("Swipe action failed:", error);
      // Roll back.
      set({ emails: previousEmails, swipeHistory });
      onRollback?.();
    }
  },

  async undoSwipe() {
    const { swipeHistory, emails } = get();
    if (swipeHistory.length === 0) return;

    const last = swipeHistory[swipeHistory.length - 1];
    const restored = [last.email, ...emails].sort((a, b) => b.receivedAtMs - a.receivedAtMs);
    set({ emails: restored, swipeHistory: swipeHistory.slice(0, -1) });
    await emailStore.saveEmails([last.email]);
  },

  clearError() {
    set({ error: null });
  },
}));
