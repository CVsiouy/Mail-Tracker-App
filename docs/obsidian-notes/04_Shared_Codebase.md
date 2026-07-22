# 🔗 Shared Codebase & Contracts

Inside your project, there is a special folder: `packages/shared`. This folder is compiled into a shared package called `@mailtracker/shared` which is imported by **both** the mobile app and the backend server.

Let's explore why this exists and what it does.

---

## 💡 Why Share Code? (The DRY Principle)
In programming, there is a golden rule: **DRY**—**D**on't **R**epeat **Y**ourself.

Imagine the mobile app wants to send an email to the server for AI categorization. The app needs to send a request containing:
- `messageId` (string)
- `from` (string)
- `subject` (string)
- `snippet` (string)

If the mobile app is written in one workspace, and the backend in another, you would have to write the rules defining this object twice: once on the mobile side (to construct it), and once on the server side (to check and read it). 

If you decide to rename `messageId` to `id` in the future, you have to remember to change it in two different codebases. If you forget one, the app crashes!

**The solution**: Define the structure **once** in `packages/shared`, and import it on both sides.

---

## 🛡️ Data Validation with Zod
How does the server know that the data sent by the phone isn't corrupted, malicious, or missing required fields? We use a library called **Zod**.

Zod is a **schema validation** library. Think of a Zod schema as a strict contract or blueprint.

For example, in `packages/shared/src/schemas.ts`, we define the blueprint for categorizing an email:

```typescript
export const categorizeEmailRequestSchema = z.object({
  messageId: z.string().min(1), // Must be a string, at least 1 character long
  from: z.string(),              // Must be a string
  subject: z.string(),           // Must be a string
  snippet: z.string(),           // Must be a string
});
```

- When the backend receives a request, it calls `categorizeEmailRequestSchema.parse(req.body)`.
- If the phone sent a number instead of a string, or forgot to send the `messageId`, Zod immediately catches the error and rejects the request. This keeps the backend secure and prevents bugs!

---

## 📑 Shared Files Breakdown

### 1. `allowedCategories.ts`
Defines the list of categories that the AI can output:
- `Work`, `Personal`, `Promotions`, `Social`, `Updates`, `Forums`, `Important`, `Finance`, `Security`, `General`.
By sharing this list, the mobile app knows exactly what colors to use to paint the UI pill tags, and the backend knows exactly what prompt categories to send to Azure OpenAI!

### 2. `schemas.ts`
Defines the structures of all requests and responses:
- `CategorizeEmailRequest` & `CategorizeEmailResponse` (single email categorization).
- `InsightsRequest` & `InsightsResponse` (summarizing inbox stats).
- It also includes a utility function `normalizeAiCategory` which guarantees that even if the AI outputs something strange (like `"work "` with a space or `"WORK"` in uppercase), it gets cleaned up into our official category title (`"Work"`).

---

## 🔗 Next Steps
- See these contracts in action by tracing the data flows in **[[05_Step_by_Step_Workflows]]**.
