---
name: sprint
description: Wave-based execution of a feature/task by a multi-agent team — research → wave plan (5-8 agents in 2-5 waves) → approval → wave-by-wave teammate spawn via TeamCreate. Two modes — full sprint (with research phase) and lightweight wave (uses current chat context). Each wave is independent parallel work by agents under strict file ownership; dependent tasks go in the next wave. At every wave-close, **automatically emits one EvidencePack per touched artifact via forgeplan MCP** (`mcp__forgeplan__forgeplan_new` + `forgeplan_update` + `forgeplan_link`) — no opt-in. At sprint-close, prompts the user to bulk-activate the collected EVIDs. Soft CLI fallback if MCP unavailable; warns instead of silent-skip if a sprint closes with zero EVIDs. Use for large feature implementation, refactor sprints, milestones. Triggers (EN/RU) — "sprint", "wave plan", "implement feature in waves", "запусти спринт", "распланируй волны", "реализуй фичу", "implement RFC-XXX", "/sprint", "/wave".
---

# Wave-Based Sprint Execution

Wave-based task execution — research, plan, approval, wave-by-wave teammate spawn.
Combines two modes: **full sprint** (research-first) and **lightweight wave** (uses
chat context). Builds on [`team`](../team/SKILL.md) and, when needed,
[`research`](../research/SKILL.md).

---

## Project context (read first)

If `/setup` ran in the project, paths, commands, and terminology are pinned in:

- `@docs/agents/paths.md` — where RFCs, TODOs, sources live (for the file-ownership map)
- `@docs/agents/build-config.md` — build/test commands for inter-wave checks
- `@CONTEXT.md` — domain glossary (use when phrasing teammate tasks)

Check with `test -d docs/agents`. If present, hand it to teammates in the prompt.
If not, auto-detect: glob the project, parse `package.json` / `Cargo.toml` / `go.mod`
for commands.

Never assume pnpm/cargo/etc or specific paths — read `docs/agents/*.md` or detect
in-session.

---

## Tool selection (MCP vs shell — PRD-021)

`/sprint` uses forgeplan for `claim`, `dispatch`, `new evidence`, `link`. Two paths:

| Path | When | How |
|---|---|---|
| **MCP-first** (preferred) | `mcp__forgeplan__*` tools present in deferred-tools list (forgeplan MCP server wired and reachable) | Call `mcp__forgeplan__forgeplan_claim`, `forgeplan_dispatch`, `forgeplan_new`, `forgeplan_link` directly. Returns typed dicts + `_next_action` server hint to relay. |
| **Shell fallback** | MCP tools absent (server not started, or `.mcp.json` not configured) | `forgeplan claim ...` / `forgeplan dispatch ...` via Bash. Same semantics, less structured I/O. |
| Neither available | `command -v forgeplan` fails | Warn, skip artifact ops, run sprint as chat-driven coordination only |

**How to probe**: list available tools via `ToolSearch query="select:mcp__forgeplan__forgeplan_health"`. If schema returns — MCP path active. Else shell. Probe once per sprint, not per teammate.

**Teammate sub-agents inherit**: when team-lead spawns teammates, include the probe result + the appropriate command syntax in the teammate prompt (see §4b.g below).

---

## When to use

- Big feature / RFC needing 5-8+ agents and 2-5 waves.
- Refactor with clear dependency layers.
- Milestone of many sub-tasks that can be partially parallelized.
- User said: "sprint", "wave", "реализуй", "implement RFC-XXX", "запусти волны".

## When NOT to use

- Pinpoint fix (1 file, 1 function) — single agent.
- Pure research without an implementation plan — [`research`](../research/SKILL.md).
- Code review — [`audit`](../audit/SKILL.md).

---

## Two modes

| Mode | When | Step 1 | Step 2 |
|---|---|---|---|
| **Full Sprint** | Fresh task, empty or thin context | Research via [`research`](../research/SKILL.md) (3 parallel Explore agents) | Generate plan |
| **Lightweight Wave** | Task already discussed, context is rich | Extract context from chat (skip research) | Generate plan |

All other steps are shared.

---

## Iron Rules

The six iron rules from [`team`](../team/SKILL.md) apply here without
exception — `TeamCreate`-only, team-lead = coordinator, teammates do all
the work, extra work spawns a new teammate, ask before `TeamDelete`,
one-file-per-agent-per-wave. Read them in `team`; do not paraphrase
them in plans (they drift).

**Sprint-specific application**: file ownership is enforced at the **wave
level** — within a single wave, every file is owned by exactly one teammate;
if two teammates need the same file, split into sequential waves. See
the wave examples below for how this maps to a real plan.

---

## Step 1: Research / Extract context

### Full Sprint (default)

3 parallel Explore agents:

```
Agent R1: Read RFC + TODO
  → Read referenced RFC (if any)
  → Read relevant TODO sections (offset/limit)
  → Extract: completed phases, remaining work, blockers

Agent R2: Scan codebase
  → Glob/Grep for files related to scope
  → Map: existing, reusable, file ownership
  → Note patterns from similar modules

Agent R3: Memory + known issues
  → memory_recall("{topic}") if available
  → Read KNOWN-ISSUES.md
  → Recent git log for context
```

(Can delegate to [`research`](../research/SKILL.md) for the deep variant.)

### Lightweight Wave

**Don't spawn Explore agents.** Extract from chat:

- Files read or discussed.
- Tasks / TODOs mentioned.
- Architectural decisions taken.
- RFC references.
- User preferences / requirements.

Plus quick local checks:

```bash
git branch --show-current
# Glob/Grep ONLY to confirm a specific file
# Read 1-2 files ONLY if mentioned and not yet read
```

### Context summary (shared)

```
Branch: {git}
Task: {what we're doing}
Done: {checkboxes from RFC/TODO}
Remaining: {what's left}
Key files: {from chat or research}
Constraints: {from CLAUDE.md, RFC, user preferences}
```

---

## Step 2: Generate FULL TEXT PLAN

### Sizing rules

| Context | Waves | Agents total |
|---|---|---|
| Small (1-3 tasks) | 1-2 | 2-4 |
| Medium (4-8 tasks) | 2-3 | 4-6 |
| Large (9+ tasks) | 3-5 | 5-8 |

**Hard limits**:

- Max **5 waves**.
- Max **5 agents per wave**.
- Max **400 LOC per agent** (>400 — split into 2 agents).
- Min **100 LOC per agent** (<100 — merge with another).

### Agent description format

```
**Agent {i}: `{kebab-name}`** (subagent_type: `{type}`)
- Files: NEW/MODIFY
  - `{path}` (~{LOC})
- Task: {one-line}
  - Study: {2-4 files FIRST}
  - Create: {bullet points}
  - Requirements: {2-4 constraints}
```

### Subagent type selection

| Task type | subagent_type |
|---|---|
| Generic implementation | `general-purpose` |
| Frontend (React/Vue/etc) | `frontend-developer` / `nextjs-developer` |
| Backend / API / services | `backend-architect` / `microservices-architect` |
| TypeScript types | `typescript-pro` |
| Tests | `general-purpose` or `tester` |
| Docs | `documentation-engineer` |

(Adapt to subagent types available in the project's `agents/` dir.)

### Wave dependency patterns

- **Foundation → Features → Polish**
- **Backend → Frontend → Integration**
- **Parallel Domains → Integration → Tests**

Within a wave — parallel. Between waves — sequential, dependencies flow through files.

---

## Step 3: Present plan, wait for approval

> **CRITICAL**: emit the plan as **text**. No execution until the user says "go".

```markdown
# {Title} — Sprint/Wave Plan

## Context
- Branch: `{branch}`
- RFC: `{path}` (if any)
- TODO: `{path}` (with line range if known)

## Already done
✅ {item 1} ({summary — LOC, tests, deliverables})
✅ {item 2} (...)

## Remaining work

### {Category 1}: {name} (~{LOC})
- {sub-task} (~{LOC})

### {Category 2}: {name}
- [ ] {task} (~{LOC}) — `{file-path}`

## Existing resources (study them!)

| File | What's there | How to reuse |
|---|---|---|
| `{path}` | {desc} | {how} |

## Waves

### Wave 1 — {Name}: {summary} ({M} agents in parallel)

**Agent 1: `{name}`** (subagent_type: `{type}`)
- Files: NEW
  - `{path}` (~{LOC})
- Task: ...
  - Study: ...
  - Create: ...
  - Requirements: ...

**Agent 2: `{name}`** (...)
...

### Wave 2 — ... (same pattern)

## File Ownership

| Agent | Files (NEW/MODIFY) | Read-only deps |
|---|---|---|
| agent-1 | shared/types.ts (NEW) | — |
| agent-2 | features/store.ts (NEW) | shared/types.ts |
| agent-3 | features/page.tsx (NEW) | features/store.ts |

(If two agents in the same wave touch one file — stop and replan.)

## Dependencies

Wave 1: [agent-a] [agent-b] [agent-c] — parallel
                ↓
Wave 2: [agent-d] [agent-e] — parallel
       ↑ depends on {what from wave 1}

## Key files

| File | Why |
|---|---|
| `{path}` | reason |

## Rules

1. Each agent — ONLY its own files.
2. Follow CLAUDE.md project rules.
3. {sprint-specific rule from research / chat}
4. 0 new type-check errors.

## Effort Summary

| Wave | Agents | LOC | Tests | Description |
|---|---|---|---|---|
| 1 | 3 | ~420 | 12 | Foundation |
| 2 | 3 | ~810 | 18 | Features |
```

After the plan — **ask**:

```
---

**Plan ready. {N} waves, {M} agents, ~{LOC} LOC, ~{tests} tests.**

Options:
1. ✅ Run it — TeamCreate → Wave 1
2. ✏️ Adjust — tell me what to change
3. 📋 Save plan to file
4. ❌ Cancel
```

**Don't proceed** until an explicit "go" / "yes" / "1".

---

## Step 4: Execute wave-by-wave

### 4a. Setup

```
1. CHECK existing teams:
   - If a "sprint-*" / "wave-*" team exists — check state:
     · all teammates finished? → DONE
     · unresponsive / stuck? → HUNG
     · still working? → ACTIVE (wait or ask)
   - ASK user: "Team '{name}' — {status}. TeamDelete it?"
   - Confirmed → TeamDelete | Refused → ask what to do
2. TeamCreate(team_name="sprint-{topic}" or "wave-{topic}")
3. team-lead = coordination ONLY
4. teammates = all the work
```

### 4a-bis. Forgeplan dispatch + session derivation

**Always run** when forgeplan is reachable (MCP or shell) — even for chat-driven sprints. The dispatcher needs `affected_files` on real artifacts to be useful, but the **session-id derivation** below applies to every sprint regardless.

**MCP-first path** (per Tool Selection preamble):

```python
# pseudocode — actual call via mcp__forgeplan__forgeplan_dispatch tool
SESSION_ID = "SESSION-" + datetime.utcnow().strftime("%Y-%m-%d-%H%M%S")

if has_real_artifact_ids(wave_plan):
    result = mcp__forgeplan__forgeplan_dispatch(agents={agents-per-wave})
    # result is typed dict with _next_action hint
    relay_to_report(result.get("_next_action"))
else:
    log(f"dispatch skipped — no artifact IDs in plan; using {SESSION_ID}")
```

**Shell fallback** (when MCP tools absent):

```bash
SESSION_ID="SESSION-$(date -u +%Y-%m-%d-%H%M%S)"

if grep -qE 'PRD-[0-9]+|RFC-[0-9]+|SPEC-[0-9]+' <<< "{wave-plan-text}"; then
  command -v forgeplan && forgeplan dispatch -n {agents-per-wave} --json
else
  echo "dispatch skipped — no artifact IDs in plan; will use $SESSION_ID for claim-loop"
fi
```

The `SESSION-YYYY-MM-DD-HHMMSS` synthetic ID is **load-bearing** — it's what teammates claim in §4b.g when no real artifact-ID is present. Without it, chat-driven sprints would leave `forgeplan claims` empty and `forgeplan activity` would have no agent attribution.

`forgeplan dispatch` (when called) returns a parallel-safe grouping (PRD-057 dispatcher with Jaccard file-overlap detection at threshold 0.3). Use it as a **second opinion** on your wave plan:

| Dispatch says | Your plan says | Action |
|---|---|---|
| Group A: [PRD-001, PRD-003] | Same wave | ✅ go |
| Group A: [PRD-001, PRD-003] | Different waves | OK — your split is more conservative; go |
| Group A: [PRD-001, PRD-003] | Same wave, but PRD-001 and PRD-003 share files in your file-ownership table | ⚠️ stop — your file map disagrees with Jaccard. Re-check the ownership table before spawning |

Pass each agent the artifact ID they own — see 4b teammate prompt addendum below.

### 4b. Team-lead prompt

```
You are the team lead for "{title}".

!!! IRON RULE — YOUR ROLE: COORDINATE ONLY !!!
- You do NOT write code. EVER.
- You do NOT edit files. EVER.
- You do NOT run tests. EVER.
- You ONLY: spawn teammates → monitor → verify → report → next wave.
- Extra work discovered? → Spawn NEW teammate. NEVER add to existing.

## Full Plan
{plan from Step 3}

## Execution Protocol

For each Wave (sequential):

1. ANNOUNCE: "🌊 Wave {N}/{total}: {wave name} — spawning {M} agents"

2. SPAWN all wave agents as teammates (parallel).
   Each teammate prompt includes:
   a) Their specific task from plan
   b) Files they own (NEW/MODIFY)
   c) What to study FIRST
   d) Requirements
   e) "Follow CLAUDE.md project rules"
   f) "Report back: files created/modified, LOC, issues"
   g) Forgeplan-aware — UNCONDITIONAL claim/release loop (PRD-020 + PRD-021 MCP-first):
      Each teammate uses `${ARTIFACT_ID:-$SESSION_ID}` — real artifact when present, derived
      `SESSION-YYYY-MM-DD-HHMMSS` (set in §4a-bis) as fallback for chat-driven sprints.

      **MCP-first** (when teammate sees `mcp__forgeplan__forgeplan_claim` in their tool list):
      - BEFORE starting work: call `mcp__forgeplan__forgeplan_claim(id="${ARTIFACT_ID:-$SESSION_ID}", agent="{kebab-name}", note="{wave-N task}")`
        — capture the response's `_next_action` for inclusion in final report.
      - AFTER completing: report the artifact ID (or session ID) + LOC summary so team-lead can
        emit `mcp__forgeplan__forgeplan_new(kind="evidence", title="...")` post-wave.
      - On failure / abort: `mcp__forgeplan__forgeplan_release(id="${ARTIFACT_ID:-$SESSION_ID}", agent="{kebab-name}")` to free the slot.

      **Shell fallback** (MCP tools not present):
      - BEFORE: `forgeplan claim ${ARTIFACT_ID:-$SESSION_ID} --agent {kebab-name} --note "{wave-N task}"`
      - AFTER: report ID + LOC for team-lead to emit `forgeplan new evidence ...`
      - On failure: `forgeplan release ${ARTIFACT_ID:-$SESSION_ID} --agent {kebab-name}`

      Why unconditional: PRD-018 operating contract + PRD-020 close the gap where chat-driven
      sprints (no artifact ID in the task) bypassed the artifact graph entirely. PRD-021 adds
      MCP-first preference: when MCP tools are available, prefer them — they return typed dicts
      and methodology hints (`_next_action`) that can be relayed verbatim to user reports.

3. WAIT for all wave agents to complete.

4. VERIFY:
   - Did all agents report completion?
   - Any type-check errors? (ask one agent to run typecheck)
   - Any file conflicts?

5. UPDATE task overlay (send to user):
   "✅ Wave {N} complete: {summary}
    Remaining: Wave {N+1}..."

6. ASK user: "Wave {N} done. Continue to Wave {N+1}? (yes / pause / abort)"

After ALL waves:
1. Final verification (typecheck/build/tests).
2. INSIGHTS EXTRACTION (mandatory — see Step 6).
3. SPRINT-CLOSE EVID BULK ACTIVATION (mandatory — see Step 7).
4. Summary report.
5. Shutdown teammates.
6. Signal completion.
```

### 4b-bis. Wave-close evidence autopublish (MANDATORY — PRD-077 FR-012)

> **This step is not optional.** Team-lead MUST execute it after every wave that
> reports back. Skipping it = sprint methodology failure → `forgeplan health`
> stays blind and `forgeplan score` underweights the work.

After all teammates in wave `N` report back, team-lead runs the **autopublish
algorithm** before announcing "wave complete" to the user:

#### Algorithm

```
1. enumerate touched_artifacts (set):
   - any PRD-NNN / RFC-NNN / SPEC-NNN / ADR-NNN / EPIC-NNN ID mentioned in:
       a) teammate prompts (the {ARTIFACT_ID} they claimed)
       b) commit Refs: trailers landed during this wave
       c) the wave-plan's File Ownership / Effort tables
   - dedupe (one EVID per artifact, even if 2-3 teammates worked on it)

2. if touched_artifacts is empty:
   - this is a chat-driven wave with no artifact attribution
   - emit ONE session-level EVID linked to the SESSION_ID (§4a-bis), title:
     "{SESSION_ID}: wave N — {1-line work summary}"
   - skip the per-artifact link step; SESSION_IDs are ephemeral
   - continue to step 5

3. for each artifact_id in touched_artifacts:
   a) build EVID title:  "{sprint_name}: wave N — {work summary for this artifact}"
   b) build EVID body (see §4b-ter for the required structured fields)
   c) MCP-first:  evid = mcp__forgeplan__forgeplan_new(kind="evidence", title=...)
                  mcp__forgeplan__forgeplan_update(id=evid["id"], body=...)
                  mcp__forgeplan__forgeplan_link(source=evid["id"], target=artifact_id, relation="informs")
                  relay evid["_next_action"] into the wave-close report
   d) Shell fallback (MCP unavailable, see step 6):
                  forgeplan new evidence "{title}"   # capture EVID-MMM from output
                  $EDITOR .forgeplan/evidence/EVID-MMM-*.md   # fill ## Structured Fields
                  forgeplan link EVID-MMM {artifact_id} --relation informs

4. record (evid_id, target_artifact_id, wave_n) in the sprint's collected_evids
   list — used by §7 sprint-close batch prompt.

5. announce in the wave-close handoff (see §4d):
   "Wave N evidence: {len(collected_evids_this_wave)} EVID(s) emitted —
    {EVID-AAA → PRD-XXX, EVID-BBB → RFC-YYY, …}"

6. if MCP tools unavailable AND CLI fallback also fails (no forgeplan binary on PATH):
   - DO NOT silently skip
   - WARN explicitly: "MCP+CLI both unavailable — N evidence captures
     deferred. Copy-paste these commands manually after the sprint:
     <print the would-have-been shell commands>"
   - still record placeholder entries in collected_evids so §7 surfaces them
```

#### Why per-artifact, not per-teammate or per-wave

- A single artifact may be built by 2-3 teammates across waves (Wave 1 scaffolding + Wave 2 integration). Evidence describes the *artifact's* state, not whose hands.
- One wave may touch 0, 1, or many artifacts — the algorithm handles all three.
- One artifact may accumulate multiple EVIDs across waves (Wave 1 EVID for "scaffolded", Wave 2 EVID for "integration done"). These are linked separately and bulk-activated together in §7.

#### Do NOT auto-activate at this step

Wave-close emits **draft** EVIDs. Activation is batched at sprint close (§7) so
the user reviews all evidence at once instead of being interrupted N times.

### 4b-ter. EvidencePack body — required structured fields

> **Critical for R_eff.** Without these fields the parser sets `CL0`
> (penalty 0.9) and the artifact's score collapses to 0.1. The autopublish
> writes them automatically; if you customize the body, do not strip them.

After `forgeplan_new` returns the EVID ID, immediately call `forgeplan_update`
(or edit the file in CLI fallback) with a body matching this template:

```markdown
## Structured Fields

verdict: supports
congruence_level: 3
evidence_type: measurement

## Wave summary

- Sprint: {sprint_name}
- Wave: {N} of {total}
- Workers spawned: {kebab-name-1}, {kebab-name-2}, ...
- Commits: {short-sha-1}, {short-sha-2}, ...   # only this wave's commits
- Files changed: {count} ({list — truncate to top 5 + "+ N more"})
- Tests added: {count} ({pass/fail summary})
- Pipeline gates: fmt ✓, check ✓, test ✓, clippy ✓   # whichever ran
- Merge commit: {sha if integration branch already merged, else "pending"}

## Acceptance criteria validation

{paste the acceptance criteria for this artifact and tick ✓/✗ each one}
```

**Defaults rationale**: sprint work is the *implementation* of acceptance
criteria from the parent PRD/RFC. That maps to `evidence_type: measurement`
(quantitative check against criteria). `verdict: supports` is the default
because sprint completion implies the design hypothesis held; flip to
`weakens` only if the wave produced contrary findings (rare — usually those
go into a separate EVID via `/audit`).

`congruence_level: 3` (CL3, same-context) is the default because the EVID
captures the exact artifact it informs. Lower only if cross-artifact
inferences were involved.

### 4c. Dynamic teammates

If extra work surfaces mid-wave (bug, missing file, needed component):

```
- Team-lead spawns a NEW teammate for that task
- New teammate runs in ITS OWN process, ITS OWN context
- Don't pile on existing teammates
- Team-lead waits for ALL teammates (original + new) before closing the wave
```

### 4d. Wave handoff + token budget

Between waves, hand off to the user with a progress snapshot and next-step options. Format and token-budget warning thresholds (30% / 15%) are defined verbatim in [`references/OUTPUT-FORMATS.md`](references/OUTPUT-FORMATS.md) §1.

Always emit the handoff at the same moments — never skip, never improvise the layout mid-sprint.

---

## Step 5: Wave completion overlay

After each wave, emit a cumulative task overlay. Format is defined verbatim in [`references/OUTPUT-FORMATS.md`](references/OUTPUT-FORMATS.md) §2 — table of waves with status / agents / LOC / output, files modified, key decisions, next wave, and a fixed set of user-facing options.

Use the format as-is; don't redesign it mid-sprint.

---

## Step 6: Final — Insights Extraction (MANDATORY)

After ALL waves complete, the team **must** extract and document insights.
**Without this, the sprint is not finished.**

### What to collect

- **Architectural decisions (ADR)** — what was chosen and why.
- **Bottlenecks** — context overflow, cascading errors, stale build.
- **Tech debt** — what didn't get done, stubs, follow-ups.
- **Reusable patterns** — what good thing emerged that's worth copying.

### Where to record

1. **RFC / design doc** (if exists) — section `Implementation Log` → `Sprint Insights & Bottlenecks`. See [`rfc`](../rfc/SKILL.md).
2. **TODO files** — section `Sprint Insights & Technical Debt`:

   ```markdown
   | # | Task | RFC/Ref | Priority | Why it matters |
   | - | ---- | ------- | -------- | -------------- |
   | 1 | ...  | ...     | P1/P2    | ...            |
   ```

3. **KNOWN-ISSUES.md** (if bugs were found):

   ```markdown
   ### N. {Short Description}
   **File:** `path/to/file:line`
   **Description:** ...
   **Status:** Open
   **Found:** YYYY-MM-DD ({Sprint context})
   ```

4. **Memory** (if available): `memory_retain` ADR + tech debt + patterns + insights.

### Final output

Emit the **Sprint Complete** report — format in [`references/OUTPUT-FORMATS.md`](references/OUTPUT-FORMATS.md) §3. It includes deliverables, cumulative file list, insights & tech debt block (mandatory — see "What to collect" above), and next-step checklist (test / type-check / commit / audit).

---

## Step 7: Sprint-close — bulk EVID activation prompt (MANDATORY — PRD-077 FR-012)

After Step 6 (Insights Extraction) and before signalling "sprint complete",
team-lead consolidates the EVIDs collected in §4b-bis across every wave and
hands control to the user for activation.

### 7a. Summary print

```markdown
## Sprint evidence summary

Sprint "{sprint_name}" emitted **{N} EVID(s)** across **{M} artifact(s)**
in **{W} wave(s)**.

| EVID | Target artifact | Wave | Verdict | Status |
|---|---|---|---|---|
| EVID-AAA | PRD-XXX | 1 | supports | draft |
| EVID-BBB | RFC-YYY | 1 | supports | draft |
| EVID-CCC | PRD-XXX | 2 | supports | draft |
| EVID-DDD | SESSION-2026-…  | 3 | supports | draft |   # chat-driven, no link
```

If `M == 0` (no artifacts touched, no SESSION-level EVID emitted either),
this is a **methodology failure** — see §7c below.

### 7b. Activation prompt

```
{N} EVID(s) created during this sprint. Activate them now?

Options:
1. ✅ Activate ALL ({N}) — bulk forgeplan_activate
2. 🔧 Review one-by-one (walk through, activate selectively)
3. ⏸️ Defer — keep as draft, activate manually later
4. ❌ Discard — drop EVIDs without activation (rare; explain why)
```

**Wait for explicit user response.** Do not auto-activate.

When user picks (1):

```python
# MCP-first:
for evid_id in collected_evids:
    mcp__forgeplan__forgeplan_activate(id=evid_id)
# relay each _next_action; abort batch on first failure

# Shell fallback:
for evid_id in collected_evids:
    forgeplan activate $evid_id
```

When user picks (2): print each EVID title + target + structured fields →
`forgeplan_activate` per yes.

When user picks (3) or (4): record the choice in the sprint final report so
later sessions know these EVIDs exist as drafts.

### 7c. Zero-EVID warning (methodology failure)

If the sprint closes with **zero** EVIDs emitted (touched_artifacts was empty
on every wave AND no SESSION-level EVID landed):

```
⚠️  Sprint closed without evidence.

This is a methodology gap: the artifact graph has no record of the {W} waves
of work just completed. `forgeplan health` will report a blind spot.

Suggested remediation — emit a session-level EVID retroactively:

  forgeplan new evidence "{sprint_name}: {1-line summary}"
  # → captures EVID-MMM, edit body to add Structured Fields:
  #     verdict: supports
  #     congruence_level: 3
  #     evidence_type: measurement
  # optionally link to a Note:
  forgeplan new note "Sprint outcome: {description}"
  forgeplan link EVID-MMM NOTE-NNN --relation informs

Run these before merging the release branch.
```

### 7d. Non-interactive (`/autorun`) considerations

When `/sprint` is invoked from `/autorun` or another non-interactive
orchestrator that cannot prompt the user, behaviour:

- §7b prompt is skipped; collected EVIDs are left as **draft**
- the sprint final report lists all collected EVIDs and emits a single
  line: `Bulk-activate when ready:  forgeplan activate EVID-AAA EVID-BBB ...`
- §7c zero-EVID warning still fires (it's a print, not a prompt)
- callers can pass `auto_activate=true` (orchestrator convention) to skip
  the prompt and execute option (1) directly — only enable this when the
  orchestrator has already gated user approval upstream

---

## Wave Patterns Quick Reference

| Type | Pattern | Waves | Agents |
|---|---|---|---|
| Full-stack feature | Stores/Types → Backend → Frontend → Tests | 4 | 8 |
| UI-only | Stores/Hooks → Components → Pages → Tests | 3-4 | 6-8 |
| Backend-only | Schema/Types → Services → Actions → Tests | 3 | 5-6 |
| Refactor | Foundation → Migration → Integration → Cleanup | 3-4 | 6-8 |
| Bug sprint | Research → Fixes → Verification → Docs | 2-3 | 4-6 |

---

## Anti-Patterns (break = sprint fails)

| Anti-Pattern | Why | Do this instead |
|---|---|---|
| ⛔ `Task()` instead of `TeamCreate` | No coordination, no handoff | ALWAYS `TeamCreate` |
| ⛔ Team-lead writes code | Roles blur, control lost | Team-lead = coordination ONLY |
| ⛔ Extra work onto existing teammate | Overload, focus loss | NEW teammate per extra task |
| ⛔ Two agents on one file | Conflicts, lost code | Strict file ownership |
| Execute without user approval | Wrong plan, wasted tokens | ALWAYS show plan, wait for "go" |
| >5 agents per wave | Token explosion | Split across more waves |
| >400 LOC per agent | Quality drops | Split into 2 |
| Ignoring stale teams | TeamCreate fails | TeamDelete the old ones first |
| No task overlay between waves | Lost context | ALWAYS overlay |
| Ignoring token budget | Mid-sprint overflow | Check before every wave |
| Duplicating CLAUDE.md rules | Wasted tokens | "Follow CLAUDE.md" + 3-4 specifics |
| Skip insights extraction | Knowledge is lost | INSIGHTS — mandatory |
| ⛔ Skip wave-close evidence autopublish | Artifact graph stays blind, R_eff underweights work | §4b-bis is MANDATORY — one EVID per touched artifact per wave |
| ⛔ Auto-activate EVIDs without user prompt | Bypasses user review of generated evidence | §7b ALWAYS prompts (unless `auto_activate=true` from gated orchestrator) |
| Silent skip when MCP+CLI both unavailable | User never learns evidence wasn't captured | WARN explicitly with copy-paste fallback commands |

---

## Related skills

- [`team`](../team/SKILL.md) — foundation (Mode A/B, file ownership, recipes).
- [`research`](../research/SKILL.md) — research phase of full sprint.
- [`audit`](../audit/SKILL.md) — post-sprint audit.
- [`rfc`](../rfc/SKILL.md) — Implementation Log + Insights land in the RFC.
- [`do`](../do/SKILL.md) — chains everything together.
- [`build`](../build/SKILL.md) — when a research report with IMPLEMENTATION-PLAN.md already exists.
- [`restore`](../restore/SKILL.md) — at session start, before a sprint.

## Forgeplan integration

`/sprint` is **forgeplan-aware end-to-end** when `forgeplan` is on `$PATH` or
`mcp__forgeplan__*` tools are exposed:

- **Dispatch + claim loop** — wired into Step 4 (4a-bis, 4b.g)
- **Wave-close evidence autopublish** — MANDATORY (§4b-bis), one EVID per
  touched artifact per wave, structured fields filled by the skill
- **Sprint-close batch activation** — MANDATORY (§7), prompts user to
  bulk-activate the collected draft EVIDs

No manual `forgeplan new evidence` is required at wave-close anymore; the
skill writes it for you. The commands below describe the shape; the skill
calls them.

### Before `/sprint <task>` (still user's responsibility)

```bash
forgeplan health                   # observe blind spots first
forgeplan route "<task>"           # decide depth (Tactical/Standard/Deep/Critical)
# Standard+:
forgeplan new prd "<title>"        # shape: PRD with MUST sections
forgeplan validate PRD-NNN         # gate before sprint
forgeplan reason PRD-NNN           # ADI 3+ hypotheses (Deep+: required)
```

### During `/sprint` (skill calls these automatically)

```bash
forgeplan dispatch -n {agents-per-wave} --json   # parallel-safe grouping (PRD-057)
# Per teammate, in their spawn prompt:
forgeplan claim {artifact-id} --agent {kebab-name}
# Per wave at close, by team-lead (autopublish, MANDATORY):
forgeplan new evidence "{artifact-id}: wave N — ..."   # ×N for N touched artifacts
forgeplan link EVID-MMM {artifact-id} --relation informs
```

### After `/sprint` completes (skill prompts, user picks)

```bash
# Skill prints the EVID summary and asks: "Activate all N EVIDs now?"
# On "yes" the skill calls:
forgeplan activate EVID-AAA
forgeplan activate EVID-BBB
# ...
# After bulk activation, user runs themselves:
forgeplan score PRD-NNN            # R_eff updated with new EVID weights
forgeplan activate PRD-NNN         # parent PRD: draft → active (if ready)
```

If the user picks "defer" or "discard" at §7b, EVIDs stay draft and the
sprint report records the deferred list. If MCP+CLI are both unavailable,
the skill prints copy-paste commands rather than silently skipping.

### Want this orchestrated for you?

Install [`forgeplan-workflow`](../../../../plugins/forgeplan-workflow/README.md) and run `/forge-cycle "<task>"` instead — it auto-routes, creates the PRD, delegates the build to skills like this one, creates evidence, activates, and prepares the commit. `/sprint` is the **executor**; `/forge-cycle` is the **orchestrator**.

```
/plugin install forgeplan-workflow@ForgePlan-marketplace
/reload-plugins
```

---

## Decision Guide: full sprint vs lightweight wave

```
Do you already have context in chat?
  ├── YES → lightweight wave (skip research, generate plan)
  │    ├── Discussed the task → wave
  │    ├── Read RFC/TODO → wave
  │    └── Did research → wave
  │
  └── NO → full sprint (research + plan)
       ├── New task → full sprint
       └── Session start after a break → restore, then full sprint
```
