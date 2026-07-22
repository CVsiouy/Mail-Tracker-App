import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Resolve repo-root `.env` for local dev. Production should inject env vars and may omit the file.
 */
export function resolveDotEnvPath(): string | undefined {
  const fromEnv = process.env.MAILTRACKER_ENV_FILE?.trim();
  if (fromEnv && existsSync(fromEnv)) return resolve(fromEnv);

  let dir = process.cwd();
  for (let i = 0; i < 12; i++) {
    const candidate = join(dir, ".env");
    if (existsSync(candidate)) return candidate;
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }

  return undefined;
}
