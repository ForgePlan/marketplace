---
name: sprint
description: Wave-based execution of a feature/task by a multi-agent team — research → wave plan (5-8 agents in 2-5 waves) → approval → wave-by-wave teammate spawn via TeamCreate. Two modes — full sprint (with research phase) and lightweight wave (uses current chat context). Each wave is independent parallel work by agents under strict file ownership; dependent tasks go in the next wave. Use for large feature implementation, refactor sprints, milestones. Triggers (EN/RU) — "sprint", "wave plan", "implement feature in waves", "запусти спринт", "распланируй волны", "реализуй фичу", "implement RFC-XXX", "/sprint", "/wave".
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

**Always run** when forgeplan CLI is on `$PATH` — even for chat-driven sprints (no artifact IDs). The dispatcher needs `affected_files` on real artifacts to be useful, but the **session-id derivation** below applies to every sprint regardless.

```bash
# Step 1 — derive session-id once for this sprint (used as fallback artifact-id below)
SESSION_ID="SESSION-$(date -u +%Y-%m-%d-%H%M%S)"

# Step 2 — dispatch only if real artifact-IDs are in the plan (otherwise dispatch returns no parallel-safe candidates with empty file-ownership)
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
   g) Forgeplan-aware — UNCONDITIONAL claim/release loop (PRD-020):
      Each teammate uses `${ARTIFACT_ID:-$SESSION_ID}` — real artifact when present, derived
      `SESSION-YYYY-MM-DD-HHMMSS` (set in §4a-bis) as fallback for chat-driven sprints.
      - BEFORE starting work: run `forgeplan claim ${ARTIFACT_ID:-$SESSION_ID} --agent {kebab-name} --note "{wave-N task}"`
        — soft signal "I'm working on this" (PRD-057). Skip ONLY if claim already held by same agent name.
      - AFTER completing: report the artifact ID (or session ID) + LOC summary so team-lead can
        emit `forgeplan new evidence` post-wave (see step 4b-bis below).
      - On failure / abort: `forgeplan release ${ARTIFACT_ID:-$SESSION_ID} --agent {kebab-name}` to free the slot.
      Why unconditional: PRD-018 operating contract + PRD-020 close the gap where chat-driven
      sprints (no artifact ID in the task) bypassed the artifact graph entirely. Now every
      teammate is visible in `forgeplan claims` for the duration of their work.

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
3. Summary report.
4. Shutdown teammates.
5. Signal completion.
```

### 4b-bis. Per-artifact evidence emission (UNCONDITIONAL — PRD-020)

Team-lead emits **one evidence per completed artifact** at wave-close — not per teammate, not per wave. Same pattern for both modes; only the linked artifact differs.

```bash
# Artifact-driven (real PRD-NNN/RFC-NNN/SPEC-NNN in plan):
forgeplan new evidence "{artifact-id}: {what shipped} — {tests/smoke status}"
forgeplan link EVID-MMM {artifact-id} --relation informs

# Chat-driven (no real artifact-ID — using SESSION_ID from §4a-bis):
forgeplan new evidence "{SESSION_ID}: {sprint description} — {what shipped} — {tests/smoke status}"
# No link needed — SESSION-IDs are ephemeral, evidence stands alone with descriptive title.
# Optionally link to a NOTE if the work warrants persistent reference:
#   forgeplan new note "Sprint outcome: {description}"
#   forgeplan link EVID-MMM NOTE-NNN --relation informs
```

Why per-artifact and not per-teammate: a single artifact may be built by 2-3 teammates across waves (Wave 1: scaffolding + Wave 2: integration). Evidence describes the *artifact's* state, not who pushed which line.

Why unconditional (vs v1.6.0 conditional): PRD-020 closed the gap where chat-driven sprints emitted no evidence at all. Now every sprint produces ≥1 evidence in the artifact graph, making `forgeplan activity` and `forgeplan health` reflect actual project work even when scope started without explicit artifact IDs.

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

If the `forgeplan` CLI is on `$PATH` (probe with `command -v forgeplan`), this skill is **forgeplan-aware**. The **dispatch + claim + evidence loop** is wired into Step 4 (4a-bis, 4b.g, 4b-bis) for artifact-driven sprints; the recommendations below are for human-orchestrated runs.

### Before `/sprint <task>`

```bash
forgeplan health                   # observe blind spots first
forgeplan route "<task>"           # decide depth (Tactical/Standard/Deep/Critical)
# Standard+:
forgeplan new prd "<title>"        # shape: PRD with MUST sections
forgeplan validate PRD-NNN         # gate before sprint
forgeplan reason PRD-NNN           # ADI 3+ hypotheses (Deep+: required)
```

### During `/sprint` (artifact-driven mode — see 4a-bis)

```bash
forgeplan dispatch -n {agents-per-wave} --json   # parallel-safe grouping (PRD-057)
# Per teammate, in their spawn prompt:
forgeplan claim {artifact-id} --agent {kebab-name}   # soft signal "I'm working on this"
# Per artifact at wave-close, by team-lead:
forgeplan new evidence "{artifact-id}: ..."
forgeplan link EVID-MMM {artifact-id} --relation informs
```

### After `/sprint` completes

```bash
forgeplan new evidence "<task>: tests pass / smoke OK / N waves merged"   # for chat-driven sprints, or sprint-level summary
forgeplan link EVID-MMM PRD-NNN --relation informs
forgeplan score PRD-NNN            # R_eff > 0?
forgeplan activate PRD-NNN         # draft → active
```

Without these, the sprint output ships but the artifact graph stays empty — `forgeplan health` will surface a blind spot ("active sprint without linked evidence").

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
