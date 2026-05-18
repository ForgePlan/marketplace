# Troubleshooting

Diagnostic recipes for common issues. For full automated diagnostic,
run `/fpl-hsmem:diagnose` — it walks 6 checks and reports a verdict.

---

## Hindsight server issues

### "Hindsight is unreachable"

Symptoms:
- `memory_status` returns "unreachable" / network error
- `/fpl-hsmem:status` reports Server: red
- Hook logs show `Recall failed: fetch failed` in `[Hindsight]` lines

Diagnose:

```bash
# Check container is running
docker ps | grep hindsight

# Check API directly
curl http://localhost:8888/health

# Logs
docker logs hindsight --tail 100
```

Fixes:

| Cause | Fix |
|-------|-----|
| Container stopped | `docker start hindsight` |
| Container crashed | `docker logs hindsight` to see why, recreate if needed |
| Port 8888 conflict | Run on different port: `docker run ... -p 9000:8888 ...`, set `HINDSIGHT_URL=http://localhost:9000` |
| Container exists but unhealthy | `docker rm -f hindsight` and recreate from scratch |
| `claude-code` provider not authenticated | Run `claude auth login` on the host, recreate container |

Recreate container fresh (Docker, no API keys):

```bash
docker rm -f hindsight
docker run -d --name hindsight \
  -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_PROVIDER=claude-code \
  ghcr.io/vectorize-io/hindsight:latest
```

### "First startup is very slow"

First-time Docker run downloads the embedding model (~100MB) and
initializes Postgres. Subsequent starts are seconds. Wait 30-60 seconds
on first run, then `curl http://localhost:8888/health`.

### "Hindsight extracts garbage facts"

The fact-extraction LLM is choosing bad facts. Two levers:

1. **Set a better `retainMission`**:
   ```bash
   HINDSIGHT_RETAIN_MISSION="Extract concrete technical decisions, \
     bug root causes, and explicit user preferences. Ignore generic \
     reasoning, exploratory tangents, and information already in the \
     codebase."
   ```

2. **Switch LLM provider on the server side.** The default
   `claude-code` provider is generally good. If you've configured
   `ollama` with a small model, extraction quality degrades. Either
   upgrade to `gemma3:12b` or larger, or switch to `openai` /
   `anthropic`.

---

## Bank ID issues

### "Wrong bank ID is being used"

Symptoms:
- Working in `/Users/me/Work/project-a`, but `memory_get_current_bank`
  returns `project-b`
- Or recall surfaces memories from a different project

Diagnose:

```bash
# What bank does the resolver pick?
cd /your/project/path
git rev-parse --git-common-dir   # shows main repo path
```

The plugin uses `basename` of `git rev-parse --git-common-dir` to derive
the project name. Common causes:

| Cause | Fix |
|-------|-----|
| You're inside a git worktree linked to a different repo | Expected behavior — worktrees share one bank. To force isolation, pin `HINDSIGHT_BANK_ID` in this directory's `.mcp.json` |
| Monorepo subdirectory shares bank with parent | Add nested `.mcp.json` with `HINDSIGHT_BANK_ID=submodule-specific` |
| Old `.mcp.json` pins a stale bank ID | Edit `.mcp.json` → `mcpServers.hindsight.env.HINDSIGHT_BANK_ID` |
| Auto-derive picked a generic name (e.g. `Work` for `/Users/me/Work`) | Pin explicit `HINDSIGHT_BANK_ID` via env or `.mcp.json` |

### "Bank ID changed without me changing anything"

If you renamed your project directory or moved git worktrees, the
derived bank ID changes. Memory from the old name is still on the
Hindsight server — it's just orphaned. Two options:

1. **Pin the old bank ID** in `.mcp.json`:
   ```json
   "env": { "HINDSIGHT_BANK_ID": "old-project-name" }
   ```
2. **Migrate manually** — there's no built-in rename. Use the web UI
   at http://localhost:9999 to inspect and copy memories if needed.

---

## Recall quality

### "Recall returns no results"

Causes (in likelihood order):

1. **Bank is empty.** Run `memory_status` — if memory count is 0,
   nothing has been retained yet. Wait for ~10 conversation turns or
   run `/fpl-hsmem:bootstrap` to seed.
2. **Query is too short.** Hindsight needs ≥5 characters. The hook
   silently skips very short prompts.
3. **Auto-retain is disabled.** Check `HINDSIGHT_AUTO_RETAIN`,
   `.hindsight-disabled` marker.
4. **Server health.** See "Hindsight is unreachable" above.

### "Recall returns junk (irrelevant memories)"

Common causes:

| Cause | Fix |
|-------|-----|
| Query is a single keyword | Rephrase as a natural-language question |
| `recallBudget: low` set | Try `high` for thoroughness |
| Bank contains too much noise | Set / refine `bankMission`, narrow with `tags` filter |
| Memories from a forgotten side project polluting the bank | Confirm bank ID is correct; isolate per project |

Use `memory_recall` with filters:

```
memory_recall(
  query="authentication decisions and tradeoffs",
  types=["world"],          # facts, not personal experience
  tags=["auth", "ADR"],     # narrow if you've been tagging
  budget="high",
  max_tokens=2048
)
```

### "I want recall to consider more conversation history"

By default the recall hook only uses the current prompt for the query.
To compose multi-turn queries:

```bash
HINDSIGHT_RECALL_CONTEXT_TURNS=3
```

The hook will read the last 3 user turns from the transcript and build
a composite query. Useful when the conversation has built up context
that the current prompt alone doesn't capture.

---

## Hook issues

### "Auto-recall doesn't seem to fire"

Symptoms:
- Claude doesn't seem to "remember" anything from prior sessions
- No `[Hindsight]` lines in stderr even with `HINDSIGHT_DEBUG=true`

Diagnose:

```bash
# Hook state files exist?
ls -la ~/.hindsight/state/
# turns.json should appear after first prompt

# Check hooks are registered
ls .claude/settings.local.json .claude/settings.json
cat .claude/settings.local.json 2>/dev/null | grep recall
```

Fixes:

| Cause | Fix |
|-------|-----|
| Plugin not installed | `/plugin list` — should show `fpl-hsmem` active |
| Project has `.hindsight-disabled` | Remove the marker file if you want hooks on |
| Project's `.claude/settings.local.json` overrides hooks | Check it doesn't have `"hooks": {}` (empty disables all) |
| Claude Code version doesn't support `UserPromptSubmit` event | Update Claude Code |
| Hook timeout (12s) firing on slow Hindsight | Set `HINDSIGHT_RECALL_BUDGET=low` |

Manual test:

```bash
echo '{"prompt":"проверка","cwd":"'"$(pwd)"'","session_id":"x"}' | \
  HINDSIGHT_DEBUG=true \
  node /path/to/fpl-hsmem/dist/hooks/recall.mjs
```

Should output `[Hindsight]` lines and JSON with `hookSpecificOutput`.

### "Auto-retain doesn't save anything"

Causes:

| Cause | Fix |
|-------|-----|
| Throttling — `retainEveryNTurns=10` by default | Have ≥10 turns OR set `HINDSIGHT_RETAIN_EVERY_N_TURNS=1` for testing |
| Transcript too short / empty | Need ≥10 chars of meaningful content |
| `HINDSIGHT_AUTO_RETAIN=false` somewhere | Check env, `.hindsight.json`, `.mcp.json` env |
| Hook timeout (15s) cut off network | Increase timeout in plugin's `hooks.json` or set `HINDSIGHT_DISABLED=false` |
| Hindsight is rejecting writes | Check `docker logs hindsight` for `POST /v1/.../memories` errors |

### "Session ended but final retain didn't happen"

`session-end.mjs` only runs if Claude Code emits the SessionEnd event.
Some shutdown paths (kill -9, terminal closed) skip it. The next session
will pick up where this one left off via auto-retain; the worst-case
loss is the partial conversation since the last throttled retain.

---

## Compaction edge cases

### "Memory looks duplicated after Claude Code compacted my session"

Claude Code occasionally compacts long sessions — the transcript
shrinks mid-session. `retain.mjs` detects this and bumps a chunk index
so the old long document survives.

You'll see documents like:
```
session-abc123     ← original long transcript
session-abc123-c1  ← after first compaction
session-abc123-c2  ← after second compaction
```

This is **correct behavior** — both versions are searchable, recall
picks the more relevant chunk. If you don't want this, delete old
chunks via the web UI (http://localhost:9999).

To see compaction state:

```bash
cat ~/.hindsight/state/retention.json
```

---

## Opt-out troubleshooting

### "I disabled with `.hindsight-disabled` but it still runs"

Check:

```bash
ls -la .hindsight-disabled    # file exists in cwd?
pwd                            # are you in the project root?
```

The marker must be in the **directory Claude Code is launched in** —
not the project's git root if you cd'd into a subdirectory.

If you're using nested directories, you might want to opt out at git
root level:

```bash
cd $(git rev-parse --show-toplevel)
touch .hindsight-disabled
```

### "I enabled but it still doesn't run"

If you previously disabled via env var, check shell exports:

```bash
echo $HINDSIGHT_DISABLED
unset HINDSIGHT_DISABLED   # if accidentally set
```

Also check `.claude/settings.local.json`:

```json
{
  "env": { "HINDSIGHT_DISABLED": "true" }   ← remove this
}
```

---

## Mental model issues

### "Created a mental model, content is empty"

Expected on day one. Mental models are populated by **consolidation
cycles**, which run after retains accumulate. Wait 10-30 minutes, then:

```
mental_model_get("your-page-id")
```

If still empty after an hour:

```bash
# Has Hindsight done any consolidation?
docker logs hindsight 2>&1 | grep -i consolidat | tail -5
```

If you see no consolidation runs, the bank may not have enough memories
yet for consolidation to be useful. Push more conversations through the
bank.

### "Mental model content is stale or wrong"

Force a refresh:

```
mental_model_update("page-id", {
  source_query: "<new or refined query>"
})
```

Or delete and recreate with a better query. Source queries that are too
broad ("everything about X") produce bad pages; narrow questions ("what
decisions about X and why") produce good ones.

---

## Web UI diagnostics

For everything else — the Hindsight web UI is a memory graph
visualizer:

```bash
open http://localhost:9999
```

From here you can:

- Browse all memories in a bank
- See entity extraction quality
- Run search queries directly (faster iteration than via Claude)
- Delete bad memories manually
- Inspect document storage
- See consolidation history

---

## When to file a bug

If you've worked through the above and still have an issue specific to
`fpl-hsmem` (the plugin, not the Hindsight server):

1. Run `/fpl-hsmem:diagnose` and save the output
2. Run `HINDSIGHT_DEBUG=true` and capture hook logs from stderr
3. File at https://github.com/ForgePlan/marketplace/issues with title
   `fpl-hsmem: <symptom>` and attach both outputs

For Hindsight-server-side issues (not the plugin):
https://github.com/vectorize-io/hindsight/issues

---

## Last resort — reset state

If hook state is somehow corrupted (very rare):

```bash
rm -rf ~/.hindsight/state/
```

Turn counters and retention tracking reset to zero. Memories in
Hindsight are unaffected — only the local hook state file is wiped.
Next auto-retain rebuilds the state files.

To **also** reset all memories in a bank (destructive):

```bash
# Use the web UI to delete the bank, or:
curl -X DELETE http://localhost:8888/v1/default/banks/<bank-id>
```

This is irreversible. Use `/fpl-hsmem:export-bank` first if you want
a backup.
