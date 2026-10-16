#!/usr/bin/env bash
# Batch enrichment (dist/enrich.mjs + memory_retain_batch): validation, routing, secret/PII refusal,
# dry run vs apply. Offline (fake server).
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
[ -f "$HERE/../dist/enrich.mjs" ] || { echo "  FAIL dist/ missing — run npm run build"; exit 1; }
exec node "$HERE/enrich.test.mjs"
