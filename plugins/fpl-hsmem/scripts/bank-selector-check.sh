#!/usr/bin/env bash
# П1: спрашивает не резолвер, а тот селектор банка, который исполняет процесс.
# Имя банка снимается из собственного отладочного вывода хука, а не выводится наблюдателем.
# Аргументы: $1 = путь к settings.json, $2 = корень проекта
set -u
SETTINGS="${1:?settings.json}"
ROOT="${2:?project root}"
# Существование проверяем ДО приведения к абсолютному пути, иначе cd в
# несуществующий каталог склеивает путь и ошибка врёт о том, чего не нашли.
# Код 2 = проверку выполнить нельзя; код 1 = проверка выполнена и красная.
[ -f "$SETTINGS" ] || { echo "П1 ОШИБКА: файл настроек не найден: $SETTINGS"; exit 2; }
[ -d "$ROOT" ]     || { echo "П1 ОШИБКА: корень проекта не найден: $ROOT"; exit 2; }
# node require() не понимает относительный путь — приводим к абсолютному.
SETTINGS="$(cd "$(dirname "$SETTINGS")" && pwd)/$(basename "$SETTINGS")"
ROOT="$(cd "$ROOT" && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

# 1. Объявленное имя банка — из разрешённой конфигурации проекта.
DECL=$(node -e '
const fs=require("fs"),p=require("path");const r=process.argv[1];
let m=null;
try{const o=JSON.parse(fs.readFileSync(p.join(r,".mcp.json"),"utf8"));m=o?.mcpServers?.hindsight?.env?.HINDSIGHT_BANK_ID||null}catch(e){}
if(!m){try{m=JSON.parse(fs.readFileSync(p.join(r,".hindsight.json"),"utf8")).bankId||null}catch(e){}}
process.stdout.write(m||"");' "$ROOT")
[ -n "$DECL" ] || {
  echo "П1 НЕПРИМЕНИМА: проект не объявляет bankId ни в .mcp.json, ни в .hindsight.json."
  echo "  Сравнивать не с чем: у П1 нет ожидаемого значения, поэтому это не красная."
  echo "  ВНИМАНИЕ: отсутствие объявления — самостоятельный дефект (И-2: выведенное"
  echo "  из каталога имя объявлением НЕ является). Он требует отдельной проверки,"
  echo "  а не молчаливого поглощения этой."
  exit 2; }

# 2. Три писателя проверяются по отдельности: recall (UserPromptSubmit),
#    retain (Stop), session-end (SessionEnd). Проверка одного из трёх
#    оставляла бы два непроверенными, а текст П1 требует все три.
EVENT="${3:-UserPromptSubmit}"

# Команда хука — извлекается из settings.json, а не выбирается проверяющим.
HOOKCMD=$(node -e '
const o=require(process.argv[1]);
const ev=process.argv[2];
const h=o?.hooks?.[ev]?.[0]?.hooks?.[0];
if(!h){process.exit(3)}
const args=(h.args||[]).join(" ");
process.stdout.write(((h.command||"")+" "+args).trim());' "$SETTINGS" "$EVENT") || {
  echo "П1 НЕПРИМЕНИМА: в $SETTINGS хук $EVENT не объявлен."
  echo "  Это не «дефект жив» и не «починено» — это «проверять в этом файле нечего»."
  echo "  После починки по варианту Б хук приходит из hooks.json включённого плагина,"
  echo "  и здесь его законно нет. Прогоните проверку на сводной конфигурации хуков."
  exit 2; }
HOOKCMD="${HOOKCMD//\$\{CLAUDE_PLUGIN_ROOT\}/${CLAUDE_PLUGIN_ROOT:-}}"

# Писателям (Stop / SessionEnd) нужна непустая расшифровка, иначе они выходят
# ДО строки с именем банка, и замер выглядит как "хук не назвал банк".
printf '%s\n' \
  '{"type":"user","message":{"role":"user","content":"проба выбора банка"}}' \
  '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"ответ пробы"}]}}' \
  > "$TMP/transcript.jsonl"
printf '{"cwd":"%s","session_id":"P1-PROBE","transcript_path":"%s","prompt":"p1 bank probe"}' \
  "$ROOT" "$TMP/transcript.jsonl" > "$TMP/in.json"

# 3. Запуск в песочнице: сеть обрезана (порт 9 закрыт), ключ пуст, состояние изолировано.
OUT=$(env -i HOME="$HOME" PATH="$PATH" \
  HINDSIGHT_DEBUG=1 HINDSIGHT_URL=http://127.0.0.1:9 HINDSIGHT_API_KEY= \
  HINDSIGHT_RETAIN_EVERY_N_TURNS=1 \
  CLAUDE_PLUGIN_DATA="$TMP/state" \
  $HOOKCMD < "$TMP/in.json" 2>&1)

ACTUAL=$(printf '%s' "$OUT" | sed -n "s/.*[Ff]rom bank '\([^']*\)'.*/\1/p;s/.*[Rr]etain to bank '\([^']*\)'.*/\1/p" | head -1)
[ -n "$ACTUAL" ] || {
  echo "П1 НЕПРИМЕНИМА: хук не назвал банк (замер недействителен)."
  echo "  Пустой ответ — не красная проверка: селектор не ответил вовсе."
  echo "$OUT"
  exit 2; }

echo "  объявлено: $DECL"
echo "  хук назвал: $ACTUAL   (команда: $HOOKCMD)"
if [ "$ACTUAL" = "$DECL" ]; then echo "П1 PASS"; exit 0; else echo "П1 FAIL: процесс идёт в '$ACTUAL', а не в '$DECL'"; exit 1; fi
