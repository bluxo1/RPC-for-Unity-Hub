import { execFile } from 'node:child_process';
import { platform } from 'node:os';
import { dirname, resolve } from 'node:path';
import { trayIcon, type TrayStatus } from './icons.js';
import { log } from '../logging/logger.js';

export type { TrayStatus };

export interface TrayHandlers {
  onReload: () => void;
  onExit: () => void;
  configPath: string;
  logPath: string;
  version: string;
}

export interface TrayController {
  setStatus(status: TrayStatus, tooltip: string): void;
  close(): void;
}

interface TrayMenuItem {
  title: string;
  tooltip: string;
  enabled?: boolean;
  hidden?: boolean;
  checked?: boolean;
  items?: TrayMenuItem[];
}

interface TrayClick {
  item: TrayMenuItem;
}

/**
 * Only the slice of systray2 this module uses. Typing it structurally sidesteps the
 * CJS default-export interop, which TypeScript models differently from how Node and
 * esbuild each resolve it at runtime.
 */
interface SysTrayLike {
  new (conf: { menu: TrayMenu; debug?: boolean }): SysTrayInstance;
  separator: TrayMenuItem;
}

interface TrayMenu {
  icon: string;
  title: string;
  tooltip: string;
  items: TrayMenuItem[];
}

interface SysTrayInstance {
  ready(): Promise<void>;
  onClick(listener: (action: TrayClick) => void): unknown;
  onError(listener: (error: Error) => void): unknown;
  sendAction(action: unknown): Promise<unknown>;
  kill(exitNode?: boolean): Promise<void>;
}

const isWindows = platform() === 'win32';

/**
 * Node's CJS interop makes the shape of this module depend on how it was loaded: running
 * the emitted ESM puts the class on `namespace.default.default`, while the esbuild CJS
 * bundle puts it on `namespace.default`. Accept either rather than betting on one.
 */
async function loadSysTray(): Promise<SysTrayLike> {
  const namespace = (await import('systray2')) as unknown as {
    default?: unknown;
  };
  const first = namespace.default;
  const candidate =
    typeof first === 'function'
      ? first
      : (first as { default?: unknown } | undefined)?.default;
  if (typeof candidate !== 'function') {
    throw new Error('systray2 did not export a constructor');
  }
  return candidate as SysTrayLike;
}

/** Hands a path to the desktop's own file manager; failure is never fatal. */
function reveal(target: string): void {
  const [command, args] = isWindows
    ? ['explorer.exe', [resolve(target)]]
    : platform() === 'darwin'
      ? ['open', [resolve(target)]]
      : ['xdg-open', [resolve(target)]];
  // explorer.exe reports a non-zero exit code even when it succeeds, so the result
  // is deliberately ignored rather than surfaced as an error.
  execFile(command, args, () => undefined);
}

const noopTray: TrayController = {
  setStatus() {
    /* headless */
  },
  close() {
    /* headless */
  },
};

/** A helper binary that hangs must not take the daemon down with it. */
const READY_TIMEOUT_MS = 5_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('tray did not become ready')), ms),
    ),
  ]);
}

/**
 * The tray is strictly optional: the daemon's job is to push presence, and it must keep
 * doing that on a headless CI box, over SSH, or in the single-file build if the helper
 * binary is missing. Every failure here degrades to `noopTray` instead of propagating.
 *
 * systray2 resolves its helper as `./traybin/<bin>` relative to the working directory
 * before falling back to its own package directory, which is why the installer ships a
 * `traybin/` beside the executable.
 */
export async function createTray(
  handlers: TrayHandlers,
): Promise<TrayController> {
  if (process.env.UNITY_HUB_RPC_NO_TRAY === '1') return noopTray;

  const items = {
    config: {
      title: 'Open Config Folder',
      tooltip: 'Open Config Folder',
      enabled: true,
    },
    reload: {
      title: 'Reload Configuration',
      tooltip: 'Reload Configuration',
      enabled: true,
    },
    logs: {
      title: 'Show Debug Logs',
      tooltip: 'Show Debug Logs',
      enabled: true,
    },
    exit: { title: 'Exit', tooltip: 'Exit', enabled: true },
  };

  try {
    const SysTrayClass = await loadSysTray();
    const buildMenu = (status: TrayStatus, tooltip: string) => ({
      icon: trayIcon(status, isWindows),
      title: '',
      tooltip,
      items: [
        {
          title: `Unity Hub RPC v${handlers.version}`,
          tooltip,
          enabled: false,
        },
        SysTrayClass.separator,
        items.config,
        items.reload,
        SysTrayClass.separator,
        items.logs,
        SysTrayClass.separator,
        items.exit,
      ],
    });

    const tray = new SysTrayClass({
      menu: buildMenu('idle', 'Starting…'),
      debug: false,
    });
    // systray2 only builds its readline interface inside init(), which ready() awaits;
    // attaching listeners before that throws on a null stream and would lose the tray
    // to a fallback that looks like "headless".
    await withTimeout(tray.ready(), READY_TIMEOUT_MS);

    tray.onError(
      (error: Error) => void log('Tray error; continuing headless', error),
    );
    void tray.onClick((action: TrayClick) => {
      switch (action.item.title) {
        case items.config.title:
          return reveal(dirname(resolve(handlers.configPath)));
        case items.reload.title:
          return handlers.onReload();
        case items.logs.title:
          return reveal(handlers.logPath);
        case items.exit.title:
          return handlers.onExit();
      }
    });

    return {
      setStatus(status, tooltip) {
        // systray2 has no tooltip setter; the menu carries it, so resend the menu.
        void tray
          .sendAction({ type: 'update-menu', menu: buildMenu(status, tooltip) })
          .catch(() => undefined);
      },
      close() {
        // `false` keeps the daemon's own shutdown path in charge of exiting.
        void tray.kill(false).catch(() => undefined);
      },
    };
  } catch (error) {
    void log('Tray unavailable; continuing headless', error);
    return noopTray;
  }
}
