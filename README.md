# Unity Hub RPC

Lightweight Discord Rich Presence for Unity Hub. Python reads Unity Hub's local JSON state; a strict TypeScript/Node.js process transforms it into Discord IPC presence updates.

## Setup

1. Install Node.js 22+, Python 3.10+, Discord desktop, and Unity Hub.
2. Install dependencies: `npm install` and `pip install -r python/requirements.txt`.
3. Copy `config.example.json` to `config.json` and set your Discord application client ID.
4. Build and run: `npm run build && npm start`.

For development, use `npm run dev`. The Python poller can be checked independently with `python python/state_monitor.py`.

## State and presence

The poller emits one JSON object per line every five seconds by default. It searches platform-specific Unity Hub `editor` and `projects.json` locations, tolerates missing or malformed files, and reports an idle state when no project can be resolved. Discord fields are truncated to 128 characters.

The current implementation covers the Phase 0/1 core loop and tests for state parsing and presence mapping. Config validation/hot reload, tray UI, and packaging are intentionally staged for Phase 2/3.

## Tests and quality

Use `npm run build`, `npm run lint`, and `npm test` for TypeScript. Use `pytest tests/python`, `ruff check python tests/python`, and `black --check python tests/python` for Python.

No bot token, server permissions, telemetry, or non-local network calls are used.
