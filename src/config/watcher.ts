import { watch, type FSWatcher } from 'chokidar';
import { dirname, resolve } from 'node:path';
import { readConfig } from './loader.js';
import type { AppConfig } from './schema.js';

/**
 * Watches the parent directory rather than the file. Editors and `npm run format` save
 * atomically — write a temp file, rename it over the target — and a recreated file is
 * reported as `add`, not `change`, so both events feed the same reload. This also picks up
 * a config that is created for the first time while the daemon is already running.
 */
export function watchConfig(
  path: string,
  onChange: (config: AppConfig) => void,
  onError: (reason: string) => void,
): FSWatcher {
  const target = resolve(path);
  const watcher = watch(dirname(target), {
    depth: 0,
    ignoreInitial: true,
    // A rename-over can briefly expose a half-written file; wait for the size to settle.
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
  });

  const reload = (changed: string): void => {
    if (resolve(changed) !== target) return;
    void readConfig(path).then((result) => {
      // A rejected reload leaves the running config in place: one bad keystroke in
      // an editor must not silently reset every setting to its default.
      if (result.ok) onChange(result.config);
      else onError(result.reason);
    });
  };

  watcher.on('add', reload);
  watcher.on('change', reload);
  return watcher;
}
