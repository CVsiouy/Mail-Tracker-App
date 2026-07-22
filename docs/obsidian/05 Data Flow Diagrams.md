# Data Flow Diagrams

These diagrams show how data moves.

## App Startup

```mermaid
flowchart TD
  Start["Open mobile app"] --> App["App.tsx"]
  App --> Root["RootNavigator"]
  Root --> AuthStore["useAuthStore"]
  AuthStore --> HasTokens{"Valid saved tokens?"}
  HasTokens -->|No| Onboarding["Show OnboardingScreen"]
  HasTokens -->|Yes| MainTabs["Show MainTabs"]
```

## Gmail Sign-In

```mermaid
sequenceDiagram
  participant User
  participant Mobile
  participant Google
  participant SecureStore

  User->>Mobile: Tap "Sign in with Gmail"
  Mobile->>Google: Start OAuth flow
  Google-->>User: Show consent screen
  User->>Google: Approve permissions
  Google-->>Mobile: Return access/refresh tokens
  Mobile->>SecureStore: Save tokens
  Mobile-->>User: Show main app
```

## Loading Emails

```mermaid
sequenceDiagram
  participant SwipeScreen
  participant InboxStore
  participant SQLite
  participant Gmail

  SwipeScreen->>InboxStore: loadEmails()
  InboxStore->>SQLite: Try cached emails
  SQLite-->>InboxStore: Cached emails if any
  InboxStore-->>SwipeScreen: Show cached emails
  InboxStore->>Gmail: Fetch fresh messages
  Gmail-->>InboxStore: Message list + details
  InboxStore->>SQLite: Save email metadata
  InboxStore-->>SwipeScreen: Show fresh emails
```

## AI Categorization

```mermaid
sequenceDiagram
  participant Mobile
  participant API
  participant Azure

  Mobile->>API: POST /ai/categorize-batch
  API->>API: Validate request with Zod
  API->>Azure: Send prompt + email snippets
  Azure-->>API: Category JSON
  API->>API: Normalize category
  API-->>Mobile: Category results
  Mobile->>Mobile: Update screen state and SQLite
```

## Swiping An Email

```mermaid
sequenceDiagram
  participant User
  participant SwipeScreen
  participant InboxStore
  participant Gmail
  participant SQLite
  participant API
  participant Firebase

  User->>SwipeScreen: Swipe card
  SwipeScreen->>InboxStore: swipeEmail(index, decision)
  InboxStore-->>SwipeScreen: Remove card optimistically
  InboxStore->>Gmail: Apply action
  Gmail-->>InboxStore: Success
  InboxStore->>SQLite: Update local cache
  InboxStore->>API: POST /sync/swipes
  API->>Firebase: Save swipe decision
```

If Gmail action fails, `useInboxStore.ts` tries to put the email back into the list.

## Backend Request Flow

```mermaid
flowchart TD
  Request["Incoming HTTP request"] --> Helmet["helmet"]
  Helmet --> Cors["cors"]
  Cors --> Json["express.json"]
  Json --> Logger["pino-http"]
  Logger --> Health{"Is /health?"}
  Health -->|Yes| HealthRoute["health route"]
  Health -->|No| Secret["shared secret auth"]
  Secret --> Routes["/ai, /sync, /push"]
  Routes --> ErrorHandler["error handler if needed"]
```

