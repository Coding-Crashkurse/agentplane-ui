import { configSchema, type AppConfig } from './schema';

export class ConfigError extends Error {}

/**
 * Fetches /config.json before first render (SPEC §3). All environment-specific
 * values come from here at runtime: never from import.meta.env.
 */
export async function loadConfig(): Promise<AppConfig> {
  const url = new URL('/config.json', window.location.origin);
  let response: Response;
  try {
    response = await fetch(url, { cache: 'no-store' });
  } catch {
    throw new ConfigError('config.json could not be fetched: is the server serving it?');
  }
  if (!response.ok) {
    throw new ConfigError(`config.json could not be loaded (HTTP ${response.status}).`);
  }
  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new ConfigError('config.json is not valid JSON.');
  }
  const parsed = configSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new ConfigError(`config.json is invalid: ${issues}`);
  }
  return parsed.data;
}
