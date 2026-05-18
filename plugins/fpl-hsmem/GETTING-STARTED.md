# Getting Started with fpl-hsmem

A 10-minute walkthrough from "no memory at all" to "Claude remembers
your project across sessions".

If you already have Hindsight running and just need the install command,
jump to [`README.md`](./README.md). This guide is for the first time you
set up `fpl-hsmem` on a real machine.

---

## What you'll have at the end

- A local Hindsight server running in Docker, no external LLM keys
  required (uses your Claude subscription for fact extraction).
- The `fpl-hsmem` plugin loaded into Claude Code.
- One pilot project wired up with:
  - A private memory bank derived automatically from the project name.
  - Auto-recall firing before every prompt.
  - Auto-retain saving conversations once every 10 turns.
  - Three starter mental models seeded by `/fpl-hsmem:bootstrap`.

Total time: about 10 minutes the first time, ~0 seconds on every
subsequent project (the plugin works out of the box once installed).

---

## Step 1 — start Hindsight

`fpl-hsmem` is an MCP client for [Hindsight](https://github.com/vectorize-io/hindsight).
You need one Hindsight server running on your machine. Recommended path
uses the `claude-code` LLM provider — Hindsight will use your Claude
subscription for fact extraction, so no external API keys.

```bash
docker run -d --name hindsight \
  -p 8888:8888 \
  -p 9999:9999 \
  -e HINDSIGHT_API_LLM_PROVIDER=claude-code \
  ghcr.io/vectorize-io/hindsight:latest
```

Verify:

```bash
curl http://localhost:8888/health
# {"status":"healthy","database":"connected",...}
```

If you see anything other than `healthy`, check `docker logs hindsight -f`
and the [Troubleshooting](./TROUBLESHOOTING.md#hindsight-server-issues)
guide before continuing.

> **Why this provider?** `claude-code` reuses your `claude auth login`
> credentials. Alternative providers (`openai`, `anthropic`, `ollama`,
> `groq`, ...) work too — see [`CONFIGURATION.md`](./CONFIGURATION.md#llm-providers)
> if you prefer one of them.

---

## Step 2 — install the plugin

In any Claude Code session:

```
/plugin marketplace add ForgePlan/marketplace
/plugin install fpl-hsmem@ForgePlan-marketplace
/reload-plugins
```

After reload, `claude plugin list` should show `fpl-hsmem` as active.

---

## Step 3 — verify in your pilot project

Pick the project you want to try memory on. Pick something you actually
work in — empty memory benefits nothing.

```bash
cd ~/Work/my-pilot-project
claude   # start Claude Code in this directory
```

In the session, run:

```
/fpl-hsmem:status
```

You should see something like:

```
Hindsight: healthy
Bank:      my-pilot-project (0 memories, 0 documents)
Pages:     none yet
URL:       http://localhost:8888

All green. Bank is empty — auto-retain will start populating it after
about 10 conversation turns.
```

If the bank ID doesn't match your expectation (worktrees, monorepos,
nested directories), see [`CONFIGURATION.md`](./CONFIGURATION.md#bank-id-resolution).

---

## Step 4 — bootstrap the bank

The bank starts empty. You can wait for auto-retain to populate it
gradually, or seed it now with existing artifacts and starter pages.

```
/fpl-hsmem:bootstrap
```

The skill will:

1. Confirm the bank ID and propose a one-sentence mission for it.
2. Look for `forge/prds/*.md`, `forge/rfcs/*.md`, `forge/adrs/*.md`,
   `docs/architecture.md` and offer to ingest them.
3. Propose 2-3 starter mental models tailored to the project (e.g.
   `decisions-log`, `tech-debt`, `team-conventions`).

You see a plan and confirm each step. Skip what's not relevant — this
is interactive.

> **Why not auto-ingest everything?** Hindsight's value is
> conversational long-tail context, not file storage. Ingesting active
> docs creates duplication with `Read`. Start small, let memory grow
> from actual conversations.

---

## Step 5 — have a few real conversations

Use Claude in the project as you normally would. Ask design questions.
Discuss tradeoffs. Get bugs explained. Don't think about memory.

Behind the scenes:

- **Every prompt** triggers `recall.mjs` — relevant memories from this
  bank are silently appended to your message before Claude sees it.
- **Every response** is followed by `retain.mjs` (throttled — saves the
  full transcript once every 10 turns by default).
- **Closing the session** triggers `session-end.mjs` for a final retain
  so short conversations aren't lost.

After 10+ turns, run `/fpl-hsmem:status` again. You should see memory
count climbing.

---

## Step 6 — create your first mental model

Mental models are **living pages** — synthesized answers to a recurring
question that Hindsight auto-refreshes after each memory consolidation.
They give Claude (and you) a coherent summary instead of raw recall
results.

Good candidates emerge from real usage. Look for questions you've asked
3+ times: "what tech debt have we flagged?", "what decisions have we
made about X?", "what conventions does this codebase use?".

```
/fpl-hsmem:mental-model

> id:           tech-debt
> name:         Open tech debt
> source_query: "What technical debt items have we identified across
>                conversations but not yet addressed?"

Living page — Hindsight auto-rebuilds the content after every
consolidation. Content appears after a few retain cycles.

Create? [y/n] y
```

The page is created immediately but **empty** — Hindsight needs at least
one consolidation cycle to populate it. Check back in 10-30 minutes
with `mental_model_get("tech-debt")`.

---

## Step 7 — explore the web UI (optional)

Hindsight ships with a memory graph visualizer:

```
open http://localhost:9999
```

You can see entities Hindsight extracted, relationships between them,
the raw memories, and run search queries directly. Useful for debugging
recall quality.

---

## What to do next

After a few days of real use:

1. **Run `/fpl-hsmem:status`** to confirm memories are accumulating.
2. **Test recall quality**: ask Claude about something you discussed
   earlier — does it remember? If recall returns junk, see the
   [Troubleshooting](./TROUBLESHOOTING.md#recall-quality) guide.
3. **Add more mental models** as recurring patterns emerge.
4. **Read [`USAGE.md`](./USAGE.md)** for integration recipes with
   `fpl-skills`, forgeplan artifacts, and team workflows.

---

## Common first-day issues

| Symptom | Most likely cause | Fix |
|---------|-------------------|-----|
| `memory_status` says "unreachable" | Docker container down | `docker start hindsight`, then check `docker logs hindsight` |
| Memory count stuck at 0 after many turns | Hook not firing | Check `~/.hindsight/state/turns.json` exists; run `/fpl-hsmem:diagnose` |
| Wrong bank ID resolved | Project is inside a git worktree | See [`CONFIGURATION.md`](./CONFIGURATION.md#bank-id-resolution) |
| Recall returns irrelevant results | Bank too small yet, or query too short | Wait for more retains; rephrase as a full sentence |
| Don't want memory in this project | — | `touch .hindsight-disabled` in project root |

Full diagnostic via `/fpl-hsmem:diagnose` or
[`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md).

---

## Multi-project workflow

You don't need to repeat this guide per project. The plugin's
plugin-install mode works on every project automatically — bank ID is
derived from each project's git root or directory name. The only thing
you might want to do per project is run `/fpl-hsmem:bootstrap` once to
seed it with existing artifacts.

If you want explicit, committed configuration per project (visible to
the team via git), use Mode 2 instead — see
[`CONFIGURATION.md`](./CONFIGURATION.md#mode-2-setup-cli).
