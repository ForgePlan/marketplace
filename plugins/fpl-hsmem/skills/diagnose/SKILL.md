---
name: diagnose
description: |
  The full diagnostic when memory is not doing what it should: server reachable, bank resolved as
  intended, hooks actually firing, config not overridden somewhere you forgot, and jobs completing.
  Written to distinguish the failure modes that look identical from the outside — a dead server and
  an empty bank both return nothing.
  EN: Six-step integration diagnostic with a remediation per finding. Use for "recall never fires",
  "retain seems broken", "I do not see memory happening", or before changing settings. NOT a
  content audit — whether the bank is worth having is /fpl-hsmem:audit-bank.
  RU: Диагностика интеграции в шесть шагов, с лечением на каждую находку. Для «recall не срабатывает»,
  «retain не сохраняет», «память вообще не работает» или перед правкой настроек. НЕ аудит содержимого
  — стоит ли этот банк держать, отвечает /fpl-hsmem:audit-bank.
  Triggers: "memory isn't working", "recall never fires", "retain is broken", "diagnose hindsight",
  "hooks not running", "память не работает", "recall не срабатывает", "retain сломан",
  "диагностика hindsight", "хуки не запускаются"
hindsight-tools: [memory_status, memory_get_current_bank, mental_model_list, memory_operations, bank_config_get]
extra-tools: [Bash, Read]
allowed-tools: mcp__hindsight__memory_status, mcp__plugin_fpl-hsmem_hindsight__memory_status, mcp__hindsight__memory_get_current_bank, mcp__plugin_fpl-hsmem_hindsight__memory_get_current_bank, mcp__hindsight__mental_model_list, mcp__plugin_fpl-hsmem_hindsight__mental_model_list, mcp__hindsight__memory_operations, mcp__plugin_fpl-hsmem_hindsight__memory_operations, mcp__hindsight__bank_config_get, mcp__plugin_fpl-hsmem_hindsight__bank_config_get, Bash, Read
---

# Diagnose Hindsight integration

Run a structured six-step diagnostic. Report expected inactive states separately from failures.
Keep it read-only: do not enable hooks, change registrations, or create banks.


## Model tier

**This skill asks for tier C for the checks, B for the diagnosis.**

Running the six checks is mechanical. The
value is in distinguishing failures that look identical from outside — a dead server and an empty
bank both return nothing, and reporting the wrong one sends someone to fix the wrong thing.

`model:` values like `opus` / `sonnet` / `haiku` are Claude Code names, not the
requirement. On another runtime substitute whatever serves this tier there, and when you cannot
tell, miss **upward**. Saving cost means giving a skill less work, not a weaker model.

## Step 1 — Configuration and server reachability

Сначала проверь проектный `.hindsight.json`, границу git-root и opt-out. Отсутствующий или
отключённый конфиг — штатное неактивное состояние; не делай сетевой запрос. Невалидный конфиг
исправляют по единственной безопасной диагностике stderr, не выводя токен или сырой файл.

Для активного конфига используй его явный `url` или пользовательский `HINDSIGHT_URL`, а не
жёстко заданный localhost. Read-only `/version` должен показать API >=0.10.2 и <0.11.0;
`/health` проверяет доступность. Ошибка подключения не доказывает, что остановлен Docker:
проверь адрес, сеть и фактический способ развёртывания. Не ослабляй проверку совместимости.

## Step 2 — Bank resolution

- Call `memory_get_current_bank`
- Compare with what the user expects (ask if unsure)
- ✓ matches → resolution working
- ✗ unexpected → inspect `config_file`, `default_bank` and `allowed_banks`; discovery stops at
  the git root and never uses a home-wide config. A nested repository needs its own opt-in.
- Zero tools → missing/disabled is expected; invalid config reports one safe stderr reason.

## Step 3 — Bank content

- Call `memory_status` for memory count and document count
- Call `mental_model_list` for living pages
- Note ratios:
  - Memories = 0 → банк может быть новым или использовать только отобранные ручные записи.
    Не включай autoRetain как средство диагностики.
  - Documents = 0 → no `document_ingest` runs yet (normal for new bank)
  - Mental models = 0 → either new bank, or user hasn't created any
    (suggest `mental-model` skill)

## Step 4 — Hook policy and optional state

Сначала прочитай `autoRecall` и `autoRetain`: оба по умолчанию false. Retain state находится в
`${CLAUDE_PLUGIN_DATA}/state`, если переменная задана, иначе в `~/.hindsight/state`. При выключенном
autoRetain отсутствие `turns.json` и `retention.json` нормально. State не доказывает работу recall.

Только если оператор уже отдельно разрешил соответствующий hook, проверь его регистрацию и
диагностику. В Claude plugin-mode регистрация принадлежит плагину; в direct Codex/OMP —
конфигурации конкретного host. Должен быть один MCP и один набор hooks, не оба режима сразу.
Для разрешённого retain проверь state и результат operations; не считай один свежий mtime
доказательством успешного сохранения. Само существование банка не разрешает включение hooks.

## Step 5 — Config resolution

There is one source: the nearest `.hindsight.json` at or above cwd (see
CONFIGURATION.md), walking no further than the git toplevel and never
`$HOME/.hindsight.json`. Only `HINDSIGHT_URL` may override its url, and `HINDSIGHT_API_KEY` is
used only together with it. Show the user `config_file`,
`default_bank`, `allowed_banks`, `url` and `token_source` from
`memory_get_current_bank` — never the token itself.

## Step 6 — Opt-out check

Look for:
- `.hindsight-disabled` in cwd or beside the resolved config
- `HINDSIGHT_DISABLED=true` in the environment

If present, report intentional opt-out. Do not remove it or enable hooks as remediation.

## Final summary

```
Hindsight diagnostic
─────────────────────
Server:     <green|red> (<details>)
Bank:       <bank-id> resolved from <source>
Content:    <N memories>, <M docs>, <K pages>
Hooks:      <active|inactive> (state files: <found|missing>)
Opt-out:    <yes|no>

<verdict: "Everything looks correct" | "Issues: ..." | "Fix path: ...">
```

If issues are found, propose **one concrete action** the user can take
next, not a list of every possibility.
