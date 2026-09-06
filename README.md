# Unity Hub → Discord Rich Presence

Show your active Unity project on Discord: project name, Unity version, active
scene, and elapsed session time — without a bot token, without a Unity Editor
plugin, and without sending anything anywhere except Discord's local IPC pipe.

```
┌─────────────────────────────────────────────┐
│ MyAwesomeGame                               │
│ Scene: MainMenu                             │
│ ⏱  Unity 2022.3.1f1                         │
└─────────────────────────────────────────────┘
```

The production daemon is a single TypeScript/Node.js process. It reads Unity
Hub's local state, transforms it into Rich Presence, and talks to Discord over
local IPC. The Python parser remains in `python/` for cross-platform parser
testing and development, but is not required to run the installed daemon.

## How it detects things

Unity Hub state files differ by operating system. The poller checks the local
`editor` and `projects.json` files in the standard Unity Hub data directory:

| Platform | Location |
| --- | --- |
| Windows | `%APPDATA%\UnityHub` and `%LOCALAPPDATA%\UnityHub` |
| macOS | `~/Library/Application Support/UnityHub` |
| Linux | `$XDG_CONFIG_HOME/UnityHub` or `~/.config/UnityHub` |

The parser tolerates missing or malformed files and reports an idle state when
there is no project to display. It accepts common Unity Hub fields such as
`projectPath`, `projectName`, `editorVersion`, and `activeScene`.

The Python process emits JSON lines like:

```json
{
  "project": "MyAwesomeGame",
  "version": "2022.3.1f1",
  "scene": "MainMenu",
  "unityHubRunning": true,
  "timestamp": 1735689600
}
```

## Install

Prerequisites:

* Node.js 22 or newer
* Python 3.10 or newer
* Unity Hub
* Discord desktop app

```bash
git clone https://github.com/bluxo1/RPC-for-Unity-Hub.git
cd RPC-for-Unity-Hub
npm install
pip install -r python/requirements.txt
```

## Discord application setup

1. Open <https://discord.com/developers/applications> and create an application.
2. Copy its **Application ID**.
3. Upload Rich Presence artwork with these asset keys:
   `unity_logo`, `unity_play`, and `unity_idle`.
4. Copy `config.example.json` to `config.json` and set `discordClientId`.

No bot token, OAuth secret, server permission, or Discord account credential is
needed. Discord desktop must be running; the web client does not expose the
local IPC socket.

## Run

```bash
npm run build
npm start
```

To register automatic startup on Windows after building:

```powershell
npm run install:windows
```

This creates a per-user `UnityHubRPC` Scheduled Task that launches the daemon
hidden at Windows logon. Remove it with:

```powershell
npm run uninstall:windows
```

The daemon keeps running quietly, waits for Discord if it is closed, and
switches to idle while no Unity project is detected. Its log is stored at
`%LOCALAPPDATA%\UnityHubRPC\unity-hub-rpc.log`.

For TypeScript development:

```bash
npm run dev
```

To inspect the optional Python parser independently:

```bash
python python/state_monitor.py
```

The poll interval is five seconds by default and is read from `config.json`.

## Presence mapping

| Unity state | Details | State | Artwork |
| --- | --- | --- | --- |
| Project open | Project name and configured format | `Unity {version}` | `unity_logo` |
| Scene active | Project name and configured format | `Scene: {scene}` | `unity_play` + `unity_logo` |
| Idle | `Unity Hub RPC` | `Idle` | `unity_idle` |

Presence fields are truncated to Discord's 128-character limit. Active project
states include the poller's timestamp as the elapsed-session start time.

## Configuration

`config.example.json` documents the intended settings:

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

The schema validates the client ID, update interval, display flags, idle timeout,
and custom status format. Invalid or missing configuration falls back to safe
defaults. Config hot reload and the interactive tray menu are planned for the
next phase.

## Security and privacy

* **Local state only.** Unity Hub files are read locally; no Unity or project
  contents are uploaded.
* **Discord IPC only.** The Node process communicates with the local Discord
  desktop socket and makes no application network requests.
* **No credentials.** The project never reads Discord tokens, OAuth secrets, or
  Unity account credentials.
* **No injection.** It is not a Unity Editor plugin and does not hook, modify,
  or inject into Unity Hub or the Unity Editor.
* **User-level execution.** No administrator or elevated permissions are needed.

## Tests and quality

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

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Nothing appears in Discord | Discord desktop is not running, or Activity Privacy is disabled |
| `Client ID is Invalid` | `discordClientId` is missing or still a placeholder |
| The card is idle | Unity Hub state files are missing, malformed, or no project is active |
| The scene is not shown | `showSceneName` is disabled or Unity Hub did not expose an active scene |
| Python does not start | Python is not on `PATH`; set the `PYTHON` environment variable for Node |
| Discord disconnects | The bridge retries on later poll cycles and reconnects when Discord returns |

## Roadmap

The repository currently contains the autonomous Node core: state parsing,
presence transformation, Discord IPC, local logging, Windows autostart scripts,
and tests. Planned follow-up work includes a fully wired system tray, a signed
single-file installer, config hot reload, and release automation.

## License

MIT — see [LICENSE](LICENSE).
