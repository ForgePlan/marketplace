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

Run a structured 5-step diagnostic. Each step produces a status line.
At the end, summarize as "all green" / list of issues + remediation.


## Model tier

**This skill asks for tier C for the checks, B for the diagnosis.**

Running the six checks is mechanical. The
value is in distinguishing failures that look identical from outside — a dead server and an empty
bank both return nothing, and reporting the wrong one sends someone to fix the wrong thing.

`model:` values like `opus` / `sonnet` / `haiku` are Claude Code names, not the
requirement. On another runtime substitute whatever serves this tier there, and when you cannot
tell, miss **upward**. Saving cost means giving a skill less work, not a weaker model.

## Step 1 — Server reachability

```bash
curl -fsS http://localhost:8888/health
```
- ✓ 200 with `{"status":"healthy",...}` → server is up
- ✗ connection refused → Docker container is not running
- ✗ 5xx → server is up but unhealthy (check `docker logs hindsight`)

## Step 2 — Bank resolution

- Call `memory_get_current_bank`
- Compare with what the user expects (ask if unsure)
- ✓ matches → resolution working
- ✗ unexpected → check `.mcp.json` env, or project name derivation
  (`git rev-parse --git-common-dir` in the project)

## Step 3 — Bank content

- Call `memory_status` for memory count and document count
- Call `mental_model_list` for living pages
- Note ratios:
  - Memories = 0 in a 1-month-old project → auto-retain might be off,
    or `retainEveryNTurns` is too high
  - Documents = 0 → no `document_ingest` runs yet (normal for new bank)
  - Mental models = 0 → either new bank, or user hasn't created any
    (suggest `mental-model` skill)

## Step 4 — Hook state files

```bash
ls -la ~/.hindsight/state/ 2>/dev/null
```
Look for:
- `turns.json` — tracks turn count per session (used by retain throttling)
- `retention.json` — tracks message_count per session (used for compaction detection)

- ✓ both exist with recent mtime → hooks are running
- ✗ neither exists → hooks aren't firing. Check
  `.claude/settings.local.json` for hook registration, or check if the
  plugin is loaded (run `claude plugin list`)

## Step 5 — Config resolution

Read in order, report which one provides each value:
- `~/.hindsight/config.json`
- `<cwd>/.mcp.json` → `mcpServers.hindsight.env`
- `<cwd>/.hindsight.json`
- Environment variables (`HINDSIGHT_*`)

Show the user the final resolved bankId and URL with their source.

## Step 6 — Opt-out check

Look for:
- `<cwd>/.hindsight-disabled` file
- `HINDSIGHT_DISABLED=true` env

If present, **none of the above matters** — Hindsight is disabled in
this project. Tell the user and ask if they want to enable it.

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
