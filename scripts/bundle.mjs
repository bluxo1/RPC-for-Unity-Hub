// Bundling lives here rather than in an esbuild CLI invocation because the client id has to
// reach esbuild as a *quoted* JS expression. Passing that through PowerShell to npx.cmd loses
// the quotes, and the bare number that results is larger than Number.MAX_SAFE_INTEGER, so it
// silently rounds to a client id Discord has never heard of.
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

const DEFAULT_CLIENT_ID = '1545892869363998771';
const clientId = process.env.UNITY_HUB_RPC_CLIENT_ID || DEFAULT_CLIENT_ID;
const outfile = 'dist/bundle.cjs';

if (!/^\d{6,}$/.test(clientId)) {
  throw new Error(`UNITY_HUB_RPC_CLIENT_ID must be digits, got: ${clientId}`);
}

// The executable is standalone, so the tray menu's version string has to be baked in
// too — there is no package.json sitting next to it at runtime.
const { version } = JSON.parse(await readFile('package.json', 'utf8'));

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile,
  define: {
    'process.env.UNITY_HUB_RPC_CLIENT_ID': JSON.stringify(clientId),
    'process.env.UNITY_HUB_RPC_VERSION': JSON.stringify(version),
  },
});

// The rounding bug was invisible in a working build, so prove the exact digits survived.
const bundled = await readFile(outfile, 'utf8');
if (!bundled.includes(`"${clientId}"`)) {
  throw new Error(
    `Bundle does not contain the client id as a string literal; ` +
      `the --define substitution was mangled. Inspect ${outfile}.`,
  );
}

console.log(`Bundled ${outfile} with client id ${clientId}`);
