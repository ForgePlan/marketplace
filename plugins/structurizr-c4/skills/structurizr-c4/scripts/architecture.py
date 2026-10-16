#!/usr/bin/env python3
"""Local Structurizr lifecycle and reproducible exports. Python 3.9+, stdlib only."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import time
from typing import Optional, Tuple
import urllib.error
import urllib.request

SKILL = Path(__file__).resolve().parents[1]
CACHE = Path.home() / '.cache' / 'structurizr-c4'


def binary():
    path = shutil.which('structurizr')
    if not path and Path('/opt/homebrew/bin/structurizr').is_file():
        path = '/opt/homebrew/bin/structurizr'
    if not path:
        raise RuntimeError('Structurizr is missing. Install the modern package: brew install structurizr')
    return path


def workspace(directory):
    root = Path(directory).expanduser().resolve()
    if not (root / 'workspace.dsl').is_file():
        raise RuntimeError('workspace.dsl not found in ' + str(root))
    return root


def run_cli(*args, capture=False):
    return subprocess.run([binary(), *map(str, args)], check=True, text=True,
                          stdout=subprocess.PIPE if capture else None)


def init_model(directory, name):
    root = Path(directory).expanduser().resolve()
    root.mkdir(parents=True, exist_ok=True)
    output = root / 'workspace.dsl'
    if output.exists():
        raise RuntimeError('Existing workspace preserved: ' + str(output))
    template = (SKILL / 'assets' / 'workspace.dsl').read_text()
    # A JSON string also escapes quotes/newlines safely for the DSL string literal.
    content = template.replace('__SYSTEM_NAME__', json.dumps(name, ensure_ascii=False))
    with output.open('x') as handle:
        handle.write(content)
    for filename, text in {
        'evidence.md': '# Evidence\n\nDraft template. Replace example elements using repository evidence.\n\n| Element / relationship ID | Status | Repo / revision / path / lines | Meaning |\n|---|---|---|---|\n',
        'assumptions.md': '# Assumptions and open questions\n\nThis is an illustrative starting model, not a discovered architecture. Confirm the system boundary, actors, runtime units and data flows before using it as documentation.\n',
    }.items():
        path = root / filename
        if not path.exists():
            path.write_text(text)
    print(output)


def validate(root):
    run_cli('validate', '-workspace', root / 'workspace.dsl')
    # inspect returns nonzero for findings; do not silently turn warnings green.
    run_cli('inspect', '-workspace', root / 'workspace.dsl', '-severity', 'error,warning')


def export_model(root, format_name, use_layout=False):
    validate(root)
    source = root / ('workspace.json' if use_layout else 'workspace.dsl')
    if not source.is_file():
        raise RuntimeError('Requested layout file is missing: ' + str(source))
    if use_layout and source.stat().st_mtime < (root / 'workspace.dsl').stat().st_mtime:
        raise RuntimeError('workspace.json is older than the DSL. Refresh and save it in the viewer first.')
    parent = root / 'exports'
    parent.mkdir(exist_ok=True)
    output = parent / format_name
    marker = '.structurizr-generated.json'
    if output.exists() and not (output / marker).is_file():
        raise RuntimeError('Refusing to replace an unmanaged export directory: ' + str(output))
    with tempfile.TemporaryDirectory(prefix='.' + format_name + '-', dir=str(parent)) as temporary:
        staging = Path(temporary) / 'output'
        run_cli('export', '-workspace', source, '-format', format_name, '-output', staging)
        if not staging.is_dir() or not any(staging.iterdir()):
            raise RuntimeError('Exporter produced no files')
        (staging / marker).write_text(json.dumps({
            'source': str(source),
            'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'format': format_name,
            'created_at': time.strftime('%Y-%m-%dT%H:%M:%S%z'),
            'manual_layout': use_layout,
        }, indent=2) + '\n')
        previous = Path(temporary) / 'previous'
        if output.exists():
            output.rename(previous)
        try:
            staging.rename(output)
        except BaseException:
            if previous.exists():
                previous.rename(output)
            raise
    print(output)


def state_paths(root):
    CACHE.mkdir(parents=True, exist_ok=True)
    key = hashlib.sha256(str(root).encode()).hexdigest()[:20]
    return CACHE / (key + '.json'), CACHE / (key + '.log')


def read_state(root):
    path, _ = state_paths(root)
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError):
        return None


def process_identity(pid: int) -> Optional[Tuple[str, str]]:
    if pid <= 0:
        return None
    try:
        result = subprocess.run(
            ['ps', '-ww', '-p', str(pid), '-o', 'lstart=', '-o', 'command='],
            capture_output=True, text=True, check=False,
            env={**os.environ, 'LC_ALL': 'C'})
    except OSError:
        return None
    fields = result.stdout.rstrip('\n').split(None, 5)
    if result.returncode != 0 or len(fields) != 6:
        return None
    return ' '.join(fields[:5]), fields[5]


def viewer_command(command: str, root: Path) -> bool:
    suffix = ' local ' + str(root)
    return command.endswith(suffix) and 'structurizr' in command[:-len(suffix)].lower()


def owned_process(state: Optional[dict], root: Path) -> bool:
    if not isinstance(state, dict) or state.get('directory') != str(root):
        return False
    try:
        identity = process_identity(int(state['pid']))
    except (KeyError, TypeError, ValueError):
        return False
    return (identity is not None and identity[0] == state.get('started_at')
            and viewer_command(identity[1], root))


def start(root, port):
    state = read_state(root)
    if owned_process(state, root):
        print(state['url'])
        return
    validate(root)
    with socket.socket() as probe:
        try:
            probe.bind(('127.0.0.1', port))
        except OSError:
            raise RuntimeError('Port is busy. Choose another --port: ' + str(port))
    state_path, log_path = state_paths(root)
    env = dict(os.environ)
    env['JAVA_TOOL_OPTIONS'] = (env.get('JAVA_TOOL_OPTIONS', '') +
                               ' -Dserver.address=127.0.0.1 -Dserver.port=' + str(port)).strip()
    env['STRUCTURIZR_AUTOREFRESHINTERVAL'] = '2000'
    with log_path.open('a') as log:
        process = subprocess.Popen([binary(), 'local', str(root)], env=env,
                                   stdin=subprocess.DEVNULL, stdout=log, stderr=log,
                                   start_new_session=True)
    state = {'pid': process.pid, 'directory': str(root), 'port': port,
             'url': 'http://127.0.0.1:' + str(port)}
    try:
        deadline = time.monotonic() + 40
        while time.monotonic() < deadline:
            if process.poll() is not None:
                raise RuntimeError('Viewer exited. Log: ' + str(log_path))
            try:
                with urllib.request.urlopen(state['url'], timeout=1) as response:
                    if response.status == 200:
                        identity = process_identity(process.pid)
                        if identity is None or not viewer_command(identity[1], root):
                            raise RuntimeError('Cannot verify viewer process identity. Log: ' + str(log_path))
                        state['started_at'] = identity[0]
                        state_path.write_text(json.dumps(state, indent=2) + '\n')
                        print(state['url'])
                        return
            except (urllib.error.URLError, TimeoutError, OSError):
                pass
            time.sleep(0.25)
        raise RuntimeError('Viewer did not become ready in 40 seconds. Log: ' + str(log_path))
    except BaseException:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
        state_path.unlink(missing_ok=True)
        raise


def status(root):
    state = read_state(root)
    if owned_process(state, root):
        print(json.dumps({'running': True, **state}, ensure_ascii=False, indent=2))
    else:
        print(json.dumps({'running': False, 'directory': str(root)}))


def stop(root):
    state = read_state(root)
    path, _ = state_paths(root)
    if owned_process(state, root):
        os.kill(int(state['pid']), signal.SIGTERM)
        for _ in range(40):
            if not owned_process(state, root):
                break
            time.sleep(0.1)
        if owned_process(state, root):
            raise RuntimeError('Viewer is still stopping; state preserved for another stop attempt')
        print('Stopped ' + state['url'])
    else:
        print('No owned viewer process is running')
    path.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    for command in ['init', 'validate', 'export', 'start', 'status', 'stop']:
        action = sub.add_parser(command)
        action.add_argument('directory')
        if command == 'init':
            action.add_argument('--name', required=True)
        if command == 'export':
            action.add_argument('--format', choices=['static', 'mermaid', 'plantuml', 'json'], default='static')
            action.add_argument('--use-layout', action='store_true', help='Use viewer-saved workspace.json after refreshing it')
        if command == 'start':
            action.add_argument('--port', type=int, default=18080)
    args = parser.parse_args()
    if args.command == 'init':
        init_model(args.directory, args.name)
        return
    # Status and stop must work even if the model was moved or deleted.
    root = (Path(args.directory).expanduser().resolve()
            if args.command in ('status', 'stop') else workspace(args.directory))
    if args.command == 'validate':
        validate(root)
    elif args.command == 'export':
        export_model(root, args.format, args.use_layout)
    elif args.command == 'start':
        if not 1024 <= args.port <= 65535:
            raise RuntimeError('Port must be between 1024 and 65535')
        start(root, args.port)
    elif args.command == 'status':
        status(root)
    else:
        stop(root)


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, OSError, subprocess.CalledProcessError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
