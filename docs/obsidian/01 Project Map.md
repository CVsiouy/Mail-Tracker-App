# Project Map

This note explains what each folder does.

## Root Folder

The root folder is:

`C:\Users\ChiragVerma\OneDrive - Gentell\Desktop\Mail-Tracker-App`

Important root files:

- `package.json`
  - Defines top-level commands like `npm run build`, `npm run dev:api`, and `npm run dev:mobile`.

- `.env`
  - Local secret/config file. It is gitignored and should not be committed.

- `.env.example`
  - Template showing which environment variables are expected.

- `README.md`
  - Human-facing overview of the project.

- `tsconfig.base.json`
  - Shared TypeScript settings.

## `apps/api`

This is the backend server.

Main files:

- `apps/api/src/index.ts`
  - Starts the HTTP server.

- `apps/api/src/app.ts`
  - Creates the Express app and attaches middleware/routes.

- `apps/api/src/config/env.ts`
  - Reads environment variables from `.env` and validates them.

- `apps/api/src/routes/ai.ts`
  - Routes for AI categorization and insights.

- `apps/api/src/routes/sync.ts`
  - Routes for syncing emails/swipes to Firebase.

- `apps/api/src/routes/push.ts`
  - Routes for push notification registration/test sends.

- `apps/api/src/services/categorizer.ts`
  - Main logic for categorizing one email.

- `apps/api/src/services/azureOpenAi.ts`
  - Low-level function that calls Azure OpenAI.

- `apps/api/src/services/firebaseAdmin.ts`
  - Initializes Firebase Admin SDK if Firebase env vars are configured.

## `apps/mobile`

This is the React Native app.

Main files:

- `apps/mobile/App.tsx`
  - Mobile app's top-level component.

- `apps/mobile/src/navigation/RootNavigator.tsx`
  - Chooses between onboarding/login and the main app.

- `apps/mobile/src/navigation/MainTabs.tsx`
  - Bottom tabs: Swipe, Categories, Insights, Settings.

- `apps/mobile/src/screens/OnboardingScreen.tsx`
  - Gmail sign-in screen.

- `apps/mobile/src/screens/SwipeScreen.tsx`
  - Main inbox swipe card screen.

- `apps/mobile/src/components/EmailCard.tsx`
  - Reusable email card UI.

- `apps/mobile/src/stores/useAuthStore.ts`
  - Zustand store for login state and tokens.

- `apps/mobile/src/stores/useInboxStore.ts`
  - Zustand store for emails, swipes, local cache, categorization.

- `apps/mobile/src/services/auth`
  - Gmail OAuth login and token storage.

- `apps/mobile/src/services/gmail`
  - Calls Gmail API.

- `apps/mobile/src/services/storage`
  - SQLite local email storage.

- `apps/mobile/src/services/api`
  - Calls this project's backend API.

## `packages/shared`

This package holds shared TypeScript contracts.

Main files:

- `packages/shared/src/schemas.ts`
  - Zod schemas and TypeScript types for AI requests/responses.

- `packages/shared/src/allowedCategories.ts`
  - List of allowed AI email categories.

- `packages/shared/src/index.ts`
  - Re-exports shared items.

Why this exists: the mobile app and API both need to agree on the shape of data. Putting shared types in one package reduces accidental mismatches.

## `docs`

Contains existing project docs plus these Obsidian notes.

- `docs/ARCHITECTURE.md`
  - Higher-level architecture/security notes.

- `docs/SHIPPING.md`
  - Release/deployment notes.

- `docs/obsidian`
  - Beginner-friendly notes generated from exploring the codebase.

## `legacy`

The existing architecture doc says this contains an older `.NET MAUI + ASP.NET Core` implementation. Treat this as reference material, not the current main app.

