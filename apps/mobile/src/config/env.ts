import Constants from "expo-constants";

export type MobileEnv = {
  mailtrackerApiBaseUrl: string;
};

/**
 * Single place that reads Expo `extra` (populated from root `.env` via `app.config.ts`).
 */
export function getMobileEnv(): MobileEnv {
  const extra = Constants.expoConfig?.extra as Partial<MobileEnv> | undefined;
  return {
    mailtrackerApiBaseUrl: extra?.mailtrackerApiBaseUrl ?? "http://localhost:5080",
  };
}
