#!/usr/bin/env python3
"""Установка Palych в явный файл startup-инструкций любого агента, без сети.

Адаптация scripts/install.py из ponomr/palych (MIT); происхождение — в sources.md.
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

START = '<!-- palych:start -->\n'
END = '<!-- palych:end -->\n\n'
STAMP = re.compile(r'<!-- palych:sha256 ([0-9a-f]{64}) -->\n')
ROOT = Path(__file__).resolve().parents[1]
ADAPTER_DOCS = 'https://github.com/ponomr/palych/blob/main/adapters/README.md'


def digest(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def payload(source: Path = ROOT) -> str:
    core = (source / 'skills/palych/SKILL.md').read_text(encoding='utf-8')
    body = core.split('---', 2)[2].split('## Optional examples', 1)[0]
    body = body.split('Consult only relevant optional', 1)[0].strip()
    body = body.replace(f'[host adapter]({ADAPTER_DOCS})', 'host adapter')
    return ('Palych is enabled by default for every chat reply in this conversation.\n'
            'An explicit request to turn it off takes priority until enabled again.\n'
            'Keep the current on/off state when compacting or handing off context.\n\n'
            + body + '\n')


def block(source: Path = ROOT) -> str:
    text = payload(source)
    return START + '<!-- palych:sha256 ' + digest(text) + ' -->\n' + text + END


def locate(text: str):
    if 'palych:start' not in text and 'palych:end' not in text:
        return None
    if text.count(START) != 1 or text.count(END) != 1:
        raise ValueError('malformed Palych block; inspect it before changing instructions')
    start = text.index(START)
    end = text.index(END, start) + len(END)
    stamp = STAMP.match(text, start + len(START))
    if not stamp or digest(text[stamp.end():end - len(END)]) != stamp.group(1):
        raise ValueError('Palych block was edited; preserve your edits before replacing it')
    return start, end


def read_target(path: Path) -> bytes:
    if path.is_symlink() or (path.exists() and path.stat().st_nlink != 1):
        raise ValueError('instruction file is linked; use its managing workflow instead')
    if path.exists() and not path.is_file():
        raise ValueError('instruction path is not a regular file')
    return path.read_bytes() if path.exists() else b''


@contextmanager
def locked(folder: Path):
    folder.mkdir(parents=True, exist_ok=True, mode=0o700)
    path = folder / '.palych-install.lock'
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
            raise ValueError('current Palych rules are not installed in this instruction file')
        return {'installed': True, 'path': str(path), 'changed': False}
    if action == 'install':
        desired = block(source)
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
        folder = path.parent / '.palych-backups'
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
    fd, temporary = tempfile.mkstemp(prefix='.palych-', dir=path.parent)
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
    parser = argparse.ArgumentParser(description=__doc__)
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
        print(f'Palych activation: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
