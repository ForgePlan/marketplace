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

## Bank identity — the failure class that eats memory silently

Everything in this chapter is one failure wearing different hats: **more than one
thing can decide which bank you write to, and when they disagree nobody is told.**
Recall keeps answering, statistics keep looking healthy, and the corpus quietly
splits in two. Every recipe below was written after living through it.

### The five-minute check — run this first

```
memory_get_current_bank      # in a plain session
memory_status                # names the SOURCE of the bank id, and warns when it was derived
```

Then find everything that can set the name:

```bash
grep -rn HINDSIGHT_BANK_ID \
  .mcp.json .claude/settings.json .claude/settings.local.json \
  ~/.hindsight/config.json .hindsight.json 2>/dev/null
```

**One line is healthy. Two lines is the bug**, even when both name the same
bank — the second one is a trap waiting for the day they diverge.

Resolution order, highest wins: environment → `.mcp.json` (that server only) →
`.hindsight.json` → `~/.hindsight/config.json` → derived from the project root's
directory name. `.mcp.json`'s `env` block applies **only to the server declared
in it**, which is exactly how one project ends up with a server on one bank and
its background hooks on another.

### "Memory forgot something I know it was told"

The single most common report, and it is almost never amnesia.

| What to check | What it means |
|---|---|
| `memory_get_current_bank` returns a bank you did not choose | something is naming it for you — run the grep above |
| `memory_status` says `bank_id_source: derived-from-directory` | nobody chose it; rename the directory and the memory moves |
| Two sets of hindsight tools in the tool list, different prefixes | two servers are registered — see the next recipe |
| `memory_operations status=failed` returns rows | the conversation genuinely never became memory; this is loss, not misplacement |

### "There are two hindsight servers in my tool list"

Symptom: both `mcp__hindsight__*` and `mcp__plugin_<something>_hindsight__*`
appear. Ask each which bank it holds:

```
memory_get_current_bank    # via the plugin's tools
memory_get_current_bank    # via the hand-wired server's tools
```

Different answers mean the project has been writing to two banks in parallel.

Worse, check **which binary** the hand-wired one runs:

```bash
python3 -c "import json;print(json.load(open('.mcp.json'))['mcpServers']['hindsight']['args'])"
```

A path under `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/` pins a
**frozen old version of the very plugin you have installed**. It does not update
when the plugin updates, so every fix shipped since that version is absent from
that path while looking identical from the outside.

**Fix:** delete the hand-wired `hindsight` block from `.mcp.json` and let the
plugin provide the server. Keep a copy of the file first. Verify by restarting
the session and confirming only one set of memory tools is present.

### "I have several banks for one project — how do I merge them?"

Read this before running anything. The merge path has a rule that is in no
documentation and costs an afternoon to discover.

**`document-transfer` SKIPS a document whose id already exists in the target.**
It reports `completed` either way. A run here moved 1 document out of 8 and
reported success:

```json
{"documents_imported": 1, "documents_skipped": 7, "facts_imported": 4}
```

Why: the background hook writes each session's transcript under the **session
UUID**. Two banks that both received hook writes therefore hold the *same ids*
with *different contents*, and the importer refuses to touch a colliding id.

**So measure the overlap before you transfer.** The useful size of a transfer is
not how many documents the source has — it is how many of the source's document
ids the target does *not* already have:

```bash
# list ids on both sides, compare
curl -s -H "Authorization: Bearer $HINDSIGHT_API_KEY" \
  "$HINDSIGHT_URL/v1/default/banks/<source>/documents?limit=50" | jq -r '.items[].id' | sort > /tmp/src.ids
curl -s -H "Authorization: Bearer $HINDSIGHT_API_KEY" \
  "$HINDSIGHT_URL/v1/default/banks/<target>/documents?limit=50" | jq -r '.items[].id' | sort > /tmp/tgt.ids
comm -23 /tmp/src.ids /tmp/tgt.ids     # these are the only ones that will move
```

Two outcomes, and they call for opposite actions:

- **High overlap (session-UUID ids on both sides).** The banks are not two
  corpora, they are two partial copies of the same conversation history. There is
  little to merge; pick the one that is ahead and stop writing to the other.
  Do **not** delete the target's copy to force the source's in — measure first,
  the target's copy is often the larger one.
- **Zero overlap (named documents: `prd-024-…`, `master-reference`).** These are
  ingested artifacts, not transcripts. The transfer will move all of them.

The procedure, once you know it is worth doing:

```
POST /v1/default/banks/<source>/document-transfer/export   → operation_id
GET  /v1/default/banks/<source>/operations/<id>            → poll to completed
                                                             → result_metadata.download_url
# download the archive, then
POST /v1/default/banks/<target>/document-transfer          → multipart upload → operation_id
GET  /v1/default/banks/<target>/operations/<id>            → poll to completed
POST /v1/default/banks/<target>/consolidate                → rebuild derived beliefs
# then rebuild each knowledge page: mental_model_refresh
```

Notes earned the hard way:

- **Poll to a terminal state; never assume.** A poller that dies of a network
  hiccup is not evidence about the job it was watching. Read
  `result_metadata` — `documents_imported` is the only number that means anything.
- **Observations do not travel and do not need to.** Every memory outside a
  document is a derived belief (measured: exactly, to the unit, in three separate
  banks). The target recomputes them from the facts it now has, which is what
  `/consolidate` is for.
- **The source bank is untouched.** Transfer copies; nothing is deleted. If the
  import disappoints, the source is still the source.
- The admin CLI's `import-bank` is a *different thing*: it restores a whole bank
  and fails if the target already exists. It cannot merge.

### "I have banks I never created"

A bank materialises on first touch — any string that reaches the server becomes
one. A deployment audited here held **61 banks**, among them `src`, `docs`,
`dev`, `repo`, `shared`, `old`, `k8s`: directory names that leaked in from a
session started one level too deep.

There is no server-side guard against this. Prevention is on the client:

- Declare `HINDSIGHT_BANK_ID` explicitly in every project, so nothing is derived.
- Treat `bank_id_source: derived-from-directory` in `memory_status` as a defect
  to fix, not a note.
- A typo in a declared name still creates a bank. If that matters to you, keep a
  short allowlist of known bank ids and check against it before writing.

Junk banks are harmless but not free: they are indistinguishable from real ones
in `GET /v1/default/banks`, so the next person auditing cannot tell what is live.

### "The bank id changed without me changing anything"

You renamed the project directory, or a session started from a subdirectory that
resolves differently. Memory under the old name is still on the server — orphaned,
not lost.

1. **Point back at it**: declare the old `HINDSIGHT_BANK_ID` explicitly.
2. **Or move what matters across** with the transfer procedure above — after
   measuring the id overlap.

Renaming a bank in place is not supported.

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
