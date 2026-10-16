"""Переходы режима через реальные subprocess и синтетические Claude Code events."""

from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from threading import Barrier
from typing import Any, Optional
import unittest


PLUGIN = Path(__file__).resolve().parents[1]


def session_key(sid: str) -> str:
    return hashlib.sha256(sid.encode("utf-8")).hexdigest()


class PalychHookTests(unittest.TestCase):
    def setUp(self) -> None:
        temporary = tempfile.TemporaryDirectory(prefix="slopocop-palych-test-")
        self.addCleanup(temporary.cleanup)
        self.base = Path(temporary.name)
        self.state = self.base / "state"
        self.plugin = PLUGIN

    @property
    def state_file(self) -> Path:
        return self.state / "state.json"

    def run_event(self, event: dict[str, Any]) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, "-B", str(self.plugin / "hooks/session_hook.py"),
             "--host", "claude-code", "--state-dir", str(self.state)],
            input=json.dumps(event), text=True, capture_output=True, timeout=15,
        )

    def event(self, name: str = "SessionStart", sid: str = "parent",
              **extra: Any) -> Optional[dict[str, Any]]:
        result = self.run_event({"hook_event_name": name, "session_id": sid, **extra})
        self.assertEqual(result.returncode, 0, result.stderr)
        if not result.stdout:
            return None
        output = json.loads(result.stdout)["hookSpecificOutput"]
        self.assertEqual(output["hookEventName"], name)
        return json.loads(output["additionalContext"].splitlines()[1])

    def control(self, prompt: str, sid: str = "parent") -> dict[str, Any]:
        metadata = self.event("UserPromptSubmit", sid, prompt=prompt)
        self.assertIsNotNone(metadata)
        assert metadata is not None
        self.assertIs(metadata["saved"], True)
        return metadata

    def saved_state(self) -> dict[str, Any]:
        return json.loads(self.state_file.read_text(encoding="utf-8"))

    def assert_rejected(self, result: subprocess.CompletedProcess[str]) -> None:
        self.assertEqual(result.returncode, 1)
        self.assertEqual(result.stdout, "")
        self.assertIn("Palych adapter:", result.stderr)

    def test_off_survives_compaction_and_on_reactivates(self) -> None:
        self.assertIs(self.control("Включи Палыча")["enabled"], True)
        self.assertIs(self.control("Отключи Палыча")["enabled"], False)
        self.assertIs(self.event(source="compact")["enabled"], False)
        self.assertIs(self.saved_state()["sessions"][session_key("parent")], False)
        self.assertNotIn(session_key("parent"), self.saved_state()["emitted"])
        self.assertIs(self.control("Enable palych.")["enabled"], True)
        self.assertIs(self.event(source="compact")["enabled"], True)
        self.assertIn(session_key("parent"), self.saved_state()["emitted"])

    def test_default_changes_preserve_explicit_session_overrides(self) -> None:
        self.control("Enable palych", sid="explicit")
        self.control("Отключи постоянное включение Палыча", sid="defaults")
        self.assertIs(self.saved_state()["always_on"], False)
        self.assertIs(self.event(sid="new", source="startup")["enabled"], False)
        self.assertIs(self.event(sid="explicit", source="resume")["enabled"], True)
        self.control("Enable palych always", sid="defaults")
        self.assertIs(self.event(sid="newer", source="startup")["enabled"], True)
        self.control("Turn off palych", sid="one-session")
        self.assertIs(self.saved_state()["always_on"], True)
        self.assertIs(self.event(sid="explicit", source="compact")["enabled"], True)
        self.assertIs(self.event(sid="another", source="startup")["enabled"], True)

    def test_task_data_and_subagent_events_cannot_change_parent_mode(self) -> None:
        self.control("Включи Палыча")
        before = self.state_file.read_bytes()
        for prompt in (
            "Объясни cache invalidation",
            "«Отключи Палыча»",
            "Объясни фразу: Отключи Палыча",
            "```\nTurn off palych\n```",
        ):
            with self.subTest(prompt=prompt):
                self.assertIsNone(self.event("UserPromptSubmit", prompt=prompt))
                self.assertEqual(self.state_file.read_bytes(), before)
        for name, extra in (
            ("UserPromptSubmit", {"prompt": "Отключи Палыча"}),
            ("SessionStart", {"source": "compact"}),
        ):
            with self.subTest(event=name):
                self.assertIsNone(self.event(name, agent_id="child", **extra))
                self.assertEqual(self.state_file.read_bytes(), before)
        self.assertIs(self.event(source="compact")["enabled"], True)

    def test_invalid_session_ids_never_acknowledge_or_modify_state(self) -> None:
        self.control("Enable palych")
        before = self.state_file.read_bytes()
        for sid in (None, "", "  ", 42, [], {}):
            for name, extra in (
                ("UserPromptSubmit", {"prompt": "Turn off palych"}),
                ("SessionStart", {"source": "compact"}),
            ):
                with self.subTest(sid=sid, event=name):
                    self.assert_rejected(self.run_event({
                        "hook_event_name": name, "session_id": sid, **extra,
                    }))
                    self.assertEqual(self.state_file.read_bytes(), before)
        self.assert_rejected(self.run_event({
            "hook_event_name": "UserPromptSubmit", "prompt": "Turn off palych",
        }))
        self.assertEqual(self.state_file.read_bytes(), before)

    def test_corrupt_state_is_reported_without_overwriting(self) -> None:
        self.state.mkdir()
        for original in (
            b"{broken json\n",
            b'{"always_on":"yes","sessions":{}}\n',
            b'{"always_on":true,"sessions":{"not-a-digest":true}}\n',
            b'{"always_on":true,"sessions":{},"emitted":{"bad":"bad"}}\n',
        ):
            with self.subTest(state=original):
                self.state_file.write_bytes(original)
                for event in (
                    {"hook_event_name": "SessionStart", "session_id": "parent", "source": "compact"},
                    {"hook_event_name": "UserPromptSubmit", "session_id": "parent", "prompt": "Enable palych"},
                ):
                    self.assert_rejected(self.run_event(event))
                    self.assertEqual(self.state_file.read_bytes(), original)

    def test_missing_core_cannot_commit_activation_or_emission(self) -> None:
        self.plugin = self.base / "plugin"
        hooks = self.plugin / "hooks"
        hooks.mkdir(parents=True)
        shutil.copy2(PLUGIN / "hooks/session_hook.py", hooks / "session_hook.py")
        event = {"hook_event_name": "UserPromptSubmit", "session_id": "parent", "prompt": "Enable palych"}
        self.assert_rejected(self.run_event(event))
        self.assertFalse(self.state_file.exists())
        self.control("Turn off palych")
        before = self.state_file.read_bytes()
        self.assert_rejected(self.run_event(event))
        self.assertEqual(self.state_file.read_bytes(), before)
        core = self.plugin / "skills/palych/SKILL.md"
        core.parent.mkdir(parents=True)
        shutil.copy2(PLUGIN / "skills/palych/SKILL.md", core)
        self.assertIs(self.control("Enable palych")["enabled"], True)
        self.assertIs(self.saved_state()["sessions"][session_key("parent")], True)
        self.assertIn(session_key("parent"), self.saved_state()["emitted"])

    def test_session_id_is_hashed_and_cannot_escape_state_directory(self) -> None:
        self.state = self.base / "nested" / "state"
        sid = "../../escape"
        self.control("Enable palych", sid=sid)
        self.assertEqual(self.saved_state()["sessions"], {session_key(sid): True})
        self.assertNotIn(sid, self.state_file.read_text(encoding="utf-8"))
        self.assertFalse((self.base / "escape").exists())
        self.assertEqual(self.state_file.stat().st_mode & 0o777, 0o600)
        self.assertIs(self.event(sid=sid, source="resume")["enabled"], True)

    def test_eight_concurrent_saves_keep_every_override(self) -> None:
        sessions = {f"parallel-{i}": i % 2 == 0 for i in range(8)}
        barrier = Barrier(8)

        def save(item: tuple[str, bool]) -> None:
            sid, enabled = item
            barrier.wait(timeout=15)
            metadata = self.control("Enable palych" if enabled else "Turn off palych", sid)
            self.assertIs(metadata["enabled"], enabled)

        with ThreadPoolExecutor(max_workers=8) as pool:
            list(pool.map(save, sessions.items()))
        self.assertEqual(self.saved_state()["sessions"], {
            session_key(sid): enabled for sid, enabled in sessions.items()
        })
        for sid, enabled in sessions.items():
            self.assertIs(self.event(sid=sid, source="resume")["enabled"], enabled)


if __name__ == "__main__":
    unittest.main()
