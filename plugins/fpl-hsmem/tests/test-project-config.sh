#!/usr/bin/env bash
# Project-only opt-in: no .hindsight.json → no tools, no hook traffic, no implicit bank. Offline.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
[ -f "$HERE/../dist/testable.mjs" ] || { echo "  FAIL dist/ missing — run npm run build"; exit 1; }
exec node "$HERE/project-config.test.mjs"
