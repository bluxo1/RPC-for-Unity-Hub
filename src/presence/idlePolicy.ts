import {
  toPresence,
  type DiscordPresence,
  type PresenceOptions,
  type UnityHubState,
} from './transformer.js';

export type PresenceAction =
  { kind: 'update'; presence: DiscordPresence } | { kind: 'clear' };

/**
 * Discord keeps displaying the last activity it was given until something clears it,
 * so a daemon that only ever pushes updates would pin a stale "Idle" card to the
 * profile for as long as it runs. `idleTimeoutMinutes` bounds how long that
 * placeholder is allowed to linger after the last project closes.
 */
export class IdlePolicy {
  private idleSince: number | null = null;

  constructor(private timeoutMinutes: number) {}

  setTimeoutMinutes(minutes: number): void {
    this.timeoutMinutes = minutes;
  }

  decide(
    state: UnityHubState,
    options: PresenceOptions,
    nowMs: number,
  ): PresenceAction {
    if (state.project) {
      this.idleSince = null;
      return { kind: 'update', presence: toPresence(state, options) };
    }
    // A timeout of 0 means "never show the placeholder", so don't even start the clock.
    if (this.timeoutMinutes <= 0) return { kind: 'clear' };
    this.idleSince ??= nowMs;
    const idleMinutes = (nowMs - this.idleSince) / 60_000;
    if (idleMinutes >= this.timeoutMinutes) return { kind: 'clear' };
    return { kind: 'update', presence: toPresence(state, options) };
  }
}
