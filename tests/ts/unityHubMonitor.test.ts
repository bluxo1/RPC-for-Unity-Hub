import { describe, expect, it } from 'vitest';
import {
  ProjectSessionClock,
  toUnityState,
} from '../../src/state/unityHubMonitor.js';

const editor = { projectPath: 'C:\\Games\\SpaceGame', version: '2022.3.1f1' };

describe('Unity state', () => {
  it('resolves the open project from the running editor', async () => {
    await expect(
      toUnityState(
        { editor, hubRunning: true },
        new ProjectSessionClock(),
        100,
      ),
    ).resolves.toMatchObject({
      project: 'SpaceGame',
      version: '2022.3.1f1',
      projectPath: 'C:\\Games\\SpaceGame',
      unityHubRunning: true,
      timestamp: 100,
    });
  });

  it('reports idle when no editor is running', async () => {
    await expect(
      toUnityState(
        { editor: null, hubRunning: true },
        new ProjectSessionClock(),
        100,
      ),
    ).resolves.toMatchObject({
      project: null,
      version: null,
      unityHubRunning: true,
    });
  });

  it('reports the hub as closed when nothing is running', async () => {
    await expect(
      toUnityState(
        { editor: null, hubRunning: false },
        new ProjectSessionClock(),
        100,
      ),
    ).resolves.toMatchObject({
      project: null,
      unityHubRunning: false,
    });
  });

  it('falls back to null version when the path encodes none and the project is unreadable', async () => {
    const runtime = {
      editor: { projectPath: 'C:\\Games\\Nope', version: null },
      hubRunning: true,
    };
    await expect(
      toUnityState(runtime, new ProjectSessionClock(), 100),
    ).resolves.toMatchObject({ project: 'Nope', version: null });
  });
});

describe('ProjectSessionClock', () => {
  it('holds the start time steady while the same project stays open', () => {
    const clock = new ProjectSessionClock();
    expect(clock.anchor('C:\\Games\\SpaceGame', 100)).toBe(100);
    expect(clock.anchor('C:\\Games\\SpaceGame', 160)).toBe(100);
    expect(clock.anchor('C:\\Games\\SpaceGame', 999)).toBe(100);
  });

  it('restarts the clock when a different project opens', () => {
    const clock = new ProjectSessionClock();
    expect(clock.anchor('C:\\Games\\SpaceGame', 100)).toBe(100);
    expect(clock.anchor('C:\\Games\\Other', 160)).toBe(160);
    expect(clock.anchor('C:\\Games\\Other', 200)).toBe(160);
  });

  it('restarts the clock after the project closes and reopens', () => {
    const clock = new ProjectSessionClock();
    expect(clock.anchor('C:\\Games\\SpaceGame', 100)).toBe(100);
    expect(clock.anchor(null, 160)).toBe(160);
    expect(clock.anchor('C:\\Games\\SpaceGame', 200)).toBe(200);
  });
});
