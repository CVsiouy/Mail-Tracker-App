import type { CategorizeEmailRequest, CategorizeEmailResponse } from "@mailtracker/shared";

export function stubCategorize(
  request: CategorizeEmailRequest,
  azureConfigured: boolean,
): CategorizeEmailResponse {
  const haystack = `${request.subject} ${request.snippet}`.toLowerCase();
  let category = "General";
  let confidence = 0.4;

  if (haystack.includes("invoice") || haystack.includes("receipt") || haystack.includes("payment")) {
    category = "Finance";
    confidence = 0.75;
  } else if (haystack.includes("unsubscribe") || haystack.includes("sale") || haystack.includes("% off")) {
    category = "Promotions";
    confidence = 0.8;
  } else if (haystack.includes("meeting") || haystack.includes("calendar") || haystack.includes("invite")) {
    category = "Work";
    confidence = 0.7;
  } else if (haystack.includes("otp") || haystack.includes("verify") || haystack.includes("security")) {
    category = "Security";
    confidence = 0.9;
  }

  const reason = azureConfigured
    ? "Stub classifier — Azure OpenAI credentials present but call failed or was skipped."
    : "Stub classifier — set AZURE_OPENAI_* in root `.env` to enable cloud categorization.";

  return {
    messageId: request.messageId,
    category,
    confidence,
    reason,
    available: true,
  };
}

export function degradedResponse(messageId: string): CategorizeEmailResponse {
  return {
    messageId,
    category: "Uncategorized",
    confidence: 0,
    reason: "AI backend unavailable",
    available: false,
  };
}
