#!/usr/bin/env bash
# П3 — отрицательный контроль. Два состояния с РАЗНЫМИ обязательными ответами.
# Состояние M: объявление лежит в .mcp.json  -> обязан выдать NC_MCP_WINS
# Состояние F: то же объявление перенесено в .hindsight.json -> обязан выдать NC_FILE_WINS
# Каталог фикстуры в обоих состояниях называется одинаково (nc-fixture), поэтому
# выведенное-из-каталога имя (nc-fixture) ни в одном состоянии не является верным ответом.
# Аргумент: $1 = путь к бандлу хука recall.mjs, который исполняет процесс.
set -u
HOOK="${1:?path to recall.mjs}"
# Код 2 = проверку выполнить нельзя; 1 = выполнена и красная; 0 = зелёная.
# Без этого различия опечатка в пути к бандлу давала пустые ответы на оба
# состояния и тот же код 1, что честная красная: «посмотрели не туда»
# читалось как «дефект жив».
[ -f "$HOOK" ] || { echo "П3 НЕПРИМЕНИМА: бандл хука не найден: $HOOK"; exit 2; }
BASE="$(mktemp -d)"; trap 'rm -rf "$BASE"' EXIT
FIX="$BASE/nc-fixture"; mkdir -p "$FIX"

probe() {
  printf '{"cwd":"%s","session_id":"P3","transcript_path":"","prompt":"negative control probe for bank selection"}' "$FIX" > "$BASE/in.json"
  env -i HOME="$HOME" PATH="$PATH" HINDSIGHT_DEBUG=1 HINDSIGHT_URL=http://127.0.0.1:9 \
      HINDSIGHT_API_KEY= CLAUDE_PLUGIN_DATA="$BASE/state" \
      node "$HOOK" < "$BASE/in.json" 2>&1 | sed -n "s/.*from bank '\([^']*\)'.*/\1/p" | head -1
}

rm -f "$FIX/.mcp.json" "$FIX/.hindsight.json"
cat > "$FIX/.mcp.json" <<'EOF'
{"mcpServers":{"hindsight":{"command":"node","env":{"HINDSIGHT_BANK_ID":"NC_MCP_WINS"}}}}
EOF
M=$(probe)

rm -f "$FIX/.mcp.json"
cat > "$FIX/.hindsight.json" <<'EOF'
{"bankId":"NC_FILE_WINS"}
EOF
F=$(probe)

echo "  состояние M (.mcp.json):       ожидание NC_MCP_WINS   -> получено ${M:-<пусто>}"
echo "  состояние F (.hindsight.json): ожидание NC_FILE_WINS  -> получено ${F:-<пусто>}"

# Пусто ХОТЯ БЫ в одном состоянии — селектор не ответил, а не ответил неверно.
# Это не красный: мерили не то, что собирались (не тот файл, сломанный бандл,
# изменившийся формат вывода, выключенная отладка). Красный остаётся ровно за
# «оба состояния назвали банк, и сравнение не сошлось».
if [ -z "$M" ] || [ -z "$F" ]; then
  echo "П3 НЕПРИМЕНИМА: хук не назвал банк (замер недействителен)."
  echo "  Пустой ответ — не красная проверка: селектор не ответил вовсе."
  echo "  Проверьте, что \$1 указывает на recall.mjs нужной версии и что бандл исполняется."
  exit 2
fi

fail=0
[ "$M" = "NC_MCP_WINS" ]  || { echo "  ! состояние M провалено"; fail=1; }
[ "$F" = "NC_FILE_WINS" ] || { echo "  ! состояние F провалено"; fail=1; }
[ "$M" != "$F" ] || { echo "  ! контроль не различает состояния (один ответ на оба)"; fail=1; }
if [ "$fail" = 0 ]; then echo "П3 PASS"; exit 0; else echo "П3 FAIL"; exit 1; fi
