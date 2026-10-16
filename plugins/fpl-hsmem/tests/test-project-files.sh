#!/usr/bin/env bash
# Descriptor-bound, size-capped project file reads and CLI refusals. Offline.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
[ -f "$HERE/../dist/testable.mjs" ] || { echo "  FAIL dist/ missing — run npm run build"; exit 1; }
exec node "$HERE/project-files.test.mjs"
