# Backend API Walkthrough

This note explains the backend.

## What The Backend Is Responsible For

The backend does server-side work that should not be done directly inside the mobile app:

- Keep Azure OpenAI API keys off the phone.
- Call Azure OpenAI for categorization/insights.
- Optionally sync data to Firebase using Firebase Admin credentials.
- Optionally send push notifications through Firebase Cloud Messaging.
- Validate incoming requests.
- Apply basic security middleware.

## Startup

File:

`apps/api/src/index.ts`

This starts the server.

It reads:

- host
- port
- environment
- auth settings

Then it logs that the API is listening.

Default API port is `5080`.

## Express App

File:

`apps/api/src/app.ts`

This creates the Express application.

Middleware used:

- `helmet`
  - Adds safer HTTP headers.

- `cors`
  - Controls which origins can call the API from browsers.

- `express.json`
  - Lets the server read JSON request bodies.

- `pino-http`
  - Logs HTTP requests.

- shared secret auth middleware
  - Protects most routes except `/health`.

Routes mounted:

- `/health`
- `/ai`
- `/sync`
- `/push`

## Environment Config

File:

`apps/api/src/config/env.ts`

This reads environment variables and validates them with Zod.

Important variables:

- `API_PORT`
- `API_HOST`
- `API_AUTH_SHARED_SECRET`
- `CORS_ORIGINS`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_DEPLOYMENT`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_DATABASE_URL`

The config also computes booleans:

- `azureOpenAi.isConfigured`
- `firebase.isConfigured`

Those booleans let the app gracefully fall back when optional services are not configured.

## AI Routes

File:

`apps/api/src/routes/ai.ts`

Routes:

- `POST /ai/categorize`
  - Categorizes one email.

- `POST /ai/categorize-batch`
  - Categorizes many emails.
  - Uses concurrency limit of 4, meaning it processes up to 4 at a time.

- `POST /ai/insights`
  - Generates an inbox summary.

Before doing work, these routes parse the request body with Zod schemas from `packages/shared`.

## Categorization Service

File:

`apps/api/src/services/categorizer.ts`

This creates a prompt for Azure OpenAI.

Allowed categories:

- Work
- Personal
- Promotions
- Social
- Updates
- Forums
- Important
- Finance
- Security
- General

If Azure OpenAI is configured:

1. Build a chat completion request.
2. Send it to Azure.
3. Parse the JSON response.
4. Normalize the category.
5. Return category, confidence, reason, and `available: true`.

If Azure OpenAI is not configured:

1. Use the stub categorizer.
2. Return a fallback result.

This is good for local development because the app can still run without paid AI setup.

## Azure OpenAI Service

File:

`apps/api/src/services/azureOpenAi.ts`

This builds the Azure OpenAI URL:

```text
{endpoint}/openai/deployments/{deployment}/chat/completions?api-version={apiVersion}
```

It sends:

- method: `POST`
- header: `api-key`
- JSON body
- timeout: 20 seconds

It returns either:

- `{ ok: true, content }`
- `{ ok: false, status, body }`

## Sync Routes

File:

`apps/api/src/routes/sync.ts`

Routes:

- `POST /sync/emails`
  - Writes email metadata to Firebase Realtime Database.

- `POST /sync/swipes`
  - Writes a swipe decision to Firebase.

If Firebase is not configured, these routes return HTTP `503`.

That means "service unavailable", not necessarily a code crash.

## Firebase Admin

File:

`apps/api/src/services/firebaseAdmin.ts`

This lazily initializes Firebase Admin.

Lazily means it waits until Firebase is actually needed instead of initializing during server startup.

Why this is useful:

- The backend can still run without Firebase env vars.
- Local development is easier.
- Startup avoids failing just because optional Firebase setup is missing.

## Shared Secret Auth

File:

`apps/api/src/middleware/sharedSecretAuth.ts`

This middleware protects API routes using the `X-Api-Secret` header when `API_AUTH_SHARED_SECRET` is configured.

Important:

- `/health` skips auth.
- Other API routes require the header if shared-secret auth is enabled.

## Error Handler

File:

`apps/api/src/middleware/errorHandler.ts`

This centralizes error responses.

Why that matters:

- Route files can call `next(error)`.
- One handler formats the final response.
- Production can avoid leaking full stack traces.

