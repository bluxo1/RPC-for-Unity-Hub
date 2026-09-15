import { readFile } from 'node:fs/promises';
import { configSchema, defaultConfig, type AppConfig } from './schema.js';

export type ConfigResult =
  { ok: true; config: AppConfig } | { ok: false; reason: string };

/**
 * Separated from `loadConfig` so hot reload can tell "this file is broken" from
 * "there is no file". Silently substituting defaults is right on first run, but during a
 * reload it would throw away a working config because of one half-typed edit.
 */
export async function readConfig(path: string): Promise<ConfigResult> {
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch {
    // First run is intentionally zero-config.
    return { ok: true, config: defaultConfig };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'invalid JSON',
    };
  }
  const result = configSchema.safeParse(parsed);
  if (result.success) return { ok: true, config: result.data };
  return {
    ok: false,
    reason: JSON.stringify(result.error.flatten().fieldErrors),
  };
}

export async function loadConfig(path = 'config.json'): Promise<AppConfig> {
  const result = await readConfig(path);
  if (result.ok) return result.config;
  console.warn(`Invalid ${path}; using defaults. ${result.reason}`);
  return defaultConfig;
}
