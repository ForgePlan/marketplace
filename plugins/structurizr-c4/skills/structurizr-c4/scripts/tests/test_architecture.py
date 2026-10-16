import contextlib
import io
import json
from pathlib import Path
import signal
import socket
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import architecture


class ViewerOwnershipTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory(prefix="viewer-ownership-")
        self.addCleanup(self.temporary.cleanup)
        self.root = (Path(self.temporary.name) / "native workspace").resolve()
        self.started_at = "Sat Oct 17 12:34:56 2026"
        self.command = "/opt/java/bin/java -jar /opt/structurizr.war local " + str(self.root)
        self.state = {"pid": 12345, "directory": str(self.root), "port": 18080,
                      "url": "http://127.0.0.1:18080", "started_at": self.started_at}
        cache = patch.object(architecture, "CACHE", Path(self.temporary.name) / "cache")
        cache.start()
        self.addCleanup(cache.stop)

    def test_process_identity_reads_start_time_and_full_command_with_spaces(self) -> None:
        output = "  Sat Oct 17 12:34:56 2026 " + self.command + "\n"
        result = subprocess.CompletedProcess([], 0, stdout=output)
        with patch.object(architecture.subprocess, "run", return_value=result) as run:
            self.assertEqual(architecture.process_identity(12345), (self.started_at, self.command))
        self.assertEqual(run.call_args.kwargs["env"]["LC_ALL"], "C")
        self.assertIn("-ww", run.call_args.args[0])

    def test_unreadable_or_incomplete_process_identity_fails_closed(self) -> None:
        for result in (subprocess.CompletedProcess([], 1, stdout=""),
                       subprocess.CompletedProcess([], 0, stdout="Sat Oct 17")):
            with self.subTest(result=result), patch.object(
                    architecture.subprocess, "run", return_value=result):
                self.assertIsNone(architecture.process_identity(12345))
        with patch.object(architecture.subprocess, "run", side_effect=OSError):
            self.assertIsNone(architecture.process_identity(12345))
        with patch.object(architecture.subprocess, "run") as run:
            self.assertIsNone(architecture.process_identity(0))
            self.assertIsNone(architecture.process_identity(-12345))
            run.assert_not_called()

    def test_exact_workspace_and_recorded_process_start_are_owned(self) -> None:
        with patch.object(architecture, "process_identity", return_value=(self.started_at, self.command)):
            self.assertTrue(architecture.owned_process(self.state, self.root))

    def test_workspace_prefixes_and_nonlocal_subcommands_are_not_owned(self) -> None:
        commands = [self.command + "-other", self.command + "/child",
                    self.command + " --extra", self.command.replace(" local ", " localhost "),
                    "/opt/other/bin/viewer local " + str(self.root)]
        for command in commands:
            with self.subTest(command=command), patch.object(
                    architecture, "process_identity", return_value=(self.started_at, command)):
                self.assertFalse(architecture.owned_process(self.state, self.root))
        prefix = self.root.with_name("native")
        state = {**self.state, "directory": str(prefix)}
        with patch.object(architecture, "process_identity", return_value=(self.started_at, self.command)):
            self.assertFalse(architecture.owned_process(state, prefix))

    def test_reused_pid_or_missing_start_identity_never_authorizes_stop(self) -> None:
        state_path, _ = architecture.state_paths(self.root)
        for started_at in ("Sat Oct 17 12:34:55 2026", None, 1792230896.0):
            state = {**self.state, "started_at": started_at}
            state_path.write_text(json.dumps(state), encoding="utf-8")
            with self.subTest(started_at=started_at), patch.object(
                    architecture, "process_identity", return_value=(self.started_at, self.command)), \
                    patch.object(architecture.os, "kill") as kill, \
                    contextlib.redirect_stdout(io.StringIO()):
                architecture.stop(self.root)
                kill.assert_not_called()
            self.assertFalse(state_path.exists())

    def test_foreign_workspace_state_does_not_signal_its_viewer(self) -> None:
        prefix = self.root.with_name("native")
        state_path, _ = architecture.state_paths(prefix)
        state_path.write_text(json.dumps({**self.state, "directory": str(prefix)}), encoding="utf-8")
        with patch.object(architecture, "process_identity", return_value=(self.started_at, self.command)), \
                patch.object(architecture.os, "kill") as kill, \
                contextlib.redirect_stdout(io.StringIO()):
            architecture.stop(prefix)
            kill.assert_not_called()
        self.assertFalse(state_path.exists())

    def test_stop_signals_only_a_verified_instance(self) -> None:
        state_path, _ = architecture.state_paths(self.root)
        state_path.write_text(json.dumps(self.state), encoding="utf-8")
        with patch.object(architecture, "owned_process", side_effect=[True, False, False]), \
                patch.object(architecture.os, "kill") as kill, \
                contextlib.redirect_stdout(io.StringIO()):
            architecture.stop(self.root)
        kill.assert_called_once_with(self.state["pid"], signal.SIGTERM)
        self.assertFalse(state_path.exists())

    def test_repeated_start_reuses_the_verified_instance(self) -> None:
        with patch.object(architecture, "read_state", return_value=self.state), \
                patch.object(architecture, "process_identity", return_value=(self.started_at, self.command)), \
                patch.object(architecture, "validate") as validate, \
                patch.object(architecture.subprocess, "Popen") as popen, \
                contextlib.redirect_stdout(io.StringIO()) as output:
            architecture.start(self.root, 18081)
        self.assertEqual(output.getvalue().strip(), self.state["url"])
        validate.assert_not_called()
        popen.assert_not_called()

    def test_occupied_port_is_rejected_without_starting_a_process(self) -> None:
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", 0))
            listener.listen()
            port = listener.getsockname()[1]
            with patch.object(architecture, "validate"), \
                    patch.object(architecture.subprocess, "Popen") as popen, \
                    self.assertRaisesRegex(RuntimeError, "Port is busy"):
                architecture.start(self.root, port)
            popen.assert_not_called()


if __name__ == "__main__":
    unittest.main()
