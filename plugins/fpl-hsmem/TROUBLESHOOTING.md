# Troubleshooting

> [!IMPORTANT]
> **3.7.0 is project-only and default-off.** It requires an explicit `.hindsight.json` and
> Hindsight API >=0.10.2 and <0.11.0. `autoRecall`/`autoRetain` are false unless explicitly enabled;
> initial adoption should use the read-only policy in [`CONFIGURATION.md`](./CONFIGURATION.md).


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
| Port 8888 conflict | Run on a different port and set that exact `url` in `.hindsight.json`; there is no URL default |
| Container exists but unhealthy | Diagnose before recreation; production rollback must keep image and database paired |
| `claude-code` provider not authenticated | Run `claude auth login` on the host, recreate container |

For a new disposable local server, pin a compatible image rather than `latest`:

```bash
docker rm -f hindsight
docker run -d --name hindsight \
  -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_PROVIDER=claude-code \
  ghcr.io/vectorize-io/hindsight:0.10.2
curl http://localhost:8888/version
```

Do not use this destructive recreation recipe on production. Follow the migration runbook in
`CONFIGURATION.md`: restored-copy rehearsal, paired image+database rollback, and restore evidence.

### "First startup is very slow"

First-time Docker run downloads the embedding model (~100MB) and
initializes Postgres. Subsequent starts are seconds. Wait 30-60 seconds
on first run, then `curl http://localhost:8888/health`.

### "Hindsight extracts garbage facts"

The fact-extraction LLM is choosing bad facts. Two levers:

1. **Set a better `retainMission`** — an **operator** setting, deliberately not an agent-callable
   tool argument. It steers what the extractor keeps on every future retain, so an agent able to set
   it could rewrite the memory rules for everything that follows. Set it in the environment or the
   bank config; `memory_set_mission` accepts only the persona:
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

## Configuration and bank identity

### The five-minute check

```
memory_get_current_bank
memory_status
```

The active identity has one source: the nearest project `.hindsight.json` within the discovery
boundary. It declares `banks` and `defaultBank`; `HINDSIGHT_BANK_ID`, user-global config, and folder
names are ignored. If no config is found or it is disabled, the server is silent and lists zero
tools. If it is invalid, it lists zero tools and emits one redacted stderr diagnostic.

Check the project files, not legacy selectors:

```bash
cat .hindsight.json
test ! -e .hindsight-disabled
```

### "Unsupported Hindsight API version"

The first bank-list or bank-scoped request calls `/version` and caches the result. API 0.9.1,
0.11+, missing/malformed responses, and request failure are refused before any bank request. Use a
server in **>=0.10.2 and <0.11.0**; do not bypass the gate. Inactive/invalid configurations do not
make even the version request.

### "There are two hindsight servers in my tool list"

Only one registration is allowed per runtime. In Claude Code, use the plugin registration and
remove a hand-wired duplicate. In Codex or OMP, register
`node /absolute/path/to/fpl-hsmem/dist/index.mjs` once in that client's project MCP config. Do not
add legacy bank environment selectors. Restart and confirm only one tool prefix remains.

### "The selected bank is refused"

The client refuses a bank outside `banks` or absent from `GET /v1/default/banks` before a
bank-scoped request. Correct the explicit configuration, or have an authorized operator create the
bank separately. Do not widen the allowlist merely to silence the error.

`BankGate` and `allowTools`/`denyTools` are client-side controls, not Hindsight server
authorization. Other clients holding credentials are outside those controls, and the plugin makes
no blanket claim that every server read can never create state.

### "I have legacy split banks"

Do not merge during the Stage-0 pilot. Freeze writes, inventory source/target document IDs and
collisions, and make migration a separately reviewed operation. Hindsight's document transfer may
skip IDs already present in the target while still reporting completion; measure imported/skipped
counts and keep the source unchanged until the result is verified.

---

## Recall quality

### "Recall returns no results"

Causes (in likelihood order):

1. **Bank is empty.** Run `memory_status`. An empty bank is expected during a read-only pilot;
   seeding it needs a later write authorization.
2. **Query is too short.** Hindsight needs ≥5 characters. The hook, if enabled, skips very short
   prompts.
3. **Auto-recall is off.** Expected by default; use `memory_recall` manually in Stage 0.
4. **Server health or compatibility.** See "Hindsight is unreachable" and the version gate above.

### "Recall returns junk (irrelevant memories)"

Common causes:

| Cause | Fix |
|-------|-----|
| Query is a single keyword | Rephrase as a natural-language question |
| `recallBudget: low` set | Try `high` for thoroughness |
| Bank contains too much noise | Refine the server bank mission through an authorized operator; narrow recall with `tags` |
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

Set `recallContextTurns` in `.hindsight.json` (only relevant after `autoRecall: true` is separately
authorized):

```json
{ "recallContextTurns": 3 }
```

The hook reads that many prior user turns from the transcript and builds a bounded composite query.

---

## Hook issues

### "Auto-recall doesn't seem to fire"

Symptoms after `autoRecall: true` was explicitly authorized:
- Claude does not seem to remember prior sessions.
- No `[Hindsight]` lines appear on stderr with project config `"debug": true`.

Diagnose:

```bash
cat .hindsight.json
test ! -e .hindsight-disabled
```

First confirm `autoRecall` is actually true. In the Stage-0 pilot, a silent hook is correct.

Fixes:

| Cause | Fix |
|-------|-----|
| Plugin not installed | `/plugin list` — should show `fpl-hsmem` active |
| Project has `.hindsight-disabled` | Remove the marker file if you want hooks on |
| Project's `.claude/settings.local.json` overrides hooks | Check it doesn't have `"hooks": {}` (empty disables all) |
| Claude Code version doesn't support `UserPromptSubmit` event | Update Claude Code |
| Hook timeout (12s) firing on slow Hindsight | Lower `.hindsight.json` `recallBudget` or keep `autoRecall: false` |

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
| Throttling — `retainEveryNTurns=10` by default | After write authorization, lower `retainEveryNTurns` in `.hindsight.json` for a controlled test |
| Transcript too short / empty | Need ≥10 chars of meaningful content |
| `autoRetain` is false | Expected by default; enable only under a later write-authorization record |
| Hook timeout (15s) cut off network | Diagnose server latency; do not bypass project safety controls |
| Hindsight is rejecting writes | Check `docker logs hindsight` for `POST /v1/.../memories` errors |

### "Session ended but final retain didn't happen"

`session-end.mjs` only runs if Claude Code emits the SessionEnd event and `autoRetain` is true.
Some shutdown paths (kill -9, terminal closed) skip it. In the default-off pilot it is intentionally
silent and no transcript is written.

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

Check both the launch directory and the discovered project config directory:

```bash
pwd
ls -la .hindsight-disabled
root="$(git rev-parse --show-toplevel)"
ls -la "$root/.hindsight.json" "$root/.hindsight-disabled"
```

A marker in cwd or beside `.hindsight.json` disables the project. The config-side marker keeps the
opt-out effective when Claude Code starts in a subdirectory.

To opt out at the configured project:

```bash
touch "$(git rev-parse --show-toplevel)/.hindsight-disabled"
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

## Consolidation stops keeping up on a large bank

The symptom is quiet: mental models stay stale, the observation count stops moving, and nothing
errors on your side. Server logs show `RuntimeError: Failed to search memories (TimeoutError)`.

**What the run has to search is what times out.** Consolidation searches the graph for every
candidate memory, and past some bank size that search stops fitting in the server's timeout. Two
knobs change how much work one job attempts — the **scope** (`observation_scopes`) and the **round
size** (`consolidation_max_memories_per_round`). Measured on one bank — 41,972 memories,
2,063,526 links — in this order:

| Scope | Round size | Result |
|---|---|---|
| whole bank | 100 | wedged for a week, **305 retries**, never finished |
| whole bank | 25 | finished, but 7 retries over ~35 min for **+12** observations |
| one tag | 25 | 3 of 5 jobs finished with **0 retries**; 1 failed, 1 kept retrying |
| one tag | 100 | 1 of 1 failed |

**Read this honestly: narrowing moves the boundary, it does not remove it.** The controlled
comparison is rows 2 and 3 — same round size, only the scope changed, and the change is large. But
a narrowed run on a thousand-memory slice still fails sometimes, and the single sample at round size
100 failed. Both knobs matter; neither is a cure.

**The real fix for a bank this size is to stop having a bank this size.** Smaller banks on the same
deployment (4,863 and 7,011 memories) consolidate whole, with no narrowing and no tuning. If you are
tuning these knobs repeatedly, that is the signal to split the bank, not to keep tuning.

**Graph retrieval is not the culprit** — check this before you go turning it off. Disabling
`enable_graph_retrieval` cuts recall sharply (23.8 s → 4.4 s on the bank above), but whole-bank
consolidation kept timing out with it disabled, and the narrowed runs succeeded with it back on.
Turning it off permanently degrades every future query to buy nothing.

### The narrowing

`POST /consolidate` accepts `observation_scopes` — a list of tag sets. Only unconsolidated memories
whose tags contain every tag of at least one set get processed:

```bash
curl -sX POST "$H/v1/default/banks/$BANK/consolidate" \
  -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \
  -d '{"observation_scopes": [["<one-tag>"]]}'
```

Auto-retain tags every memory with the **Claude Code session id**, so a session id is a ready-made
slice — roughly a thousand memories instead of forty thousand. Read the backlog before and after:

```bash
# how many memories are waiting; valid states are pending, done, failed
curl -s "$H/v1/default/banks/$BANK/memories/list?limit=1&consolidation_state=pending" \
  -H "Authorization: Bearer $KEY" | jq .total
```

### The dedup trap — why one bad job blocks everything

While a consolidation job is `pending`, every new `POST /consolidate` returns **that same job** with
`deduplicated: true` instead of starting a new one. So a job that can never finish blocks
consolidation permanently, and the block is invisible: your request returns `200`.

```bash
# is something already queued?
curl -s "$H/v1/default/banks/$BANK/operations?type=consolidation&status=pending" \
  -H "Authorization: Bearer $KEY"

# cancel it — ONLY works while status is 'pending'
curl -sX DELETE "$H/v1/default/banks/$BANK/operations/<id>" -H "Authorization: Bearer $KEY"
```

A job already in `processing` **cannot be cancelled** (`409`, "only 'pending' operations can be
cancelled"). Wait it out — it does reach a terminal state, and its per-round timeouts are retries,
not death.

### `consolidation/recover` — check before you call it

`POST /consolidation/recover` resets memories that were *permanently marked failed* after exhausting
retries, so the next run picks them up again. It deletes nothing. But it only has work to do if
something is actually in that state — check first, or you will "fix" a problem you do not have:

```bash
curl -s "$H/v1/default/banks/$BANK/memories/list?limit=1&consolidation_state=failed" \
  -H "Authorization: Bearer $KEY" | jq .total   # 0 → recover is a no-op
```

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
If `autoRetain` is later enabled, its next eligible run rebuilds the state files.

To **also** reset all memories in a bank (destructive):

```bash
# Use the web UI to delete the bank, or:
curl -X DELETE http://localhost:8888/v1/default/banks/<bank-id>
```

This is irreversible. Use `/fpl-hsmem:export-bank` first if you want
a backup.
