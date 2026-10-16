"""Контракт установки в явный файл инструкций без привязки к агенту."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


INSTALLER = Path(__file__).resolve().parents[1] / 'scripts/activate.py'
LEGACY_START = '<!-- palych:start -->\n'
LEGACY_END = '<!-- palych:end -->\n\n'
LEGACY_BODY = ('Palych is enabled by default for every chat reply in this conversation.\n'
               'An explicit request to turn it off takes priority until enabled again.\n'
               'Keep the current on/off state when compacting or handing off context.\n\n'
               'Give compact, clear replies.\n')


def legacy_block(body: str = LEGACY_BODY) -> str:
    stamp = hashlib.sha256(body.encode('utf-8')).hexdigest()
    return LEGACY_START + '<!-- palych:sha256 ' + stamp + ' -->\n' + body + LEGACY_END


class PortableActivationTests(unittest.TestCase):
    def setUp(self) -> None:
        temporary = tempfile.TemporaryDirectory(prefix='slopocop-activation-test-')
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.target = self.root / 'startup.md'

    def run_action(self, action: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, '-B', str(INSTALLER), action,
             '--instructions', str(self.target)],
            capture_output=True, text=True, timeout=15,
        )

    def success(self, action: str) -> dict:
        result = self.run_action(action)
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)

    def assert_rejected(self, action: str) -> None:
        result = self.run_action(action)
        self.assertEqual(result.returncode, 1)
        self.assertEqual(result.stdout, '')
        self.assertIn('Slopocop activation:', result.stderr)

    def test_install_check_and_uninstall_preserve_external_instructions(self) -> None:
        original = b'# Project\r\nDo not deploy without approval.\r\n'
        self.target.write_bytes(original)
        self.target.chmod(0o640)
        installed = self.success('install')
        self.assertTrue(installed['installed'])
        self.assertTrue(installed['changed'])
        self.assertEqual(Path(installed['backup']).read_bytes(), original)
        self.assertTrue(self.target.read_bytes().endswith(original))
        self.assertEqual(self.target.stat().st_mode & 0o777, 0o640)
        self.assertTrue(self.success('check')['installed'])
        before = self.target.read_bytes()
        self.assertFalse(self.success('install')['changed'])
        self.assertEqual(self.target.read_bytes(), before)
        removed = self.success('uninstall')
        self.assertFalse(removed['installed'])
        self.assertTrue(removed['changed'])
        self.assertEqual(self.target.read_bytes(), original)
        self.assertFalse(self.success('uninstall')['changed'])
        self.assertEqual(self.run_action('check').returncode, 1)

    def test_fresh_file_is_created_only_at_explicit_path(self) -> None:
        self.target = self.root / 'nested' / 'startup.md'
        installed = self.success('install')
        self.assertEqual(installed['path'], str(self.target))
        self.assertNotIn('backup', installed)
        self.assertTrue(self.success('check')['installed'])
        self.assertEqual(self.target.stat().st_mode & 0o777, 0o600)
        self.success('uninstall')
        self.assertEqual(self.target.read_bytes(), b'')

    def test_edited_managed_block_is_not_overwritten_or_removed(self) -> None:
        self.success('install')
        original = self.target.read_bytes()
        first_line, remainder = original.split(b'\n', 1)
        edited = first_line + b'\nUser change inside managed block.\n' + remainder
        self.target.write_bytes(edited)
        for action in ('install', 'check', 'uninstall'):
            with self.subTest(action=action):
                self.assert_rejected(action)
                self.assertEqual(self.target.read_bytes(), edited)
        self.assertFalse((self.root / '.slopocop-backups').exists())

    def test_linked_instruction_files_are_preserved(self) -> None:
        actual = self.root / 'managed-elsewhere.md'
        actual.write_bytes(b'Instructions managed elsewhere.\n')
        self.target.symlink_to(actual.name)
        result = self.run_action('install')
        self.assertEqual(result.returncode, 1)
        self.assertTrue(self.target.is_symlink())
        self.assertEqual(actual.read_bytes(), b'Instructions managed elsewhere.\n')
        self.target.unlink()
        os.link(actual, self.target)
        self.assertEqual(self.run_action('install').returncode, 1)
        self.assertEqual(actual.read_bytes(), b'Instructions managed elsewhere.\n')

    def test_no_implicit_home_or_project_target(self) -> None:
        result = subprocess.run(
            [sys.executable, '-B', str(INSTALLER), 'install'],
            cwd=self.root, capture_output=True, text=True, timeout=15,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(result.stdout, '')
        self.assertEqual(list(self.root.iterdir()), [])

    def test_uninstall_succeeds_with_missing_core_and_preserves_bytes(self) -> None:
        # Удаляем ядро только во временной копии плагина.
        installer, skills = self.temporary_plugin()
        original = b'# Project\r\nDo not deploy without approval.\r\n'
        self.target.write_bytes(original)
        install_run = subprocess.run(
            [sys.executable, '-B', str(installer), 'install',
             '--instructions', str(self.target)],
            capture_output=True, text=True, timeout=15,
        )
        self.assertEqual(install_run.returncode, 0, install_run.stderr)
        self.assertNotEqual(self.target.read_bytes(), original)
        (skills / 'SKILL.md').unlink()
        uninstall_run = subprocess.run(
            [sys.executable, '-B', str(installer), 'uninstall',
             '--instructions', str(self.target)],
            capture_output=True, text=True, timeout=15,
        )
        self.assertEqual(uninstall_run.returncode, 0, uninstall_run.stderr)
        self.assertEqual(self.target.read_bytes(), original)

    def temporary_plugin(self) -> tuple[Path, Path]:
        source_root = INSTALLER.parent.parent
        plugin = self.root / 'plugin'
        scripts = plugin / 'scripts'
        skills = plugin / 'skills' / 'slopocop'
        scripts.mkdir(parents=True)
        skills.mkdir(parents=True)
        shutil.copy2(source_root / 'scripts/activate.py', scripts / 'activate.py')
        shutil.copy2(source_root / 'skills/slopocop/SKILL.md', skills / 'SKILL.md')
        return scripts / 'activate.py', skills

    def test_explicit_reinstall_replaces_validated_legacy_block(self) -> None:
        original = ('# Project\r\nDo not deploy without approval.\r\n\r\n'
                    + legacy_block()).encode('utf-8')
        self.target.write_bytes(original)
        installed = self.success('install')
        self.assertTrue(installed['installed'])
        self.assertEqual(Path(installed['backup']).read_bytes(), original)
        updated = self.target.read_text(encoding='utf-8')
        self.assertIn('<!-- slopocop:start -->', updated)
        self.assertNotIn('palych:start', updated)
        self.assertNotIn('palych:sha256', updated)
        self.assertIn('# Project', updated)
        self.assertTrue(self.success('check')['installed'])

    def test_edited_legacy_block_is_not_replaced_or_removed(self) -> None:
        body = LEGACY_BODY.replace('Give compact, clear replies.', 'User rewrote this line.')
        # Stamp still describes the original body, so the block is an edited artifact.
        edited = ('# Project\n' + LEGACY_START
                  + '<!-- palych:sha256 ' + hashlib.sha256(LEGACY_BODY.encode('utf-8')).hexdigest()
                  + ' -->\n' + body + LEGACY_END)
        self.target.write_bytes(edited.encode('utf-8'))
        origin = self.target.read_bytes()
        for action in ('install', 'check', 'uninstall'):
            with self.subTest(action=action):
                self.assert_rejected(action)
                self.assertEqual(self.target.read_bytes(), origin)
        self.assertFalse((self.root / '.slopocop-backups').exists())

    def installed_block(self) -> str:
        # A block the installer itself produced: individually valid and stamped,
        # so rejection below proves duplicate/malformed detection, not a bad stamp.
        scratch = self.root / 'scratch.md'
        scratch.write_bytes(b'')
        run = subprocess.run(
            [sys.executable, '-B', str(INSTALLER), 'install', '--instructions', str(scratch)],
            capture_output=True, text=True, timeout=15,
        )
        self.assertEqual(run.returncode, 0, run.stderr)
        return scratch.read_text(encoding='utf-8')

    def test_duplicate_or_mixed_managed_blocks_are_rejected(self) -> None:
        current = self.installed_block()
        cases = {
            'two valid new blocks': 'x\n' + current + current,
            'two legacy blocks': 'x\n' + legacy_block() + legacy_block(),
            'new and legacy together': 'x\n' + legacy_block() + current,
            'legacy block plus orphan new start': 'x\n' + legacy_block()
                                                   + '<!-- slopocop:start -->\nA\n',
            'orphan legacy end only': 'x\n<!-- palych:end -->\n',
            'orphan new start only': 'x\n<!-- slopocop:start -->\nA\n',
            'orphan new end only': 'x\n<!-- slopocop:end -->\n',
        }
        for label, text in cases.items():
            with self.subTest(case=label):
                self.target.write_bytes(text.encode('utf-8'))
                for action in ('install', 'check', 'uninstall'):
                    with self.subTest(case=label, action=action):
                        self.assert_rejected(action)
                self.assertEqual(self.target.read_text(encoding='utf-8'), text)

    def test_legacy_block_uninstalls_with_missing_core(self) -> None:
        installer, skills = self.temporary_plugin()
        original = ('# Project\n' + legacy_block()).encode('utf-8')
        self.target.write_bytes(original)
        (skills / 'SKILL.md').unlink()
        run = subprocess.run(
            [sys.executable, '-B', str(installer), 'uninstall',
             '--instructions', str(self.target)],
            capture_output=True, text=True, timeout=15,
        )
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual(self.target.read_bytes(), b'# Project\n')
        self.assertFalse(json.loads(run.stdout)['installed'])


if __name__ == '__main__':
    unittest.main()
