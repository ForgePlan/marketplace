"""Переходы режима через реальные subprocess и синтетические Claude Code events."""

from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from threading import Barrier
from typing import Any, Optional
import unittest


PLUGIN = Path(__file__).resolve().parents[1]
LEGACY_HOME_STATE = Path(".local") / "state" / "palych" / "claude-code"
NEW_HOME_STATE = Path(".local") / "state" / "slopocop" / "claude-code"


def session_key(sid: str) -> str:
    return hashlib.sha256(sid.encode("utf-8")).hexdigest()


class SlopocopHookTests(unittest.TestCase):
    def setUp(self) -> None:
        temporary = tempfile.TemporaryDirectory(prefix="slopocop-hook-test-")
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

    def run_default(self, home: Path, *args: str,
                    stdin: str = "") -> subprocess.CompletedProcess[str]:
        # No --state-dir: exercises the real default location under a temporary HOME.
        return subprocess.run(
            [sys.executable, "-B", str(self.plugin / "hooks/session_hook.py"),
             "--host", "claude-code", *args],
            input=stdin, text=True, capture_output=True, timeout=15,
            env={**os.environ, "HOME": str(home)},
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
        self.assertIn("Slopocop adapter:", result.stderr)

    def test_off_survives_compaction_and_on_reactivates(self) -> None:
        self.assertIs(self.control("Включи Slopocop")["enabled"], True)
        self.assertIs(self.control("Отключи Slopocop")["enabled"], False)
        self.assertIs(self.event(source="compact")["enabled"], False)
        self.assertIs(self.saved_state()["sessions"][session_key("parent")], False)
        self.assertNotIn(session_key("parent"), self.saved_state()["emitted"])
        self.assertIs(self.control("Enable Slopocop.")["enabled"], True)
        self.assertIs(self.event(source="compact")["enabled"], True)
        self.assertIn(session_key("parent"), self.saved_state()["emitted"])

    def test_default_changes_preserve_explicit_session_overrides(self) -> None:
        self.control("Enable Slopocop", sid="explicit")
        self.control("Отключи постоянное включение Slopocop", sid="defaults")
        self.assertIs(self.saved_state()["always_on"], False)
        self.assertIs(self.event(sid="new", source="startup")["enabled"], False)
        self.assertIs(self.event(sid="explicit", source="resume")["enabled"], True)
        self.control("Enable Slopocop always", sid="defaults")
        self.assertIs(self.event(sid="newer", source="startup")["enabled"], True)
        self.control("Turn off Slopocop", sid="one-session")
        self.assertIs(self.saved_state()["always_on"], True)
        self.assertIs(self.event(sid="explicit", source="compact")["enabled"], True)
        self.assertIs(self.event(sid="another", source="startup")["enabled"], True)

    def test_task_data_and_subagent_events_cannot_change_parent_mode(self) -> None:
        self.control("Включи Slopocop")
        before = self.state_file.read_bytes()
        for prompt in (
            "Объясни cache invalidation",
            "«Отключи Slopocop»",
            "Объясни фразу: Отключи Slopocop",
            "```\nTurn off Slopocop\n```",
        ):
            with self.subTest(prompt=prompt):
                self.assertIsNone(self.event("UserPromptSubmit", prompt=prompt))
                self.assertEqual(self.state_file.read_bytes(), before)
        for name, extra in (
            ("UserPromptSubmit", {"prompt": "Отключи Slopocop"}),
            ("SessionStart", {"source": "compact"}),
        ):
            with self.subTest(event=name):
                self.assertIsNone(self.event(name, agent_id="child", **extra))
                self.assertEqual(self.state_file.read_bytes(), before)
        self.assertIs(self.event(source="compact")["enabled"], True)

    def test_legacy_public_commands_are_not_aliases(self) -> None:
        self.control("Включи Slopocop")
        before = self.state_file.read_bytes()
        for prompt in (
            "Enable palych",
            "Enable palych for this conversation",
            "Включи Палыча",
            "включи palych для этого разговора",
            "Turn off palych",
            "Отключи Палыча",
            "Enable palych always",
            "Отключи постоянное включение Палыча",
        ):
            with self.subTest(prompt=prompt):
                self.assertIsNone(self.event("UserPromptSubmit", prompt=prompt))
                self.assertEqual(self.state_file.read_bytes(), before)

    def test_invalid_session_ids_never_acknowledge_or_modify_state(self) -> None:
        self.control("Enable Slopocop")
        before = self.state_file.read_bytes()
        for sid in (None, "", "  ", 42, [], {}):
            for name, extra in (
                ("UserPromptSubmit", {"prompt": "Turn off Slopocop"}),
                ("SessionStart", {"source": "compact"}),
            ):
                with self.subTest(sid=sid, event=name):
                    self.assert_rejected(self.run_event({
                        "hook_event_name": name, "session_id": sid, **extra,
                    }))
                    self.assertEqual(self.state_file.read_bytes(), before)
        self.assert_rejected(self.run_event({
            "hook_event_name": "UserPromptSubmit", "prompt": "Turn off Slopocop",
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
                    {"hook_event_name": "UserPromptSubmit", "session_id": "parent", "prompt": "Enable Slopocop"},
                ):
                    self.assert_rejected(self.run_event(event))
                    self.assertEqual(self.state_file.read_bytes(), original)

    def test_missing_core_cannot_commit_activation_or_emission(self) -> None:
        self.plugin = self.base / "plugin"
        hooks = self.plugin / "hooks"
        hooks.mkdir(parents=True)
        shutil.copy2(PLUGIN / "hooks/session_hook.py", hooks / "session_hook.py")
        event = {"hook_event_name": "UserPromptSubmit", "session_id": "parent", "prompt": "Enable Slopocop"}
        self.assert_rejected(self.run_event(event))
        self.assertFalse(self.state_file.exists())
        self.control("Turn off Slopocop")
        before = self.state_file.read_bytes()
        self.assert_rejected(self.run_event(event))
        self.assertEqual(self.state_file.read_bytes(), before)
        core = self.plugin / "skills/slopocop/SKILL.md"
        core.parent.mkdir(parents=True)
        shutil.copy2(PLUGIN / "skills/slopocop/SKILL.md", core)
        self.assertIs(self.control("Enable Slopocop")["enabled"], True)
        self.assertIs(self.saved_state()["sessions"][session_key("parent")], True)
        self.assertIn(session_key("parent"), self.saved_state()["emitted"])

    def test_session_id_is_hashed_and_cannot_escape_state_directory(self) -> None:
        self.state = self.base / "nested" / "state"
        sid = "../../escape"
        self.control("Enable Slopocop", sid=sid)
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
            metadata = self.control("Enable Slopocop" if enabled else "Turn off Slopocop", sid)
            self.assertIs(metadata["enabled"], enabled)

        with ThreadPoolExecutor(max_workers=8) as pool:
            list(pool.map(save, sessions.items()))
        self.assertEqual(self.saved_state()["sessions"], {
            session_key(sid): enabled for sid, enabled in sessions.items()
        })
        for sid, enabled in sessions.items():
            self.assertIs(self.event(sid=sid, source="resume")["enabled"], enabled)

    def test_default_state_imports_validated_legacy_once_and_keeps_off(self) -> None:
        home = self.base / "home"
        legacy = home / LEGACY_HOME_STATE
        legacy.mkdir(parents=True)
        off_key = session_key("off-session")
        on_key = session_key("on-session")
        # Default stays on; only an explicit per-session override is off. The
        # import must carry both, without the test recreating the off it checks.
        original = json.dumps({"always_on": True,
                               "sessions": {off_key: False, on_key: True}}).encode("utf-8")
        (legacy / "state.json").write_bytes(original)

        event = json.dumps({
            "hook_event_name": "SessionStart", "session_id": "off-session", "source": "startup",
        })
        run = self.run_default(home, stdin=event)
        self.assertEqual(run.returncode, 0, run.stderr)
        context = json.loads(run.stdout)["hookSpecificOutput"]["additionalContext"]
        self.assertIs(json.loads(context.splitlines()[1])["enabled"], False)

        migrated_path = home / NEW_HOME_STATE / "state.json"
        migrated = json.loads(migrated_path.read_text(encoding="utf-8"))
        self.assertIs(migrated["always_on"], True)
        self.assertEqual(migrated["sessions"], {off_key: False, on_key: True})
        # The previous installation's data is imported, never edited or removed.
        self.assertEqual((legacy / "state.json").read_bytes(), original)

        # Import happens once: later damage to the legacy file cannot reach the
        # state that already exists.
        (legacy / "state.json").write_bytes(b'{"always_on": false, "sessions": {"x": false}}')
        follow_up = self.run_default(home, stdin=json.dumps({
            "hook_event_name": "SessionStart", "session_id": "fresh", "source": "startup",
        }))
        self.assertEqual(follow_up.returncode, 0, follow_up.stderr)
        fresh = json.loads(follow_up.stdout)["hookSpecificOutput"]["additionalContext"]
        self.assertIs(json.loads(fresh.splitlines()[1])["enabled"], True)
        self.assertEqual(json.loads(migrated_path.read_text(encoding="utf-8"))["sessions"],
                         {off_key: False, on_key: True})

    def test_existing_state_is_not_overwritten_by_legacy_state(self) -> None:
        home = self.base / "home"
        legacy = home / LEGACY_HOME_STATE
        legacy.mkdir(parents=True)
        key = session_key("parent")
        (legacy / "state.json").write_bytes(
            json.dumps({"always_on": True, "sessions": {key: True}}).encode("utf-8"))

        state_dir = home / NEW_HOME_STATE
        state_dir.mkdir(parents=True)
        (state_dir / "state.json").write_bytes(
            json.dumps({"always_on": True, "sessions": {key: False}}).encode("utf-8"))

        result = self.run_default(home, "set", "--session", "other", "--mode", "on")
        self.assertEqual(result.returncode, 0, result.stderr)
        saved = json.loads((state_dir / "state.json").read_text(encoding="utf-8"))
        self.assertIs(saved["sessions"][key], False)
        self.assertIs(saved["sessions"][session_key("other")], True)

    def test_corrupt_legacy_state_is_rejected_without_new_commit(self) -> None:
        home = self.base / "home"
        legacy = home / LEGACY_HOME_STATE
        legacy.mkdir(parents=True)
        broken = b'{"always_on":"yes","sessions":{}}\n'
        (legacy / "state.json").write_bytes(broken)

        result = self.run_default(home, "set", "--session", "parent", "--mode", "on")
        self.assert_rejected(result)
        self.assertEqual((legacy / "state.json").read_bytes(), broken)
        self.assertFalse((home / NEW_HOME_STATE / "state.json").exists())

    def test_explicit_state_dir_is_isolated_from_legacy_default_state(self) -> None:
        home = self.base / "home"
        legacy = home / LEGACY_HOME_STATE
        legacy.mkdir(parents=True)
        key = session_key("parent")
        original = json.dumps({"always_on": False, "sessions": {key: False}}).encode("utf-8")
        (legacy / "state.json").write_bytes(original)

        result = subprocess.run(
            [sys.executable, "-B", str(self.plugin / "hooks/session_hook.py"),
             "--host", "claude-code", "--state-dir", str(self.state),
             "set", "--session", "parent", "--mode", "on"],
            text=True, capture_output=True, timeout=15,
            env={**os.environ, "HOME": str(home)},
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIs(json.loads(result.stdout)["enabled"], True)
        saved = self.saved_state()
        self.assertIs(saved["always_on"], True)
        self.assertEqual(saved["sessions"], {key: True})
        self.assertEqual((legacy / "state.json").read_bytes(), original)


if __name__ == "__main__":
    unittest.main()
