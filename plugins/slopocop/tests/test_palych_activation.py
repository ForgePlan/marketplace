"""Контракт установки в явный файл инструкций без привязки к агенту."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


INSTALLER = Path(__file__).resolve().parents[1] / 'scripts/activate.py'


class PortableActivationTests(unittest.TestCase):
    def setUp(self) -> None:
        temporary = tempfile.TemporaryDirectory(prefix='palych-activation-test-')
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
                result = self.run_action(action)
                self.assertEqual(result.returncode, 1)
                self.assertEqual(result.stdout, '')
                self.assertEqual(self.target.read_bytes(), edited)
        self.assertFalse((self.root / '.palych-backups').exists())

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
        source_root = INSTALLER.parent.parent
        plugin = self.root / 'plugin'
        scripts = plugin / 'scripts'
        skills = plugin / 'skills' / 'palych'
        scripts.mkdir(parents=True)
        skills.mkdir(parents=True)
        shutil.copy2(source_root / 'scripts/activate.py', scripts / 'activate.py')
        shutil.copy2(source_root / 'skills/palych/SKILL.md', skills / 'SKILL.md')
        installer = scripts / 'activate.py'
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


if __name__ == '__main__':
    unittest.main()
