---
name: fpl-init
description: One-command project bootstrap for the ForgePlan ecosystem. Probes the forgeplan CLI, runs `forgeplan init`, wires `.mcp.json` and `.claude/settings.json`, then chains `/bootstrap` (universal CLAUDE.md template) and `/setup` (docs/agents/ wizard) so a fresh repo is fully wired in one shot. Recommends — but does not install — companion plugins (fpf, laws-of-ux, agents-core, forgeplan-workflow, forgeplan-orchestra). Use on a brand-new project, or on an existing project that has none of `.forgeplan/`, `CLAUDE.md`, `docs/agents/`. Triggers (EN/RU) — "fpl init", "init project", "bootstrap forgeplan", "set up everything", "full project setup", "/fpl-init", "поставь всё", "разверни проект с нуля", "инициализируй проект".
disable-model-invocation: true
allowed-tools: Read Write Edit Bash(test *) Bash(ls *) Bash(cat *) Bash(pwd *) Bash(command *) Bash(git *) Bash(forgeplan *) Bash(mkdir *) Bash(jq *) Bash(python3 *)
---

# fpl-init — full project bootstrap

One command. Wraps the four manual steps a new ForgePlan project usually
needs (forgeplan init, MCP wiring, CLAUDE.md, docs/agents/) and runs them
end-to-end. The user only confirms once at the start; verification happens
at the end.

This skill **delegates** — it doesn't reimplement [`bootstrap`](../bootstrap/SKILL.md)
or [`setup`](../setup/SKILL.md). It probes, decides what's missing, then
calls those skills' workflows for the parts that apply.

---

## When to use

- Brand-new repo (just `git init`, no scaffolding).
- Existing repo missing the canonical baseline: no `.forgeplan/`, no
  `CLAUDE.md`, no `docs/agents/`.
- User explicitly types `/fpl-init` or asks "set up everything", "разверни
  проект с нуля", "поставь всё".

## When NOT to use

- All three baseline pieces are already present (`.forgeplan/` +
  `CLAUDE.md` + `docs/agents/`). Tell the user the project is already
  wired and route them to the targeted skill they actually need
  (`/restore`, `/briefing`, etc.).
- The user wants only one piece (e.g. just `CLAUDE.md`) — call the
  specific skill directly (`/bootstrap`).
- The cwd is a marketplace / plugin source (signature: `.claude-plugin/`
  or `plugins/*/`-like layout) — refuse, this isn't a target project.
- No git repo. The downstream skills assume git; refuse and ask the user
  to `git init -b main` first.

---

## Process

### 1. Orient

Run in parallel:

```bash
pwd
git rev-parse --show-toplevel 2>/dev/null || echo "not a git repo"
test -f CLAUDE.md && echo "CLAUDE.md exists" || echo "no CLAUDE.md"
test -d .forgeplan && echo ".forgeplan/ exists" || echo "no .forgeplan/"
test -d docs/agents && echo "docs/agents/ exists" || echo "no docs/agents/"
test -f .mcp.json && echo ".mcp.json exists" || echo "no .mcp.json"
test -f .claude/settings.json && echo ".claude/settings.json exists" || echo "no .claude/settings.json"
test -d .claude-plugin && echo "REFUSE: this is a plugin source" || true
```

Decide:

| Probe result | Action |
|---|---|
| `not a git repo` | Refuse. Ask user to run `git init -b main`. |
| `REFUSE: this is a plugin source` | Refuse. Tell the user this skill is for project repos, not plugin sources. |
| All four (`.forgeplan/`, `CLAUDE.md`, `docs/agents/`, `.mcp.json`) present | Tell the user setup is already complete; suggest `/restore` for context recall and exit. |
| Anything missing | Continue to step 2. |

### 2. Probe forgeplan CLI

```bash
command -v forgeplan
forgeplan --version 2>/dev/null || true
```

If `forgeplan` is **not on `$PATH`** — refuse with install instructions:

```
forgeplan CLI is required but not found on $PATH.

Install it via one of:
  • macOS / Linux Homebrew: brew install ForgePlan/tap/forgeplan
  • From source (any platform with Rust):
      cargo install --git https://github.com/ForgePlan/forgeplan forgeplan-cli

Then re-run /fpl-init.
```

Don't try to install it yourself; this is a one-time user action.

### 3. Plan

Build a short plan from the probe results and show it to the user. **Ask
once, run end-to-end** (no per-step approvals):

```
fpl-init plan for $(basename "$PWD"):
  • forgeplan init        ← .forgeplan/ missing
  • wire .mcp.json        ← add forgeplan MCP server
  • wire .claude/settings.json  ← add forgeplan PreToolUse safety hook
  • /bootstrap            ← create CLAUDE.md from template (stack-detected)
  • /setup                ← interactive wizard for docs/agents/

Companion plugins to consider after (NOT installed by this command):
  fpf, agents-core, forgeplan-workflow, forgeplan-orchestra
  laws-of-ux (only if this repo has frontend)

Proceed? [y/n]
```

Skip the rows for pieces that already exist (e.g. don't list
`forgeplan init` if `.forgeplan/` is already there). If the user says no,
exit cleanly.

### 4. forgeplan init

If `.forgeplan/` is missing:

```bash
forgeplan init -y
```

If forgeplan's `init` command doesn't accept `-y`, fall back to
`forgeplan init` and treat any interactive prompt by passing through with
sensible defaults (the user has already approved the plan in step 3).

Verify:

```bash
test -d .forgeplan && forgeplan health 2>/dev/null | head -10 || echo "init failed"
```

If init failed — stop and surface the forgeplan output. Don't continue
through the rest of the plan with a broken artifact store.

### 5. Wire `.mcp.json`

Goal: ensure the `forgeplan` MCP server entry exists, **without
overwriting existing entries**.

Target shape:

```json
{
  "mcpServers": {
    "forgeplan": {
      "command": "forgeplan",
      "args": ["mcp"],
      "transport": "stdio"
    }
  }
}
```

Rules:
- File missing → write the minimal version above.
- File present + `mcpServers.forgeplan` missing → merge the entry in,
  preserving every other server (e.g. `hindsight`, `orch`).
- File present + `mcpServers.forgeplan` already there → diff against
  target shape; if it matches, skip; if not, ask the user before
  changing.

Implementation: prefer `python3` for the merge (always available, no
dependency on `jq`):

```bash
python3 - <<'PY'
import json, pathlib
p = pathlib.Path(".mcp.json")
data = json.loads(p.read_text()) if p.exists() else {}
data.setdefault("mcpServers", {})
data["mcpServers"].setdefault("forgeplan", {
    "command": "forgeplan",
    "args": ["mcp"],
    "transport": "stdio",
})
p.write_text(json.dumps(data, indent=2) + "\n")
PY
```

Make sure the file ends with a newline; some editors complain otherwise.

### 6. Wire `.claude/settings.json` (optional, ask first)

Goal: add a `PreToolUse:Bash` hook that warns before destructive forgeplan
commands (delete, reset, force-merge). This is a soft-default — ask the
user before adding it, since `.claude/settings.json` is host-personal.

Ask:

```
Add a PreToolUse safety hook for forgeplan? It blocks Bash commands
that look like `forgeplan delete`/`reset`/`destroy` without explicit
--yes flags. Skip this if you're already comfortable with destructive
forgeplan commands. [y/n]
```

If yes, merge into `.claude/settings.json` (creating the file if needed):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "case \"$CLAUDE_TOOL_INPUT_command\" in *'forgeplan delete'*|*'forgeplan reset'*|*'forgeplan destroy'*) [[ \"$CLAUDE_TOOL_INPUT_command\" == *'--yes'* ]] || { echo 'destructive forgeplan op without --yes; aborting'; exit 2; };; esac"
          }
        ]
      }
    ]
  }
}
```

Use the same Python merge approach as in step 5: load → merge into
`hooks.PreToolUse[]` (append, don't replace) → write. If the user already
has a `PreToolUse:Bash` hook, append a sibling `hooks` entry instead of
replacing the matcher.

If the user says no — skip this step entirely, don't print warnings.

### 7. Run `/bootstrap` flow

If `CLAUDE.md` is missing, invoke the bootstrap workflow inline (don't
spawn a sub-session — this skill IS the orchestrator):

1. Run the stack-detection probes from
   [`bootstrap`](../bootstrap/SKILL.md) step 3.
2. **Read the template file** at
   `../bootstrap/resources/templates/CLAUDE.md.template`. This is
   **mandatory**, not aspirational:
   - Use `Read` to load the template literally. Don't summarize, don't
     paraphrase, don't write a "better version from memory".
   - If the file doesn't exist, **abort step 7** and surface the path
     you tried. Do not invent a replacement CLAUDE.md.
3. Substitute placeholders in the loaded text:
   - Replace every `{{VAR}}` with the value detected in step 7.1.
   - For each `{{IF_X}}…{{/IF_X}}` block: keep inner content if `X` is
     true (e.g. `IF_LANG_TS` when TypeScript was detected), drop the
     entire block (markers included) if false.
   - Inline `{{IF_X}}…{{/IF_X}}` markers (used inside list items and
     tables for one-line additions) follow the same rule.
   - Replace `<PROJECT_NAME>` with `basename "$PWD"`.
   - Anything you can't determine → leave the placeholder visible
     (`{{VAR}}`) with a HTML comment line above it:
     `<!-- /fpl-init: could not detect — fill manually -->`.
     **Never guess** — a visible placeholder gets fixed once; a wrong
     guess gets propagated.
4. Write the rendered output verbatim to `./CLAUDE.md`. The structure
   (red-lines section first, non-goals last, the section ordering) is
   load-bearing — see `bootstrap/resources/guides/CLAUDE-MD-GUIDE.ru.md`
   for why. Do not reorder, omit, or "improve" sections.

Use **append mode** if `CLAUDE.md` already exists — the user may have a
custom file they care about. Default to append, never replace. Append
means adding a `## Reference` block pointing to fpl-skills, not pasting
the whole template.

Don't copy the optional `guides/` folder unless the user explicitly asked
for it — that's `bootstrap`'s decision and most projects don't need
those Russian author-guides.

**Anti-pattern to avoid**: writing a thin 60-line CLAUDE.md "from
scratch" because the template seems too verbose. The verbosity is the
point — the U-curve attention model needs primacy/recency zones to be
populated. A thin file silently strips guard rails.

### 7-bis. Inject forgeplan operating contract into CLAUDE.md

If forgeplan CLI is on `$PATH` (probed in step 2), append the **operating contract** to CLAUDE.md. This makes forgeplan-aware behaviour the default for every session in the project — without it, agents revert to general heuristics and skip artifact-graph operations under context pressure (the failure mode this section fixes).

**Idempotency check** — read CLAUDE.md and look for the version marker `<!-- forgeplan-operating-contract:v1 -->`. If present, skip silently and continue to step 8. If absent, ask the user once:

```
Inject the 13-line forgeplan operating contract into CLAUDE.md? It tells future
agents to use forgeplan as source-of-truth on every non-trivial task — search
before creating, claim before working, evidence after finishing. [y/n]
```

Default to `y` (per the step-3 plan approval). If user says no — skip; do not warn again.

If yes — append (NOT replace) the following block to `./CLAUDE.md`:

```markdown
<!-- forgeplan-operating-contract:v1 -->
## Forgeplan operating contract (this project)

Forgeplan is the source of truth for artifacts in this project. On every non-trivial task you MUST:

**Before** — `forgeplan search "<topic>"` then `forgeplan list -s draft`. Find related artifacts before creating new ones (avoid duplicates; reuse existing).
**During** (multi-agent / artifact-driven) — `forgeplan claim <ID> --agent <name>` per teammate before they start; `forgeplan dispatch -n N --json` for parallel-safe wave grouping.
**After** — `forgeplan new evidence "<summary>"` + `forgeplan link EVID-MMM <ARTIFACT-ID> --relation informs` + `forgeplan score <ARTIFACT-ID>` + `forgeplan activate <ARTIFACT-ID>` if R_eff > 0.

Prefer `mcp__forgeplan__*` tools over shell when forgeplan MCP is wired in `.mcp.json`. If `command -v forgeplan` fails, warn once at session start and proceed without artifact ops.

This is enforcement, not recommendation. Skipping leaves the artifact graph empty — `forgeplan health` will flag orphans / missing evidence / stale stubs.
```

The marker `<!-- forgeplan-operating-contract:v1 -->` is **load-bearing**: re-running `/fpl-init` keys off this marker to avoid double-appending. If the contract evolves to v2, change the marker and add a migration note rather than mutating the v1 block in place.

**Verify**: `grep -q 'forgeplan-operating-contract:v1' CLAUDE.md` returns 0. Echo "✓ operating contract injected" or "✓ contract already present, skipped" depending on path taken.

### 8. Run `/setup` flow

If `docs/agents/` is missing, invoke the setup wizard inline. Per
[`setup`](../setup/SKILL.md):

1. Section A — issue tracker (probe Orchestra/GitHub/Linear/local).
2. Section B — build & test commands (auto-detect from `package.json` /
   `Cargo.toml` / `pyproject.toml` / `Makefile`).
3. Section C — project paths (RFC dir, TODO file, ADR dir, docs).
4. Section D — domain glossary (offer to create starter `CONTEXT.md`).

Each section gets one user confirmation. The user already approved the
overall flow in step 3, so don't re-ask "shall we run setup?" — just go
through the sections.

At the end, append the `## Agent skills` block to `CLAUDE.md` (with user
yes; that's setup's final step).

### 9. Recommend companion plugins

**Print, don't install.** Show the user a copy-paste block:

```
Recommended companion plugins (run these manually if you want them):

  /plugin install fpf@ForgePlan-marketplace
      First Principles Framework — pairs with /refine and /diagnose.

  /plugin install agents-core@ForgePlan-marketplace
      11 baseline subagents — /audit and /sprint use them when present.

  /plugin install forgeplan-workflow@ForgePlan-marketplace
      /forge-cycle and /forge-audit — tighter forgeplan-only flow.

  /plugin install forgeplan-orchestra@ForgePlan-marketplace
      /sync and /session — multi-session coordination.

  /plugin install laws-of-ux@ForgePlan-marketplace
      Frontend UX reviewer — /audit will spawn it when changesets are
      frontend-heavy. Skip if this repo is backend-only.
```

Don't try to detect "is this a frontend repo" beyond a one-line probe
(`test -f package.json && grep -q -E '(react|vue|svelte|angular|next|nuxt)' package.json`).
If unsure, leave laws-of-ux in the list with the caveat.

### 10. Verify

Run a final health check:

```bash
forgeplan health 2>/dev/null | head -10
ls docs/agents/ 2>/dev/null
head -20 CLAUDE.md 2>/dev/null
test -f .mcp.json && echo "✓ .mcp.json wired"
```

Expected: forgeplan reports healthy, `docs/agents/` has 4 files
(issue-tracker / build-config / paths / domain), `CLAUDE.md` first lines
show project name, `.mcp.json` exists.

### 11. Report

Final summary in a single block:

```
✓ forgeplan init           done · .forgeplan/ created · X artifacts
✓ .mcp.json                wired (forgeplan + N existing servers preserved)
✓ .claude/settings.json    safety hook added       (or "skipped per user")
✓ CLAUDE.md                created from template   (or "appended")
✓ Operating contract       injected into CLAUDE.md (or "already present" / "skipped per user")
✓ docs/agents/             configured (4 files)
✓ CONTEXT.md               created starter         (or "skipped — exists")

Next steps:
  /restore        — recover context after a break
  /briefing       — today's tasks from your tracker
  /research <q>   — deep multi-agent research
  /refine <plan>  — sharpen an RFC or implementation plan
  /sprint <task>  — wave-based execution
  /audit          — multi-expert code review
  /diagnose <bug> — disciplined 6-phase debug loop
  /autorun <task> — overnight autopilot

Optional companion plugins listed above. Run them at your own pace.
```

If any step in the plan failed — replace its ✓ with ✗ and show the error.

---

## Idempotency

`/fpl-init` should be safe to re-run. Re-runs:

- Detect what's already in place (step 1) and skip those branches.
- Never overwrite existing `CLAUDE.md` content (always append).
- Operating contract injection (step 7-bis) keys off marker `<!-- forgeplan-operating-contract:v1 -->` — re-runs detect and skip without prompting.
- Never overwrite existing `.mcp.json` entries (always merge).
- Never overwrite existing `docs/agents/*.md` (`/setup` re-prompts).

If everything is already in place, the skill prints "already initialized"
and exits without changes.

## Errors and recovery

| Symptom | Action |
|---|---|
| `forgeplan` not on `$PATH` | Print install instructions (step 2) and stop. |
| `forgeplan init` fails | Surface stderr; stop before the rest of the plan. Don't try to wire MCP for a broken artifact store. |
| `.mcp.json` is invalid JSON | Don't merge — back up to `.mcp.json.bak`, write a fresh minimal version, tell the user to merge their old config back in. |
| Stack detection in step 7 returns nothing | Leave placeholders visible (`{{LANG}}`, `{{PKG_MANAGER}}`) — better than guessing. |
| User aborts at step 3 | Exit cleanly, no files touched. |
| User aborts mid-flow | Stop after the current step; don't roll back already-written files. Print "partial init: completed steps X, Y; skipped Z. Re-run /fpl-init when ready." |

## Related skills

- [`bootstrap`](../bootstrap/SKILL.md) — `/fpl-init` calls bootstrap's
  workflow inline. Use `/bootstrap` directly for CLAUDE.md only.
- [`setup`](../setup/SKILL.md) — same. Use `/setup` directly to (re)run
  the docs/agents wizard.
- [`restore`](../restore/SKILL.md) — first thing to run after `/fpl-init`
  in subsequent sessions to recover context.

## Anti-patterns

- ❌ Don't install companion plugins automatically. `/plugin install` is
  host-level; the user must approve each one.
- ❌ Don't pause for approval at every substep. The user approved the
  whole flow in step 3; subsequent pauses just slow them down.
- ❌ Don't overwrite `.mcp.json` blindly — always merge.
- ❌ Don't run on a marketplace/plugin source. The signature
  (`.claude-plugin/` or `plugins/*/`) is your guard rail.
- ❌ Don't fabricate forgeplan output. If `forgeplan health` errors,
  show the actual error rather than a green checkmark.
