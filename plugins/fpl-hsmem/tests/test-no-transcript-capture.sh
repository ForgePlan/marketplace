#!/usr/bin/env bash
# Stop / SessionEnd never capture a transcript unless the project sets autoRetain: true. Offline.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
[ -f "$HERE/../dist/hooks/retain.mjs" ] || { echo "  FAIL dist/ missing — run npm run build"; exit 1; }
exec node "$HERE/no-transcript-capture.test.mjs"
