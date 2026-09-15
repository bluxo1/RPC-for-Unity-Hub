import { DiscordClient } from './discord/client.js';
import { loadConfig } from './config/loader.js';
import { watchConfig } from './config/watcher.js';
import type { AppConfig } from './config/schema.js';
import { UnityHubMonitor } from './state/unityHubMonitor.js';
import { IdlePolicy } from './presence/idlePolicy.js';
import type { UnityHubState } from './presence/transformer.js';
import { createTray, type TrayController } from './tray/tray.js';
import { APP_VERSION } from './version.js';
import { getLogPath, log } from './logging/logger.js';

const CONFIG_PATH = process.env.UNITY_HUB_RPC_CONFIG ?? 'config.json';

function tooltipFor(state: UnityHubState): string {
  if (!state.project) return 'Idle — no project active';
  const version = state.version ?? 'unknown';
  return `${state.project} — Unity ${version}`;
}

async function main(): Promise<void> {
  const path = CONFIG_PATH;
  let config: AppConfig = await loadConfig(path);

  let discord = new DiscordClient(config.discordClientId);
  const idle = new IdlePolicy(config.idleTimeoutMinutes);
  let tray: TrayController | null = null;

  const presenceOptions = (): {
    showSceneName: boolean;
    showProjectPath: boolean;
    format: string;
  } => ({
    showSceneName: config.showSceneName,
    showProjectPath: config.showProjectPath,
    format: config.customStatusFormat,
  });

  const onState = async (state: UnityHubState): Promise<void> => {
    const action = idle.decide(state, presenceOptions(), Date.now());
    if (action.kind === 'clear') {
      await discord.clear();
      tray?.setStatus('idle', tooltipFor(state));
      return;
    }
    const reachable = await discord.update(action.presence);
    // No project plus an unreachable Discord is still "idle" to the user; an error icon
    // would nag about a client they may simply not have open.
    const status = !reachable
      ? state.project
        ? 'error'
        : 'idle'
      : state.project
        ? 'connected'
        : 'idle';
    tray?.setStatus(status, tooltipFor(state));
  };

  const monitor = new UnityHubMonitor(onState, config.updateIntervalMs);

  const shutdown = async (): Promise<void> => {
    monitor.stop();
    await watcher.close();
    tray?.close();
    await discord.destroy();
    await log('Unity Hub RPC stopped');
    process.exit(0);
  };

  tray = await createTray({
    version: APP_VERSION,
    configPath: path,
    logPath: getLogPath(),
    onReload: () => void reload(),
    onExit: () => void shutdown(),
  });

  const reload = async (): Promise<void> => {
    const next = await loadConfig(path);
    // A client id change means a different Discord application, so the IPC session
    // has to be torn down rather than reused.
    if (next.discordClientId !== config.discordClientId) {
      await discord.destroy();
      discord = new DiscordClient(next.discordClientId);
    }
    if (next.updateIntervalMs !== config.updateIntervalMs) {
      monitor.setIntervalMs(next.updateIntervalMs);
    }
    idle.setTimeoutMinutes(next.idleTimeoutMinutes);
    config = next;
    await log('Configuration reloaded');
    tray?.setStatus('idle', 'Configuration reloaded');
  };

  const watcher = watchConfig(
    path,
    () => void reload(),
    (reason) =>
      void log(`Config reload rejected; keeping current settings: ${reason}`),
  );

  monitor.start();
  await log(`Unity Hub RPC ${APP_VERSION} started`);

  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
}

void main().catch((error: unknown) => {
  void log('Unity Hub RPC failed to start', error).finally(() =>
    process.exit(1),
  );
});
