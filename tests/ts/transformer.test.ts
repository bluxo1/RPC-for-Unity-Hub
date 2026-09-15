import { describe, expect, it } from 'vitest';
import { toPresence } from '../../src/presence/transformer.js';
const base = {
  project: 'MyGame',
  version: '2022.3.1f1',
  scene: null,
  unityHubRunning: true,
  timestamp: 1735689600,
};
const withPath = { ...base, projectPath: 'D:/dev/MyGame' };
describe('presence transformer', () => {
  it('maps an open project', () =>
    expect(toPresence(base)).toMatchObject({
      details: 'MyGame — Unity 2022.3.1f1',
      state: 'Unity 2022.3.1f1',
      assets: { large_image: 'unity_logo' },
    }));
  it('maps an active scene', () =>
    expect(toPresence({ ...base, scene: 'MainMenu' })).toMatchObject({
      state: 'Scene: MainMenu',
      assets: { large_image: 'unity_play', small_image: 'unity_logo' },
    }));
  it('maps idle state', () =>
    expect(toPresence({ ...base, project: null })).toEqual({
      details: 'Unity Hub RPC',
      state: 'Idle',
      assets: { large_image: 'unity_idle' },
    }));
  it('truncates Discord fields', () =>
    expect(
      toPresence({ ...base, project: 'x'.repeat(200) }).details.length,
    ).toBe(128));
  it('hides the project path by default', () =>
    expect(toPresence(withPath).state).toBe('Unity 2022.3.1f1'));
  it('shows the project path when enabled', () =>
    expect(toPresence(withPath, { showProjectPath: true }).state).toBe(
      'D:/dev/MyGame',
    ));
  it('prefers an active scene over the project path', () =>
    expect(
      toPresence({ ...withPath, scene: 'MainMenu' }, { showProjectPath: true })
        .state,
    ).toBe('Scene: MainMenu'));
  it('falls back to the version when the path is unknown', () =>
    expect(toPresence(base, { showProjectPath: true }).state).toBe(
      'Unity 2022.3.1f1',
    ));
  it('substitutes {path} in a custom format', () =>
    expect(toPresence(withPath, { format: '{project} ({path})' }).details).toBe(
      'MyGame (D:/dev/MyGame)',
    ));
});
