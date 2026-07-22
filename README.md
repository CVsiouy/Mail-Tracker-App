# Mail Tracker

AI-powered email management app with swipe gestures for achieving inbox zero. Built as a production-scale SaaS foundation.

**Tech Stack:**
- **Frontend**: React Native (Expo) with TypeScript
- **Backend**: Node.js + Express API (TypeScript, ESM)
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: Google OAuth 2.0 (PKCE) → server-verified ID token → own JWT sessions
- **AI**: Azure OpenAI (server-side only) with a durable background job queue
- **Gmail**: server-side sync (refresh token encrypted at rest with AES-256-GCM)
- **Storage**: Postgres (server, source of truth) + SQLite (local cache)

## Features

- 📧 **Swipe to Action**: Left to archive, right to keep, up to star, down to trash
- 🤖 **Background AI Categorization**: emails are categorized server-side by a Postgres-backed worker — not only when the app is open
- 📊 **Insights**: inbox summaries computed with SQL aggregation + AI
- 🔒 **Real multi-user auth**: identity is derived server-side from a verified session; a client can never access another user's data
- 📱 **Offline First**: SQLite cache for instant/offline paint

## Architecture at a glance

- The mobile app signs in with Google, then hands the server the Google **ID token** (+ Gmail refresh token). The server verifies it, issues its **own** short-lived access JWT + rotating refresh token, and returns them. The device only ever holds our session — never a shared secret, never a Gmail token.
- The server **owns the inbox**: it syncs Gmail into Postgres (`POST /sync/run`), enqueues a categorization job per message, and a `FOR UPDATE SKIP LOCKED` worker drains the queue. The app reads its inbox from `GET /emails`.
- Everything **runs locally with zero cloud credentials**: Postgres via Docker, a Google **dev-login bypass** (blocked in production), a **fixture inbox**, and the existing AI **stub** fallback.

## Quick Start (Docker — recommended)

No local Node/npm needed. Docker builds and runs everything, including Postgres.

```bash
# 1. Start Postgres + API (migrations run automatically on boot)
docker compose up -d db api

# 2. Check it's alive (no auth required)
curl http://localhost:5080/health   # -> {"status":"ok",...}
```

The API starts on `http://localhost:5080` with sensible dev defaults baked into
`docker-compose.yml` — no `.env` required. It logs its config on boot:
`db=postgres google=dev-bypass azureOpenAi=stub worker=on`.

### Exercise the full flow locally (no cloud credentials)

```bash
# Build an unsigned dev Google ID token (accepted by the dev bypass)
TOKEN_JSON='{"sub":"me-123","email":"you@example.com","name":"You"}'
DEV_ID=$(node -e "console.log(Buffer.from(process.argv[1]).toString('base64url'))" "$TOKEN_JSON")
ID_TOKEN="eyJhbGciOiJub25lIn0.$DEV_ID."

# Log in -> get a session
ACCESS=$(curl -s -X POST localhost:5080/auth/google -H 'content-type: application/json' \
  -d "{\"idToken\":\"$ID_TOKEN\"}" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).accessToken))")

# Sync the fixture inbox into Postgres + enqueue categorization
curl -s -X POST localhost:5080/sync/run -H "authorization: Bearer $ACCESS"

# Read the categorized inbox (worker runs every ~3s)
curl -s localhost:5080/emails -H "authorization: Bearer $ACCESS"
```

### Run the mobile app

```bash
docker compose up mobile      # Expo dev server on :8081
# or, natively: npm run dev:mobile
```

**Note for Android Emulator**: set `MAILTRACKER_API_BASE_URL=http://10.0.2.2:5080` to reach the local API.

### Native (without Docker)

```bash
cp .env.example .env          # then set DATABASE_URL to a reachable Postgres
npm install
npm run build                 # builds shared + api (runs `prisma generate`)
npm run --prefix apps/api db:deploy
npm run dev:api               # http://localhost:5080
npm run dev:mobile            # in another terminal
```

## Project Structure

```
Mail-Tracker-App/
├── apps/
│   ├── api/                    # Node.js Express API
│   │   └── src/
│   │       ├── config/         # Environment configuration
│   │       ├── routes/         # API endpoints
│   │       ├── services/       # Business logic
│   │       └── middleware/     # Auth, error handling
│   │
│   └── mobile/                 # React Native app
│       └── src/
│           ├── screens/        # App screens (Swipe, Categories, etc.)
│           ├── components/     # Reusable UI components
│           ├── navigation/     # Navigation configuration
│           ├── stores/         # Zustand state management
│           ├── services/       # API, Gmail, storage services
│           └── config/         # App configuration
│
├── packages/
│   └── shared/                 # Shared TypeScript types & schemas
│
└── docs/
    ├── ARCHITECTURE.md         # Technical architecture
    └── SHIPPING.md             # Build & deployment guide
```

## API Reference

### Authentication

Authenticated endpoints require a session access token:
```http
Authorization: Bearer <accessToken>
```
Obtain it from `POST /auth/google`. There is no shared secret. The user id is
derived from the token server-side and is never accepted from the request body.

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Health check |
| POST | `/auth/google` | — | Verify Google ID token → issue session (access + refresh) |
| POST | `/auth/refresh` | — | Rotate refresh token → new session |
| POST | `/auth/logout` | — | Revoke a session |
| POST | `/sync/run` | ✔ | Server-side pull sync (Gmail → Postgres) + enqueue categorization |
| GET | `/emails` | ✔ | Read the inbox (paged, newest first) |
| GET | `/emails/insights` | ✔ | Inbox summary (SQL aggregation + AI) |
| POST | `/sync/swipes` | ✔ | Record a swipe decision |
| POST | `/ai/categorize` | ✔ | Categorize a single email |
| POST | `/ai/categorize-batch` | ✔ | Categorize multiple emails (concurrency: 4) |
| POST | `/push/register` | ✔ | Register an FCM push token |

## Environment Variables

See [`.env.example`](.env.example) for the full, documented list. Highlights:

```env
# Database (Postgres) — docker-compose sets this to the `db` service automatically
DATABASE_URL=postgres://mailtracker:mailtracker@localhost:5432/mailtracker

# Session / auth
SESSION_JWT_SECRET=dev-session-secret-change-me
TOKEN_ENC_KEY=<32-byte base64 key>            # AES-256-GCM for the stored Gmail refresh token
DEV_TRUST_UNVERIFIED_GOOGLE=true              # dev only; blocked in production

# Google OAuth (server verifies ID token + refreshes Gmail tokens)
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=

# Azure OpenAI (optional; falls back to a stub categorizer)
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_DEPLOYMENT=

# Mobile → API (no client secret is bundled into the app)
MAILTRACKER_API_BASE_URL=http://localhost:5080
GMAIL_OAUTH_CLIENT_ID_ANDROID=
GMAIL_OAUTH_CLIENT_ID_IOS=
```

## Building for Production

### EAS Build (Recommended)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for development
cd apps/mobile
eas build --profile development --platform android
eas build --profile development --platform ios

# Build for production (App Store / Play Store)
eas build --profile production --platform android
eas build --profile production --platform ios
```

See [`docs/SHIPPING.md`](docs/SHIPPING.md) for detailed deployment instructions.

## Development Commands

```bash
# Docker (recommended)
docker compose up -d db api          # Postgres + API (auto-migrates)
docker compose up mobile             # Expo dev server
docker compose logs -f api           # tail API logs

# Root npm commands
npm run build                        # Build shared + api (runs `prisma generate`)
npm run dev:api                      # Start API server (tsx watch)
npm run dev:mobile                   # Start Expo dev server
npm run typecheck                    # Type check shared + api

# Database (Prisma)
npm run --prefix apps/api db:migrate # Create + apply a migration (dev)
npm run --prefix apps/api db:deploy  # Apply committed migrations
npm run --prefix apps/api db:studio  # Browse data in Prisma Studio
```

## Documentation

- **[Architecture](docs/ARCHITECTURE.md)** — Security boundaries, data flow, and technical decisions
- **[Shipping Guide](docs/SHIPPING.md)** — EAS Build, Firebase setup, app store deployment

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License — see LICENSE file for details.

---

**Built with ❤️ for inbox zero enthusiasts**