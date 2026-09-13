import { DiscordClient } from './discord/client.js';
import { loadConfig } from './config/loader.js';
import { UnityHubMonitor } from './state/unityHubMonitor.js';
import { toPresence } from './presence/transformer.js';
import { log } from './logging/logger.js';

async function main(): Promise<void> {
  const config = await loadConfig(process.env.UNITY_HUB_RPC_CONFIG ?? 'config.json');
  const discord = new DiscordClient(config.discordClientId);
  const monitor = new UnityHubMonitor(
    (state) => void discord.update(toPresence(state, config.showSceneName, config.customStatusFormat)),
    config.updateIntervalMs,
  );
  monitor.start();
  void log('Unity Hub RPC started');

  const shutdown = (): void => {
    monitor.stop();
    void log('Unity Hub RPC stopped').finally(() => process.exit(0));
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

void main().catch((error: unknown) => {
  void log('Unity Hub RPC failed to start', error).finally(() => process.exit(1));
});
