# Getting Started with fpl-skills

A 10-minute walkthrough from "fresh repo" to "fully wired ForgePlan
project with skills loaded and CLAUDE.md in place".

If you already have `forgeplan` installed and just want the install
command, jump to [`README.md`](./README.md). This guide is for the first
time you set up the plugin on a real project.

---

## What you'll have at the end

- `forgeplan` CLI on your `$PATH` (one-time install).
- `fpl-skills` plugin loaded into Claude Code.
- A target project with:
  - `.forgeplan/` — artifact storage (PRDs, RFCs, ADRs, Evidence).
  - `CLAUDE.md` — universal template, stack-detected.
  - `docs/agents/*.md` — 4 metadata files that other skills read instead
    of hardcoding paths.
  - `.mcp.json` — wired so Claude Code can talk to forgeplan via MCP.
  - `.claude/settings.json` — optional safety hook for destructive
    forgeplan ops.

Total time: about 10 minutes the first time, ~1 minute on every
subsequent project (everything but the per-project `/fpl-init` is
one-time).

---

## Step 1 — install forgeplan

`fpl-skills` requires the forgeplan CLI for artifact lifecycle. Pick
whichever channel fits your machine:

```bash
# macOS / Linuxbrew
brew install ForgePlan/tap/forgeplan

# Anywhere with Rust toolchain
cargo install --git https://github.com/ForgePlan/forgeplan forgeplan-cli
```

Verify:

```bash
forgeplan --version
forgeplan health  # exits clean even outside a project
```

If `forgeplan` isn't on `$PATH`, the rest of this guide will refuse to
proceed.

---

## Step 2 — install the plugin

In any Claude Code session:

```
/plugin marketplace add ForgePlan/marketplace
/plugin install fpl-skills@ForgePlan-marketplace
/reload-plugins
```

After reload, you should see the SessionStart hook output something like:

```
🛠  fpl-skills active — branch: main
   New project? Run /fpl-init to bootstrap forgeplan + CLAUDE.md + docs/agents/.
```

---

## Step 3 — open your project

Navigate to the repository you want to wire up. It should be a real git
repo:

```bash
cd ~/Work/my-new-project
git init -b main  # only if it's truly fresh
claude            # start Claude Code in this directory
```

If the repo isn't initialized, `/fpl-init` will refuse — the downstream
skills assume git history.

---

## Step 4 — run /fpl-init

Type:

```
/fpl-init
```

You'll see a plan like:

```
fpl-init plan for my-new-project:
  • forgeplan init
  • wire .mcp.json
  • wire .claude/settings.json
  • /bootstrap
  • /setup

Companion plugins to consider after (NOT installed by this command):
  fpf, agents-core, forgeplan-workflow, forgeplan-orchestra
  laws-of-ux (only if this repo has frontend)

Proceed? [y/n]
```

Approve once. The skill runs end-to-end:

1. **`forgeplan init`** — creates `.forgeplan/` with empty artifact
   tables.
2. **Wire `.mcp.json`** — adds the forgeplan MCP server entry. Existing
   entries (Hindsight, Orchestra, etc.) are preserved.
3. **Wire `.claude/settings.json`** — asks once whether to add a
   PreToolUse safety hook for destructive forgeplan commands. Skip this
   if you'd rather not.
4. **`/bootstrap`** — probes your project (`package.json`, `Cargo.toml`,
   `go.mod`, `pyproject.toml`, `Makefile`, lockfiles) and renders the
   universal CLAUDE.md template with detected language, package manager,
   build/test commands, etc. Anything it can't detect is left as
   `{{PLACEHOLDER}}` so you can fill it in deliberately.
5. **`/setup`** — interactive wizard with four sections:
   - **A** — issue tracker (Orchestra / GitHub Issues / Linear / local
     TODO). Auto-detects, asks once.
   - **B** — build & test commands. Pre-filled from step 4's probes.
   - **C** — project paths (RFC dir, TODO file, ADR dir, docs).
   - **D** — domain glossary. Optional starter `CONTEXT.md`.
6. **Verify + report** — runs `forgeplan health`, lists `docs/agents/`,
   shows the first lines of `CLAUDE.md`, prints a copy-paste block of
   recommended companion plugins.

---

## Step 5 — first useful commands

After `/fpl-init` finishes, try (in order):

```
/restore                # quick session-context recall
/briefing               # today's tasks from your tracker
/research <some-topic>  # deep multi-agent research → research/reports/
/refine <a-plan-file>   # interview-driven refinement of an RFC or plan
/sprint <task>          # wave-based execution
/audit                  # multi-expert code review of pending changes
/diagnose <a-bug>       # disciplined 6-phase debug loop
/autorun <task>         # overnight autopilot — research → sprint → audit
```

Each skill auto-loads `docs/agents/*.md` via frontmatter `@`-imports, so
none of them needs to ask you "where are RFCs?" or "what's your test
command?" again.

---

## Step 6 — add companion plugins (optional)

`/fpl-init` prints a copy-paste block at the end. Run any subset that
matches how you work:

| Plugin | When to add |
|---|---|
| `fpf` | You want First Principles Framework alongside `/refine` and `/diagnose` for hypothesis generation. |
| `agents-core` | You want `/audit` and `/sprint` to draw from 11 baseline subagents (debugger, code-reviewer, planner, tester, etc.). |
| `forgeplan-workflow` | You want a tighter forgeplan-only loop via `/forge-cycle` and `/forge-audit`. Compatible with fpl-skills. |
| `forgeplan-orchestra` | You work across multiple Claude Code sessions / agents and want `/sync` for coordination. |
| `laws-of-ux` | The repo has a frontend. `/audit` will spawn `ux-reviewer` automatically when changesets touch UI code. |

---

## Re-running /fpl-init

`/fpl-init` is idempotent. If everything is already in place, it tells
you and exits without changes. If only some pieces are present
(e.g. you ran `forgeplan init` manually but never wired CLAUDE.md), it
fills in the gaps without touching the existing parts.

When in doubt, run it again. It won't overwrite your work.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "forgeplan CLI is required but not found on $PATH" | Step 1 was skipped | Install via brew or cargo, then re-run `/fpl-init`. |
| "this isn't a git repo" | Forgot `git init` | `git init -b main` then re-run. |
| "this is a plugin source — refuse" | You ran `/fpl-init` inside a marketplace or plugin source | Move to a real project repo. The marketplace itself doesn't get bootstrapped. |
| `forgeplan init` fails | `.forgeplan/` already exists with corrupted state | `rm -rf .forgeplan && /fpl-init` (you'll lose any artifacts that were stored). |
| `.mcp.json` corrupted after the merge | Pre-existing file had invalid JSON | The skill backed it up to `.mcp.json.bak` and wrote a fresh minimal version. Re-merge your old config manually. |
| SessionStart hook still says "Run /fpl-init to bootstrap" after running it | `/reload-plugins` skipped, or `.forgeplan/`/`CLAUDE.md`/`docs/agents/` actually missing | Re-run `/fpl-init`; if all three are there the next session-start will say "Quick start: /restore · /briefing · /research". |

---

## What's next

Once your project is wired, the day-to-day is:

1. **Start of session** — let SessionStart greet you, run `/restore` if
   you want a context refresh.
2. **Pick a task** — `/briefing` lists what's open from your tracker.
3. **Plan it** — `/refine` for fuzzy plans, `/research` for unknown
   territory, `/rfc` for things that need a written record.
4. **Execute** — `/sprint` for wave-based work, `/do` for interactive
   step-by-step, `/autorun` for overnight unattended runs.
5. **Review** — `/audit` before merging, `/diagnose` when something
   broke.

Everything reads `docs/agents/*.md` — so re-run `/setup` (or edit those
files directly) whenever the project structure changes. No skill body
ever hardcodes a path.

Welcome to ForgePlan.
