#!/usr/bin/env bash
# П1: все Hindsight-хуки выбранных событий, в обязательной OS-песочнице.
# Аргументы: settings.json, корень проекта, необязательное событие (по умолчанию all).
# Коды: 0 — выбор совпал у всех; 1 — измерено расхождение; 2 — замер неполон/недоступен.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)" || exit 2
command -v node >/dev/null 2>&1 || { echo "НЕПРИМЕНИМА: требуется Node.js >=20"; exit 2; }
exec node "$HERE/bank-selector-probe.mjs" check "$@"
