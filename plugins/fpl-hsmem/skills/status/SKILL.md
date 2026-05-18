---
name: status
description: Show Hindsight memory health, current bank, and statistics for the active project. Use when the user asks "is memory working?", "what bank am I on?", "how many memories?", or wants a quick diagnostic of the Hindsight integration.
allowed-tools: mcp__hindsight__memory_status, mcp__hindsight__memory_get_current_bank, mcp__hindsight__mental_model_list
---

# Hindsight status

Quick health check and statistics for the active Hindsight bank.

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
