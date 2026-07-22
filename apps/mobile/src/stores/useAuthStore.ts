import { create } from "zustand";
import type { UserProfile } from "@mailtracker/shared";
import { authService } from "../services/auth/authService.js";
import { sessionStore } from "../services/auth/tokenStore.js";
import { mailTrackerApi } from "../services/api/mailTrackerApi.js";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  error: string | null;

  initialize: () => Promise<boolean>;
  signIn: () => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

/**
 * Authentication state.
 *
 * Sign-in flow:
 *  1. Google OAuth on-device → { idToken, gmailRefreshToken }.
 *  2. POST them to our server (`/auth/google`); the server verifies the ID
 *     token, upserts the user, stores the Gmail refresh token, and returns a
 *     session (access + refresh) PLUS the user profile.
 *  3. Store the session securely and set `user` from the server response — this
 *     is why `user` is reliably populated (the old bug was never fetching it).
 */
export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  error: null,

  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      const session = await sessionStore.get();
      if (!session) {
        set({ isLoading: false, isAuthenticated: false });
        return false;
      }
      // We have a stored session. Validate it by fetching the inbox lazily
      // elsewhere; here we optimistically mark authenticated (the API client's
      // 401→refresh interceptor handles an expired access token).
      set({ isAuthenticated: true, isLoading: false });
      return true;
    } catch (error) {
      console.error("Auth initialization failed:", error);
      set({ isLoading: false, error: "Failed to initialize authentication" });
      return false;
    }
  },

  signIn: async () => {
    set({ isLoading: true, error: null });
    try {
      const google = await authService.authorize();
      if (!google || !google.idToken) {
        set({ isLoading: false, error: "Google sign-in failed" });
        return false;
      }

      const session = await mailTrackerApi.loginWithGoogle(
        google.idToken,
        google.refreshToken || undefined,
      );

      await sessionStore.save({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        accessTokenExpiresAtMs: Date.now() + session.expiresIn * 1000,
      });

      set({
        isAuthenticated: true,
        user: session.user,
        isLoading: false,
      });
      return true;
    } catch (error) {
      console.error("Sign in failed:", error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Sign in failed",
      });
      return false;
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      const session = await sessionStore.get();
      if (session?.refreshToken) {
        await mailTrackerApi.logout(session.refreshToken).catch(() => undefined);
      }
      await authService.signOut();
      await sessionStore.clear();
      set({ isAuthenticated: false, user: null, isLoading: false });
    } catch (error) {
      console.error("Sign out failed:", error);
      set({ isLoading: false, error: error instanceof Error ? error.message : "Sign out failed" });
    }
  },

  clearError: () => set({ error: null }),
}));
