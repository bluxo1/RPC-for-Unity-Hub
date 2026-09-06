"""Typed models for Unity Hub state."""
from dataclasses import dataclass
from typing import Any



@dataclass(frozen=True)
class UnityHubState:
    project: str | None = None
    version: str | None = None
    scene: str | None = None
    project_path: str | None = None
    unity_hub_running: bool = False
    timestamp: float = 0.0

    def to_json_dict(self) -> dict[str, Any]:
        return {
            "project": self.project,
            "version": self.version,
            "scene": self.scene,
            "projectPath": self.project_path,
            "unityHubRunning": self.unity_hub_running,
            "timestamp": self.timestamp,
        }
