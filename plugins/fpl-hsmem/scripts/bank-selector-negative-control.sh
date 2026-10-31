#!/usr/bin/env bash
# П3: два defaultBank и пять inactive/invalid состояний текущего контракта.
# Аргумент: путь к recall.mjs. Реальная сеть/банки не используются.
# Коды: 0 — контроль пройден; 1 — измерено неверное поведение; 2 — замер недоступен.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)" || exit 2
command -v node >/dev/null 2>&1 || { echo "НЕПРИМЕНИМА: требуется Node.js >=20"; exit 2; }
exec node "$HERE/bank-selector-probe.mjs" negative "$@"
