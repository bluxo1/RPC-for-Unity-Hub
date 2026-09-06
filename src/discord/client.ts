import RPC from '@xhayper/discord-rpc';
import type { DiscordPresence } from '../presence/transformer.js';
export class DiscordClient {
  private client?: RPC.Client;
  private connected = false;
  constructor(private readonly clientId: string) {}
  async update(presence: DiscordPresence): Promise<void> {
    try {
      if (!this.client) {
        this.client = new RPC.Client({ clientId: this.clientId, transport: { type: 'ipc' } });
        this.client.on('disconnected', () => { this.connected = false; });
        await this.client.connect();
        this.connected = true;
      }
      if (this.connected && this.client.user) {
        await this.client.user.setActivity({ name: 'Unity', details: presence.details, state: presence.state, startTimestamp: presence.startTimestamp, largeImageKey: presence.assets.large_image, smallImageKey: presence.assets.small_image });
      }
    } catch { this.connected = false; }
  }
}
