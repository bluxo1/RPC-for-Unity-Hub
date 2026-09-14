import RPC from '@xhayper/discord-rpc';
import type { DiscordPresence } from '../presence/transformer.js';
import { log } from '../logging/logger.js';

const LOGIN_TIMEOUT_MS = 10_000;

export class DiscordClient {
  private client?: RPC.Client;
  private connected = false;
  private busy = false;
  constructor(private readonly clientId: string) {}

  async update(presence: DiscordPresence): Promise<void> {
    // Discord never answers the handshake for an unknown client id, so without this
    // guard every poll would stack up another IPC socket behind a login that never settles.
    if (this.busy) return;
    this.busy = true;
    try {
      if (!this.client || !this.connected) await this.connect();
      if (this.connected && this.client?.user) {
        await this.client.user.setActivity({
          name: 'Unity',
          details: presence.details,
          state: presence.state,
          startTimestamp: presence.startTimestamp,
          largeImageKey: presence.assets.large_image,
          smallImageKey: presence.assets.small_image,
        });
      }
    } catch (error) {
      await this.reset();
      void log('Discord RPC connection failed; will retry', error);
    } finally {
      this.busy = false;
    }
  }

  private async connect(): Promise<void> {
    await this.reset();
    const client = new RPC.Client({
      clientId: this.clientId,
      transport: { type: 'ipc' },
    });
    client.on('disconnected', () => {
      this.connected = false;
    });
    this.client = client;
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        client.login(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new Error(
                  `Discord login timed out after ${LOGIN_TIMEOUT_MS}ms`,
                ),
              ),
            LOGIN_TIMEOUT_MS,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
    this.connected = true;
  }

  private async reset(): Promise<void> {
    this.connected = false;
    const client = this.client;
    this.client = undefined;
    if (!client) return;
    try {
      await client.destroy();
    } catch {
      // A half-open socket must not block the next attempt.
    }
  }
}
