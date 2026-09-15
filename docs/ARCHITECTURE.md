# Architecture — Unity Hub RPC

## System Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                               Unity Hub RPC                                  │
│                                                                              │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐                 │
│  │ Unity Process │───▶│  Transformer  │───▶│    Discord    │                 │
│  │    Monitor    │    │  + IdlePolicy │    │    Client     │                 │
│  └───────────────┘    └───────────────┘    └───────────────┘                 │
│         │                     │                    │                         │
│         ▼                     ▼                    ▼                         │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐                 │
│  │   OS process  │    │  Presence +   │    │  Discord IPC  │                 │
│  │  table (CIM,  │    │  session clock│    │  pipe/socket  │                 │
│  │     ps)       │    │               │    │               │                 │
│  └───────────────┘    └───────────────┘    └───────────────┘                 │
│                                                                              │
│  ┌──────────────────────────────┐    ┌──────────────────────────────┐        │
│  │        Config Manager        │    │        Tray Controller       │        │
│  │  Loader │ Watcher │ Schema   │    │   Icon  │  Menu  │ Tooltip   │        │
│  └──────────────────────────────┘    └──────────────────────────────┘        │
└──────────────────────────────────────────────────────────────────────────────┘
```

The daemon is a single Node.js process. There is no Unity Editor plugin and no
bot token: it reads the OS process table for a running editor, turns that into a
presence payload, and pushes it over Discord's local IPC transport.

## Component Breakdown

### 1. Unity Process Monitor (`src/state/`)

- **Responsibility**: Find the Unity _editor_ process and the project it was told to open.
- **Source of truth**: the process table, not a state file. Unity Hub's own state
  files (`%APPDATA%\UnityHub\…`) were the original approach and proved less
  reliable than the editor's command line; `unityProcess.ts` replaced them.
- **Detection**: enumerates `Unity.exe` / `Unity Hub.exe` on Windows via CIM
  (`Get-CimInstance Win32_Process` — `wmic` is gone on current Windows builds),
  and `ps -Ao command=` on macOS and Linux. A platform abstraction resolves the
  right call per OS.
- **Selection**: a process counts as an open project only if its command line
  carries `-projectpath <dir>`. Unity Hub itself is excluded, so a Hub that is
  merely open never produces a presence.
- **Version**: taken from the version segment of the executable path
  (`…/2022.3.1f1/Editor/Unity.exe`), falling back to
  `ProjectSettings/ProjectVersion.txt` inside the project.
- **Session clock** (`unityHubMonitor.ts`): Discord renders `startTimestamp` as a
  live counter, so it is anchored per project path and held stable while that
  project stays open. Recomputing it each poll would pin the timer at 00:00.
- **Polling**: `updateIntervalMs` between cycles; a scan that outlives its
  interval does not overlap the next one.

### 2. Transformer and Idle Policy (`src/presence/`)

- **Responsibility**: Convert a `UnityHubState` into a Discord presence payload.
- **Template**: `{project}`, `{version}`, and `{path}` are substituted from
  `customStatusFormat`.
- **Second line**: an active scene wins over the project path, which wins over the
  version already shown in `details` — only one fact fits.
- **Truncation**: `details` and `state` are capped at Discord's 128-character limit.
- **Idle policy**: while no project is open the daemon publishes the idle
  placeholder, then clears the activity once `idleTimeoutMinutes` elapses.
  Discord keeps showing the last activity it was handed until something clears
  it, so without this an idle daemon would pin a stale card to the profile for as
  long as it ran. A timeout of `0` clears immediately and never shows the placeholder.
- **Assets**: `unity_logo`, `unity_idle`, and `unity_play` are uploaded to the
  Discord application; missing keys degrade to a blank image rather than an error.

### 3. Discord Client (`src/discord/client.ts`)

- **Responsibility**: Hold the IPC session and push activity updates.
- **Protocol**: Discord RPC over a named pipe (Windows) or Unix domain socket
  (macOS, Linux), via `@xhayper/discord-rpc` — no bot token and no gateway.
- **Login timeout**: Discord does not answer the handshake for an unknown client
  id, so `login()` is raced against a 10 s timeout. Without it every poll would
  stack another socket behind a login that never settles.
- **Serialised updates**: one update is in flight at a time.
- **Clear**: dropping the activity never opens a connection — with Discord closed
  there is nothing to clear, and dialling out on every idle poll would undo the
  reconnect behaviour entirely.
- **Error handling**: a failed update resets the client and retries on the next
  poll; a disconnected socket marks the presence cleared, since Discord drops the
  activity itself when the pipe closes.

### 4. Config Manager (`src/config/`)

- **Responsibility**: Load, validate, and hot-reload `config.json`.
- **Validation**: a [zod](https://zod.dev) schema; every field has a default, so
  first run is zero-config and a partial file is valid.
- **Sources**: `config.json` (path overridable with `UNITY_HUB_RPC_CONFIG`)
  layered over built-in defaults. There is no environment-variable override for
  individual settings.
- **Startup**: an unreadable or invalid file logs a warning and uses defaults.
- **Hot reload** (`watcher.ts`): the parent directory is watched rather than the
  file, because editors and formatters save by writing a temp file and renaming
  it over the target, and a file recreated that way is reported as `add` rather
  than `change` — both events feed the same reload. Watching the directory also
  catches a config that appears while the daemon runs.
- **Rejected reloads**: an invalid edit keeps the running configuration. Silently
  substituting defaults mid-session would throw away working settings because of
  one half-typed line.

### 5. Tray Controller (`src/tray/`)

- **Responsibility**: Status icon, tooltip, and the context menu.
- **Menu**: Open Config Folder | Reload Configuration | Show Debug Logs | Exit,
  with the running version as a disabled header item.
- **Icons**: `unity_play`-style status dots — green connected, grey idle, red
  error — generated by `scripts/generate-icons.mjs` and committed as base64, so
  no build step depends on image files on disk.
- **Helper binary**: systray2 spawns a separate native binary resolved as
  `./traybin/<name>` relative to the working directory _before_ consulting its
  own package. The installer therefore ships `traybin/` beside the executable and
  registers the startup shortcut with `-WorkingDirectory '{app}'`.
- **Strictly optional**: a missing helper, a headless session, `ready()` hanging,
  or `UNITY_HUB_RPC_NO_TRAY=1` all degrade to a no-op controller. Presence
  updates never depend on the tray. Listeners attach only after `ready()`, since
  systray2 builds its readline interface inside `init()`.

### 6. Logging (`src/logging/logger.ts`)

- Appends to `%LOCALAPPDATA%\UnityHubRPC\unity-hub-rpc.log` on Windows and
  `$XDG_STATE_HOME/unity-hub-rpc/unity-hub-rpc.log` elsewhere.
- Logging failures are swallowed: it must never stop the daemon.
- `UNITY_HUB_RPC_CONSOLE=1` mirrors the log to stderr for development.

## Data Flow

```
[Unity editor runs with -projectpath]
              │
              ▼
[Monitor enumerates processes]  ──▶  UnityRuntime { editor, hubRunning }
              │
              ▼
[Session clock anchors timestamp]
              │
              ▼
[IdlePolicy decides]  ──▶  update | clear
              │
              ▼
[Transformer applies template + truncation]  ──▶  DiscordPresence
              │
              ▼
[Discord client sends over local IPC]  ──▶  Discord profile
```

## Technology Stack

| Layer               | Technology                    | Rationale                                                     |
| ------------------- | ----------------------------- | ------------------------------------------------------------- |
| Runtime             | Node.js 22+ (TypeScript, ESM) | Cross-platform, no runtime install for the packaged build     |
| Packaging           | Node SEA + esbuild + postject | One self-contained `.exe`, no Node install required           |
| Process enumeration | CIM (Windows), `ps` (POSIX)   | The editor's command line carries the project path            |
| Discord IPC         | `@xhayper/discord-rpc`        | Discord RPC without a bot token or gateway                    |
| Config              | `zod` + `chokidar`            | Schema validation with defaults; cross-platform change events |
| Tray                | `systray2`                    | Native tray via a helper binary on all three platforms        |
| Tests               | Vitest (TS), pytest (Python)  | Fast, no build step for tests                                 |
| Installer           | Inno Setup                    | Free, scriptable, per-user install with no elevation          |

## Directory Structure

```
unity-hub-rpc/
├── src/
│   ├── index.ts                  # Wiring: config, monitor, idle policy, tray
│   ├── version.ts                # Baked in at bundle time
│   ├── config/
│   │   ├── schema.ts             # zod schema + defaults
│   │   ├── loader.ts             # Read/validate, distinguish missing from broken
│   │   └── watcher.ts            # Directory-level hot reload
│   ├── discord/
│   │   └── client.ts             # IPC session, login timeout, clear
│   ├── presence/
│   │   ├── transformer.ts        # UnityHubState → DiscordPresence
│   │   └── idlePolicy.ts         # Idle timeout → update | clear
│   ├── state/
│   │   ├── unityProcess.ts       # Process enumeration, path/version parsing
│   │   └── unityHubMonitor.ts    # Poll loop + session clock
│   ├── tray/
│   │   ├── tray.ts               # systray2 wiring with headless fallback
│   │   └── icons.ts              # Generated base64 status icons
│   └── logging/
│       └── logger.ts
├── python/                       # Superseded Unity Hub state-file parser
├── tests/
│   ├── ts/                       # Vitest
│   └── python/                   # pytest
├── scripts/
│   ├── bundle.mjs                # esbuild bundle, bakes in client id and version
│   ├── generate-icons.mjs        # Emits src/tray/icons.ts
│   ├── build-windows.ps1         # SEA executable + traybin staging
│   ├── install-windows.ps1
│   └── uninstall-windows.ps1
├── installer/
│   └── UnityHubRPC.iss
└── docs/
```

## Error Handling Strategy

| Scenario                  | Behavior                                                          |
| ------------------------- | ----------------------------------------------------------------- |
| No Unity project open     | Publish the idle placeholder, clear it after `idleTimeoutMinutes` |
| Unity Hub open, no editor | Idle — the Hub alone is not a session                             |
| Discord not running       | Login times out after 10 s; retry on the next poll                |
| Process query fails       | Treated as "nothing open"; never crashes the daemon               |
| Config invalid at startup | Warn and use defaults                                             |
| Config invalid on reload  | Reject the reload, keep the running configuration, log the reason |
| Tray helper missing/hung  | No-op tray; presence updates continue unaffected                  |
| Log write fails           | Swallowed — logging never stops the daemon                        |

## Security Considerations

- **No elevation** — per-user install, runs as a standard user.
- **No outbound network** — the only remote party is the Discord client on the
  same machine, over a local pipe or socket; the app makes no HTTP requests.
- **No injection** — reads the public process table only.
- **No telemetry** — nothing is collected or transmitted.
- **Local state only** — the config and log stay in the user's own directories.

## Performance Targets

| Metric              | Target                                       |
| ------------------- | -------------------------------------------- |
| Memory footprint    | < 50 MB RAM                                  |
| CPU usage           | < 1% at idle                                 |
| Startup time        | < 2 seconds                                  |
| Presence sync delay | bounded by `updateIntervalMs` (default 15 s) |

The default poll interval is deliberately well above one second: each cycle
enumerates processes (~0.8 s on Windows) and Discord rate-limits activity updates
to a handful per 20 s, so polling faster only burns CPU.
