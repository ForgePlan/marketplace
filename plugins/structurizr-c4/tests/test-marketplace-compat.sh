#!/usr/bin/env bash
set -euo pipefail

# Общий runner не передаёт аргументы: checkout определяется по положению скрипта,
# а не cwd. Явный путь сохраняет standalone-проверку подготовленного пакета.

if [ "$#" -gt 1 ]; then
  echo "Usage: bash tests/test-marketplace-compat.sh [marketplace-checkout]" >&2
  exit 2
fi

plugin_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ "$#" -eq 1 ]; then
  marketplace_root="$1"
else
  marketplace_root="$plugin_root/../.."
fi

python3 - "$plugin_root" "$marketplace_root" <<'PY'
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

plugin = Path(sys.argv[1]).resolve()
marketplace = Path(sys.argv[2]).expanduser().resolve()
gates = [
    'frontmatter-check.js',
    'interop-skills-check.js',
    'description-shape-check.js',
    'validate-install-manifests.js',
    'validate-no-personal-paths.js',
]
if not marketplace.is_dir():
    raise SystemExit('Marketplace checkout not found: ' + str(marketplace))
source = marketplace / 'scripts' / 'ci'
missing = [gate for gate in gates if not (source / gate).is_file()]
if missing:
    raise SystemExit('Missing marketplace gates: ' + ', '.join(missing))
if not shutil.which('node'):
    raise SystemExit('Node.js is required to execute marketplace compatibility gates')

with tempfile.TemporaryDirectory(prefix='structurizr-c4-compat-') as temporary:
    fixture = Path(temporary)
    target = fixture / 'plugins' / 'structurizr-c4'
    shutil.copytree(plugin, target, symlinks=True, ignore=shutil.ignore_patterns(
        '.git', '__pycache__', '*.pyc', '.smoke-*', '.gates-*'))
    ci = fixture / 'scripts' / 'ci'
    ci.mkdir(parents=True)
    (fixture / '.claude-plugin').mkdir()
    entry = json.loads((target / 'docs' / 'marketplace-entry.json').read_text())
    catalog = {'name': 'compatibility-fixture', 'plugins': [entry],
               'profiles': {'full': [entry['name']]}}
    (fixture / '.claude-plugin' / 'marketplace.json').write_text(json.dumps(catalog))
    for gate in gates:
        shutil.copy2(source / gate, ci / gate)
        subprocess.run(['node', str(ci / gate)], cwd=fixture, check=True)

print('Standalone marketplace compatibility: PASS (isolated fixture; no installation)')
print('Full marketplace catalog/documentation integration was not tested by this command.')
PY
