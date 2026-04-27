import {
  type CategorizeEmailRequest,
  type CategorizeEmailResponse,
  normalizeAiCategory,
} from "@mailtracker/shared";
import { appConfig } from "../config/env.js";
import { logger } from "../logger.js";
import { postChatCompletion } from "./azureOpenAi.js";
import { degradedResponse, stubCategorize } from "./stubCategorizer.js";

function buildCategorizePayload(request: CategorizeEmailRequest) {
  const allowed = [
    "Work",
    "Personal",
    "Promotions",
    "Social",
    "Updates",
    "Forums",
    "Important",
    "Finance",
    "Security",
    "General",
  ].join(", ");
  const systemPrompt =
    "You are an email triage assistant. " +
    `Classify the email into exactly one of these categories: ${allowed}. ` +
    'Respond with JSON only, shape: ' +
    '{"category":"<one of the list>","confidence":<0..1>,"reason":"<short>"}. ' +
    "No prose, no markdown.";
  const userPrompt = `From: ${request.from}\nSubject: ${request.subject}\nSnippet: ${request.snippet}`;
  return {
    messages: [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ],
    temperature: 0,
    max_tokens: 150,
    response_format: { type: "json_object" },
  };
}

function parseModelOutput(messageId: string, content: string): CategorizeEmailResponse {
  try {
    const root = JSON.parse(content) as {
      category?: string;
      confidence?: number;
      reason?: string;
    };
    const category = normalizeAiCategory(root.category);
    const confidence =
      typeof root.confidence === "number" && Number.isFinite(root.confidence) ? root.confidence : 0.5;
    const reason = root.reason ?? null;
    return { messageId, category, confidence, reason, available: true };
  } catch {
    return degradedResponse(messageId);
  }
}

export async function categorizeEmail(request: CategorizeEmailRequest): Promise<CategorizeEmailResponse> {
  if (!appConfig.azureOpenAi.isConfigured) {
    return stubCategorize(request, false);
  }

  try {
    const result = await postChatCompletion(buildCategorizePayload(request));
    if (!result.ok) {
      return stubCategorize(request, true);
    }
    return parseModelOutput(request.messageId, result.content);
  } catch (e) {
    logger.error({ err: e, messageId: request.messageId }, "Azure OpenAI categorization failed");
    return degradedResponse(request.messageId);
  }
}
