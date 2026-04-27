# Mail Tracker

Expo (React Native) client + Node.js API. Gmail is read on-device via the Gmail API; **all AI calls go through `apps/api`**, which is the only component that talks to Azure OpenAI.

The previous .NET solution lives under [`legacy/`](legacy/README.md).

## Requirements

- **Node.js 20+** and **npm 9+** (Expo SDK 52, TypeScript tooling, and native prebuild all assume a current runtime).
- Android Studio (for Android emulator) when developing mobile.

## First-time setup

```powershell
Set-Location "C:\path\to\Mail-Tracker-App"
Copy-Item .env.example .env
# Edit .env — at minimum set MAILTRACKER_API_BASE_URL and API_AUTH_SHARED_SECRET for local API calls.
```

Install dependencies (runs installs under `packages/shared`, `apps/api`, and `apps/mobile`):

```powershell
npm install
```

Build TypeScript packages:

```powershell
npm run build
```

## Run the API

```powershell
npm run dev:api
```

Smoke test:

```http
GET http://localhost:5080/health
```

When `API_AUTH_SHARED_SECRET` is set in `.env`, protected routes require header:

```http
X-Api-Secret: <same value as API_AUTH_SHARED_SECRET>
```

AI routes:

- `POST /ai/categorize`
- `POST /ai/categorize-batch` (bounded concurrency = 4)
- `POST /ai/insights`

## Run the mobile app

```powershell
npm run dev:mobile
```

The Expo app reads `MAILTRACKER_API_BASE_URL` from the **repo root** `.env` via `apps/mobile/app.config.ts` and exposes it as `extra.mailtrackerApiBaseUrl`. The only code that should read that value is `apps/mobile/src/config/env.ts`.

**Android emulator:** use `http://10.0.2.2:5080` in `.env` so the device can reach your PC’s localhost.

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — security boundaries and layout.
- [`legacy/docs/`](legacy/docs/) — older shipping/privacy notes (still useful until rewritten for Expo).

## Phases

Implementation follows the phased plan (foundation → API → auth → Gmail → swipe UI → …). Finish each phase’s **Done when** checklist before moving on.


