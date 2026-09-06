# Architecture — Unity Hub RPC

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Unity Hub RPC                                   │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐  │
│  │ State Monitor │──▶│  Transformer │──▶│   Discord    │──▶│   Discord    │  │
│  │   (Poller)   │   │  (Formatter) │   │    Client    │   │    Server    │  │
│  └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘  │
│         │                  │                  │                              │
│         ▼                  ▼                  ▼                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                      │
│  │  File System │   │   Template   │   │  IPC Pipe    │                      │
│  │  (Unity Hub) │   │   Engine     │   │  (Discord)   │                      │
│  └──────────────┘   └──────────────┘   └──────────────┘                      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        Config Manager                                │   │
│  │   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐            │   │
│  │   │   Loader     │   │   Watcher    │   │  Validator   │            │   │
│  │   └──────────────┘   └──────────────┘   └──────────────┘            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        Tray Controller                               │   │
│  │   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐            │   │
│  │   │    Icon      │   │    Menu      │   │   Tooltip    │            │   │
│  │   └──────────────┘   └──────────────┘   └──────────────┘            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. State Monitor (Poller)
- **Responsibility**: Detect active Unity projects by reading Unity Hub's local state files
- **Polling Strategy**: Configurable interval with exponential backoff on errors
- **File Targets**:
  - `editor` — active editor process & project binding
  - `projects.json` — project metadata cache
- **Platform Abstraction**: Resolves `%APPDATA%`, `~`, and environment variables per OS

### 2. Transformer (Formatter)
- **Responsibility**: Convert raw Unity Hub state into Discord-compatible presence payloads
- **Template Engine**: String interpolation with placeholders `{project}`, `{version}`, `{scene}`
- **Idle Logic**: Switch to idle presence when no active project detected for `idleTimeoutMinutes`
- **Validation**: Truncate strings to Discord limits (128 chars for details/state)

### 3. Discord Client
- **Responsibility**: Maintain IPC connection to Discord and push Rich Presence updates
- **Protocol**: Discord RPC over named pipe (Windows) or Unix domain socket (macOS/Linux)
- **Lifecycle**: Connect → Handshake → Activity Update → Keep-alive → Disconnect
- **Error Handling**: Reconnect with backoff on pipe disconnect

### 4. Config Manager
- **Responsibility**: Load, validate, and hot-reload user configuration
- **Sources** (priority order):
  1. `config.json` in application directory
  2. Environment variables (`UHRPC_*` prefix)
  3. Built-in defaults
- **Hot Reload**: FileSystemWatcher triggers re-validation without restart

### 5. Tray Controller
- **Responsibility**: Provide minimal system tray UI for status and control
- **Features**:
  - Context menu: Open Config | Reload | Exit
  - Icon states: Connected / Disconnected / Idle / Error
  - Tooltip: Current project name or last error

## Data Flow

```
[Unity Hub writes state] ──▶ [File System]
                                    │
                                    ▼
[State Monitor polls] ──────▶ [Raw JSON]
                                    │
                                    ▼
[Transformer parses] ───────▶ [UnityHubState]
                                    │
                                    ▼
[Formatter applies template] ▶ [DiscordPresence]
                                    │
                                    ▼
[Discord Client sends] ─────▶ [Discord IPC]
                                    │
                                    ▼
[Discord displays] ─────────▶ [User Profile]
```

## Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Runtime | .NET 6.0+ | Cross-platform, single-file publish, async/await |
| Discord IPC | discord-rpc C# wrapper | Mature, battle-tested, minimal dependencies |
| Tray UI | H.NotifyIcon / Gtk# / Cocoa# | Native tray per platform |
| Config | System.Text.Json | Built-in, fast, source generators |
| Logging | Microsoft.Extensions.Logging | Standard, pluggable, structured |

## Directory Structure

```
unity-hub-rpc/
├── src/
│   ├── UnityHubRPC/
│   │   ├── Program.cs
│   │   ├── Services/
│   │   │   ├── StateMonitor.cs
│   │   │   ├── PresenceTransformer.cs
│   │   │   ├── DiscordClient.cs
│   │   │   ├── ConfigManager.cs
│   │   │   └── TrayController.cs
│   │   ├── Models/
│   │   │   ├── UnityHubState.cs
│   │   │   ├── DiscordPresence.cs
│   │   │   └── AppConfig.cs
│   │   └── Platforms/
│   │       ├── WindowsPlatform.cs
│   │       ├── MacOSPlatform.cs
│   │       └── LinuxPlatform.cs
│   └── UnityHubRPC.Core/
│       └── Shared types, constants, interfaces
├── tests/
│   └── UnityHubRPC.Tests/
│       ├── StateMonitorTests.cs
│       ├── TransformerTests.cs
│       └── DiscordClientTests.cs
└── docs/
    ├── ARCHITECTURE.md
    ├── PRD.md
    ├── Design.md
    └── PHASES.md
```

## Error Handling Strategy

| Scenario | Behavior |
|----------|----------|
| Unity Hub not running | Show idle presence, retry every poll cycle |
| Discord not running | Queue updates, reconnect on next poll |
| Config file invalid | Fall back to defaults, log warning, show tray error |
| State file unreadable | Back off polling, show error tooltip |
| Presence update fails | Retry with backoff, max 5 attempts |

## Security Considerations

- **No network calls** — all data is local file system reads
- **No elevation required** — runs as standard user
- **No process injection** — reads public JSON state files only
- **Config isolation** — user-scoped config directory

## Performance Targets

| Metric | Target |
|--------|--------|
| Memory footprint | < 50 MB RAM |
| CPU usage | < 1% at idle |
| Poll latency | < 10 ms per cycle |
| Startup time | < 2 seconds |
| Presence sync delay | < 5 seconds (configurable) |
