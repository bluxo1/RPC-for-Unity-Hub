/**
 * Replaced at bundle time by scripts/bundle.mjs, the same way the client id is — a
 * single-file executable has no package.json to read from. The fallback only covers
 * running straight from `dist/`.
 */
export const APP_VERSION = process.env.UNITY_HUB_RPC_VERSION ?? '0.0.0-dev';
