# Glossary For Beginners

## API

An API is a way for programs to talk to each other.

In this project:

- The mobile app calls Gmail's API.
- The mobile app calls your backend API.
- The backend calls Azure OpenAI's API.
- The backend calls Firebase's API.

## Backend

A backend is code that runs on a server, not on the user's phone.

Here, `apps/api` is the backend.

## Frontend

The frontend is the part the user sees and interacts with.

Here, `apps/mobile` is the frontend/mobile app.

## TypeScript

TypeScript is JavaScript with types.

Types help catch mistakes before the app runs.

Example:

```ts
type SwipeDecision = "archive" | "keep" | "trash" | "star";
```

This means a swipe decision must be one of those four strings.

## React Native

React Native lets you build mobile apps using React concepts.

Instead of writing Android Java/Kotlin and iOS Swift separately, you write mostly TypeScript/JavaScript.

## Expo

Expo is tooling around React Native.

It helps with:

- running the app during development
- building Android/iOS apps
- accessing native features through packages

## Component

A component is a reusable UI function.

Example:

`EmailCard` is a component because it displays one email card.

## Props

Props are inputs passed into a component.

Example idea:

```tsx
<EmailCard email={email} isTopCard={true} />
```

`email` and `isTopCard` are props.

## State

State is data that can change while the app is running.

Examples:

- Is the user signed in?
- Which emails are loaded?
- Is the app loading?
- Did an error happen?

## Zustand

Zustand is a state management library.

This app uses:

- `useAuthStore`
- `useInboxStore`

The word `use` is common in React hooks.

## Hook

A hook is a React function that lets components use state, effects, or other behavior.

Examples:

- `useEffect`
- `useState`
- `useRef`
- `useAuthStore`
- `useInboxStore`

## OAuth

OAuth is a login/permission system.

Instead of asking the user for their Gmail password, the app sends them to Google. Google returns tokens if the user approves.

## Access Token

A temporary key used to call Gmail.

## Refresh Token

A longer-lived key used to get a new access token.

## Secure Store

Secure storage on the phone.

This app uses `expo-secure-store` to save Gmail tokens.

## SQLite

SQLite is a small database stored inside the app/device.

This app uses it to cache email metadata locally.

## Firebase Realtime Database

A cloud database from Firebase.

This app optionally syncs email metadata and swipe actions to Firebase.

## Firebase Admin

Firebase Admin is the server-side SDK.

It should run on the backend, not in the mobile app, because it uses powerful credentials.

## Azure OpenAI

Microsoft Azure's hosted OpenAI service.

This backend calls Azure OpenAI to categorize emails and generate insights.

## Zod

Zod validates data at runtime.

TypeScript checks code while developing, but Zod checks actual incoming data when the app runs.

Example: making sure a request body has `messageId`, `from`, `subject`, and `snippet`.

## Express

Express is a Node.js web server framework.

It defines routes like:

- `GET /health`
- `POST /ai/categorize`
- `POST /sync/swipes`

## Middleware

Middleware is code that runs during a request before the final route handler.

Examples in this backend:

- security headers
- CORS
- JSON parsing
- logging
- shared-secret auth

## CORS

CORS controls which websites can call an API from a browser.

It matters more for web apps than mobile apps, but it is still configured here.

## Monorepo

A repository containing multiple projects/packages.

This repo contains:

- mobile app
- backend API
- shared package

## Package

A package is a Node/npm project with its own `package.json`.

This repo has packages at:

- root
- `apps/api`
- `apps/mobile`
- `packages/shared`

## Dependency

A dependency is third-party code installed through npm.

Examples:

- `express`
- `axios`
- `zod`
- `zustand`
- `expo`

## Build

Building converts TypeScript into JavaScript that Node can run.

The mobile app is usually run through Expo tooling instead of a simple TypeScript build.

## Lint

Linting checks code style and suspicious patterns.

This project uses ESLint.

## Typecheck

Typechecking asks TypeScript to verify that the code's types make sense.

