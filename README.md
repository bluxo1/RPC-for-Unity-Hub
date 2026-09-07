# Unity Hub → Discord Rich Presence

Show the Unity project detected by Unity Hub in Discord Rich Presence, including
the project name, Unity version, active scene when available, and elapsed
session time.

The production daemon is a TypeScript/Node.js process. It reads Unity Hub's
local state files, converts the result into a Discord activity, and communicates
with the Discord desktop client through its local IPC transport. It does not
need a Discord bot token, a Unity Editor plugin, or project uploads.

## Current status

Implemented:

- Cross-platform Unity Hub state-file discovery for Windows, macOS, and Linux
- Project, Unity version, and scene parsing with graceful idle handling
- Discord IPC connection that tolerates Discord being unavailable
- Config loading and validation from `config.json`
- Discord field truncation to the 128-character limit
- File logging and a Windows logon startup task
- TypeScript and Python tests with GitHub Actions CI

Not yet wired into the daemon:

- The system-tray boundary in `src/tray/` is currently a placeholder
- Config hot reload, `idleTimeoutMinutes`, and `showProjectPath` are reserved
  for follow-up work
- The Python parser is useful for standalone development and tests, but is not
  required by the Node daemon

## Requirements

- Node.js 22 or newer
- Unity Hub
- Discord desktop app
- Python 3.10 or newer only when using the optional Python parser or Python tests

## Install

```bash
git clone https://github.com/bluxo1/RPC-for-Unity-Hub.git
cd RPC-for-Unity-Hub
npm install
```

To use the optional Python tooling:

```bash
pip install -r python/requirements.txt
```

## Discord application setup

1. Create an application at <https://discord.com/developers/applications>.
2. Copy its **Application ID**.
3. Upload Rich Presence artwork using these asset keys:
   `unity_logo`, `unity_play`, and `unity_idle`.
4. Copy `config.example.json` to `config.json` and replace
   `discordClientId` with your Application ID.

Discord desktop must be running; the web client does not expose the local IPC
socket. No bot token, OAuth secret, server permission, or Discord account
credential is required.

## Run

Build and start the daemon:

```bash
npm run build
npm start
```

For TypeScript development:

```bash
npm run dev
```

The daemon polls every five seconds by default. Set `UNITY_HUB_RPC_CONFIG` to
load a config file from another path. Set `UNITY_HUB_RPC_CONSOLE=1` to mirror
log messages to stderr.

On Windows, register automatic startup after building:

```powershell
npm run install:windows
```

Remove the per-user `UnityHubRPC` Scheduled Task with:

```powershell
npm run uninstall:windows
```

The Windows log is written to
`%LOCALAPPDATA%\UnityHubRPC\unity-hub-rpc.log`. On macOS and Linux it is
written below the user's state directory (`$XDG_STATE_HOME` or
`~/.local/state`).

## Unity Hub state files

The monitor checks the `editor` and `projects.json` files in Unity Hub's local
data directory:

| Platform | Location |
| --- | --- |
| Windows | `%APPDATA%\UnityHub` and `%LOCALAPPDATA%\UnityHub` |
| macOS | `~/Library/Application Support/UnityHub` |
| Linux | `$XDG_CONFIG_HOME/UnityHub` or `~/.config/UnityHub` |

The parser accepts common Unity Hub fields such as `projectPath`, `path`,
`projectName`, `editorVersion`, and `activeScene`. Missing, unreadable, or
malformed files result in an idle state rather than a crash.

## Presence mapping

| Detected state | Details | State | Artwork |
| --- | --- | --- | --- |
| Project open | Configured project format | `Unity {version}` | `unity_logo` |
| Scene available | Configured project format | `Scene: {scene}` | `unity_play` + `unity_logo` |
| No project | `Unity Hub RPC` | `Idle` | `unity_idle` |

The default status format is `{project} — Unity {version}`. Discord details
and state values are truncated to 128 characters. Active project states use the
poller's timestamp as the elapsed-session start time.

## Configuration

`config.example.json` contains the available settings:

```json
{
  "discordClientId": "1234567890123456789",
  "updateIntervalMs": 5000,
  "showSceneName": true,
  "showProjectPath": false,
  "idleTimeoutMinutes": 5,
  "customStatusFormat": "{project} — Unity {version}"
}
```

The schema validates the client ID, polling interval, display flags, idle
timeout, and status format. Invalid or missing configuration falls back to
safe defaults. Only `discordClientId`, `updateIntervalMs`, `showSceneName`,
and `customStatusFormat` currently affect the Node daemon.

## Tests and quality checks

TypeScript:

```bash
npm run build
npm run lint
npm test
```

Python:

```bash
pytest tests/python
ruff check python tests/python
black --check python tests/python
```

GitHub Actions runs the TypeScript and Python checks separately on every push
and pull request.

## Project layout

```text
src/                 TypeScript daemon
  state/             Unity Hub file discovery and parsing
  presence/          Discord activity transformation
  discord/           Discord IPC client
  config/            Configuration schema and loader
  logging/           File and console logging
python/              Optional Python parser and models
tests/               TypeScript and Python tests
docs/                Product, design, and architecture notes
scripts/             Windows startup and uninstall scripts
```

## Security and privacy

- Unity Hub state is read locally; project contents are not uploaded.
- Discord communication uses the local desktop IPC transport.
- The project does not read Discord tokens, OAuth secrets, or Unity account
  credentials.
- It is not a Unity Editor plugin and does not inject into Unity Hub or the
  Unity Editor.
- It runs with normal user permissions.

## License

MIT.
