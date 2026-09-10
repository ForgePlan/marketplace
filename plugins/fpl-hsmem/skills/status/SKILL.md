---
name: status
description: |
  A thirty-second read of one memory bank: which bank, who chose it, how much is in it, and whether
  anything is silently broken. The first thing to run when memory "feels off" — most such feelings
  turn out to be the session reading one bank while something else writes to another.
  EN: Quick health + statistics for the active bank. Use for "is memory working", "what bank am I
  on", "how many memories". NOT an audit — it does not look at privacy posture or failed jobs; that
  is /fpl-hsmem:audit-bank.
  RU: Быстрая проверка здоровья и статистика активного банка. Для вопросов «память работает?»,
  «в каком мы банке?», «сколько там записей». НЕ аудит — приватность и упавшие задачи не смотрит,
  это /fpl-hsmem:audit-bank.
  Triggers: "memory status", "is memory working", "what bank", "how many memories", "hindsight health",
  "статус памяти", "память работает", "в каком банке", "сколько воспоминаний", "проверь hindsight"
hindsight-tools: [memory_status, memory_get_current_bank, mental_model_list, memory_operations]
allowed-tools: mcp__hindsight__memory_status, mcp__plugin_fpl-hsmem_hindsight__memory_status, mcp__hindsight__memory_get_current_bank, mcp__plugin_fpl-hsmem_hindsight__memory_get_current_bank, mcp__hindsight__mental_model_list, mcp__plugin_fpl-hsmem_hindsight__mental_model_list, mcp__hindsight__memory_operations, mcp__plugin_fpl-hsmem_hindsight__memory_operations
---

# Hindsight status

Quick health check and statistics for the active Hindsight bank.


## Model tier

**This skill asks for tier C.**

Reads three tools and prints what they said. No judgement, no irreversible step,
and the oracle is immediate — the numbers either match the bank or they do not. Give this the
cheapest model that can read a table.

`model:` values like `opus` / `sonnet` / `haiku` are Claude Code names, not the
requirement. On another runtime substitute whatever serves this tier there, and when you cannot
tell, miss **upward**. Saving cost means giving a skill less work, not a weaker model.

## Steps

1. Call `memory_status` to get the connection state and bank statistics.
2. Call `memory_get_current_bank` to confirm the active bank ID.
3. Call `mental_model_list` to see which living knowledge pages exist (if any).
4. Summarize the output in plain English. If anything looks wrong (no
   connection, empty bank, no mental models in an old project), say so
   and suggest a remediation.

## Output shape

```
Hindsight: <healthy/unreachable>
Bank:      <bank-id>  (<N> memories, <M> documents)
Pages:     <list of mental_model names or "none yet">
URL:       <hindsight URL>

<one-line interpretation: "all green", "no memories yet — try a few turns",
 "Hindsight not reachable — start docker container", etc.>
```

## Remediation hints

If `memory_status` fails:
- Check `docker ps | grep hindsight`
- Check `curl http://localhost:8888/health`
- Suggest the docker run command from the plugin README

If bank is empty after a long active project:
- Mention auto-retain throttling (`retainEveryNTurns`, default 10)
- Suggest calling `memory_status` again after a few more conversation turns
