import { appConfig } from "../config/env.js";
import { logger } from "../logger.js";

export type ChatCompletionMessage = { role: "system" | "user"; content: string };

export async function postChatCompletion(body: unknown): Promise<{ ok: true; content: string } | { ok: false; status: number; body: string }> {
  const { endpoint, apiKey, deployment, apiVersion } = appConfig.azureOpenAi;
  if (!endpoint || !apiKey || !deployment) {
    return { ok: false, status: 500, body: "not configured" };
  }

  const url = `${endpoint.replace(/\/$/, "")}/openai/deployments/${deployment}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      logger.warn({ status: res.status, body: text.slice(0, 500) }, "Azure OpenAI non-success");
      return { ok: false, status: res.status, body: text };
    }
    let content = "";
    try {
      const json = JSON.parse(text) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      content = json.choices?.[0]?.message?.content ?? "";
    } catch {
      return { ok: false, status: 502, body: "invalid json from provider" };
    }
    return { ok: true, content };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return { ok: false, status: 504, body: "timeout" };
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}
