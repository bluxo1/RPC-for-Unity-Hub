# Development Status — Unity Hub RPC

This document tracks what has actually shipped. It replaces an earlier plan
written against a .NET stack that the project never used; the daemon is
TypeScript/Node.js with an Inno Setup installer.

Legend: **[x]** done · **[~]** partial · **[ ]** not started

---

## Phase 0 — Foundation

**Goal**: Repository scaffolding, tooling, and CI/CD.

- [x] Repository layout (`src/`, `tests/`, `docs/`, `scripts/`, `installer/`)
- [x] GitHub Actions CI: build, lint, and test on push and pull request
- [x] Release pipeline: builds the executable on a `v*` tag and publishes it
- [x] Installer version stamped from the release tag
- [x] `.gitignore`, `.gitattributes`, ESLint, Prettier, EditorConfig-style config
- [ ] `LICENSE` — still absent; add before a public release

**Definition of done**: CI green on `main` — met.

---

## Phase 1 — Core Engine

**Goal**: State detection and Discord IPC.

- [x] Unity editor detection from the process table (Windows CIM, POSIX `ps`)
- [x] Project path and Unity version resolution, with `ProjectVersion.txt` fallback
- [x] Session clock anchored per project so the elapsed timer stays stable
- [x] Discord IPC client with a login timeout and reconnect-on-next-poll
- [x] Presence transformer with templates, truncation, and idle handling
- [x] Unit tests for the parser, transformer, monitor, and idle policy

**Definition of done**: detects an open project, updates Discord, and stays quiet
when Discord is unavailable — met.

---

## Phase 2 — Configuration & Tray

**Goal**: User-facing configuration and the system tray.

- [x] JSON configuration with a validating schema and defaults for every field
- [x] Hot reload without a restart, covering rename-over saves and recreated files
- [x] Tests for the loader and watcher, including the reject-invalid-reload path
- [x] Tray icon with connected / idle / error states and a status tooltip
- [x] Context menu: Open Config Folder, Reload Configuration, Show Debug Logs, Exit
- [x] Tray helper shipped with the installer
- [x] Graceful headless fallback when no tray is available

**Definition of done**: config changes apply without a restart and the tray
reflects state — met.

---

## Phase 3 — Polish & Advanced Features

**Goal**: Idle behaviour, resilience, logging, and packaging.

- [x] `idleTimeoutMinutes` — idle placeholder, then the presence is cleared
- [x] Config-reload resilience: a rejected reload keeps the running settings
- [x] Structured file logging with an optional console mirror
- [x] Windows installer (Inno Setup, per-user, no elevation) and standalone `.exe`
- [x] Windows logon startup task
- [~] Scene name reporting — the transformer handles `{scene}`, but nothing
  supplies it. The editor does not publish its active scene; this needs an
  in-editor script, which the project deliberately avoids depending on.
- [ ] macOS and Linux packaging (`.dmg`, AppImage/DEB). The daemon code paths
      exist, but only Windows is packaged and tested today.
- [ ] Tray icon dark/light theming.

**Definition of done**: partially met — Windows is complete; the other two
platforms still need packaging and a real test pass.

---

## Phase 4 — Release & Post-Launch

**Goal**: Public release and feedback.

- [ ] `LICENSE` file
- [ ] v1.0.0 tag and published release notes
- [ ] Screenshots or a short demo in the README
- [ ] Issue templates and contribution guidelines
- [ ] Community announcement and issue triage

---

## Known Gaps

1. **The Python bridge is dead code.** `python/` and `src/bridge/pythonBridge.ts`
   implement the original Unity Hub state-file parser that the process-based
   detection superseded. Nothing in the daemon imports them, but CI still runs
   their tests. They can be deleted, or kept as a documented fallback.
2. **Scene reporting is unimplemented** (see Phase 3).
3. **Only Windows is packaged.** The macOS and Linux code paths are untested
   against real installs.
4. **No `LICENSE`**, which blocks a public release.
5. **Discord asset keys** (`unity_logo`, `unity_idle`, `unity_play`) must be
   uploaded to the Discord application or the images render blank.
6. **The tray has no automated test.** It spawns a native helper, so it is
   covered by running the built daemon and checking that the helper process
   appears and is torn down on shutdown, not by a unit test.

---

## Future Roadmap (Post-v1.0)

### v1.1 — Customization

- Custom Discord application support (user-provided client IDs)
- More status template placeholders
- Per-project configuration overrides
- Dark/light tray icon themes

### v1.2 — GUI Preferences

- Native preferences window (replacing JSON editing)
- Live preview of the status format
- Import/export configuration

### v1.3 — Collaboration

- Party/lobby integration for shared projects
- "Join" button for team members
- Local project activity history

### v2.0 — Ecosystem

- Plugin API for custom data sources
- Web dashboard for analytics
- Integration with other engines (Unreal, Godot)

---

## Risk Register

| Risk                                                             | Likelihood | Impact | Mitigation                                                                             |
| ---------------------------------------------------------------- | ---------- | ------ | -------------------------------------------------------------------------------------- |
| Unity changes how the project path is passed on the command line | Medium     | High   | Parsing is isolated in `unityProcess.ts` with tests; fall back to `ProjectVersion.txt` |
| Discord IPC protocol changes                                     | Low        | High   | Use the maintained `@xhayper/discord-rpc` library                                      |
| Tray helper is missing from a packaged build                     | Medium     | Low    | Degrades to headless; the installer ships `traybin/`                                   |
| Cross-platform tray inconsistencies                              | Medium     | Medium | Tray is optional by design; failures never stop presence                               |
| Scene detection is unreliable                                    | Medium     | Medium | Left unimplemented rather than requiring an editor plugin                              |
| Low adoption                                                     | Medium     | Low    | Focus on polish; share in Unity and Discord dev communities                            |
