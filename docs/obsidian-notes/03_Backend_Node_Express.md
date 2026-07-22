# ⚙️ Backend: API Server (Node.js & Express)

The folder `apps/api` contains the backend server program. It is written in **TypeScript** (JavaScript with types) and runs on **Node.js** using the **Express** framework.

---

## 💡 What are Node.js and Express?
- **Node.js**: A tool that allows developers to run JavaScript code outside of a web browser (e.g. directly on a computer or server).
- **Express**: A fast, minimal framework for Node.js that helps developers write APIs. It makes it easy to say: "When a phone sends a POST request to `/ai/categorize`, run this function."

---

## 📂 Backend Project Layout

Here is the directory structure inside `apps/api/src/`:

```text
apps/api/src/
├── config/        # Reads and validates settings from your root `.env`
├── middleware/    # Checkpoints that incoming requests must pass through
├── routes/        # Defines the URLs (endpoints) the phone can call
├── services/      # Code that talks to external services (AI, Firebase, etc.)
├── app.ts         # Assembles the server configuration, middleware, and routes
└── index.ts       # The entry point that boots up the server
```

---

## 🛡️ Middleware: The Checkpoints
Before a request reaches an API route, it travels through **middleware**. Think of middleware as security guards or checkpoints in a building:

1. **`helmet`**: A security guard that adds standard safety headers to prevent common web attacks.
2. **`cors`**: Checks if the request is coming from an allowed device or website.
3. **`express.json`**: Reads the incoming data and makes sure it's formatted as a clean JSON object (so JavaScript can read it).
4. **`pinoHttp`**: Logs every incoming request to the terminal so developers can see what's happening.
5. **`sharedSecretAuth`**: Checks the header `X-Api-Secret`. If the phone doesn't provide the secret matching the one in your `.env` file, the guard rejects the request immediately with a `401 Unauthorized` error.

---

## 🤖 The AI Services (Azure OpenAI)
The backend holds the API keys for Azure OpenAI. It provides two main features:

### 1. Email Categorization (`categorizer.ts`)
When a card is loaded, the phone sends the sender, subject, and preview snippet of the email.
- **The Prompt**: The backend constructs a message telling the AI:
  > "You are an email triage assistant. Classify the email into exactly one of these categories: Work, Personal, Promotions, Social, Updates, Forums, Important, Finance, Security, General. Respond with JSON only, shape: `{"category":"<category>","confidence":<0..1>,"reason":"<short>"}`."
- **The Stub Fallback (`stubCategorizer.ts`)**: If you haven't filled in your Azure OpenAI keys in the `.env` file, the server won't crash! Instead, it runs a list of local rules (e.g. "if the email contains 'unsubscribe', mark it as 'Promotions'"). This is a robust engineering practice called **graceful degradation**.

### 2. Email Summaries (`insights.ts`)
When you request Insights, the phone sends up to 40 emails. The backend asks OpenAI to write a short two-sentence summary and highlight up to 5 bullet points of what's happening in your inbox.
- If AI is offline, it falls back to a **local summary** that calculates stats locally (e.g. "You have 12 emails across 3 categories").

---

## 🔄 Firebase Integration (`firebaseAdmin.ts`)
Your server uses `firebase-admin` to talk to Google Firebase in the cloud.
- **Database Sync (`routes/sync.ts`)**: When the phone app receives new emails or records swipes, it sends them to `/sync/emails` and `/sync/swipes`. The backend saves these to the **Firebase Realtime Database**. This lets you access your data on another device instantly.
- **Push Notifications (`routes/push.ts`)**: If a new email arrives, the server can use Firebase Cloud Messaging (FCM) to trigger a push notification on your phone.

---

## 🔗 Next Steps
- Learn how the mobile app and server share code in **[[04_Shared_Codebase]]**.
- Review the step-by-step swipe workflow in **[[05_Step_by_Step_Workflows]]**.
