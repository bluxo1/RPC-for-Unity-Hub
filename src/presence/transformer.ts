export interface UnityHubState {
  project: string | null;
  version: string | null;
  scene: string | null;
  projectPath?: string | null;
  unityHubRunning: boolean;
  timestamp: number;
}

export interface DiscordPresence {
  details: string;
  state: string;
  startTimestamp?: number;
  assets: { large_image: string; small_image?: string };
}

export interface PresenceOptions {
  showSceneName?: boolean;
  showProjectPath?: boolean;
  format?: string;
}

const LIMIT = 128;
export const DEFAULT_FORMAT = '{project} — Unity {version}';

const truncate = (value: string): string =>
  value.length > LIMIT ? `${value.slice(0, LIMIT - 1)}…` : value;

/** Shown while no project is open, until the idle timeout tears the presence down. */
export function idlePresence(): DiscordPresence {
  return {
    details: 'Unity Hub RPC',
    state: 'Idle',
    assets: { large_image: 'unity_idle' },
  };
}

export function toPresence(
  state: UnityHubState,
  options: PresenceOptions = {},
): DiscordPresence {
  const {
    showSceneName = true,
    showProjectPath = false,
    format = DEFAULT_FORMAT,
  } = options;
  if (!state.project) return idlePresence();

  const version = state.version ?? 'Unknown';
  const projectPath = state.projectPath ?? '';
  const hasScene = showSceneName && Boolean(state.scene);
  const hasPath = showProjectPath && projectPath.length > 0;

  // The second line can only carry one fact; a scene is more specific than the
  // path, and the path is more specific than the version already in `details`.
  const secondLine = hasScene
    ? `Scene: ${state.scene}`
    : hasPath
      ? projectPath
      : `Unity ${version}`;

  return {
    details: truncate(
      format
        .replaceAll('{project}', state.project)
        .replaceAll('{version}', version)
        .replaceAll('{path}', projectPath),
    ),
    state: truncate(secondLine),
    startTimestamp: state.timestamp * 1000,
    assets: {
      large_image: hasScene ? 'unity_play' : 'unity_logo',
      ...(hasScene ? { small_image: 'unity_logo' } : {}),
    },
  };
}
