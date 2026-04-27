/** Must stay aligned with legacy AzureOpenAiEmailCategorizer.AllowedCategories. */
export const ALLOWED_AI_CATEGORIES = [
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
] as const;

export type AllowedAiCategory = (typeof ALLOWED_AI_CATEGORIES)[number];
