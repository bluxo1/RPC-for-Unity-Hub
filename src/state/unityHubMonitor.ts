import { basename } from 'node:path';
import type { UnityHubState } from '../presence/transformer.js';
import {
  readProjectVersion,
  readUnityRuntime,
  type UnityRuntime,
} from './unityProcess.js';

/**
 * Discord renders `startTimestamp` as a live counter, so it has to stay fixed for as long
 * as the same project stays open — recomputing it each poll pins the timer at 00:00.
 */
export class ProjectSessionClock {
  private key: string | null = null;
  private startedAt = 0;

  anchor(projectKey: string | null, now: number): number {
    if (!projectKey) {
      this.key = null;
      return now;
    }
    if (this.key !== projectKey) {
      this.key = projectKey;
      this.startedAt = now;
    }
    return this.startedAt;
  }
}

export async function toUnityState(
  runtime: UnityRuntime,
  clock: ProjectSessionClock,
  now: number,
): Promise<UnityHubState> {
  const editor = runtime.editor;
  if (!editor) {
    return {
      project: null,
      version: null,
      scene: null,
      projectPath: null,
      unityHubRunning: runtime.hubRunning,
      timestamp: clock.anchor(null, now),
    };
  }
  const version =
    editor.version ?? (await readProjectVersion(editor.projectPath));
  return {
    project: basename(editor.projectPath) || editor.projectPath,
    version,
    // The editor does not publish its active scene; that needs an in-editor script.
    scene: null,
    projectPath: editor.projectPath,
    unityHubRunning: true,
    timestamp: clock.anchor(editor.projectPath, now),
  };
}

export async function readUnityState(
  clock: ProjectSessionClock,
  now = Date.now() / 1000,
): Promise<UnityHubState> {
  return toUnityState(await readUnityRuntime(), clock, now);
}

export class UnityHubMonitor {
  private timer?: NodeJS.Timeout;
  private polling = false;
  private readonly clock = new ProjectSessionClock();
  constructor(
    private readonly onState: (state: UnityHubState) => void,
    private readonly intervalMs = 15000,
  ) {}

  start(): void {
    void this.poll();
    this.timer = setInterval(() => void this.poll(), this.intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async poll(): Promise<void> {
    // Enumerating processes can outlast a short interval; overlapping scans would only pile up.
    if (this.polling) return;
    this.polling = true;
    try {
      this.onState(await readUnityState(this.clock));
    } finally {
      this.polling = false;
    }
  }
}
