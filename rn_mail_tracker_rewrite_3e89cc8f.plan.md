---
name: RN Mail Tracker Rewrite
overview: Rewrite Mail-Tracker-App as React Native (Expo Prebuild) + Node.js/Express backend + Firebase Realtime DB, preserving all existing features (OAuth + Gmail API, SQLite cache, categorize/insights AI, inbox actions, categories, onboarding, settings) while swapping UI to a Tinder-style swipe card stack. Archive existing MAUI/.NET code to /legacy.
todos: []
isProject: false
---

# RN Mail Tracker Rewrite

## 0. Repo reshape

Target tree at `Mail-Tracker-App/`:

```
.env                       (single source of truth, gitignored)
.env.example
.gitignore
README.md
package.json               (root workspace, npm workspaces)
docs/
  ARCHITECTURE.md          (rewritten)
  PRIVACY.md               (kept, minor edits: FCM + Firebase)
  SHIPPING.md              (rewritten: EAS Build + Node host)
apps/
  mobile/                  (React Native, Expo Prebuild)
  api/                     (Node.js + Express)
packages/
  shared/                  (TS types + contracts shared by mobile + api)
legacy/
  MailTrackerApp/          (moved from MailTrackerApp/)
  MailTracker.Api/         (moved from MailTracker.Api/)
  MailTracker.sln
  README.md                (note: archived, see /apps)
```

Principles carried from existing codebase (non-negotiable):
- **Single `.env` at repo root** loaded once. No key read via `process.env.X` directly outside a central config module (DRY).
- **All AI runs only in backend**; mobile never holds an AI key.
- **OAuth tokens live only in platform secure storage on device** (not `.env`, not Firebase).
- **MVVM-style separation**: `screens/` (dumb views) + `hooks/stores/` (state + actions) + `services/` (I/O). Mirrors existing Views/ViewModels/Services.
- Interfaces for every I/O service so they're swappable and unit-testable.
- `UPPER_SNAKE_CASE` env keys, same prefixes as today (`AZURE_OPENAI_*`, `GMAIL_*`, `API_*`, `MAILTRACKER_*`, add `FIREBASE_*`, `FCM_*`).

## 1. Root `.env` (one source of truth)

Update [.env.example](Mail-Tracker-App/.env.example) to:

```
# Backend: Azure OpenAI (server-side only)
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_DEPLOYMENT=
AZURE_OPENAI_API_VERSION=2024-10-21

# Dev auth between mobile app and API
API_AUTH_SHARED_SECRET=

# Backend host
API_PORT=5080
API_HOST=0.0.0.0

# Firebase Admin (backend only: verify ID tokens, write Realtime DB, send FCM)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_DATABASE_URL=

# Gmail OAuth (mobile)
GMAIL_OAUTH_CLIENT_ID_ANDROID=
GMAIL_OAUTH_CLIENT_ID_IOS=
GMAIL_REDIRECT_URI=com.mailtracker.app:/oauth2redirect

# Mobile -> API base URL
MAILTRACKER_API_BASE_URL=http://10.0.2.2:5080

# Mobile Firebase (public) config
FIREBASE_WEB_API_KEY=
FIREBASE_APP_ID_ANDROID=
FIREBASE_APP_ID_IOS=
FIREBASE_MESSAGING_SENDER_ID=
```

- Backend loader: `apps/api/src/config/env.ts` uses `dotenv` pointed at root `.env`, then exports a Zod-validated `config` object. Replaces [MailTracker.Api/Configuration/EnvConfigLoader.cs](Mail-Tracker-App/MailTracker.Api/Configuration/EnvConfigLoader.cs).
- Mobile loader: `apps/mobile/app.config.ts` reads root `.env` via `dotenv` and exposes values via `expo-constants` `extra`. One `apps/mobile/src/config/env.ts` module is the only place `Constants.expoConfig.extra` is read (mirrors [MailTrackerApp/Configuration/EnvConfigLoader.cs](Mail-Tracker-App/MailTrackerApp/Configuration/EnvConfigLoader.cs)).

## 2. Backend: `apps/api` (Node.js + Express + TypeScript)

Port of [MailTracker.Api](Mail-Tracker-App/MailTracker.Api) feature-for-feature.

```
apps/api/
  package.json
  tsconfig.json
  src/
    index.ts                  (bootstrap: load env, wire app, listen)
    app.ts                    (express app factory, middleware order)
    config/env.ts             (Zod-validated, single read)
    middleware/
      sharedSecretAuth.ts     <- SharedSecretAuthMiddleware.cs
      firebaseAuth.ts         (verify Firebase ID token; optional in Phase 1)
      errorHandler.ts
    routes/
      health.ts               <- HealthEndpoints.cs
      ai.ts                   <- AiEndpoints.cs (/ai/categorize, /ai/categorize-batch, /ai/insights)
      sync.ts                 (new: Realtime DB writes)
      push.ts                 (new: FCM device token register / test send)
    services/
      azureOpenAi.ts          (shared HTTP client; DRY across categorizer + insights)
      aiCategorizer.ts        <- IEmailCategorizer + AzureOpenAiEmailCategorizer + StubEmailCategorizer
      aiInsights.ts           <- AzureOpenAiInsightsService
      firebase.ts             (firebase-admin singleton: RTDB + FCM)
      pushService.ts
```

Endpoint contracts identical to existing C# records so mobile DTOs match:
- `GET /health` — unauthenticated.
- `POST /ai/categorize` — `{messageId, from, subject, snippet}` -> `{messageId, category, confidence, reason, available}`. Same `AllowedCategories` list as [AzureOpenAiEmailCategorizer.cs](Mail-Tracker-App/MailTracker.Api/Services/AzureOpenAiEmailCategorizer.cs).
- `POST /ai/categorize-batch` — bounded concurrency = 4 via `p-limit`.
- `POST /ai/insights` — same shape as [Insights.cs](Mail-Tracker-App/MailTracker.Api/Models/Insights.cs).
- `POST /sync/emails` — upsert metadata into `users/{uid}/emails/{messageId}`.
- `POST /sync/swipes` — append swipe decisions to `users/{uid}/swipes/{messageId}`.
- `POST /push/register` — save FCM token to `users/{uid}/devices/{tokenHash}`.

Auth layers:
1. `X-Api-Secret` shared-secret (dev), same header name as today.
2. Later: Firebase ID token in `Authorization: Bearer`.

Fallback discipline preserved from [AzureOpenAiEmailCategorizer.cs](Mail-Tracker-App/MailTracker.Api/Services/AzureOpenAiEmailCategorizer.cs) and [AzureOpenAiInsightsService.cs](Mail-Tracker-App/MailTracker.Api/Services/AzureOpenAiInsightsService.cs):
- `AZURE_OPENAI_*` not configured -> stub categorizer / deterministic local insights.
- Azure call fails -> `Degraded` response, never throw.

## 3. Shared contracts: `packages/shared`

```
packages/shared/src/
  types/
    EmailCategory.ts          <- mirror of EmailCategory.cs (same names)
    EmailSummary.ts
    EmailDetail.ts
    CategorizeEmail.ts
    Insights.ts
    GmailProfile.ts
    SwipeDecision.ts          ('archive'|'keep'|'trash'|'star')
```

Both `apps/api` and `apps/mobile` depend on `@mailtracker/shared` via npm workspaces. No duplicate DTOs (DRY).

## 4. Mobile: `apps/mobile` (React Native, Expo Prebuild)

Bootstrap: `npx create-expo-app apps/mobile -t expo-template-blank-typescript`, then `npx expo prebuild` for `android/` + `ios/`. Expo SDK 52+. EAS Build configured for iOS cloud builds from Windows.

```
apps/mobile/
  app.config.ts               (reads root .env via dotenv)
  eas.json                    (dev/preview/production)
  google-services.json        (Firebase console, Android)
  GoogleService-Info.plist    (iOS)
  src/
    App.tsx                   (root nav + providers)
    config/
      env.ts                  (single reader for Constants.expoConfig.extra)
      theme.ts                (port of Resources/Styles)
      categoryColors.ts       <- CategoryColorConverter
    navigation/
      RootNavigator.tsx       (Onboarding vs MainTabs, like AppShell.xaml)
      MainTabs.tsx            (Swipe, Categories, Insights, Settings)
    screens/
      OnboardingScreen.tsx    <- OnboardingPage + OnboardingViewModel
      SwipeScreen.tsx         (NEW primary: card stack; replaces InboxPage)
      CategoriesScreen.tsx
      CategoryEmailsScreen.tsx
      EmailDetailScreen.tsx
      InsightsScreen.tsx
      SettingsScreen.tsx
    components/
      EmailCard.tsx
      CategoryTile.tsx
      SwipeOverlay.tsx        (L=Archive, R=Keep, U=Star, D=Trash hints)
      SkeletonList.tsx
      Toast.tsx
    stores/                   (Zustand — one per feature, like ViewModels)
      useAuthStore.ts         <- AuthenticationService
      useInboxStore.ts        <- InboxViewModel
      useCategoriesStore.ts
      useInsightsStore.ts
      useSettingsStore.ts
    services/                 (all I/O; interface-first)
      interfaces.ts           (IAuthService, IGmailService, IMailTrackerApi, ITokenStore, IEmailStore, IToastService, IPushService, ISyncService)
      auth/
        authService.ts        <- AuthenticationService.cs (react-native-app-auth, PKCE)
        tokenStore.ts         <- SecureStorageTokenStore.cs (expo-secure-store)
        gmailScopes.ts        <- GmailOAuthScopes.cs (same 4 scopes)
      gmail/
        gmailService.ts       <- GmailApiService.cs (REST via fetch)
        gmailParsers.ts       (headers, base64url, MIME walk — ported)
      api/
        mailTrackerApi.ts     <- MailTrackerApiClient.cs (axios; X-Api-Secret)
      storage/
        emailStore.ts         <- SqliteEmailStore.cs (expo-sqlite)
      sync/
        firebaseSync.ts       (@react-native-firebase/database listener)
      push/
        pushService.ts        (@react-native-firebase/messaging)
      toast/toastService.ts
    utils/
      relativeDate.ts         <- RelativeDateConverter
      queryString.ts
```

### Swipe UI (primary change)

- `react-native-gesture-handler` + `react-native-reanimated` 3.
- Hand-rolled 4-direction swipe using `PanGestureHandler` + `withSpring` (most libs are 2-direction only).
- Mappings (configurable in Settings):
  - Left -> Archive (remove INBOX label, like existing `ArchiveAsync`)
  - Right -> Keep (mark read, pop)
  - Up -> Star (add STARRED label)
  - Down -> Trash
- Optimistic local removal + rollback + toast (mirrors existing `RemoveLocal`/rollback in [InboxViewModel.cs](Mail-Tracker-App/MailTrackerApp/ViewModels/InboxViewModel.cs)).
- Card content matches [EmailSummary.cs](Mail-Tracker-App/MailTrackerApp/Models/EmailSummary.cs): `FromDisplay`, `Subject`, `Snippet`, `Category` pill, relative time, attachment indicator. Tap = open detail.
- Pull-to-refresh at top of stack; empty state.
- Bulk multi-select preserved via long-press on deck (checkboxes don't fit a card stack).

### Firebase Realtime DB shape

```
users/{uid}/
  profile/   { email, displayName, photoUrl }
  emails/    {messageId}/ { from, subject, snippet, category, receivedAtMs, isUnread, hasAttachment }
  swipes/    {messageId}/ { decision, atMs, deviceId }
  devices/   {tokenHash}/ { fcmToken, platform, lastSeenMs }
```

- Rules: `auth.uid === $uid`. Mobile authenticates to Firebase with a **custom token** minted by backend (backend holds Firebase Admin). No service account on device.
- Local SQLite is still the primary cache for cold-start; Firebase mirror exists for multi-device real-time.

### Push notifications (FCM)

- `@react-native-firebase/messaging` on mobile; token sent to `POST /push/register`.
- Backend sends on new message arrival (manual test endpoint in Phase 8; Gmail Pub/Sub watch later).

### AI integration

- Phase 1–N: server-side Azure OpenAI only (same as existing).
- TensorFlow Lite on-device deferred — documented as optional offline fallback. Backend remains primary to keep AI keys off the device (existing rule).

## 5. Development workflow (Windows)

- `npm install` at repo root (workspaces).
- `npm run dev:api` -> Node API on `:5080`.
- `npm run dev:mobile` -> `expo start --dev-client`.
- Android Studio emulator hits `http://10.0.2.2:5080` (existing convention).
- iOS from Windows: `eas build --profile development --platform ios`, install via TestFlight.
- `eas.json` profiles: `development`, `preview`, `production`.

## 6. Phases (mirror existing 9-phase structure)

1. Foundation — workspaces, root `.env`, shared types, Node API `/health`, RN app boots and reads env.
2. API core — middleware, stub + Azure OpenAI categorizer, insights, Zod-validated routes.
3. OAuth + token store — `react-native-app-auth` + `expo-secure-store` + auth store + onboarding screen.
4. Gmail service + SQLite cache + list hydration — port all actions (list/get/archive/trash/markRead/unsubscribe/profile).
5. Swipe UI — 4-direction card stack wired to Gmail actions; optimistic + rollback + toast.
6. Categories + Insights screens.
7. Firebase sync — Admin on backend; RTDB writes from `/sync/*`; RN subscribes for multi-device real-time.
8. Push (FCM) — token register, server send on new message, tap deep-link to detail.
9. Settings + Shipping — settings, EAS production builds, store listing, privacy doc update.

Each phase has a "Done when" matching [README.md](Mail-Tracker-App/README.md) convention.

## 7. Docs

- Rewrite [docs/ARCHITECTURE.md](Mail-Tracker-App/docs/ARCHITECTURE.md): RN + Node + Firebase. Keep rules verbatim: "single `.env`", "AI server-only", "tokens in SecureStorage".
- [docs/PRIVACY.md](Mail-Tracker-App/docs/PRIVACY.md): add Firebase + FCM disclosures.
- Rewrite [docs/SHIPPING.md](Mail-Tracker-App/docs/SHIPPING.md): EAS Build + Node deploy target (Fly.io / Render / Azure Container App).
- [README.md](Mail-Tracker-App/README.md): RN + Node flow; keep the "copy `.env.example` to `.env`\" first-time-setup section intact.

## 8. Conflict resolution (existing vs new prompt)

- Backend: new says Node+Firebase, existing .NET+Azure OpenAI -> Node backend; Firebase for sync/auth/FCM; Azure OpenAI kept for AI (existing \"AI only in backend\" rule wins).
- AI: new says TFLite, existing Azure OpenAI -> Azure OpenAI primary; TFLite as optional later fallback.
- UI: new says swipe cards, existing list with swipes -> swipe cards primary; all existing actions preserved as directions.
- OAuth: existing PKCE + refresh + SecureStorage pattern carried over.
- Config: existing single-root-`.env` rule carried over.
- Cache: existing SQLite carried over (`expo-sqlite`).
- Scopes: same 4 scopes (email, profile, gmail.readonly, gmail.modify).

## 9. Package choices

- RN/Expo: `expo` SDK 52+, `expo-dev-client`, `expo-secure-store`, `expo-sqlite`, `expo-constants`, `expo-web-browser`, `expo-linking`.
- Gesture/anim: `react-native-gesture-handler`, `react-native-reanimated`.
- OAuth: `react-native-app-auth`.
- Firebase: `@react-native-firebase/app`, `/auth`, `/database`, `/messaging`.
- State: `zustand`.
- HTTP: `axios`.
- Nav: `@react-navigation/native`, `/bottom-tabs`, `/native-stack`.
- Toast: `react-native-toast-message`.
- API: `express`, `zod`, `dotenv`, `firebase-admin`, `p-limit`, `pino`, `cors`, `helmet`.

## 10. Guardrails (what we will NOT do)

- No AI key on device.
- No `process.env.X` or direct `Constants` access outside `config/env.ts`.
- No duplicated DTOs — all from `packages/shared`.
- No deletion of existing MAUI/.NET code — moved to `legacy/`.
- No Firebase service-account JSON bundled in the app.
