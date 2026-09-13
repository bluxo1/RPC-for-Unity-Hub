import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { basename, join } from 'node:path';
import type { UnityHubState } from '../presence/transformer.js';

type JsonValue = unknown;

export function unityHubStatePaths(env: NodeJS.ProcessEnv = process.env): string[] {
  if (platform() === 'win32') {
    return [env.APPDATA, env.LOCALAPPDATA]
      .filter((root): root is string => Boolean(root))
      .flatMap((root) => [
        join(root, 'UnityHub', 'projects-v1.json'),
        join(root, 'UnityHub', 'editorv2.json'),
        join(root, 'UnityHub', 'projects.json'),
        join(root, 'UnityHub', 'editor'),
      ]);
  }
  if (platform() === 'darwin') {
    const root = join(homedir(), 'Library', 'Application Support', 'UnityHub');
    return [join(root, 'editor'), join(root, 'projects.json')];
  }
  const root = join(env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), 'UnityHub');
  return [join(root, 'editor'), join(root, 'projects.json')];
}

function firstString(data: JsonValue, keys: string[]): string | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  for (const key of keys) {
    const value = (data as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return null;
}

function documentsItems(document: JsonValue): JsonValue[] {
  if (Array.isArray(document)) return document.flatMap(documentsItems);
  if (!document || typeof document !== 'object') return [];
  return [document, ...Object.values(document).flatMap(documentsItems)];
}

export function parseUnityHubDocuments(documents: JsonValue[], timestamp = Date.now() / 1000): UnityHubState {
  let project: string | null = null;
  let version: string | null = null;
  let scene: string | null = null;
  let projectPath: string | null = null;
  for (const document of documents) {
    for (const item of documentsItems(document)) {
      projectPath ??= firstString(item, ['projectPath', 'path', 'location']);
      project ??= firstString(item, ['project', 'projectName', 'name', 'title']);
      version ??= firstString(item, ['version', 'unityVersion', 'editorVersion']);
      scene ??= firstString(item, ['scene', 'sceneName', 'activeScene']);
      if (projectPath && !project) project = basename(projectPath);
    }
  }
  return { project, version, scene, projectPath, unityHubRunning: documents.length > 0, timestamp };
}

async function readJson(path: string): Promise<JsonValue | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as JsonValue;
  } catch {
    return null;
  }
}

export async function readUnityHubState(paths = unityHubStatePaths()): Promise<UnityHubState> {
  const existing = paths.filter(existsSync);
  const documents = (await Promise.all(existing.map(readJson))).filter((value): value is JsonValue => value !== null);
  return parseUnityHubDocuments(documents);
}

export class UnityHubMonitor {
  private timer?: NodeJS.Timeout;
  constructor(private readonly onState: (state: UnityHubState) => void, private readonly intervalMs = 5000) {}

  start(): void {
    void this.poll();
    this.timer = setInterval(() => void this.poll(), this.intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async poll(): Promise<void> {
    this.onState(await readUnityHubState());
  }
}
