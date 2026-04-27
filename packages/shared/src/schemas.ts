import { z } from "zod";
import { ALLOWED_AI_CATEGORIES } from "./allowedCategories.js";

export const categorizeEmailRequestSchema = z.object({
  messageId: z.string().min(1),
  from: z.string(),
  subject: z.string(),
  snippet: z.string(),
});

export type CategorizeEmailRequest = z.infer<typeof categorizeEmailRequestSchema>;

export const categorizeEmailResponseSchema = z.object({
  messageId: z.string(),
  category: z.string(),
  confidence: z.number(),
  reason: z.string().nullable(),
  available: z.boolean(),
});

export type CategorizeEmailResponse = z.infer<typeof categorizeEmailResponseSchema>;

export const insightEmailItemSchema = z.object({
  messageId: z.string(),
  from: z.string(),
  subject: z.string(),
  snippet: z.string(),
  category: z.string(),
});

export const insightsRequestSchema = z.object({
  emails: z.array(insightEmailItemSchema),
});

export type InsightsRequest = z.infer<typeof insightsRequestSchema>;
export type InsightEmailItem = z.infer<typeof insightEmailItemSchema>;

export const insightsResponseSchema = z.object({
  summary: z.string(),
  highlights: z.array(z.string()),
  available: z.boolean(),
});

export type InsightsResponse = z.infer<typeof insightsResponseSchema>;

/** Runtime check for model-returned category strings. */
export function normalizeAiCategory(value: string | null | undefined): string {
  if (!value?.trim()) return "General";
  const match = ALLOWED_AI_CATEGORIES.find(
    (c: (typeof ALLOWED_AI_CATEGORIES)[number]) => c.toLowerCase() === value.trim().toLowerCase(),
  );
  return match ?? "General";
}
