# Unity Hub → Discord Rich Presence

Show the Unity project you currently have open in Discord Rich Presence, including
the project name, Unity version, and elapsed session time.

The production daemon is a TypeScript/Node.js process. It detects the running Unity
editor, converts the result into a Discord activity, and communicates
with the Discord desktop client through its local IPC transport. It does not
need a Discord bot token, a Unity Editor plugin, or project uploads.

## Current status

Implemented:

- Open-project detection from the running Unity editor on Windows, macOS, and Linux
- Project name and Unity version resolution with graceful idle handling
- Discord IPC connection that tolerates Discord being unavailable, with a login
  timeout so an unreachable client cannot wedge the daemon
- Config loading and validation from `config.json`
- Discord field truncation to the 128-character limit
- A stable elapsed-session timer anchored to the open project
- File logging and a Windows logon startup task
- TypeScript and Python tests with GitHub Actions CI
- A standalone Windows executable and Inno Setup release pipeline

Not yet wired into the daemon:

- The system-tray boundary in `src/tray/` is currently a placeholder
- Config hot reload, `idleTimeoutMinutes`, and `showProjectPath` are reserved
  for follow-up work
- Active scene reporting, and therefore `showSceneName`, would need an in-editor
  script; the transformer already handles a scene if one is ever supplied
- `python/` and `src/bridge/pythonBridge.ts` still implement the superseded
  Unity Hub state-file approach and are not used by the Node daemon

## Requirements

- Node.js 22 or newer for source builds only
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
4. For a public release, the maintainer's shared Application ID is embedded at
   build time; end users do not enter it. For source builds, copy
   `config.example.json` to `config.json` and replace `discordClientId` with
   your Application ID.

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

## Build the standalone Windows release

The release build bundles the Node daemon into `UnityHubRPC.exe`. A tagged
GitHub release then wraps it in `UnityHubRPC-Setup.exe` using Inno Setup. Set
the repository secret `UNITY_HUB_RPC_CLIENT_ID` to the shared Discord
Application ID before publishing a tag:

```powershell
$env:UNITY_HUB_RPC_CLIENT_ID = 'your-public-application-id'
npm run build:windows
```

The generated executable is in `dist/`. The installer is built by the
`Windows release` GitHub Actions workflow and installs per-user without admin
rights.

## Project detection

Unity Hub's local data files list the projects you have _registered_, not the one
you currently have open, so the monitor watches for a running editor instead. Each
poll enumerates processes and looks for `Unity.exe` (`Unity` on macOS and Linux)
started with a `-projectPath` argument, which is how Unity Hub launches a project:

- **Project name** — the last path segment of `-projectPath`.
- **Unity version** — the version directory in the editor's own path
  (`.../Hub/Editor/2022.3.42f1/Editor/Unity.exe`), falling back to
  `m_EditorVersion` in the project's `ProjectSettings/ProjectVersion.txt`.
- **Hub running** — whether a `Unity Hub` process is present.

Closing the editor returns the presence to idle. A failed process query is treated
as "nothing open" rather than a crash.

The active scene is not detected: the editor does not publish it to any external
file, so reporting it would require an in-editor script installed per project.
`showSceneName` therefore has no effect at present.

## Presence mapping

| Detected state  | Details                   | State             | Artwork                     |
| --------------- | ------------------------- | ----------------- | --------------------------- |
| Project open    | Configured project format | `Unity {version}` | `unity_logo`                |
| Scene available | Configured project format | `Scene: {scene}`  | `unity_play` + `unity_logo` |
| No project      | `Unity Hub RPC`           | `Idle`            | `unity_idle`                |

The default status format is `{project} — Unity {version}`. Discord details
and state values are truncated to 128 characters. The elapsed-session start time is
anchored to when the open project was first seen and held steady until the project
changes, so Discord counts up instead of resetting on every poll.

## Configuration

`config.example.json` contains the available settings:

```json
{
  "discordClientId": "1545892869363998771",
  "updateIntervalMs": 15000,
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
