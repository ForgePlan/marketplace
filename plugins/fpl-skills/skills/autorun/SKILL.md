---
name: autorun
description: Autonomous orchestrator for green-light / overnight execution. Takes one task and runs the full engineering cycle (research → plan → sprint → audit → report) end-to-end without approval checkpoints. Uses TeamCreate with explicit file-ownership and blockedBy edges between waves, resolves blockers via ADI (Abduct → Induct → Deduce) instead of asking the user, and only stops on red-line actions (push to main, secret writes, destructive ops, deploys). Use when you want to give one prompt and let it run unattended — overnight runs, bypassPermissions sessions, or when you can't watch checkpoints. Triggers (EN/RU) — "autorun X", "run unattended", "do this overnight", "запусти автопилот", "сделай всё автономно", "ночной прогон", "/autorun".
disable-model-invocation: true
---

# Autorun (autopilot orchestrator)

Take a task → load project context → run the full forge-cycle (or `do`-cycle as fallback) → return a report. **No approval checkpoints** except red-lines.

Built on top of [`do`](../do/SKILL.md). Same pipeline templates — but every "Proceed?" / "Continue?" prompt is auto-answered "yes". Blockers go through ADI; if ADI fails, autorun stops and surfaces state — it does not loop forever.

---

## Project context (read first)

@docs/agents/issue-tracker.md
@docs/agents/build-config.md
@docs/agents/paths.md
@docs/agents/domain.md
@CONTEXT.md

If `docs/agents/` is empty AND the repo has no recognizable project files (no `package.json` / `Cargo.toml` / `go.mod` / `pyproject.toml`) — refuse to run. Tell the user to run `/setup` first. Autopilot without context is a recipe for damage.

---

## When to use

- User explicitly types `/autorun <task>`.
- User says: "run this overnight", "do it unattended", "запусти автопилот", "ночной прогон".
- User is in `bypassPermissions` mode and wants the agent to make all decisions.

## When NOT to use

- Point question or single-file edit — use direct tools.
- User wants to review the plan before execution — use [`do`](../do/SKILL.md) (it pauses for approval).
- User is actively watching the chat — use [`do`](../do/SKILL.md) or a specific skill (`research`, `sprint`, `audit`).
- No project context AND no project files — refuse and route to `/setup`.

---

## Detect environment

Probe what's available before starting:

```bash
# Methodology layer
test -d docs/agents || echo "no /setup config"
# Plugins
ls ~/.claude/plugins 2>/dev/null | grep -E 'forgeplan|dev-toolkit'
```

Decisions:

| Available | Action |
|---|---|
| `forgeplan-workflow` plugin | Run `/forge-cycle` for the structured cycle. |
| No forgeplan | Run [`do`](../do/SKILL.md) pipeline manually (research → sprint → audit). |
| `dev-toolkit` plugin (`forge-report` skill) | Use it for the final summary. |
| No dev-toolkit | Generate inline report (template below). |
| `TaskCreate` tool | Track every wave as a task; use `addBlockedBy` for cross-wave deps. |

---

## Workflow

### 1. Read context
`@docs/agents/*.md` are auto-loaded by frontmatter imports. Check `CONTEXT.md` and recent `git log` for any in-flight intent.

### 2. Classify the task
Same categories as [`do`](../do/SKILL.md): research / docs / feature / review / bug / refactor / status. Pick template silently — do NOT show plan to user, do NOT ask for approval.

### 3. Run the pipeline
Delegate to the right skill(s). Pass the **autopilot directive** (see below) in every spawn prompt so the called skill skips its own approval steps.

If the task is a feature/refactor: `research` → `sprint` (with `team`) → `audit` → report.
If the task is research only: `research` → report.
If the task is review only: `audit` → report.

### 4. File ownership + blockedBy

When `sprint` plans waves, autorun enforces:

- **One file = one teammate** per wave (no overlap inside a wave).
- **Cross-wave deps** captured as `TaskCreate(addBlockedBy=[<prev_wave_task_id>])` — so wave N+1 cannot start before N completes.
- If a generated wave plan violates either rule → abort that wave, ask `sprint` to re-split, retry. Don't proceed with a broken plan.

### 5. ADI loop on blockers

When a teammate reports stuck (test fails, type error, ambiguous spec, missing API):

1. **Abduct** — generate 3 hypotheses for the cause. Be concrete (file:line, expected vs actual, suspected layer).
2. **Induct** — for each hypothesis, run the cheapest experiment that confirms or refutes it (read a file, run a single test, grep for a definition).
3. **Deduce** — pick the best-supported hypothesis. Apply fix. Re-run the failing check.

Limit: **3 ADI rounds per blocker.** If still stuck after round 3 — record the state, mark the task BLOCKED, move on if other waves can still run, otherwise stop and surface to user.

### 6. Final report

Use `forge-report` skill if available. Otherwise generate inline using the template below.

---

## Autopilot directive (paste into every delegated skill's prompt)

```
AUTOPILOT MODE — green light from user, do NOT pause for approval.
Skip every "Proceed?" / "Continue to next wave?" / "Запускаем?" prompt — assume YES.
Resolve blockers via ADI (Abduct → Induct → Deduce), 3 rounds max per blocker.
Only stop on red-line actions (see /autorun red lines). Surface state and exit cleanly when red line hit.
```

---

## Red lines (always stop, even in autopilot)

Hard-coded stops. When any of these is about to happen, save state and exit; let the user decide:

- `git push origin main` (or push to whatever the default branch is)
- `git push --force` to any branch
- `rm -rf` outside the current working tree (e.g. `~/.claude/`, `/`, `/etc/`)
- `TeamDelete` on a team this autorun did not create
- Writing secrets/credentials anywhere (`.env` with real values, API keys to disk)
- Deploys / production migrations / DB drops
- Closing PRs / deleting branches not created by this run
- Anything tagged "destructive" in `@docs/agents/build-config.md` (project-specific extension)

Red-line behavior: write the intended action to the report ("Would have run: X"), save state, exit. Do not execute.

---

## Output format (final report)

```markdown
# Autorun: <task>

**Status**: COMPLETE | PARTIAL | BLOCKED
**Started**: <iso8601>  **Finished**: <iso8601>  **Duration**: <h:mm>

## What ran
- Wave 1 — `research`: <summary>
- Wave 2 — `sprint` (3 teammates): <summary>
- Wave 3 — `audit`: <summary>

## Files changed
**NEW** (N): <paths>
**MODIFIED** (N): <paths>
**DELETED** (N): <paths>

## ADI events
- Blocker: <description>
  - Hypotheses: H1 / H2 / H3
  - Evidence: <what was tested>
  - Resolution: <H selected, fix applied> | UNRESOLVED after 3 rounds

## Red lines hit
(empty if none — autopilot ran cleanly)
- <action> — paused for user; current state saved at <branch / file>

## Next steps
1. <user-actionable item>
2. <user-actionable item>
```

If `forge-report` skill is installed, prefer its template — keep this only as fallback.

---

## Persistence between turns

Autorun can run for many minutes. Use `TaskCreate` from the start so progress is visible:

- 1 task per wave, with `addBlockedBy` between dependent waves.
- Update status (`pending` → `in_progress` → `completed`) as waves run.
- On red-line stop or 3-round ADI failure: leave the task `in_progress` with a comment describing where you stopped.

User can `TaskList` at any time to see live progress.

---

## Related skills

- [`do`](../do/SKILL.md) — interactive variant; pauses for approval. Use when watching the chat.
- [`sprint`](../sprint/SKILL.md) — wave-by-wave execution; autorun delegates here for implementation.
- [`research`](../research/SKILL.md) — autorun delegates here for context-gathering tasks.
- [`audit`](../audit/SKILL.md) — autorun delegates here for review tasks.
- [`team`](../team/SKILL.md) — autorun and its sub-skills all use the iron rules from here.
- [`setup`](../setup/SKILL.md) — must run before autorun if `docs/agents/` is empty.

---

## Anti-patterns

- ❌ Don't pause for approval mid-pipeline. That's the entire point of `/autorun` — defeats the purpose.
- ❌ Don't bypass red lines just because you're in autopilot. Red lines override autopilot, always.
- ❌ Don't let ADI loop indefinitely. 3 rounds max per blocker, then surface and stop.
- ❌ Don't assume `forgeplan-workflow` or `dev-toolkit` plugins are installed. Probe first; fall back gracefully.
- ❌ Don't run if `docs/agents/` is empty AND no project files exist. Refuse and route to `/setup`.
- ❌ Don't generate a wave plan with file conflicts. If `sprint` produces one, regenerate before executing.
- ❌ Don't merge or push without explicit user instruction in the original task. "implement X" doesn't mean "ship X".

---

## Forgeplan integration (clarified)

The probe block at the start of this skill (step 2 — Detect environment) already lists `forgeplan-workflow` as a delegation target. To make the behaviour explicit:

| Detected | What `/autorun` does |
|---|---|
| `forgeplan-workflow` plugin installed | **Delegates to `/forge-cycle "<task>"`** — full route → shape → build → evidence → activate. No pauses. |
| `forgeplan` CLI but no `forgeplan-workflow` | Runs `research → sprint → audit → report` and **inserts manual `forgeplan` calls between phases** (route → new prd → new evidence → activate). All non-interactive. |
| Neither | Runs the standard pipeline. Prints a single warning at the start: "no forgeplan integration; artifact graph will not be updated". |

### Want full automation?

For maximum forgeplan integration with zero per-phase pauses, install `forgeplan-workflow` then invoke `/autorun` — it will silently delegate to `/forge-cycle`:

```
/plugin install forgeplan-workflow@ForgePlan-marketplace
/reload-plugins
/autorun "<task>"
```

This is the recommended setup for overnight / unattended runs on forgeplan projects.
