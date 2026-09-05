# Unity Hub RPC

> Discord Rich Presence integration for Unity Hub — show off what you're building, which Unity version you're running, and your current project, directly in your Discord status.

---

## Features

- **Project Detection** — Automatically detects the currently open Unity project from Unity Hub
- **Rich Presence** — Displays project name, Unity version, and elapsed session time in Discord
- **Scene Tracking** *(optional)* — Shows the active scene name when a project is running
- **Idle Detection** — Switches to an idle status when no project is active
- **Lightweight** — Runs quietly in the system tray with minimal resource usage

---

## Installation

### Prerequisites

- [Unity Hub](https://unity.com/download) installed
- [Discord](https://discord.com/download) desktop app running
- [.NET 6.0+](https://dotnet.microsoft.com/download) or compatible runtime

### Download & Run

1. Download the latest release from [Releases](../../releases)
2. Extract the archive
3. Run `UnityHubRPC.exe` (Windows) or `UnityHubRPC` (macOS/Linux)
4. The app will appear in your system tray

---

## Building from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/unity-hub-rpc.git
cd unity-hub-rpc

# Restore dependencies
dotnet restore

# Build the project
dotnet build --configuration Release

# Run
dotnet run --project src/UnityHubRPC
```

---

## Configuration

Create a `config.json` in the application directory to customize behavior:

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

| Option | Description | Default |
|--------|-------------|---------|
| `discordClientId` | Your Discord application client ID | *(built-in)* |
| `updateIntervalMs` | How often to poll Unity Hub state | `5000` |
| `showSceneName` | Display the active scene name | `true` |
| `showProjectPath` | Show full project path in tooltip | `false` |
| `idleTimeoutMinutes` | Minutes before switching to idle status | `5` |
| `customStatusFormat` | Template string for status text | see above |

---

## How It Works

Unity Hub stores project and editor state in a local JSON file (location varies by OS):

| OS | State File Path |
|----|-----------------|
| Windows | `%APPDATA%\UnityHub\editor` |
| macOS | `~/Library/Application Support/UnityHub/editor` |
| Linux | `~/.config/UnityHub/editor` |

This application polls that state, parses active project info, and pushes updates to Discord via the [Discord GameSDK](https://discord.com/developers/docs/game-sdk/sdk-starter-guide) or [discord-rpc](https://github.com/discord/discord-rpc) library.

---

## Project Structure

```
unity-hub-rpc/
├── src/
│   ├── UnityHubRPC/           # Main application
│   ├── UnityHubRPC.Core/      # Shared logic & models
│   └── UnityHubRPC.Discord/   # Discord RPC client wrapper
├── tests/
│   └── UnityHubRPC.Tests/
├── docs/
├── config.json.example
└── README.md
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-thing`
3. Commit your changes: `git commit -m 'Add amazing thing'`
4. Push to the branch: `git push origin feature/amazing-thing`
5. Open a Pull Request

Please read our [Contributing Guide](CONTRIBUTING.md) for details.

---

## License

[MIT](LICENSE) © [Your Name](https://github.com/yourusername)

---

## Acknowledgments

- [Discord GameSDK](https://discord.com/developers/docs/game-sdk) for Rich Presence APIs
- Unity and Unity Hub are trademarks of [Unity Technologies](https://unity.com/)
