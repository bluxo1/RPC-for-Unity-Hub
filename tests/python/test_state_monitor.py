import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parents[2] / "python"))
from state_monitor import parse_state_documents
def test_parses_project_path_and_editor_version():
    state = parse_state_documents([{"path": "/games/SpaceGame", "editorVersion": "2022.3.1f1"}], hub_running=True, timestamp=1)
    assert state.project == "SpaceGame"
    assert state.version == "2022.3.1f1"
def test_handles_empty_documents_as_idle():
    state = parse_state_documents([], hub_running=False, timestamp=1)
    assert state.project is None
    assert not state.unity_hub_running
