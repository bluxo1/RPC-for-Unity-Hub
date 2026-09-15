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
- Config loading and validation from `config.json`, with hot reload
- Idle timeout that clears the presence instead of leaving a stale activity card
- Project path display, and `{path}` in the status format
- A system tray with status icons, a tooltip, and a config/reload/logs/exit menu,
  which degrades to headless when no tray is available
- Discord field truncation to the 128-character limit
- A stable elapsed-session timer anchored to the open project
- File logging and a Windows logon startup task
- TypeScript and Python tests with GitHub Actions CI
- A standalone Windows executable and Inno Setup release pipeline

Not implemented:

- Active scene reporting. The editor does not publish its active scene, so this
  would need an in-editor script; the transformer handles a scene if one is ever
  supplied, but nothing supplies one
- macOS and Linux packaging. The daemon code paths exist, but only Windows is
  packaged and tested
- `python/` and `src/bridge/pythonBridge.ts` implement the superseded Unity Hub
  state-file approach. Nothing in the daemon imports them, but CI still runs
  their tests; they are candidates for removal

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

The daemon polls every fifteen seconds by default. Each poll enumerates the
process table (about 0.8 s on Windows) and Discord rate-limits activity updates,
so a shorter interval mostly wastes CPU; lower `updateIntervalMs` if you want
faster sync at a higher cost.

Environment variables:

| Variable                  | Effect                                            |
| ------------------------- | ------------------------------------------------- |
| `UNITY_HUB_RPC_CONFIG`    | Load the config file from another path            |
| `UNITY_HUB_RPC_CONSOLE`   | Set to `1` to mirror log messages to stderr       |
| `UNITY_HUB_RPC_NO_TRAY`   | Set to `1` to skip the tray and run headless      |
| `UNITY_HUB_RPC_CLIENT_ID` | Override the Discord application ID at build time |

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

## Tray

The daemon puts an icon in the notification area so you can tell at a glance
whether it is connected, and manage it without a terminal.

| Icon  | Meaning                                                       |
| ----- | ------------------------------------------------------------- |
| Green | A Unity project is open and the presence is being published   |
| Grey  | Running, no project open (during the idle grace period)       |
| Red   | Discord could not be reached — is the desktop client running? |

Selecting the icon opens a menu with the running version, **Open Config
Folder**, **Reload Configuration**, **Show Debug Logs**, and **Exit**. The
config folder item opens the directory holding `config.json`, not the file, so
you can edit in whichever editor you prefer; the daemon picks the change up on
its own. **Reload Configuration** is there for the case where you cannot wait
for the watcher, and **Show Debug Logs** writes the current log to your
temporary directory and opens it.

Exit removes the icon and clears the presence from your Discord profile, so no
stale "playing Unity Hub RPC" entry is left behind.

The icon is drawn at runtime as a 32×32 PNG (or a `.ico` on Windows), so there
are no image files to ship or keep in sync. If the tray cannot start — a
headless session, a locked-down machine, or a missing helper binary — the
daemon logs it and keeps running without the icon. Set
`UNITY_HUB_RPC_NO_TRAY=1` to skip it deliberately.

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
`showSceneName` therefore has no effect at present, and the second line falls
back to the project path (`showProjectPath`) or the editor version.

## Presence mapping

| Detected state        | Details                   | State                  | Artwork                     |
| --------------------- | ------------------------- | ---------------------- | --------------------------- |
| Project open          | Configured project format | `Unity {version}`      | `unity_logo`                |
| Scene available       | Configured project format | `Scene: {scene}`       | `unity_play` + `unity_logo` |
| `showProjectPath`     | Configured project format | Project directory path | `unity_logo`                |
| No project            | `Unity Hub RPC`           | `Idle`                 | `unity_idle`                |
| Idle past the timeout | Activity cleared          | —                      | —                           |

The default status format is `{project} — Unity {version}`, and `{path}` is also
available. Discord details and state values are truncated to 128 characters. The
elapsed-session start time is anchored to when the open project was first seen
and held steady until the project changes, so Discord counts up instead of
resetting on every poll.

Only one fact fits on the second line, so an active scene takes precedence over
the project path, which takes precedence over the version already shown in the
details.

Once no project has been open for `idleTimeoutMinutes`, the activity is removed
from your profile entirely. Discord keeps displaying the last activity it was
given until something clears it, so without this the idle placeholder would sit
there for as long as the daemon ran. Set the timeout to `0` to clear immediately
and never show the placeholder.

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

| Setting              | Default                       | Effect                                                                   |
| -------------------- | ----------------------------- | ------------------------------------------------------------------------ |
| `discordClientId`    | shared app ID                 | Which Discord application owns the presence                              |
| `updateIntervalMs`   | `15000`                       | Poll interval, minimum 250 ms                                            |
| `showSceneName`      | `true`                        | Show `Scene: {scene}` when a scene is known                              |
| `showProjectPath`    | `false`                       | Show the project's directory path                                        |
| `idleTimeoutMinutes` | `5`                           | Minutes of no project before the presence is cleared; `0` clears at once |
| `customStatusFormat` | `{project} — Unity {version}` | The details line; supports `{project}`, `{version}`, `{path}`            |

The schema validates every field, and each one has a default, so a partial file
is valid and a first run needs no configuration at all.

`config.json` is reloaded while the daemon runs — no restart required. The
watcher follows the parent directory rather than the file itself, so it keeps
working across editors that save by renaming a temp file over the target, and
picks up a config created after startup. If an edit is invalid, the running
configuration is kept and the reason is logged; one half-typed line will not
silently reset your settings.

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
  index.ts           Entry point: wiring, signals, shutdown
  state/             Unity editor process discovery and parsing
  presence/          Discord activity transformation and idle policy
  discord/           Discord IPC client
  config/            Configuration schema, loader, and file watcher
  tray/              Tray controller and generated icon data
  bridge/            Optional Python bridge (superseded, see docs/PHASES.md)
  logging/           File and console logging
python/              Optional Python parser and models
tests/ts/            TypeScript tests (Vitest)
tests/python/        Python tests (pytest)
docs/                Architecture, phases, and design notes
installer/           Inno Setup script for the Windows installer
scripts/             Build, icon generation, and Windows startup scripts
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
