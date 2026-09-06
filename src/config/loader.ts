import { readFile } from 'node:fs/promises';
import { configSchema, defaultConfig, type AppConfig } from './schema.js';

export async function loadConfig(path = 'config.json'): Promise<AppConfig> {
  try {
    const raw = JSON.parse(await readFile(path, 'utf8')) as unknown;
    const result = configSchema.safeParse(raw);
    if (result.success) return result.data;
    console.warn('Invalid config.json; using defaults.', result.error.flatten().fieldErrors);
  } catch {
    // First run is intentionally zero-config.
  }
  return defaultConfig;
}
