#!/usr/bin/env bash
# Hindsight 0.10 contract: every tool, driven against a fake that answers the removed endpoints
# with 410 exactly like the real server, must never reach them; recorded request shapes for the
# endpoints whose shape changed. Offline. Shapes verified against vectorize-io/hindsight v0.10.2
# (hindsight-api-slim/hindsight_api/api/http.py: BankConfigUpdate, list_mental_models, list_banks).
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
[ -f "$HERE/../dist/index.mjs" ] || { echo "  FAIL dist/ missing — run npm run build"; exit 1; }
exec node "$HERE/hindsight-010.test.mjs"
