---
name: build
description: Runs the implementation team from a finished research report — reads IMPLEMENTATION-PLAN.md (phases, file ownership, acceptance criteria) and the SUMMARY with ADRs, spawns teammates by phase (sequential or parallel), and verifies the result via build/typecheck/tests. Use when research is already done (via research or manually) and only "execute the plan" is left. Triggers (EN/RU) — "build from research", "execute IMPLEMENTATION-PLAN", "implement based on research report", "имплементируй по research", "выполни план", "/build".
---

# Build from Research

Turns a finished research report with `IMPLEMENTATION-PLAN.md` into real code.
Does not do research itself — it expects the artifacts to already exist. Builds
on [`team`](../team/SKILL.md).

---

## Project Context (read first)

If `/setup` has been run in the project, concrete commands and paths live in:

- `@docs/agents/build-config.md` — build/test/lint/typecheck commands (the
  primary input for this skill)
- `@docs/agents/paths.md` — where research reports live and where new code goes

Check via `test -f docs/agents/build-config.md`. If present — use those commands
instead of the pnpm/cargo examples below. If not — auto-detect via
`package.json` / `Cargo.toml` / `go.mod` / `pyproject.toml` / `Makefile`.

Never hardcode pnpm/cargo/npm — pick the runtime by project files.

---

## When to Use

- [`research`](../research/SKILL.md) finished and saved `IMPLEMENTATION-PLAN.md`.
- An external research-pack with a finished plan (phases, files, acceptance
  criteria) was received.
- The user said: "build from research/reports/X", "выполни план",
  "имплементируй по research-у".

## When Not to Use

- Research not done yet — start with [`research`](../research/SKILL.md).
- No plan, only an idea — use [`sprint`](../sprint/SKILL.md) (it does its own
  research).
- Code review needed — use [`audit`](../audit/SKILL.md).

---

## Prerequisites

`$ARGUMENTS` = path to the research report directory. Inside it MUST contain:

| File | Purpose |
|---|---|
| `IMPLEMENTATION-PLAN.md` | Phases + file ownership + LOC estimates + acceptance criteria |
| `00-SUMMARY.md` (or `SUMMARY.md`) | Executive summary + ADRs |
| `CONTINUATION-PROMPT.md` | (optional) Stage-by-stage prompts, useful for long pipelines |

If `IMPLEMENTATION-PLAN.md` is missing — tell the user, suggest:

- Run research first ([`research`](../research/SKILL.md)).
- Or build the plan manually ([`sprint`](../sprint/SKILL.md), Step 2).

---

## Process

### Step 0: Validate Input

```bash
# verify the directory and required files exist
ls "$ARGUMENTS/"
test -f "$ARGUMENTS/IMPLEMENTATION-PLAN.md" || echo "missing"
test -f "$ARGUMENTS/00-SUMMARY.md" || test -f "$ARGUMENTS/SUMMARY.md" || echo "missing"
```

If `$ARGUMENTS` is not provided — show the available research directories:

```bash
find . -maxdepth 4 -name "IMPLEMENTATION-PLAN.md" -path "*/research/*" 2>/dev/null
ls research/reports/ 2>/dev/null
```

### Step 1: Read the Plan

```
Read("$ARGUMENTS/IMPLEMENTATION-PLAN.md")
Read("$ARGUMENTS/00-SUMMARY.md")
Read("$ARGUMENTS/CONTINUATION-PROMPT.md")  # if present
```

Extract:

- **Phases**: name, priority (P0/P1/P2), effort, dependencies.
- **Team composition**: which agents are needed.
- **File ownership map** — each agent has its own files.
- **Acceptance criteria** — how we'll know a phase is done.

### Step 2: Present to the User

```markdown
## Build Plan from: {research-dir}

### Available Phases

| Phase | Name | Priority | Effort | Dependencies |
|---|---|---|---|---|
| 1 | {from PLAN} | P0 | 2 weeks | None |
| 2 | {from PLAN} | P0 | 3 weeks | None |
| 3 | ... | P1 | ... | Phase 2 |

### Team Composition

| Role | subagent_type | Phases |
|---|---|---|
| backend-dev | general-purpose | 1, 2 |
| frontend-dev | general-purpose / nextjs-developer | 1, 3 |
| test-writer | general-purpose | All |

### Which phases do we build?

- "all" — all sequentially
- "1,2" — specific ones
- "parallel 1,2" — in parallel (if no deps)
- "1" — only one
```

**Wait for the user's choice.**

### Step 3: Prepare Context

For each selected phase from `IMPLEMENTATION-PLAN.md`, extract:

- Task list (file paths, LOC estimates, test counts).
- Acceptance criteria.
- File ownership map.
- Dependencies on other phases.

Combine with:

- `00-SUMMARY.md` — ADRs, key decisions.
- The matching stage from `CONTINUATION-PROMPT.md` (if present).
- Deep domain reports (e.g. `02-architecture.md`, `04-api-design.md`).

### Step 4: Spawn the Implementation Team

`TeamCreate(team_name="build-{topic}")`. Structure — as in
[`team`](../team/SKILL.md).

#### Allocation

- **backend-dev**: schema, stores, services, workers.
- **frontend-dev**: pages, hooks, components.
- **agent-dev** (if planned work involves agents/orchestration): executor,
  messaging.
- **test-writer**: tests for all layers.

(Names are illustrative. Actual roster depends on what's in the plan.)

#### Teammate prompt

```
You are {role} implementing Phase {N} of "{topic}".

## Required Reading (in this order)

1. {project root}/CLAUDE.md — project rules, conventions, build commands
2. {research-dir}/00-SUMMARY.md — research summary + ADRs
3. {research-dir}/IMPLEMENTATION-PLAN.md — YOUR tasks in Phase {N}
4. {research-dir}/{relevant detail report}.md — domain context (if present)

## Your Tasks (from PLAN, Phase {N})

{paste task table from IMPLEMENTATION-PLAN}

## Acceptance Criteria

{paste from PLAN}

## Project Rules

Follow CLAUDE.md. Plus, specifically:
- {rule 1 — extracted from PLAN or CLAUDE.md}
- {rule 2}
- {rule 3}

## Your Files (strict ownership)

NEW:
- {paths from PLAN file ownership map}

MODIFY:
- {paths}

READ-ONLY (study, don't edit):
- {paths}

## Verification

After completing all tasks:
- Run project's typecheck (e.g., `npm run typecheck`, `pnpm -r exec tsc --noEmit`, `mypy`, `cargo check`)
- Run project's tests for affected packages
- Run project's build for affected packages

Report failures, do not declare done while red.

## After completion

Report back with:
- Files created / modified (paths + LOC)
- Tests added (count, what they cover)
- Verification results (typecheck/tests/build)
- Any blockers or discovered tech debt
- Updated TODO entries (mark [x] for done, add [ ] for gaps)
```

### Step 5: Monitor & Coordinate

- Track task completion (TaskList).
- When backend-dev finishes stores → unblock frontend-dev for hooks.
- When test-writer needs types → wait for backend.
- Handle blockers, replan tasks if needed.

### Step 6: Verify

Commands depend on the stack (read `CLAUDE.md` or
`package.json/Cargo.toml/pyproject.toml`):

```bash
# JavaScript/TypeScript monorepo:
pnpm -r exec tsc --noEmit
pnpm --filter "{affected-pkgs}" build
pnpm --filter "{affected-pkgs}" test

# Python:
mypy {affected-modules}
pytest {affected-tests}

# Rust:
cargo check --all
cargo test {affected-crate}

# Adapt under project's actual commands.
```

All three are mandatory: typecheck, build, test. If anything is red — don't
declare the phase done.

### Step 7: Update Docs

1. **TODO files** — `[x]` for completed, `[ ]` for gaps.
2. **KNOWN-ISSUES.md** — if bugs were discovered along the way.
3. **RFC** (if present) — `Implementation Log` + `Sprint Insights`. See
   [`rfc`](../rfc/SKILL.md).
4. **Memory** (if available):

   ```
   memory_retain("# Build: {topic} — Phase {N} Complete (YYYY-MM-DD)
   Implemented: {list}
   Tests: {count} passing
   Gaps remaining: {list}
   Key decisions: {ADRs from research}")
   ```

### Step 8: Cleanup

Shutdown teammates → `TeamDelete()`. See cleanup checklist in
[`team`](../team/SKILL.md).

---

## Phase Selection Strategies

### Parallel phases

If `IMPLEMENTATION-PLAN.md` has phases without dependencies:

```
Phase 1 (frontend) + Phase 2 (backend) → parallel
Phase 3 (depends on Phase 2) → sequential after Phase 2
```

### Incremental build

For large plans (7+ phases):

```
Session 1: Phase 1 + 2 (foundation)
Session 2: Phase 3 + 4 (features) — use CONTINUATION-PROMPT Stage 2
Session 3: Phase 5 + 6 (advanced) — Stage 3
Session 4: Phase 7 (UI polish) — Stage 5
```

Each session — its own TeamCreate, to keep token usage from ballooning.

### Single-phase focus

Quick iteration on one phase:

```
build research/reports/{dir} --phase 1
```

---

## Anti-patterns

| Anti-Pattern | Why | Do this instead |
|---|---|---|
| Build without reading research | Missing context, wrong patterns | ALWAYS read 00-SUMMARY + relevant detail reports |
| Ignore ADRs | Counter to research decisions | Follow ADRs as law |
| All phases at once | Context overflow | 2-3 phases per session |
| No verify after each | Cascade failures | typecheck + test after every phase |
| Frontend before backend types | Types out of sync | Backend → types → frontend |
| Skip TODO/RFC update | Knowledge lost | Step 7 is mandatory |

---

## Related Skills

- [`research`](../research/SKILL.md) — produces `IMPLEMENTATION-PLAN.md`.
- [`team`](../team/SKILL.md) — foundation.
- [`sprint`](../sprint/SKILL.md) — alternative when there's no plan yet.
- [`audit`](../audit/SKILL.md) — runs after the build.
- [`rfc`](../rfc/SKILL.md) — update RFC.
- [`do`](../do/SKILL.md) — chains research → build → audit.

---

## Forgeplan integration

If the `forgeplan` CLI is on `$PATH` and the IMPLEMENTATION-PLAN.md references a PRD, this skill is **forgeplan-aware** — it recommends the right CLI calls but does not invoke them.

### Before `/build`

The IMPLEMENTATION-PLAN.md should already reference the parent PRD/RFC (created by `/research` → `/refine` → `/rfc`). If not, create one:

```bash
forgeplan route "<scope of the IMPLEMENTATION-PLAN>"
forgeplan new prd "<title>"            # if Standard+ depth
forgeplan validate PRD-NNN
```

### After `/build` completes

```bash
forgeplan new evidence "<plan>: N waves merged, M tests added, build/lint clean"
forgeplan link EVID-MMM PRD-NNN --relation informs
forgeplan score PRD-NNN
forgeplan activate PRD-NNN              # draft → active
```

For `/build` runs that took multiple sessions (each adding a wave), append to the same Evidence rather than creating multiple — keeps the trail single-threaded.

### Want this orchestrated for you?

`/forge-cycle` (in [`forgeplan-workflow`](../../../../plugins/forgeplan-workflow/README.md)) handles the full build + evidence + activate flow when you start from a task description rather than an existing IMPLEMENTATION-PLAN.
