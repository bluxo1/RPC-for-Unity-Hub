import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readConfig } from '../../src/config/loader.js';
import { defaultConfig, type AppConfig } from '../../src/config/schema.js';
import { watchConfig } from '../../src/config/watcher.js';

const dirs: string[] = [];

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'unity-hub-rpc-'));
  dirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

const valid = (overrides: Partial<AppConfig> = {}): string =>
  JSON.stringify(
    { discordClientId: '1545892869363998771', ...overrides },
    null,
    2,
  );

/** Records watcher callbacks and lets a test await the next one. */
function collector() {
  const configs: AppConfig[] = [];
  const errors: string[] = [];
  let wake: (() => void) | null = null;

  const signal = (): void => {
    const pending = wake;
    wake = null;
    pending?.();
  };

  const waitFor = (predicate: () => boolean): Promise<void> =>
    new Promise((resolve, reject) => {
      if (predicate()) return resolve();
      // Config events arrive after chokidar's 200ms write-stability window; anything
      // beyond this is a hang, not a slow write.
      const timer = setTimeout(
        () => reject(new Error('timed out waiting for a config event')),
        8000,
      );
      wake = () => {
        clearTimeout(timer);
        if (predicate()) resolve();
      };
    });

  return {
    configs,
    errors,
    onChange: (config: AppConfig) => {
      configs.push(config);
      signal();
    },
    onError: (reason: string) => {
      errors.push(reason);
      signal();
    },
    waitFor,
  };
}

async function start(path: string, collected: ReturnType<typeof collector>) {
  const watcher = watchConfig(path, collected.onChange, collected.onError);
  // Attach before the initial scan finishes so no early event is missed.
  await new Promise<void>((resolve) => watcher.on('ready', () => resolve()));
  return watcher;
}

describe('Config loader', () => {
  it('treats a missing file as first run rather than an error', async () => {
    const path = join(await tempDir(), 'config.json');
    await expect(readConfig(path)).resolves.toEqual({
      ok: true,
      config: defaultConfig,
    });
  });

  it('fills defaults for a partial file', async () => {
    const path = join(await tempDir(), 'config.json');
    await writeFile(path, valid({ showProjectPath: true }), 'utf8');
    const result = await readConfig(path);
    expect(result.ok && result.config).toMatchObject({
      showProjectPath: true,
      updateIntervalMs: defaultConfig.updateIntervalMs,
      idleTimeoutMinutes: defaultConfig.idleTimeoutMinutes,
    });
  });

  it('reports malformed JSON instead of substituting defaults', async () => {
    const path = join(await tempDir(), 'config.json');
    await writeFile(path, '{ "discordClientId": ', 'utf8');
    const result = await readConfig(path);
    expect(result.ok).toBe(false);
  });

  it('rejects a field that violates the schema', async () => {
    const path = join(await tempDir(), 'config.json');
    await writeFile(path, valid({ updateIntervalMs: 10 }), 'utf8');
    const result = await readConfig(path);
    expect(result.ok).toBe(false);
  });
});

describe('Config watcher', () => {
  it('reloads when the file changes', async () => {
    const dir = await tempDir();
    const path = join(dir, 'config.json');
    await writeFile(path, valid(), 'utf8');

    const collected = collector();
    const watcher = await start(path, collected);
    try {
      await writeFile(path, valid({ updateIntervalMs: 20000 }), 'utf8');
      await collected.waitFor(() => collected.configs.length > 0);
      expect(collected.configs.at(-1)?.updateIntervalMs).toBe(20000);
    } finally {
      await watcher.close();
    }
  });

  it('survives an atomic save that renames a temp file over the target', async () => {
    const dir = await tempDir();
    const path = join(dir, 'config.json');
    await writeFile(path, valid(), 'utf8');

    const collected = collector();
    const watcher = await start(path, collected);
    try {
      // How editors and `npm run format` save: write alongside, then rename over.
      const temp = join(dir, 'config.json.tmp');
      await writeFile(
        temp,
        valid({ customStatusFormat: '{project} on Unity {version}' }),
        'utf8',
      );
      await rename(temp, path);

      await collected.waitFor(() => collected.configs.length > 0);
      expect(collected.configs.at(-1)?.customStatusFormat).toBe(
        '{project} on Unity {version}',
      );
    } finally {
      await watcher.close();
    }
  });

  it('keeps the running config when a reload is invalid', async () => {
    const dir = await tempDir();
    const path = join(dir, 'config.json');
    await writeFile(path, valid(), 'utf8');

    const collected = collector();
    const watcher = await start(path, collected);
    try {
      await writeFile(path, '{ "discordClientId": 42 }', 'utf8');
      await collected.waitFor(() => collected.errors.length > 0);
      // The point of the split: a half-typed edit must not reset every setting.
      expect(collected.configs).toHaveLength(0);
      expect(collected.errors.at(-1)).toBeTruthy();
    } finally {
      await watcher.close();
    }
  });

  it('picks up a config that is deleted and recreated', async () => {
    const dir = await tempDir();
    const path = join(dir, 'config.json');
    await writeFile(path, valid(), 'utf8');

    const collected = collector();
    const watcher = await start(path, collected);
    try {
      // A recreated file arrives as 'add' rather than 'change', which is why both
      // events feed the same reload.
      await rm(path);
      await new Promise((resolve) => setTimeout(resolve, 400));
      await writeFile(path, valid({ idleTimeoutMinutes: 12 }), 'utf8');

      await collected.waitFor(() =>
        collected.configs.some((config) => config.idleTimeoutMinutes === 12),
      );
    } finally {
      await watcher.close();
    }
  });

  it('ignores other files in the same directory', async () => {
    const dir = await tempDir();
    const path = join(dir, 'config.json');
    await writeFile(path, valid(), 'utf8');

    const collected = collector();
    const watcher = await start(path, collected);
    try {
      await writeFile(join(dir, 'notes.txt'), 'unrelated', 'utf8');
      await writeFile(
        join(dir, 'other.json'),
        valid({ updateIntervalMs: 30000 }),
        'utf8',
      );
      await new Promise((resolve) => setTimeout(resolve, 600));
      expect(collected.configs).toHaveLength(0);
      expect(collected.errors).toHaveLength(0);
    } finally {
      await watcher.close();
    }
  });
});
