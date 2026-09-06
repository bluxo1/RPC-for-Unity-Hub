import { appendFile, mkdir } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import { dirname, join } from 'node:path';

const logPath = platform() === 'win32'
  ? join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'UnityHubRPC', 'unity-hub-rpc.log')
  : join(process.env.XDG_STATE_HOME ?? join(homedir(), '.local', 'state'), 'unity-hub-rpc', 'unity-hub-rpc.log');

export async function log(message: string, error?: unknown): Promise<void> {
  const suffix = error instanceof Error ? ` ${error.stack ?? error.message}` : '';
  const line = `[${new Date().toISOString()}] ${message}${suffix}\n`;
  try {
    await mkdir(dirname(logPath), { recursive: true });
    await appendFile(logPath, line, 'utf8');
  } catch {
    // Logging must never stop the daemon.
  }
  if (process.env.UNITY_HUB_RPC_CONSOLE === '1') console.error(line.trimEnd());
}

export function getLogPath(): string { return logPath; }
