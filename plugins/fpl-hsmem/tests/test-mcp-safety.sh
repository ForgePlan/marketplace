#!/usr/bin/env bash
# Невалидные аргументы и непроверенные document counts не должны приводить к записи/удалению.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
[ -f "$HERE/../dist/index.mjs" ] || { echo "FAIL: dist missing — run npm run build"; exit 1; }
exec node "$HERE/mcp-safety.test.mjs"
