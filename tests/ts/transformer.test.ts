import { describe, expect, it } from 'vitest';
import { toPresence } from '../../src/presence/transformer.js';
const base = { project: 'MyGame', version: '2022.3.1f1', scene: null, unityHubRunning: true, timestamp: 1735689600 };
describe('presence transformer', () => {
  it('maps an open project', () => expect(toPresence(base)).toMatchObject({ details: 'MyGame — Unity 2022.3.1f1', state: 'Unity 2022.3.1f1', assets: { large_image: 'unity_logo' } }));
  it('maps an active scene', () => expect(toPresence({ ...base, scene: 'MainMenu' })).toMatchObject({ state: 'Scene: MainMenu', assets: { large_image: 'unity_play', small_image: 'unity_logo' } }));
  it('maps idle state', () => expect(toPresence({ ...base, project: null })).toEqual({ details: 'Unity Hub RPC', state: 'Idle', assets: { large_image: 'unity_idle' } }));
  it('truncates Discord fields', () => expect(toPresence({ ...base, project: 'x'.repeat(200) }).details.length).toBe(128));
});
