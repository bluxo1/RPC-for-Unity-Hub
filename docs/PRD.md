# Product Requirements Document — Unity Hub RPC

## 1. Product Overview

**Product Name**: Unity Hub RPC  
**Version**: 1.0.0  
**Date**: 2026-09-06  
**Owner**: [Your Name]  
**Status**: Draft

### 1.1 Vision
Enable Unity developers to share their current project, engine version, and active scene with their Discord network through an elegant, zero-config Rich Presence integration.

### 1.2 Problem Statement
- Developers want to showcase their work but manually updating Discord status is tedious
- Existing solutions require editor plugins that break on Unity updates
- No lightweight, standalone tool exists that bridges Unity Hub and Discord

### 1.3 Target Audience
- Indie game developers
- Unity educators and streamers
- Game dev teams collaborating on Discord
- Hobbyist developers who want to share progress

---

## 2. Goals & Non-Goals

### 2.1 Goals (Must Have)
| ID | Goal | Priority |
|----|------|----------|
| G1 | Automatically detect active Unity project from Unity Hub | P0 |
| G2 | Display project name and Unity version in Discord status | P0 |
| G3 | Show elapsed session time in Discord | P0 |
| G4 | Run as a lightweight system tray application | P0 |
| G5 | Support Windows, macOS, and Linux | P0 |
| G6 | Require zero configuration to start | P0 |

### 2.2 Goals (Should Have)
| ID | Goal | Priority |
|----|------|----------|
| G7 | Display active scene name when project is running | P1 |
| G8 | Customizable status message templates | P1 |
| G9 | Idle detection with automatic status switch | P1 |
| G10 | Hot-reload configuration without restart | P1 |

### 2.3 Goals (Nice to Have)
| ID | Goal | Priority |
|----|------|----------|
| G11 | Show project thumbnail as Discord large image | P2 |
| G12 | Party/lobby integration for collaborative sessions | P2 |
| G13 | Web dashboard for analytics and history | P3 |

### 2.4 Non-Goals
- **Not** a Unity Editor plugin (standalone app only)
- **Not** a social network or messaging platform
- **Not** a project management or version control tool
- **Not** a performance profiler or debugger
- **Not** requiring Discord bot tokens or server permissions

---

## 3. User Stories

### 3.1 Primary User: Indie Developer
> As an indie developer, I want my Discord status to show which Unity project I'm working on so that my friends and collaborators can see what I'm building without me manually updating my status.

**Acceptance Criteria:**
- [ ] Status updates within 5 seconds of opening a Unity project
- [ ] Status clears within 5 seconds of closing all Unity projects
- [ ] Status displays project name and Unity version clearly

### 3.2 Secondary User: Game Dev Streamer
> As a game dev streamer, I want to show my active scene name in Discord so that my community knows exactly what part of the game I'm working on.

**Acceptance Criteria:**
- [ ] Scene name appears in Discord status when enabled in config
- [ ] Scene name updates in real-time as I switch scenes in Unity
- [ ] Scene name is truncated gracefully if too long

### 3.3 Tertiary User: Team Lead
> As a team lead, I want my team members' Discord statuses to show their current Unity project so I can quickly see who's working on what without asking.

**Acceptance Criteria:**
- [ ] Multiple team members can run the app simultaneously without conflicts
- [ ] Status format is consistent and readable
- [ ] App runs reliably for 8+ hour work sessions

---

## 4. Functional Requirements

### 4.1 Project Detection (FR-001 — FR-005)
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | Read Unity Hub's local state files to detect active projects | P0 |
| FR-002 | Poll for state changes at a configurable interval (default: 5s) | P0 |
| FR-003 | Handle multiple Unity Editor instances gracefully | P0 |
| FR-004 | Gracefully degrade when Unity Hub is not running | P0 |
| FR-005 | Support all Unity Hub versions from 2.0+ | P0 |

### 4.2 Discord Integration (FR-006 — FR-010)
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-006 | Connect to Discord via IPC pipe without bot token | P0 |
| FR-007 | Update Rich Presence with project name and version | P0 |
| FR-008 | Display elapsed session time (start timestamp) | P0 |
| FR-009 | Auto-reconnect to Discord if connection drops | P0 |
| FR-010 | Show appropriate idle state when no project is active | P1 |

### 4.3 Configuration (FR-011 — FR-015)
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-011 | Load configuration from `config.json` | P0 |
| FR-012 | Provide sensible defaults for all settings | P0 |
| FR-013 | Validate configuration and reject invalid values | P1 |
| FR-014 | Hot-reload configuration on file change | P1 |
| FR-015 | Support environment variable overrides | P2 |

### 4.4 System Tray (FR-016 — FR-020)
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-016 | Display tray icon on startup | P0 |
| FR-017 | Show context menu with: Open Config, Reload, Exit | P0 |
| FR-018 | Update tray icon to reflect connection state | P1 |
| FR-019 | Show tooltip with current status or last error | P1 |
| FR-020 | Minimize to tray on close (optional setting) | P2 |

---

## 5. Non-Functional Requirements

### 5.1 Performance
| ID | Requirement | Target |
|----|-------------|--------|
| NFR-001 | Memory usage | < 50 MB at steady state |
| NFR-002 | CPU usage | < 1% when idle |
| NFR-003 | Startup time | < 2 seconds |
| NFR-004 | Presence sync latency | < 5 seconds from state change |

### 5.2 Reliability
| ID | Requirement | Target |
|----|-------------|--------|
| NFR-005 | Uptime | 99.9% over 30 days |
| NFR-006 | Crash recovery | Auto-restart on crash (optional) |
| NFR-007 | Graceful degradation | All features work with partial failures |

### 5.3 Compatibility
| ID | Requirement | Target |
|----|-------------|--------|
| NFR-008 | Windows support | Windows 10, Windows 11 |
| NFR-009 | macOS support | macOS 12 (Monterey) and later |
| NFR-010 | Linux support | Ubuntu 20.04+, Fedora 35+ |
| NFR-011 | Discord support | Discord stable, PTB, Canary |
| NFR-012 | Unity Hub support | Unity Hub 2.0+ |

### 5.4 Security
| ID | Requirement | Target |
|----|-------------|--------|
| NFR-013 | No elevation | Runs as standard user |
| NFR-014 | No network calls | Local file system only |
| NFR-015 | No data collection | Zero telemetry or analytics |

---

## 6. UI/UX Requirements

### 6.1 System Tray Icon States
| State | Icon | Tooltip |
|-------|------|---------|
| Connected + Active | Green Unity logo | `{Project} — Unity {Version}` |
| Connected + Idle | Gray Unity logo | `Idle — No project active` |
| Disconnected | Red Unity logo | `Disconnected from Discord` |
| Error | Warning icon | `Error: {message}` |

### 6.2 Context Menu
```
┌─────────────────────────┐
│  Unity Hub RPC v1.0.0   │
├─────────────────────────┤
│  Open Config Folder     │
│  Reload Configuration   │
│  ─────────────────────  │
│  Show Debug Logs        │
│  ─────────────────────  │
│  Exit                   │
└─────────────────────────┘
```

---

## 7. Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Daily Active Users | 0 | 100+ | GitHub releases download count |
| Crash Rate | — | < 0.1% | Error reports / total sessions |
| Setup Time | — | < 2 min | Time from download to working status |
| User Satisfaction | — | 4.5/5 | GitHub stars / issue ratio |

---

## 8. Open Questions

1. Should we support custom Discord applications (user-provided client IDs) or ship with a built-in one?
2. How should we handle Unity Hub's state file format changes across versions?
3. Should we offer a portable (no-install) version in addition to an installer?
4. Is there value in a "Do Not Disturb" mode that temporarily disables updates?

---

## 9. Appendix

### 9.1 Glossary
| Term | Definition |
|------|------------|
| Rich Presence | Discord feature showing detailed activity info in user profiles |
| Unity Hub | Unity's project and version management application |
| IPC | Inter-Process Communication — how we talk to Discord |
| Polling | Periodic checking of file system for state changes |

### 9.2 References
- [Discord Rich Presence Documentation](https://discord.com/developers/docs/rich-presence/how-to)
- [Unity Hub Documentation](https://docs.unity3d.com/hub/manual/)
- [Discord GameSDK](https://discord.com/developers/docs/game-sdk/sdk-starter-guide)
