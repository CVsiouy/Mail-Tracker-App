# How The App Runs

This note explains startup flow.

## Root Commands

The root `package.json` defines these useful commands:

```bash
npm run build
npm run dev:api
npm run dev:mobile
npm run lint
npm run typecheck
```

Meaning:

- `npm run build`
  - Builds `packages/shared`, then builds `apps/api`.

- `npm run dev:api`
  - Starts the backend API in development mode.

- `npm run dev:mobile`
  - Starts the Expo mobile development server.

- `npm run lint`
  - Runs ESLint on shared and API code.

- `npm run typecheck`
  - Runs TypeScript checking on shared and API code.

## Backend Startup

Backend entry point:

`apps/api/src/index.ts`

Flow:

1. Import config from `apps/api/src/config/env.ts`.
2. Create the Express app by calling `createApp()` from `apps/api/src/app.ts`.
3. Create an HTTP server.
4. Listen on the configured host/port.
5. Log that the API is running.

Important detail: the backend reads the root `.env` file through `findDotEnv.ts` and `env.ts`.

## Backend App Creation

File:

`apps/api/src/app.ts`

This function wires up the server:

1. Creates an Express app.
2. Enables security headers using `helmet`.
3. Enables CORS.
4. Enables JSON body parsing.
5. Enables request logging with `pino-http`.
6. Registers `/health`.
7. Adds shared-secret authentication for most routes.
8. Registers `/ai`, `/sync`, and `/push` routes.
9. Adds a 404 handler.
10. Adds the centralized error handler.

In plain English: `app.ts` is the backend's traffic controller.

## Mobile Startup

Mobile entry point:

`apps/mobile/App.tsx`

Flow:

1. Render Expo status bar.
2. Render `RootNavigator`.

`RootNavigator` checks `useAuthStore().isAuthenticated`.

If the user is not signed in:

```text
Onboarding screen
```

If the user is signed in:

```text
Main tab app
```

## Mobile Navigation

File:

`apps/mobile/src/navigation/RootNavigator.tsx`

It uses a stack navigator:

- `Onboarding`
- `Main`

File:

`apps/mobile/src/navigation/MainTabs.tsx`

It uses bottom tabs:

- `Swipe`
- `Categories`
- `Insights`
- `Settings`

Important: `Categories`, `Insights`, and `Settings` are currently placeholder screens inside `MainTabs.tsx`, even though separate screen files also exist. See [[07 What Looks Finished And What Looks Placeholder]].

## Environment Variables

Backend:

- Reads directly from `.env` using `dotenv`.
- Validates variables with Zod.

Mobile:

- Reads values from Expo `extra`.
- Those values are populated by `apps/mobile/app.config.ts`.

The current architecture intends one root `.env` file to feed both apps.

