# Development Phases — Unity Hub RPC

## Phase 0: Foundation (Week 1)

**Goal**: Project scaffolding, tooling, and CI/CD pipeline

### Deliverables

- [ ] Repository setup with `.gitignore`, `LICENSE`, `README.md`
- [ ] Solution structure with `src/` and `tests/` directories
- [ ] CI pipeline (GitHub Actions): build, test, lint
- [ ] Release pipeline: automated versioning and artifact publishing
- [ ] Development environment documentation

### Tasks

| # | Task | Owner | Est. |
| --- | --- | --- | --- |
| 0.1 | Initialize .NET solution | — | 2h |
| 0.2 | Set up GitHub Actions CI | — | 4h |
| 0.3 | Configure code analysis (StyleCop, EditorConfig) | — | 2h |
| 0.4 | Set up test project with xUnit | — | 2h |
| 0.5 | Write development setup guide | — | 2h |

### Definition of Done

- `dotnet build` succeeds with zero warnings
- CI passes on push to `main`
- Test project runs and reports results

---

## Phase 1: Core Engine (Weeks 2–3)

**Goal**: State detection and Discord IPC communication

### Deliverables

- [ ] Cross-platform file path resolution
- [ ] Unity Hub state file parser
- [ ] Polling engine with configurable intervals
- [ ] Discord IPC client (connect, handshake, update, disconnect)
- [ ] Basic presence formatter

### Tasks

| # | Task | Owner | Est. |
| --- | --- | --- | --- |
| 1.1 | Implement platform abstraction layer | — | 6h |
| 1.2 | Build Unity Hub state file parser | — | 8h |
| 1.3 | Implement polling engine with backoff | — | 6h |
| 1.4 | Integrate discord-rpc library | — | 8h |
| 1.5 | Build presence transformer | — | 6h |
| 1.6 | Unit tests for parser and transformer | — | 6h |

### Definition of Done

- Detects active Unity project within 5 seconds
- Updates Discord status successfully
- Handles Discord not running gracefully
- All core logic has unit test coverage > 80%

---

## Phase 2: Configuration & Tray (Week 4)

**Goal**: User-facing configuration and system tray interface

### Deliverables

- [ ] JSON configuration loader with validation
- [ ] Configuration hot-reload via FileSystemWatcher
- [ ] System tray icon with state indicators
- [ ] Context menu: Open Config, Reload, Exit
- [ ] Tooltip with current status

### Tasks

| # | Task | Owner | Est. |
| --- | --- | --- | --- |
| 2.1 | Design config schema and defaults | — | 4h |
| 2.2 | Implement config loader + validator | — | 6h |
| 2.3 | Add FileSystemWatcher for hot-reload | — | 4h |
| 2.4 | Implement tray icon (Windows) | — | 6h |
| 2.5 | Implement tray icon (macOS) | — | 6h |
| 2.6 | Implement tray icon (Linux) | — | 6h |
| 2.7 | Build context menu and tooltip | — | 6h |

### Definition of Done

- Config file changes reflect without restart
- Tray icon shows correct state (connected/idle/error)
- Menu actions work on all three platforms
- App runs silently in background

---

## Phase 3: Polish & Advanced Features (Week 5)

**Goal**: Scene tracking, idle detection, and error resilience

### Deliverables

- [ ] Scene name detection from Unity Editor (optional)
- [ ] Idle timeout with automatic status switch
- [ ] Exponential backoff for error recovery
- [ ] Logging system (file + tray accessible)
- [ ] Installer packages for all platforms

### Tasks

| # | Task | Owner | Est. |
| --- | --- | --- | --- |
| 3.1 | Research scene detection approach | — | 4h |
| 3.2 | Implement idle detection logic | — | 6h |
| 3.3 | Add error backoff and recovery | — | 4h |
| 3.4 | Integrate structured logging | — | 4h |
| 3.5 | Build Windows installer (MSI/MSIX) | — | 6h |
| 3.6 | Build macOS package (DMG) | — | 6h |
| 3.7 | Build Linux package (AppImage/DEB) | — | 6h |

### Definition of Done

- Scene name appears in status when enabled
- Idle state triggers after configured timeout
- App recovers from temporary Discord disconnections
- Installers work on clean VMs for each platform

---

## Phase 4: Release & Post-Launch (Week 6+)

**Goal**: Public release, documentation, and community feedback

### Deliverables

- [ ] v1.0.0 release on GitHub
- [ ] Complete documentation (README, wiki, FAQ)
- [ ] Issue templates and contribution guidelines
- [ ] Initial community feedback collection
- [ ] Hotfix for critical bugs

### Tasks

| # | Task | Owner | Est. |
| --- | --- | --- | --- |
| 4.1 | Final QA on all platforms | — | 8h |
| 4.2 | Write release notes | — | 2h |
| 4.3 | Publish GitHub release with assets | — | 2h |
| 4.4 | Announce on relevant communities | — | 2h |
| 4.5 | Monitor issues and respond | — | ongoing |
| 4.6 | Plan v1.1 roadmap based on feedback | — | 4h |

### Definition of Done

- Release published with installers for Windows, macOS, Linux
- No P0 or P1 bugs open
- At least 50 downloads in first week

---

## Future Roadmap (Post-v1.0)

### v1.1 — Customization

- Custom Discord application support (user client IDs)
- Custom status templates with more placeholders
- Per-project configuration overrides
- Dark/light tray icon themes

### v1.2 — GUI Preferences

- Native preferences window (replacing JSON editing)
- Live preview of status format
- Import/export configuration

### v1.3 — Collaboration

- Party/lobby integration for shared projects
- "Join" button for team members
- Project activity history (local only)

### v2.0 — Ecosystem

- Plugin API for custom data sources
- Web dashboard for analytics
- Integration with other game engines (Unreal, Godot)

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Unity Hub changes state file format | Medium | High | Version detection, graceful fallback, community reporting |
| Discord IPC protocol changes | Low | High | Use stable discord-rpc library, monitor Discord dev blog |
| Cross-platform tray inconsistencies | Medium | Medium | Extensive testing on each platform, fallback to simple icon |
| Scene detection too complex/unreliable | Medium | Medium | Make optional, disable by default, document limitations |
| Low adoption / community interest | Medium | Low | Focus on polish, share in Unity/Discord dev communities |

---

## Milestone Timeline

```javascript
Week 1    Week 2    Week 3    Week 4    Week 5    Week 6+
  │         │         │         │         │         │
  ▼         ▼         ▼         ▼         ▼         ▼
┌─────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│Found│  │  Core   │  │  Core   │  │ Config  │  │ Polish  │  │ Release │
│ation│  │ Engine  │  │ Engine  │  │  + Tray │  │ + Adv   │  │ + Post  │
└─────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘
   │        │          │          │          │          │
   ▼        ▼          ▼          ▼          ▼          ▼
M0: Setup M1: Detect  M2: Discord M3: Tray   M4: Polish M5: Ship
```