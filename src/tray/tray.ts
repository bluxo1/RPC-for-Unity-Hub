/**
 * Phase 2 tray boundary. Keeping this small lets the core loop run headlessly
 * in CI and provides one place to add systray2 lifecycle/menu wiring.
 */
export type TrayStatus = 'connected' | 'idle' | 'error';

export interface TrayController {
  setStatus(status: TrayStatus): void;
  close(): void;
}

export function createTray(): TrayController {
  let status: TrayStatus = 'idle';
  return {
    setStatus(next) { status = next; void status; },
    close() { /* no-op until Phase 2 tray wiring */ },
  };
}
