#!/usr/bin/env bash
set -euo pipefail

plugin_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
python3 - "$plugin_root" <<'PY'
import importlib.util
import json
from pathlib import Path
import sys
import tempfile

root = Path(sys.argv[1])
skill = root / 'skills' / 'structurizr-c4'
manifest = json.loads((root / '.claude-plugin' / 'plugin.json').read_text())
entry = json.loads((root / 'docs' / 'marketplace-entry.json').read_text())
assert manifest['name'] == entry['name'] == 'structurizr-c4'
assert manifest['version'] == entry['version']
assert manifest['description'] == entry['description']
assert not (root / '.mcp.json').exists(), 'Core package must not register an MCP server'
alias = root / '.agents' / 'skills' / 'structurizr-c4'
assert alias.is_symlink() and alias.resolve() == skill.resolve(), 'Broken interop alias'

spec = importlib.util.spec_from_file_location('architecture', skill / 'scripts' / 'architecture.py')
helper = importlib.util.module_from_spec(spec)
sys.dont_write_bytecode = True
spec.loader.exec_module(helper)
with tempfile.TemporaryDirectory(prefix='structurizr-c4-package-') as temporary:
    workspace = Path(temporary) / 'workspace with spaces'
    helper.init_model(workspace, 'Example "quoted" system')
    original = (workspace / 'workspace.dsl').read_bytes()
    assert b'__SYSTEM_NAME__' not in original
    assert helper.workspace(workspace) == workspace.resolve()
    try:
        helper.init_model(workspace, 'Accidental replacement')
    except RuntimeError:
        pass
    else:
        raise AssertionError('init overwrote an existing model')
    assert (workspace / 'workspace.dsl').read_bytes() == original

print('Package metadata, interop alias, portable helper and non-overwrite behavior: PASS')
PY

if command -v node >/dev/null 2>&1; then
  node --check "$plugin_root/skills/structurizr-c4/scripts/check-routing.js"
else
  echo "Rendered checker syntax: SKIPPED (Node.js unavailable)"
fi
