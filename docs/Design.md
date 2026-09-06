# Design Document — Unity Hub RPC

## 1. Design Philosophy

**Minimal. Native. Invisible.**

Unity Hub RPC is a background utility, not a foreground application. The design prioritizes:
- **Zero friction** — install and forget
- **Native feel** — platform-appropriate tray icons and menus
- **Information clarity** — status at a glance, details on demand
- **Respect for focus** — never steals attention from the user's actual work

---

## 2. Visual Identity

### 2.1 Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--unity-black` | `#000000` | Primary background, tray icon base |
| `--unity-white` | `#FFFFFF` | Icon highlights, text on dark |
| `--unity-gray` | `#4A4A4A` | Idle state, inactive elements |
| `--status-green` | `#3BA55D` | Connected, active project |
| `--status-red` | `#ED4245` | Disconnected, error state |
| `--status-yellow` | `#FAA81A` | Warning, loading state |

### 2.2 Typography
- **System fonts only** — no bundled typefaces
- Windows: `Segoe UI`
- macOS: `SF Pro`
- Linux: `Cantarell` / `Ubuntu`

### 2.3 Iconography

#### Tray Icon Set (16×16, 32×32, 48×48 px)
| Icon | State | Description |
|------|-------|-------------|
| ![connected] | Connected + Active | Unity cube logo in white on black, green dot |
| ![idle] | Connected + Idle | Unity cube logo in gray, no dot |
| ![disconnected] | Disconnected | Unity cube logo with red slash |
| ![error] | Error | Warning triangle overlay |

#### Discord Rich Presence Assets
| Asset Key | Size | Description |
|-----------|------|-------------|
| `unity_logo` | 512×512 | Classic Unity cube on dark background |
| `unity_hub` | 512×512 | Unity Hub icon |
| `unity_idle` | 512×512 | Muted gray cube |
| `unity_play` | 512×512 | Cube with green play triangle |
| `unity_build` | 512×512 | Cube with orange gear |

---

## 3. System Tray Design

### 3.1 Tray Icon Behavior

```
┌────────────────────────────────────────────┐
│  Single Click        │  Show tooltip       │
│  Double Click        │  Open config folder │
│  Right Click         │  Show context menu  │
│  Hover (1s)          │  Show tooltip       │
└────────────────────────────────────────────┘
```

### 3.2 Tooltip Design

**Active State:**
```
┌──────────────────────────────┐
│  🟢 Unity Hub RPC            │
│  MyAwesomeGame — Unity 2022.3│
│  Session: 2h 14m             │
└──────────────────────────────┘
```

**Idle State:**
```
┌──────────────────────────────┐
│  ⚪ Unity Hub RPC            │
│  Idle — No project active    │
│  Waiting for Unity Hub...    │
└──────────────────────────────┘
```

**Error State:**
```
┌──────────────────────────────┐
│  🔴 Unity Hub RPC            │
│  Error: Discord not found    │
│  Click to retry              │
└──────────────────────────────┘
```

### 3.3 Context Menu Design

```
┌─────────────────────────────────┐
│  Unity Hub RPC        v1.0.0   │  ← Header (non-interactive)
├─────────────────────────────────┤
│  📁 Open Config Folder          │
│  🔄 Reload Configuration        │
│  ─────────────────────────────  │
│  📋 Copy Status to Clipboard    │
│  ─────────────────────────────  │
│  ⚙️  Preferences...             │  ← Opens config.json in editor
│  🐛 Show Debug Logs             │
│  ─────────────────────────────  │
│  ❌ Exit                        │
└─────────────────────────────────┘
```

**Menu Item States:**
- Normal: `#FFFFFF` text on transparent
- Hover: `#1A1A1A` background, `#FFFFFF` text
- Disabled: `#666666` text, no hover effect
- Separator: 1px `#333333` line

---

## 4. Discord Rich Presence Design

### 4.1 Presence Layout

```
┌──────────────────────────────────────────┐
│                                          │
│     ┌─────────────┐                      │
│     │             │   Playing a game     │
│     │  [Large]    │   ─────────────────  │
│     │  Image      │   MyAwesomeGame      │  ← details (project name)
│     │             │   Unity 2022.3.1f1   │  ← state (version)
│     └─────────────┘   02:14:33 elapsed   │  ← timestamp
│          🔲                              │
│     [Small] unity_logo                   │
│                                          │
└──────────────────────────────────────────┘
```

### 4.2 Presence States Matrix

| Unity State | Discord Details | Discord State | Large Image | Small Image |
|-------------|-----------------|---------------|-------------|-------------|
| Project open | `{project}` | `Unity {version}` | `unity_logo` | — |
| Scene active | `{project}` | `Scene: {scene}` | `unity_play` | `unity_logo` |
| Building | `{project}` | `Building...` | `unity_build` | `unity_logo` |
| Idle | `Unity Hub RPC` | `Idle` | `unity_idle` | — |
| Error | `Unity Hub RPC` | `Connection lost` | `unity_idle` | — |

### 4.3 Text Formatting Rules

```
Details (Line 1):
- Max length: 128 characters
- Truncation: ellipsis at end
- Format: "{project}" or "Unity Hub RPC"

State (Line 2):
- Max length: 128 characters
- Truncation: ellipsis at end
- Format: "Unity {version}" or "Scene: {scene}" or "Idle"

Large Image Text:
- Max length: 128 characters
- Default: "Unity Engine"
- Active: "{project} — Unity {version}"

Small Image Text:
- Max length: 128 characters
- Default: "Unity Hub RPC"
```

---

## 5. Configuration UI (Future)

> Note: v1.0 uses JSON-only configuration. A GUI preferences window is planned for v1.2.

### 5.1 Preferences Window Mockup

```
┌─────────────────────────────────────────────┐
│  ⚙️  Preferences                    [×]    │
├─────────────────────────────────────────────┤
│                                             │
│  General                                    │
│  ┌─────────────────────────────────────┐   │
│  │  ☐ Start with system               │   │
│  │  ☐ Minimize to tray on close       │   │
│  │  ☐ Show scene name in status       │   │
│  │  ☐ Show project path in tooltip    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Status Format                              │
│  ┌─────────────────────────────────────┐   │
│  │  {project} — Unity {version}       │   │
│  │  [Available: {project}, {version}, │   │
│  │   {scene}, {platform}]             │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Discord                                    │
│  ┌─────────────────────────────────────┐   │
│  │  Client ID: [________________]     │   │
│  │  ☐ Use custom application          │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Advanced                                   │
│  ┌─────────────────────────────────────┐   │
│  │  Poll interval: [5000] ms          │   │
│  │  Idle timeout: [5] minutes         │   │
│  └─────────────────────────────────────┘   │
│                                             │
│              [Cancel]    [Save Changes]     │
└─────────────────────────────────────────────┘
```

---

## 6. Animation & Motion

### 6.1 Tray Icon Animations
| Trigger | Animation | Duration |
|---------|-----------|----------|
| State change | Fade between icons | 200ms |
| Error | Gentle pulse (opacity 0.5→1) | 1s loop |
| Loading | Subtle rotation | 1s loop |

### 6.2 Menu Animations
| Trigger | Animation | Duration |
|---------|-----------|----------|
| Menu open | Fade + slide down 4px | 150ms ease-out |
| Menu close | Fade out | 100ms ease-in |
| Hover item | Background color fade | 100ms |

---

## 7. Platform-Specific Adaptations

### 7.1 Windows
- Use native Windows 11 context menu styling when available
- Support Windows 10/11 dark mode tray icons
- Respect system accent color for highlights

### 7.2 macOS
- Use macOS native menu bar (top right, not system tray)
- Support macOS dark mode auto-switching
- Follow macOS Human Interface Guidelines for menu spacing

### 7.3 Linux
- Support both AppIndicator and XEmbed tray protocols
- Respect GTK theme for menu styling
- Support both light and dark GNOME themes

---

## 8. Accessibility

- **Keyboard navigation**: All tray menu items accessible via keyboard
- **Screen readers**: Tooltip and menu items have descriptive labels
- **High contrast**: Icons maintain visibility in high-contrast modes
- **Color independence**: Icon shapes (not just colors) indicate state

---

## 9. Asset Specifications

### 9.1 Icon Export Checklist
- [ ] 16×16 px (tray, Windows/Linux)
- [ ] 18×18 px (menu bar, macOS)
- [ ] 32×32 px (tray @2x)
- [ ] 48×48 px (tray @3x, Linux)
- [ ] 256×256 px (app icon)
- [ ] 512×512 px (Discord assets)

### 9.2 File Formats
- Tray icons: `.ico` (Windows), `.icns` (macOS), `.png` (Linux)
- Discord assets: `.png` with transparency
- Source files: `.svg` (vector master)

---

## 10. Design Principles Checklist

- [ ] Does it feel native to the platform?
- [ ] Can the user understand the status at a glance?
- [ ] Does it respect the user's focus and workflow?
- [ ] Is the visual hierarchy clear?
- [ ] Are all states visually distinct?
- [ ] Does it work in both light and dark modes?
- [ ] Are text strings localizable?
