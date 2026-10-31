#!/usr/bin/env bash
# Поведенческие проверки П1/П3 и настоящих bundled hooks без live Hindsight.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)" || exit 1
exec node "$HERE/bank-selector.test.mjs"
