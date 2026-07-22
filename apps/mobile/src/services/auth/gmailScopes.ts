/**
 * Google OAuth scopes required for the app.
 *
 * - `openid` + `email` + `profile` yield an OpenID Connect ID token, which the
 *   server verifies to establish identity.
 * - The gmail scopes allow reading and modifying the user's mailbox (server-side
 *   sync uses the forwarded refresh token).
 */
export const GMAIL_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
];
