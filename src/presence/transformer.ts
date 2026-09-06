export interface UnityHubState { project: string | null; version: string | null; scene: string | null; projectPath?: string | null; unityHubRunning: boolean; timestamp: number; }
export interface DiscordPresence { details: string; state: string; startTimestamp?: number; assets: { large_image: string; small_image?: string }; }
const LIMIT = 128;
const truncate = (value: string): string => value.length > LIMIT ? `${value.slice(0, LIMIT - 1)}…` : value;
export function toPresence(state: UnityHubState, showSceneName = true, format = '{project} — Unity {version}'): DiscordPresence {
  if (!state.project) return { details: 'Unity Hub RPC', state: 'Idle', assets: { large_image: 'unity_idle' } };
  const version = state.version ?? 'Unknown';
  const hasScene = showSceneName && Boolean(state.scene);
  return { details: truncate(format.replaceAll('{project}', state.project).replaceAll('{version}', version)), state: truncate(hasScene ? `Scene: ${state.scene}` : `Unity ${version}`), startTimestamp: state.timestamp * 1000, assets: { large_image: hasScene ? 'unity_play' : 'unity_logo', ...(hasScene ? { small_image: 'unity_logo' } : {}) } };
}
