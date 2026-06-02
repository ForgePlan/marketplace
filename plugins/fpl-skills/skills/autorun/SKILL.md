---
name: autorun
description: Autonomous orchestrator for green-light / overnight execution. Takes one task and runs the full engineering cycle (research → plan → sprint → audit → report) end-to-end without approval checkpoints. Uses TeamCreate with explicit file-ownership and blockedBy edges between waves, resolves blockers via ADI (Abduct → Induct → Deduce) instead of asking the user, and only stops on red-line actions (push to main, secret writes, destructive ops, deploys). Use when you want to give one prompt and let it run unattended — overnight runs, bypassPermissions sessions, or when you can't watch checkpoints. Triggers (EN/RU) — "autorun X", "run unattended", "do this overnight", "запусти автопилот", "сделай всё автономно", "ночной прогон", "/autorun".
origin: forgeplan
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

## Autonomy gating (project-config.yaml)

**Read `.forgeplan/project-config.yaml` at start** (before the main execution loop, before any tool dispatch). The `autonomy` section governs whether `/autorun` may proceed silently with a given operation, must prompt the user, or must refuse. This is the **gate** wrapped around every MCP/Bash call in the workflow below.

### What is consumed

Three parameters from `autonomy:` (see `templates/project-config.yaml`):

| Key | Type | Semantics |
|---|---|---|
| `autonomy.default_level` | int 1–5 | Overall slider. 1 = ask everything; 5 = fully autonomous. Default **3**. |
| `autonomy.auto_approve` | list[str] | Operations allowed without confirmation, regardless of level. |
| `autonomy.human_required` | list[str] | Operations that ALWAYS require explicit human confirmation in the current turn — **cannot be auto-approved even at level 5**. |

### Precedence (hard rules)

1. **`human_required` always wins.** If an operation matches `human_required`, `/autorun` MUST stop and ask — even at level 5, even if the same op also appears in `auto_approve` (which would be a misconfiguration). This list models one-way doors.
2. **`auto_approve` wins** for matched operations not also in `human_required`. Proceed silently.
3. **`default_level` is the fallback** when neither list matches.

### Level heuristic (fallback when no list matches)

| Level | Behavior |
|---|---|
| 1 | Ask every operation (timid). |
| 2 | Ask for any mutation (forgeplan_new / update / link / Write / Edit / commit). Reads + validation auto. |
| 3 | Ask for activation/supersede/deprecate/push/merge. Low-stakes mutations auto. **(Default)** |
| 4 | Ask only for irreversible operations (`push --force`, `reset --hard`, `DROP`, `rm -rf`, delete). |
| 5 | Proceed silently for all except `human_required` (max autonomy). |

### Operation-naming syntax (matcher)

The lists use ad-hoc strings. The gating function recognises three patterns:

| Pattern | Example | Matches |
|---|---|---|
| **Exact tool name** | `forgeplan_activate` | `mcp__forgeplan__forgeplan_activate` (suffix `__<name>` or exact). |
| **Scoped match** | `forgeplan_new(kind="adr")` | Tool name AND the scope token (`kind="adr"`) appears in the operation invocation. |
| **Command prefix** | `git push --force` | The Bash command line starts with this prefix (literal prefix, not regex). |

### Gating function (pseudocode — apply at every potentially-mutating op)

```python
def gating_check(operation, project_config):
    """Returns "auto" (proceed silently), "ask" (prompt user), or "block" (refuse)."""
    autonomy = project_config.get("autonomy", {})

    # Rule 1: human_required ALWAYS wins — no level override.
    if _matches(operation, autonomy.get("human_required", [])):
        return "ask"

    # Rule 2: auto_approve wins for matched operations.
    if _matches(operation, autonomy.get("auto_approve", [])):
        return "auto"

    # Rule 3: fall back to default_level heuristic.
    level = autonomy.get("default_level", 3)
    risk = _classify(operation)  # "read" | "mutate-low" | "mutate-mid" | "irreversible"
    if level == 1: return "ask"
    if level == 2 and risk != "read": return "ask"
    if level == 3 and risk in ("mutate-mid", "irreversible"): return "ask"
    if level == 4 and risk == "irreversible": return "ask"
    return "auto"  # level 5 or low-risk at lower levels


def _matches(operation, pattern_list):
    """Pattern matcher — exact / scoped / command-prefix."""
    for pattern in pattern_list:
        if "(" in pattern:                           # scoped: forgeplan_new(kind="adr")
            tool, scope = pattern.split("(", 1)
            scope = scope.rstrip(")")
            if operation.startswith(tool) and scope in operation:
                return True
        elif pattern.startswith("git ") or pattern.startswith("gh "):  # bash prefix
            if operation.startswith(pattern):
                return True
        else:                                        # exact tool-name match
            if pattern == operation or operation.endswith("__" + pattern):
                return True
    return False


def _classify(operation):
    """Heuristic risk classification — fallback for level-based gating."""
    if any(x in operation for x in ("--force", "reset --hard", "DROP", "rm -rf")):
        return "irreversible"
    if any(x in operation for x in ("activate", "supersede", "deprecate", "push", "merge")):
        return "mutate-mid"
    if any(x in operation for x in ("new", "update", "link", "Write", "Edit", "commit")):
        return "mutate-low"
    return "read"
```

### "Ask" UX (when the gate says ask)

When `gating_check(op) == "ask"`, `/autorun` pauses and prints a structured prompt:

```
[AUTONOMY GATE] operation requires confirmation
  op:     <full operation string, e.g. mcp__forgeplan__forgeplan_activate(id="PRD-027")>
  reason: matched human_required | level-N heuristic for risk-class <X>
  proceed? (y/n)
```

Single-character answer accepted (`y` / `n`). On `n` — abort the operation, record in the final report under "Held by autonomy gate", continue with the next non-blocked wave if any.

### Built-in safe defaults (project-config.yaml absent)

If `.forgeplan/project-config.yaml` is missing or unparseable, `/autorun` continues with these **safe defaults** — backward-compatible with pre-PRD-026 projects:

```yaml
# Mirrors templates/project-config.yaml verbatim — keep in sync.
autonomy:
  default_level: 3
  auto_approve:
    - forgeplan_validate
    - forgeplan_link
    - forgeplan_get
    - forgeplan_list
    - forgeplan_new(kind="evidence")
    - forgeplan_new(kind="note")
  human_required:
    - forgeplan_activate
    - forgeplan_supersede
    - forgeplan_deprecate
    - forgeplan_new(kind="adr")
    - git push
    - git push --force
    - git reset --hard
    - gh pr merge
    - deployment
    - operation on main
    - operation on master
```

Note: `--no-verify` lives in `project-config.yaml.forbidden:` (never permitted, not even with confirmation) — see "Red lines" section below.

Note: the **RIPER Plan→Execute transition** is also `human_required` for Row-4 (non-trivial production bug) tasks, but it is a *workflow transition*, not a tool name — so it is enforced by the dedicated «RIPER methodology gate» section below, not by this tool-name matcher (RFC-018 / DEFER-016).

Log a single one-line warning at start: `autonomy: no project-config.yaml — using built-in defaults (level 3)`. No fatal error — the legacy run path stays operational.

### Integration with execution loop

Every potentially-mutating tool invocation in the workflow below (sections "Workflow", "Forgeplan integration", and any delegated skill) is wrapped:

```
verdict = gating_check(operation, project_config)
if verdict == "auto":
    invoke(operation)                          # silent
elif verdict == "ask":
    if not prompt_user_yes_no(operation):
        record_held(operation); continue
    invoke(operation)
elif verdict == "block":
    record_refused(operation); abort_wave()
```

This gate is **in addition to** the hard red-lines (see "Red lines" below). Red-lines are non-negotiable code-level stops; the autonomy gate is configurable per-project. **Red-lines override autonomy** — a level-5 project still cannot push to `main` without explicit user instruction in the current turn.

### Identity preserved

The gate does not alter identity tagging. Every teammate still runs `forgeplan_claim` / `forgeplan_release` with its own agent name (per the AUTOPILOT directive below). The gate sits between the orchestrator's decision to invoke a tool and the tool call itself — claims and releases (mechanical identity ops) are part of `auto_approve` by default and run silently.

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

> **Gate every tool call.** Before invoking any MCP or Bash operation in the steps below (or in any delegated skill), apply `gating_check(operation, project_config)` from the "Autonomy gating" section above. `auto` → invoke; `ask` → prompt y/n; `block` → record and skip. The gate sits in front of the entire pipeline, not just step 4.

### 1. Read context
`@docs/agents/*.md` are auto-loaded by frontmatter imports. Check `CONTEXT.md` and recent `git log` for any in-flight intent. Read `.forgeplan/project-config.yaml` into memory now — its `autonomy` section is consulted on every subsequent tool call.

### 2. Classify the task
Same categories as [`do`](../do/SKILL.md): research / docs / feature / review / bug / refactor / status. Pick template silently — do NOT show plan to user, do NOT ask for approval.

**RIPER arming:** if the task classifies as a **non-trivial production bug** it routes to RIPER (smith Row 4). Arm the **RIPER methodology gate** (see the dedicated section below): the Plan→Execute transition becomes `human_required` and MUST NOT be auto-traversed — this is the one place autopilot holds for a human even at level 5.

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

## Ask-back protocol (Sprint B closure of Sprint A)

Subagents dispatched mid-autorun (coder, specification, security-expert, etc.) may emit `<<NEED_USER_INPUT:...>>` sentinels when they hit an irreversible information gap that ADI cannot resolve — e.g. a schema decision that affects downstream artifacts. Because `/autorun` runs unattended, it must surface these questions asynchronously, apply defaults on timeout, and record unresolved questions as EVIDENCE so a post-run reviewer can audit every decision taken without user input. This is the same parser as `/forge-cycle` but with a **tighter anti-loop guard** (1 loop, not 2 — rationale below).

**Detection** — after each subagent returns, scan the output for `^<<NEED_USER_INPUT:` (line-start anchor, `re.MULTILINE`).

**Parser (apply to every subagent return):**

```python
# Pseudo-code — same as /forge-cycle; apply in /autorun Phase 3 (Build) and Phase 4 (Audit)
def parse_subagent_return(text):
    multi = re.search(
        r'^<<NEED_USER_INPUT_BEGIN>>\n(.*?)\n<<NEED_USER_INPUT_END>>',
        text, re.MULTILINE | re.DOTALL)
    if multi:
        return parse_multi_line(multi.group(1))   # yaml-like block → dict
    single = re.search(r'^<<NEED_USER_INPUT:\s*(.+?)>>', text, re.MULTILINE)
    if single:
        return {"question": single.group(1).strip()}
    return None   # no ask-back; continue normally
```

**Surface step** — when a sentinel is detected:
1. Pause subagent dispatch.
2. Call `AskUserQuestion` with: question text, options (if `options:` present in multi-line variant), and `default_if_no_answer` as the recommended answer.
3. **TIMEOUT (autopilot mode): 60 seconds.** If user does not answer within 60s, apply `default_if_no_answer` (or a documented best-guess if absent) and continue — autopilot cannot stall waiting for human attention.

**Re-dispatch step** — if user answered within timeout: re-dispatch the same subagent with the original prompt plus appended `## User answer to ask-back` block (question + answer). Continue phase normally.

**AUTOPILOT ANTI-LOOP (tighter than `/forge-cycle`):** If the same subagent emits ask-back for the **same question 1 time** in the same session (i.e., after re-dispatch with the answer it still emits the same sentinel), autorun MUST apply `default_if_no_answer` immediately and continue. `/forge-cycle` allows 2 same-question loops because a human is watching; `/autorun` has no human watching closely — one loop is the ceiling. When the 1-loop anti-loop triggers (autopilot mode), the checkpoint also captures the unresolved question in `pending_user_inputs[]` for inspection on resume.

**EVIDENCE emission on default applied** — whenever a default is applied (timeout elapsed OR anti-loop triggered), autorun MUST emit an EVIDENCE artifact:
- `verdict: CONCERNS`
- Body: `"Unresolved ask-back during autorun: {question}. Default applied: {default_value}. Subagent: {agent_name}."`
- Link to the parent RFC/PRD being implemented.
This ensures post-run review surfaces every question that ran without explicit user input.

**Cross-reference**: `plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md` → "Subagent ask-back protocol (PRD-029)" — sentinel format, `default_if_no_answer` field, and subagent authoring rules.

---

## NEEDS_ACTIVATION sentinel parsing (autopilot mode — Sprint D PRD-032)

When subagents (Profile B reviewers) complete EVID creation in `/autorun`, scan their
return for `^<<NEEDS_ACTIVATION: EVID-XXX>>` sentinel at the start of a line.

**Parser** (apply to every subagent return in Phase 3 Build and Phase 4 Audit):

```python
import re

def parse_needs_activation(return_text):
    match = re.search(r'^<<NEEDS_ACTIVATION:\s*(EVID-\d+)>>', return_text, re.MULTILINE)
    if match:
        return match.group(1)
    return None
```

**Autopilot activation procedure**:

1. Extract `artifact_id` from sentinel.
2. Verify R_eff via `mcp__forgeplan__forgeplan_score(id=artifact_id)` — R_eff>0 expected.
3. **Autopilot semantics**: if R_eff>0, AUTO-ACTIVATE without user confirmation — `/autorun` is
   unattended and `forgeplan_activate` is in `auto_approve` for EVID artifacts at level 4+.
   Apply `gating_check("forgeplan_activate", project_config)` as usual; default built-in config
   lists `forgeplan_activate` in `human_required` — update `project-config.yaml` to move it to
   `auto_approve` for EVID kind if fully automated activation is desired.
4. If R_eff=0, treat as drift anomaly: write to session.yaml `pending_anomalies[]` with
   `kind: needs_activation_drift`, `tier: user`. Do NOT activate. Surface in the final report
   under "Anomalies" section.
5. Capture each activated `artifact_id` in session.yaml `completed_activations[]` for audit trail.

**Anti-loop guard** (same precedent as autopilot 1-loop pattern): if the same EVID emits
`<<NEEDS_ACTIVATION:>>` more than once across re-dispatches in the same session, it is a
logic bug in the subagent — log to `pending_anomalies[]` with `kind: needs_activation_loop`
and skip all subsequent activation attempts for that artifact_id.

Cross-reference: `AGENT-AUTHORING-GUIDE.md` Profile B Step 9b (sentinel convention),
`/forge-cycle` Step 7.5 (interactive variant — confirms with user before activating),
PRD-032 Sprint D.

---

## RIPER methodology gate — autonomous Plan→Execute requires a human (RFC-018 / DEFER-016)

RIPER (smith Row 4 — a non-trivial production bug / scoped change / investigation in an existing system) is the ADR-010 instance whose enforcement is **hook-gate=No**: it ships no fail-closed hook, and its "no code before the Plan is approved" guarantee rests on **a human at the Plan→Execute mode transition** (the human saying "proceed to Execute" IS the Plan-approval). `/autorun` is purpose-built to run without that human — so a Row-4 bug driven autonomously would silently traverse Plan→Execute and remove the gate RIPER depends on (the G8 accept-by-design gap surfaced by EVID-167 F1). This section is the `/autorun`-side guard that closes it — NOT a RIPER hook (canonical RIPER has none, and a file-hook would false-positive on Research reads).

**The rule (MUST):** when the task classifies as a non-trivial production bug (Step 2 → `bug`, non-trivial → smith Row 4 → RIPER methodology), `/autorun` MUST treat the **Plan→Execute transition as `human_required`** — not auto-approvable at ANY `default_level`, exactly like the built-in `human_required` entries. "Plan→Execute" = the moment an approved Plan (the RIPER Plan RFC has reached `active`) would hand off to Execute (the first `coder` / source-or-test-mutating dispatch).

**Behavior when the gate fires:**

1. Run Research → [C4 Validate-research] → Innovate → Plan and let the Plan RFC reach `active` — these are read / design / review ops and proceed normally under the autonomy gate.
2. **STOP before the first Execute dispatch.** Do NOT dispatch `coder` (or any source/test write) for a RIPER task without explicit human approval in the current turn.
3. Treat it as an autonomy-gate `ask`: print the `[AUTONOMY GATE]` prompt with `reason: RIPER Plan→Execute (hook-gate=No depends on a human; RFC-018 / DEFER-016)`. **Unattended default = HOLD, not proceed** — this transition is a one-way door into code, so the fail-safe on the 60s ask-back timeout is to WAIT, the opposite of the usual "apply default and continue".
4. Write a checkpoint (`status: paused`, `blocker_state: riper_plan_execute_gate`), surface the resume hint (`/autorun --resume <session_id>`), and emit an EVIDENCE (`verdict: CONCERNS`, body: "RIPER Plan→Execute held — autonomous run reached an approved Plan for a Row-4 bug, but hook-gate=No requires a human at Plan→Execute; held pending approval.") linked `informs` to the Plan RFC.
5. Non-blocked non-RIPER waves (if any) may continue; the RIPER Execute stays held until a human approves.

The mandatory downstream C4 chain (`tester` + `code-reviewer` + `guardian`) remains the backstop if a Plan is somehow approved out-of-band; this gate is the front-stop on the transition itself. With this guard shipped, RFC-018's autonomous-RIPER gap is structurally **held**, not merely documented.

Cross-reference: RFC-018 FR-4, marketplace CLAUDE.md «Social-discipline boundaries» G8, NOTE-013 DEFER-016, `/riper` SKILL.md "hook-gate=No boundary".

---

## Session checkpointing (resume protocol)

### Session checkpoint lifecycle

At `/autorun` start: generate `session_id` (format `SESS-YYYYMMDD-HHMMSS-<rand4>`) and create `.forgeplan/sessions/<session_id>.yaml` with initial state (`status: active`, `current_phase: 1`, `completed_phases: []`).

After each phase completes (Route, Shape, Build per wave, Audit, Evidence, Activate, Commit): write checkpoint — update `current_phase`, append to `completed_phases[]`, record `last_checkpoint_at`.

On any blocker exit (ADI fail, `NEED_USER_INPUT` timeout, anti-loop, red-line): write checkpoint with `blocker_state` set to the trigger reason, `status: paused`, and surface resume hint: `"Session paused — resume with: /autorun --resume <session_id>"`.

Checkpoint write is **atomic**: write to `.forgeplan/sessions/<session_id>.yaml.tmp` then `mv` to `.yaml` — prevents partial-write corruption on unexpected stop. Full field schema: `docs/SESSION-CHECKPOINT-SCHEMA.md`.

### Resume flag (`--resume <session-id>`)

Parse `.forgeplan/sessions/<session-id>.yaml`. Validate:
- File exists (else: `"Session <id> not found — run --list-sessions"`).
- `status == paused` (else refuse: `active` means another run is live; `completed` cannot be resumed).
- Age ≤ 24h since `last_checkpoint_at` — if older, require `--force-resume` (emits explicit staleness warning: results may differ due to drifted state).

**Drift detection** — for each artifact ID in `pending_artifacts[]`, call `forgeplan_get(id)`. If any artifact is deleted, superseded, or missing: refuse resume and surface which artifact drifted.

**State re-hydration** — set `current_phase` = last completed + 1; load `completed_waves[]` summary into orchestrator context.

**Pending answers** — if `pending_user_inputs[]` is not empty AND user supplied `--with-answers <file.yaml>`: merge answers from file (keyed by question hash). Otherwise, prompt user for each unanswered question before continuing dispatch.

Continue dispatch from `current_phase` forward; identity tags on resumed subagents append `-resumed-from-<original-tag>` suffix.

### List flag (`--list-sessions`)

Scan `.forgeplan/sessions/*.yaml`. Render table sorted by `last_checkpoint_at` DESC:

```
SESSION_ID               STATUS     STARTED              LAST_CHECKPOINT      PHASE  TASK (60 chars)
SESS-20260519-034521-A7  paused     2026-05-19 03:45     2026-05-19 04:12     4      Implement auth service with JWT ...
SESS-20260518-210033-B2  completed  2026-05-18 21:00     2026-05-18 23:15     7      Refactor DB layer to repository ...
SESS-20260517-140011-C1  paused     2026-05-17 14:00     2026-05-17 15:30     3  ⚠ STALE — needs --force-resume
```

Sessions where age > 24h are marked `STALE — needs --force-resume`.

### Cleanup flag (`--cleanup-sessions`)

Remove `status == completed` session files immediately — no prompt (these are safe to delete; run completed successfully).

For sessions where `age > 7 days` OR (`status == paused` AND `age > 24h`): prompt user before deletion. Print one confirmation line per candidate file.

Print summary on completion: `"N completed sessions removed. M stale sessions surfaced for review."`

---

## Autopilot directive (paste into every delegated skill's prompt)

```
AUTOPILOT MODE — green light from user, do NOT pause for approval.
Skip every "Proceed?" / "Continue to next wave?" / "Запускаем?" prompt — assume YES.
Resolve blockers via ADI (Abduct → Induct → Deduce), 3 rounds max per blocker.
Only stop on (a) red-line actions (see /autorun red lines) and (b) operations the
autonomy gate marks `ask` (project-config.yaml `autonomy.human_required` or the
default_level heuristic — see /autorun "Autonomy gating" section). Surface state
and exit cleanly when red line hit; surface a structured prompt for autonomy-gate
asks and resume on user `y`.

FORGEPLAN-AWARE — UNCONDITIONAL with MCP-FIRST preference (PRD-020 + PRD-021):

TOOL SELECTION: probe Claude Code's deferred-tools list once at autorun start.
- If `mcp__forgeplan__*` tools present → MCP path (preferred): typed dicts + `_next_action` server hints to relay verbatim to user reports.
- Else if `forgeplan` shell on $PATH → shell fallback (same semantics).
- Else → warn once, run pipeline as chat-coordination only (no artifact ops).

- /sprint derives SESSION_ID="SESSION-$(date -u +%Y-%m-%d-%H%M%S)" once per sprint (§4a-bis).
  Used as fallback artifact-id when task has no real PRD-NNN/RFC-NNN/SPEC-NNN.
- Every teammate (MCP or shell) runs `forgeplan_claim id="${ARTIFACT_ID:-$SESSION_ID}" agent="<name>"` before starting (§4b.g).
  No "skip if no artifact-ID" branch — every teammate registers in the graph.
- `forgeplan_dispatch agents=N` (MCP) or `forgeplan dispatch -n N --json` (shell) is artifact-aware:
  only useful when real artifact-IDs with affected_files are in the plan.
- Team-lead emits `forgeplan_new kind=evidence` (MCP) or `forgeplan new evidence` (shell) at wave-close (§4b-bis)
  for both real artifacts and SESSION-IDs. Chat-driven sprints now emit ≥1 evidence per sprint.
- Relay `_next_action` field from MCP responses to user reports (server-driven methodology hint).
- See sprint SKILL.md sections "Tool selection" / 4a-bis / 4b.g / 4b-bis for the full wired pattern.
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

## Held by autonomy gate
(empty if none — every op was auto-approved)
- <operation> — reason: <human_required | level-N heuristic>; user verdict: <y/n>

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
- ❌ Don't autonomously traverse RIPER Plan→Execute. A Row-4 (non-trivial production bug) task's hook-gate=No guarantee depends on a human at that transition (RFC-018 / DEFER-016) — HOLD before the first Execute dispatch, never auto-proceed; unattended default is WAIT, not continue.

---

## Forgeplan integration (clarified)

The probe block at the start of this skill (step 2 — Detect environment) already lists `forgeplan-workflow` as a delegation target. To make the behaviour explicit:

| Detected | What `/autorun` does |
|---|---|
| `forgeplan-workflow` plugin installed | **Delegates to `/forge-cycle "<task>"`** — full route → shape → build → evidence → activate. No pauses. |
| `forgeplan` CLI but no `forgeplan-workflow` | Runs `research → sprint → audit → report` and **inserts manual `forgeplan` calls between phases** (route → new prd → new evidence → activate). All non-interactive. When the task is artifact-driven, `/sprint` automatically uses `forgeplan dispatch` for parallel-safe wave grouping and `forgeplan claim` per teammate (sprint SKILL.md §4a-bis / 4b.g). |
| Neither | Runs the standard pipeline. Prints a single warning at the start: "no forgeplan integration; artifact graph will not be updated". |

### Want full automation?

For maximum forgeplan integration with zero per-phase pauses, install `forgeplan-workflow` then invoke `/autorun` — it will silently delegate to `/forge-cycle`:

```
/plugin install forgeplan-workflow@ForgePlan-marketplace
/reload-plugins
/autorun "<task>"
```

This is the recommended setup for overnight / unattended runs on forgeplan projects.
