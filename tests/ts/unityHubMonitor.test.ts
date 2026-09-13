import { describe, expect, it } from 'vitest';
import { parseUnityHubDocuments } from '../../src/state/unityHubMonitor.js';

describe('Unity Hub monitor parser', () => {
  it('resolves a project from its path and editor version', () => {
    expect(parseUnityHubDocuments([{ path: 'C:/Games/SpaceGame', editorVersion: '2022.3.1f1' }], 1)).toMatchObject({
      project: 'SpaceGame',
      version: '2022.3.1f1',
      unityHubRunning: true,
      timestamp: 1,
    });
  });

  it('returns idle for no state documents', () => {
    expect(parseUnityHubDocuments([], 1)).toMatchObject({ project: null, unityHubRunning: false, timestamp: 1 });
  });

  it('resolves projects from the current Unity Hub nested project format', () => {
    expect(parseUnityHubDocuments([{ projects: [{ path: 'C:/Games/SpaceGame', title: 'SpaceGame' }] }], 1)).toMatchObject({
      project: 'SpaceGame',
      projectPath: 'C:/Games/SpaceGame',
      unityHubRunning: true,
    });
  });
});
