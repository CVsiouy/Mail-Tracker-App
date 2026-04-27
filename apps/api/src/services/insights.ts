import type { InsightEmailItem, InsightsRequest, InsightsResponse } from "@mailtracker/shared";
import { appConfig } from "../config/env.js";
import { logger } from "../logger.js";
import { postChatCompletion } from "./azureOpenAi.js";

function localSummary(request: InsightsRequest): InsightsResponse {
  if (request.emails.length === 0) {
    return { summary: "Your inbox is empty.", highlights: [], available: true };
  }

  const byCategory = new Map<string, InsightEmailItem[]>();
  for (const e of request.emails) {
    const key = e.category?.trim() ? e.category.trim() : "Uncategorized";
    const list = byCategory.get(key) ?? [];
    list.push(e);
    byCategory.set(key, list);
  }

  const sorted = [...byCategory.entries()].sort((a, b) => b[1].length - a[1].length);
  const top = sorted
    .slice(0, 3)
    .map(([k, v]) => `${v.length} ${k}`)
    .join(", ");
  const summary = `${request.emails.length} recent emails across ${sorted.length} categories (${top}).`;
  const highlights = sorted.slice(0, 5).map(([k, v]) => `${v.length} in ${k}: ${v[0]?.subject ?? ""}`);
  return { summary, highlights, available: true };
}

function degraded(): InsightsResponse {
  return {
    summary: "AI insights are currently unavailable.",
    highlights: [],
    available: false,
  };
}

function buildInsightsPayload(request: InsightsRequest) {
  const lines = request.emails.slice(0, 40).map((e) => `- [${e.category}] ${e.subject.trim()} (from ${e.from.trim()})`);
  return {
    messages: [
      {
        role: "system" as const,
        content:
          "You summarize a user's recent inbox. " +
          'Return JSON only with shape ' +
          '{"summary":"<two sentences>","highlights":["<up to 5 bullet strings>"]}. ' +
          "No prose, no markdown.",
      },
      {
        role: "user" as const,
        content: `Emails:\n${lines.join("\n")}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 400,
    response_format: { type: "json_object" },
  };
}

function parseInsights(content: string, request: InsightsRequest): InsightsResponse {
  try {
    const root = JSON.parse(content) as { summary?: string; highlights?: unknown };
    const summary = root.summary?.trim() ?? "";
    const highlights: string[] = [];
    if (Array.isArray(root.highlights)) {
      for (const item of root.highlights) {
        if (typeof item === "string" && item.trim()) highlights.push(item);
      }
    }
    if (!summary) return localSummary(request);
    return { summary, highlights, available: true };
  } catch {
    return localSummary(request);
  }
}

export async function summarizeInbox(request: InsightsRequest): Promise<InsightsResponse> {
  if (request.emails.length === 0) {
    return { summary: "Your inbox is empty.", highlights: [], available: true };
  }

  if (!appConfig.azureOpenAi.isConfigured) {
    return localSummary(request);
  }

  try {
    const result = await postChatCompletion(buildInsightsPayload(request));
    if (!result.ok) {
      return localSummary(request);
    }
    return parseInsights(result.content, request);
  } catch (e) {
    logger.error({ err: e }, "Azure OpenAI insights failed");
    return degraded();
  }
}
