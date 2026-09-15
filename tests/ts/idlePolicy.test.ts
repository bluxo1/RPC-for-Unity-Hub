import { describe, expect, it } from 'vitest';
import { IdlePolicy } from '../../src/presence/idlePolicy.js';

const open = {
  project: 'MyGame',
  version: '2022.3.1f1',
  scene: null,
  unityHubRunning: true,
  timestamp: 1735689600,
};
const closed = { ...open, project: null };
const MINUTE = 60_000;

describe('idle policy', () => {
  it('updates while a project is open', () => {
    expect(new IdlePolicy(5).decide(open, {}, 0)).toMatchObject({
      kind: 'update',
      presence: { details: 'MyGame — Unity 2022.3.1f1' },
    });
  });

  it('shows the idle placeholder until the timeout elapses', () => {
    const policy = new IdlePolicy(5);
    expect(policy.decide(closed, {}, 0)).toMatchObject({
      kind: 'update',
      presence: { state: 'Idle' },
    });
    expect(policy.decide(closed, {}, 4 * MINUTE)).toMatchObject({
      kind: 'update',
    });
  });

  it('clears the presence once the timeout elapses', () => {
    const policy = new IdlePolicy(5);
    policy.decide(closed, {}, 0);
    expect(policy.decide(closed, {}, 5 * MINUTE)).toEqual({ kind: 'clear' });
  });

  it('clears immediately when the timeout is zero', () => {
    expect(new IdlePolicy(0).decide(closed, {}, 0)).toEqual({ kind: 'clear' });
  });

  it('restarts the idle clock after a project reopens', () => {
    const policy = new IdlePolicy(5);
    policy.decide(closed, {}, 0);
    policy.decide(open, {}, 10 * MINUTE);
    expect(policy.decide(closed, {}, 11 * MINUTE)).toMatchObject({
      kind: 'update',
    });
  });

  it('honours a timeout lowered by a config reload', () => {
    const policy = new IdlePolicy(60);
    policy.decide(closed, {}, 0);
    policy.setTimeoutMinutes(5);
    expect(policy.decide(closed, {}, 6 * MINUTE)).toEqual({ kind: 'clear' });
  });
});
