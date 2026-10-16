"""Codex: восстановление после compact и наследование режима при fork."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


PLUGIN = Path(__file__).resolve().parents[1]


class CodexLifecycleTests(unittest.TestCase):
    def setUp(self) -> None:
        temporary = tempfile.TemporaryDirectory(prefix='palych-codex-test-')
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)

    def event(self, source: str = 'startup', sid: str = 'parent',
              prompt=None, **extra):
        event = {'hook_event_name': 'UserPromptSubmit' if prompt else 'SessionStart',
                 'session_id': sid, 'source': source, **extra}
        if prompt is not None:
            event['prompt'] = prompt
        run = subprocess.run(
            [sys.executable, '-B', str(PLUGIN / 'hooks/session_hook.py'),
             '--host', 'codex', '--state-dir', str(self.root / 'state')],
            input=json.dumps(event), text=True, capture_output=True, timeout=15,
        )
        self.assertEqual(run.returncode, 0, run.stderr)
        if not run.stdout:
            return None
        context = json.loads(run.stdout)['hookSpecificOutput']['additionalContext']
        return json.loads(context.splitlines()[1])

    def test_resume_deduplicates_but_compact_restores_current_mode(self) -> None:
        self.assertTrue(self.event()['enabled'])
        self.assertIsNone(self.event('resume'))
        self.assertFalse(self.event(prompt='Turn off palych')['enabled'])
        self.assertFalse(self.event('compact')['enabled'])
        self.assertFalse(self.event('resume')['enabled'])
        self.assertTrue(self.event(prompt='Enable palych')['enabled'])
        self.assertIsNone(self.event('resume'))
        self.assertTrue(self.event('compact')['enabled'])

    def test_fork_inherits_parent_off_without_disabling_other_sessions(self) -> None:
        self.event(prompt='Turn off palych')
        rollout = self.root / 'child.jsonl'
        rollout.write_text(json.dumps({
            'type': 'session_meta',
            'payload': {'id': 'child', 'forked_from_id': 'parent'},
        }) + '\n', encoding='utf-8')
        self.assertFalse(self.event('fork', 'child', transcript_path=str(rollout))['enabled'])
        self.assertFalse(self.event('compact', 'child')['enabled'])
        self.assertTrue(self.event(sid='unrelated')['enabled'])

    def test_fork_with_on_parent_emits_child_bound_helper(self) -> None:
        # ON-родитель уже передал ядро до создания дочерней беседы.
        self.assertTrue(self.event()['enabled'])
        rollout = self.root / 'child.jsonl'
        rollout.write_text(json.dumps({
            'type': 'session_meta',
            'payload': {'id': 'child', 'forked_from_id': 'parent'},
        }) + '\n', encoding='utf-8')
        metadata = self.event('fork', 'child', transcript_path=str(rollout))
        self.assertIsNotNone(metadata)
        assert metadata is not None
        self.assertTrue(metadata['enabled'])
        argv = list(metadata['set_mode_argv'])
        mode_index = argv.index('--mode')
        argv[mode_index + 1] = 'off'
        # Исполняем предоставленную ребёнку команду, а не только проверяем её текст.
        run = subprocess.run(
            [sys.executable, '-B', *argv[1:]],
            capture_output=True, text=True, timeout=15,
        )
        self.assertEqual(run.returncode, 0, run.stderr)
        # Меняется только дочерний режим; родитель остаётся включённым.
        self.assertFalse(self.event('compact', 'child')['enabled'])
        self.assertTrue(self.event('compact', 'parent')['enabled'])


if __name__ == '__main__':
    unittest.main()
