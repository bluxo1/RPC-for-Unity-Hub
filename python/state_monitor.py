"""Poll Unity Hub's local files and emit one state JSON object per line."""

import argparse
import json
import os
import time
from pathlib import Path
from typing import Any

from models import UnityHubState
from unity_hub_paths import find_state_files


def _first_string(data: Any, keys: tuple[str, ...]) -> str | None:
    if isinstance(data, dict):
        for key in keys:
            value = data.get(key)
            if isinstance(value, str) and value:
                return value
    return None


def _read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def parse_state_documents(
    documents: list[Any], *, hub_running: bool, timestamp: float | None = None
) -> UnityHubState:
    project = version = scene = project_path = None
    for document in documents:
        for item in document if isinstance(document, list) else [document]:
            if not isinstance(item, dict):
                continue
            project_path = project_path or _first_string(
                item, ("projectPath", "path", "location")
            )
            project = project or _first_string(item, ("project", "projectName", "name"))
            version = version or _first_string(
                item, ("version", "unityVersion", "editorVersion")
            )
            scene = scene or _first_string(item, ("scene", "sceneName", "activeScene"))
            if project_path and not project:
                project = Path(project_path).name
    return UnityHubState(
        project,
        version,
        scene,
        project_path,
        hub_running,
        timestamp if timestamp is not None else time.time(),
    )


def read_current_state(platform: str | None = None) -> UnityHubState:
    files = find_state_files(platform)
    return parse_state_documents(
        [_read_json(path) for path in files], hub_running=bool(files)
    )


def poll(interval_ms: int = 5000, platform: str | None = None) -> None:
    while True:
        print(json.dumps(read_current_state(platform).to_json_dict()), flush=True)
        time.sleep(max(interval_ms, 250) / 1000)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--interval-ms",
        type=int,
        default=int(os.getenv("UNITY_HUB_RPC_INTERVAL_MS", "5000")),
    )
    poll(parser.parse_args().interval_ms)
