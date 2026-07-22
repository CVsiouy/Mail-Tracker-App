# Mobile App Walkthrough

This note explains the phone app.

## What The Mobile App Is Responsible For

The mobile app does these jobs:

- Shows screens and buttons.
- Signs the user into Gmail.
- Stores Gmail tokens securely on the device.
- Loads emails from Gmail.
- Saves email metadata locally in SQLite.
- Lets the user swipe emails.
- Calls Gmail to archive/trash/star/mark-read messages.
- Calls the backend for AI categorization and sync.

## Top-Level File

File:

`apps/mobile/App.tsx`

It is small:

```tsx
export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <RootNavigator />
    </>
  );
}
```

Beginner explanation:

- A React component is a function that returns UI.
- `App` is the top component.
- `RootNavigator` decides which screen to show.

## Authentication State

File:

`apps/mobile/src/stores/useAuthStore.ts`

This is a Zustand store. A store is a place where the app keeps state that many screens/services need.

It tracks:

- `isAuthenticated`
- `isLoading`
- `user`
- `tokens`
- `error`

Main actions:

- `initialize()`
  - Tries to load saved tokens from secure storage when the app starts.

- `signIn()`
  - Starts Gmail OAuth login.
  - Saves tokens if login works.

- `signOut()`
  - Clears tokens and resets login state.

- `refreshTokens()`
  - Uses a refresh token to get a new access token.

Important concept: an access token is like a temporary key that lets the app call Gmail. A refresh token is used to get another access token later.

## Gmail Login

File:

`apps/mobile/src/services/auth/authService.ts`

This uses `react-native-app-auth` to run Gmail OAuth.

OAuth means:

1. App opens Google's login/permission page.
2. User grants permission.
3. Google returns tokens.
4. App uses tokens to call Gmail API.

The app requests Gmail scopes from:

`apps/mobile/src/services/auth/gmailScopes.ts`

## Token Storage

File:

`apps/mobile/src/services/auth/tokenStore.ts`

Tokens are saved with `expo-secure-store`.

This matters because Gmail tokens are sensitive. They should not go in normal plain text storage.

On iOS, secure store maps to Keychain-like secure storage. On Android, it maps to Keystore-like secure storage.

## Inbox State

File:

`apps/mobile/src/stores/useInboxStore.ts`

This store tracks:

- `emails`
- loading states
- pagination state
- swipe history for undo
- errors

Main actions:

- `loadEmails(forceRefresh?)`
  - Loads cached emails first if possible.
  - Then fetches from Gmail.
  - Saves fresh email metadata to SQLite.

- `loadMoreEmails()`
  - Fetches another page from Gmail.

- `refresh()`
  - Reloads the latest inbox from Gmail.

- `swipeEmail(index, decision)`
  - Removes the email from the UI optimistically.
  - Calls Gmail to perform the action.
  - Updates SQLite cache.
  - Calls backend sync route.
  - Rolls back UI if something fails.

- `categorizeEmail(messageId)`
  - Sends one email to backend AI route.

- `categorizeBatch(messageIds)`
  - Sends several emails to backend AI route.

## Gmail API Service

File:

`apps/mobile/src/services/gmail/gmailService.ts`

This service calls Gmail's REST API:

- `getProfile()`
- `listMessages()`
- `getMessage()`
- `archiveMessage()`
- `trashMessage()`
- `markAsRead()`
- `starMessage()`
- `unstarMessage()`

It also has helper functions:

- Extract sender name.
- Extract subject.
- Extract snippet/body.
- Detect attachments.
- Detect unread messages.
- Get received date.

Beginner mental model: this file is the app's translator between "our code" and "Google's Gmail API".

## Local Email Storage

File:

`apps/mobile/src/services/storage/emailStore.ts`

This uses SQLite.

SQLite is a small database stored locally on the device.

The table is called `emails`.

It stores:

- message id
- sender
- subject
- snippet
- category
- received time
- unread status
- attachment status

Why cache emails locally?

- The app can show previous emails faster.
- Some data can still be visible without network.
- It reduces repeated Gmail API calls.

## Swipe Screen

File:

`apps/mobile/src/screens/SwipeScreen.tsx`

This is the main UI screen.

Swipe meanings:

- Left: archive
- Right: keep / mark read
- Up: star
- Down: trash

The screen:

1. Loads emails on mount.
2. Categorizes the first visible emails.
3. Shows up to 3 cards in a stack.
4. Uses gesture handling to detect swipe direction.
5. Animates the top card offscreen.
6. Calls `swipeEmail()` from the inbox store.

## API Client

File:

`apps/mobile/src/services/api/mailTrackerApi.ts`

This uses Axios to call the backend.

Methods include:

- `categorizeEmail`
- `categorizeBatch`
- `getInsights`
- `syncEmails`
- `syncSwipe`
- `registerPushToken`
- `testPush`

Important: this is different from `gmailService`.

- `gmailService` calls Google.
- `mailTrackerApi` calls your own backend.

