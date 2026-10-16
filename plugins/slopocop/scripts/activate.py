#!/usr/bin/env python3
"""Установка Slopocop в явный файл startup-инструкций любого агента, без сети.

Адаптация scripts/install.py из ponomr/palych (MIT); происхождение — в sources.md.
Явная переустановка валидирует целый унаследованный Palych-блок и заменяет его
целым Slopocop-блоком; отключение не требует источника ядра.
"""
import argparse
from contextlib import contextmanager
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import sys
import tempfile
import uuid

START = '<!-- slopocop:start -->\n'
END = '<!-- slopocop:end -->\n\n'
STAMP = re.compile(r'<!-- slopocop:sha256 ([0-9a-f]{64}) -->\n')
LEGACY_START = '<!-- palych:start -->\n'
LEGACY_END = '<!-- palych:end -->\n\n'
LEGACY_STAMP = re.compile(r'<!-- palych:sha256 ([0-9a-f]{64}) -->\n')
ROOT = Path(__file__).resolve().parents[1]


def digest(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def payload(source: Path = ROOT) -> str:
    core = (source / 'skills/slopocop/SKILL.md').read_text(encoding='utf-8')
    body = core.split('---', 2)[2].split('## Optional examples', 1)[0]
    body = body.split('Consult only relevant optional', 1)[0].strip()
    return ('Slopocop is enabled by default for every chat reply in this conversation.\n'
            'An explicit request to turn it off takes priority until enabled again.\n'
            'Keep the current on/off state when compacting or handing off context.\n\n'
            + body + '\n')


def block(source: Path = ROOT) -> str:
    text = payload(source)
    return START + '<!-- slopocop:sha256 ' + digest(text) + ' -->\n' + text + END


def _locate_marker(text: str, start: str, end: str, stamp: re.Pattern, label: str):
    if text.count(start) != 1 or text.count(end) != 1:
        raise ValueError(f'malformed {label} block; inspect it before changing instructions')
    index = text.index(start)
    closing = text.index(end, index) + len(end)
    digest_match = stamp.match(text, index + len(start))
    if not digest_match or digest(text[digest_match.end():closing - len(end)]) != digest_match.group(1):
        raise ValueError(f'{label} block was edited; preserve your edits before replacing it')
    return index, closing


def locate(text: str):
    # Any single delimiter counts as present: a truncated block must be reported as
    # malformed, never treated as "nothing installed" and silently left behind.
    has_new = 'slopocop:start' in text or 'slopocop:end' in text
    has_legacy = 'palych:start' in text or 'palych:end' in text
    if not has_new and not has_legacy:
        return None
    if has_new and has_legacy:
        raise ValueError('both Slopocop and legacy managed blocks present; resolve duplicates manually')
    if has_new:
        return _locate_marker(text, START, END, STAMP, 'Slopocop')
    return _locate_marker(text, LEGACY_START, LEGACY_END, LEGACY_STAMP, 'Palych')


def read_target(path: Path) -> bytes:
    if path.is_symlink() or (path.exists() and path.stat().st_nlink != 1):
        raise ValueError('instruction file is linked; use its managing workflow instead')
    if path.exists() and not path.is_file():
        raise ValueError('instruction path is not a regular file')
    return path.read_bytes() if path.exists() else b''


@contextmanager
def locked(folder: Path):
    folder.mkdir(parents=True, exist_ok=True, mode=0o700)
    path = folder / '.slopocop-install.lock'
    if path.is_symlink():
        raise ValueError('installer lock is a symlink')
    fd = os.open(path, os.O_CREAT | os.O_RDWR, 0o600)
    with os.fdopen(fd, 'a') as stream:
        fcntl.flock(stream, fcntl.LOCK_EX)
        yield


def change(path: Path, action: str, source: Path = ROOT) -> dict:
    original = read_target(path)
    text = original.decode('utf-8')
    span = locate(text)
    if action == 'check':
        # Compare against the freshly generated block so an external edit to
        # the managed region is still reported as not installed.
        desired = block(source)
        if not span or text[span[0]:span[1]] != desired:
            raise ValueError('current Slopocop rules are not installed in this instruction file')
        return {'installed': True, 'path': str(path), 'changed': False}
    if action == 'install':
        desired = block(source)
        # Explicit reinstall of a validated legacy block (or absent block) becomes
        # the Slopocop block at the same byte range; missing core fails loudly.
        if span is None:
            if not (source / 'skills' / 'slopocop' / 'SKILL.md').exists():
                raise ValueError('Slopocop core is missing; cannot install')
        else:
            try:
                payload(source)
            except FileNotFoundError as error:
                raise ValueError('Slopocop core is missing; cannot install') from error
        updated = (text[:span[0]] + desired + text[span[1]:]) if span else desired + text
    else:
        # Uninstall removes whatever block locate() validated; the desired
        # payload is irrelevant here, so a missing core file cannot break
        # removal of an already-installed block.
        updated = (text[:span[0]] + text[span[1]:]) if span else text
    if updated == text:
        return {'installed': action == 'install', 'path': str(path), 'changed': False}
    backup = None
    if path.exists():
        folder = path.parent / '.slopocop-backups'
        if folder.is_symlink():
            raise ValueError('backup directory is a symlink')
        folder.mkdir(mode=0o700, exist_ok=True)
        backup = folder / (uuid.uuid4().hex + '-' + path.name)
        fd = os.open(backup, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'wb') as stream:
            stream.write(original)
            stream.flush()
            os.fsync(stream.fileno())
    mode = stat.S_IMODE(path.stat().st_mode) if path.exists() else 0o600
    fd, temporary = tempfile.mkstemp(prefix='.slopocop-', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as stream:
            os.fchmod(stream.fileno(), mode)
            stream.write(updated.encode('utf-8'))
            stream.flush()
            os.fsync(stream.fileno())
        if read_target(path) != original:
            raise ValueError('instruction file changed during installation; review it before retrying')
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    result = {'installed': action == 'install', 'path': str(path), 'changed': True}
    if backup:
        result['backup'] = str(backup)
    return result


def main() -> int:
    parser = argparse.ArgumentParser(prog='slopocop-activate', description=__doc__)
    parser.add_argument('action', choices=('install', 'check', 'uninstall'))
    parser.add_argument('--instructions', required=True, type=Path,
                        help='explicit startup instruction file read by the consuming agent')
    args = parser.parse_args()
    path = args.instructions.expanduser().absolute()
    try:
        if args.action == 'check':
            result = change(path, args.action)
        else:
            with locked(path.parent):
                result = change(path, args.action)
        print(json.dumps(result))
        return 0
    except (OSError, ValueError, UnicodeError, IndexError) as error:
        print(f'Slopocop activation: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
