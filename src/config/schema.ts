import { z } from 'zod';
export const configSchema = z.object({ discordClientId: z.string().regex(/^\d{6,}$/), updateIntervalMs: z.number().int().min(250).default(5000), showSceneName: z.boolean().default(true), showProjectPath: z.boolean().default(false), idleTimeoutMinutes: z.number().min(0).default(5), customStatusFormat: z.string().min(1).default('{project} — Unity {version}') });
export type AppConfig = z.infer<typeof configSchema>;
export const defaultConfig: AppConfig = { discordClientId: '1234567890123456789', updateIntervalMs: 5000, showSceneName: true, showProjectPath: false, idleTimeoutMinutes: 5, customStatusFormat: '{project} — Unity {version}' };
