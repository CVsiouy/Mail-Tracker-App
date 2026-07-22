# What Looks Finished And What Looks Placeholder

This note is important because generated code can look complete even when parts are only scaffolding.

## Looks Real / Implemented

These parts appear to have meaningful implementation:

- Backend Express server startup.
- Backend environment variable validation.
- `/health`, `/ai`, `/sync`, and `/push` route structure.
- Azure OpenAI categorization fallback behavior.
- Firebase Admin lazy initialization.
- Shared Zod schemas for AI requests/responses.
- Mobile root navigation.
- Gmail OAuth service.
- Secure token storage.
- Gmail API service.
- SQLite email cache.
- Swipe card screen with gesture handling.
- Inbox Zustand store with load, refresh, swipe, categorize, and undo logic.
- API client for backend calls.

## Placeholder Or Incomplete Areas

These areas appear unfinished or suspicious:

### Categories, Insights, Settings Tabs

`apps/mobile/src/navigation/MainTabs.tsx` defines placeholder components inside the file:

- `CategoriesScreen`
- `InsightsScreen`
- `SettingsScreen`

But there are also files:

- `apps/mobile/src/screens/CategoriesScreen.tsx`
- `apps/mobile/src/screens/InsightsScreen.tsx`
- `apps/mobile/src/screens/SettingsScreen.tsx`

Those separate screen files contain real UI logic. For example, Categories groups emails by category, Insights calculates stats and can call AI insights, and Settings shows toggles/sign-out UI.

The tab navigator is currently not importing those screen files. That means the visible app may show placeholders instead of the richer screens.

### Settings Screen Has A Touchable Bug

`apps/mobile/src/screens/SettingsScreen.tsx` tries to attach `onPress` to a normal `View`:

```tsx
<View
  ...
  {...(item.onPress ? { onPress: item.onPress } : {})}
>
```

In React Native, a normal `View` is not meant to behave like a button. This should usually be a `TouchableOpacity`, `Pressable`, or similar component for clickable rows.

### Auth User Object May Not Be Set

`useInboxStore.ts` checks:

```ts
const user = useAuthStore.getState().user;
if (!user) {
  set({ isLoading: false, error: "Not authenticated" });
  return;
}
```

But `useAuthStore.ts` stores tokens after sign-in and does not obviously fetch/set the Gmail profile user.

Possible result: the app signs in but then `loadEmails()` may say `Not authenticated` because `user` is still null.

The app can get the email from `gmailService.getProfile()`, but that does not appear wired into sign-in yet.

### Shared Secret Confusion In Mobile API Client

`apps/mobile/src/services/api/mailTrackerApi.ts` adds `X-Api-Secret` using:

```ts
const secret = env.gmailOAuthClientSecret;
```

That is suspicious because a Gmail OAuth client secret is not the same as `API_AUTH_SHARED_SECRET`.

Better design would usually have a separate mobile env value for the API shared secret in development, or a real auth scheme in production.

Also, shipping shared secrets in mobile apps is not secure for production because users can extract app contents.

### Emoji/Text Encoding Looks Broken

Several files show broken sequences like:

```text
ðŸ“§
âœ…
```

These were probably emoji that got saved/read with the wrong encoding.

This affects:

- README
- onboarding screen
- swipe screen
- docs

It is mostly visual, but it makes the UI and docs look broken.

### Mobile Type Looks Incorrect

In `apps/mobile/src/config/env.ts`, this type line looks wrong:

```ts
gmailOAuthClientIdAndroid: "711818120217-h13ug0khos9bl2mk2df3lv9j2kr2e754.apps.googleusercontent.com";
```

That is a string literal type, not a normal string. It means TypeScript expects exactly that one value.

It probably should be:

```ts
gmailOAuthClientIdAndroid: string;
```

### Swipe Index May Be Fragile

`SwipeScreen.tsx` keeps `activeCardIndex` while `useInboxStore.swipeEmail()` also removes the email from the `emails` array.

That means there are two concepts of "current position":

- local screen index
- store array after deletion

This can easily skip items because after removing index 0, the next email becomes index 0, but the screen increments `activeCardIndex` to 1.

This needs careful testing.

### Thread ID Arguments Are Misleading

Some Gmail service methods accept both `messageId` and `threadId`, but callers pass the message id for both.

Example:

```ts
gmailService.archiveMessage(email.messageId, email.messageId)
```

Currently the `threadId` parameter is unused, so this does not break anything today. But it is confusing.

### Push Notifications May Be Partial

There is backend push route/service code and mobile push service code, but based on the walkthrough, push does not appear fully connected to app startup/settings yet.

## Suggested Learning Order

If you are learning the project, read in this order:

1. `apps/mobile/App.tsx`
2. `apps/mobile/src/navigation/RootNavigator.tsx`
3. `apps/mobile/src/screens/OnboardingScreen.tsx`
4. `apps/mobile/src/stores/useAuthStore.ts`
5. `apps/mobile/src/screens/SwipeScreen.tsx`
6. `apps/mobile/src/stores/useInboxStore.ts`
7. `apps/mobile/src/services/gmail/gmailService.ts`
8. `apps/api/src/index.ts`
9. `apps/api/src/app.ts`
10. `apps/api/src/routes/ai.ts`
11. `apps/api/src/services/categorizer.ts`
12. `packages/shared/src/schemas.ts`

## Suggested Fix Order Later

If you want to make the app more reliable later, a practical order would be:

1. Fix text encoding/emoji issues.
2. Wire sign-in to fetch/set the Gmail user profile.
3. Fix `gmailOAuthClientIdAndroid` type.
4. Import real Categories/Insights/Settings screens in `MainTabs.tsx`.
5. Review the swipe index/removal behavior.
6. Separate API auth secret from Gmail OAuth client secret.
7. Run typecheck/lint and fix reported issues.
