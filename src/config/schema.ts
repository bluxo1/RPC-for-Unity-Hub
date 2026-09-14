import { z } from 'zod';

const bundledClientId =
  process.env.UNITY_HUB_RPC_CLIENT_ID ?? '1545892869363998771';
// Each poll enumerates processes (~0.8s on Windows) and Discord rate-limits activity
// updates to a handful per 20s, so polling faster than this only burns CPU.
const DEFAULT_INTERVAL_MS = 15000;
export const configSchema = z.object({
  discordClientId: z.string().regex(/^\d{6,}$/),
  updateIntervalMs: z.number().int().min(250).default(DEFAULT_INTERVAL_MS),
  showSceneName: z.boolean().default(true),
  showProjectPath: z.boolean().default(false),
  idleTimeoutMinutes: z.number().min(0).default(5),
  customStatusFormat: z.string().min(1).default('{project} — Unity {version}'),
});
export type AppConfig = z.infer<typeof configSchema>;
export const defaultConfig: AppConfig = {
  discordClientId: bundledClientId,
  updateIntervalMs: DEFAULT_INTERVAL_MS,
  showSceneName: true,
  showProjectPath: false,
  idleTimeoutMinutes: 5,
  customStatusFormat: '{project} — Unity {version}',
};
