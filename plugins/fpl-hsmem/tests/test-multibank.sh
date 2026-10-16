#!/usr/bin/env bash
# Multi-bank allowlist: every bank-scoped tool takes `bank`; banks outside the allowlist or missing
# on the server are refused before any bank-scoped request. Offline (fake server).
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
[ -f "$HERE/../dist/index.mjs" ] || { echo "  FAIL dist/ missing — run npm run build"; exit 1; }
exec node "$HERE/multibank.test.mjs"
