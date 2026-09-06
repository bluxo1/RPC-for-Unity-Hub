"""Cross-platform Unity Hub state file locations."""
from pathlib import Path
import os
import sys

def candidate_state_paths(platform: str | None = None, environ: dict[str, str] | None = None) -> list[Path]:
    platform = platform or sys.platform
    environ = environ or os.environ
    if platform == "win32":
        appdata, local = environ.get("APPDATA"), environ.get("LOCALAPPDATA")
        roots = [Path(value) / "UnityHub" for value in (appdata, local) if value]
    elif platform == "darwin":
        roots = [Path.home() / "Library/Application Support/UnityHub"]
    else:
        roots = [Path(environ.get("XDG_CONFIG_HOME", Path.home() / ".config")) / "UnityHub"]
    return [path for root in roots for path in (root / "editor", root / "projects.json")]

def find_state_files(platform: str | None = None, environ: dict[str, str] | None = None) -> list[Path]:
    return [path for path in candidate_state_paths(platform, environ) if path.is_file()]
