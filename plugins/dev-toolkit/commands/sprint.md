---
name: sprint
description: "Adaptive sprint — scales from quick fix to full release cycle. Auto-detects task complexity: Tactical (quick waves), Standard (ADI + tests + pipeline), Deep (teams + full pipeline + release). One command for all scales."
---

# Adaptive Sprint

You are a principal engineer managing a structured sprint. You auto-detect task scale and adapt behavior — from a quick 1-agent fix to a full multi-agent release cycle with ADI reasoning, quality pipeline, and close-out.

## Step 1: Gather the Task

If the user provided a task description as an argument, use that. Otherwise ask:

> "What task would you like me to sprint on?"

## Step 2: Detect Scale

Analyze the task and determine scale:

| Signal | Scale | Sprint Mode |
|---|---|---|
| Typo, config change, one-liner, obvious fix | **Tactical** | Quick: 1 agent, waves, test |
| Feature 1-3 days, new endpoint, refactor, 2+ files | **Standard** | Full: ADI, 2 agents, pipeline, PR |
| New module, irreversible, 5+ files, architecture change | **Deep** | Complete: ADI mandatory, 3-4 agents, full pipeline, release |

If `forgeplan` CLI is available, run `forgeplan route "<task>"` for calibrated depth.

Tell the user: "**Scale: [Tactical/Standard/Deep]** — [one line why]"

If they disagree, adjust.

## Step 3: Research Context

### All scales:
- Read `CLAUDE.md` or `README.md` for project conventions
- `git log --oneline -10` + `git status` + `git branch`
- Detect project type (package.json / Cargo.toml / pyproject.toml / go.mod)
- Search for files related to the task

### Standard+ adds:
- Read PRD if referenced (`.forgeplan/prds/` or task description)
- Study existing code patterns in the area being changed
- Identify test directories and conventions

### Deep+ adds:
- Gap analysis: what exists vs what's needed
- Identify integration points and backward compat risks
- Document key data structures and interfaces involved

## Step 4: ADI Checkpoint (Standard+ only)

Before coding, consider alternatives:

```
ABDUCTION: What approaches are possible? (generate 2-3)
DEDUCTION: Which fits best? (compat, performance, simplicity)
INDUCTION: Can we test this? (clear test strategy?)
```

Present to user:

> **ADI Checkpoint:**
> - **Option A**: [approach] — [pro] / [con]
> - **Option B**: [approach] — [pro] / [con]
> - **Recommended**: [choice] because [reason]
>
> Proceed with [choice]? Or prefer another approach?

For Tactical: skip ADI entirely.
For Deep: ADI is **mandatory** — do not proceed without user confirmation.

## Step 5: Create Sprint Plan

Break the task into waves. Team size by scale:

| Scale | Agents per wave | Total waves |
|---|---|---|
| Tactical | 1 | 1-2 |
| Standard | 2 parallel | 2-3 |
| Deep | 3-4 parallel | 3-4 |

Rules:
- Wave 1 = foundation (types, interfaces, config)
- Middle waves = core implementation (parallel where no file conflicts)
- Final wave = integration, tests, cleanup
- **One file = one agent** — never two agents editing the same file

### Deep Scale — SPARC Methodology (if agents-sparc installed)

When scale is Deep and the `agents-sparc` plugin is installed, structure execution as SPARC phases instead of generic waves:

1. **Specification** → spawn `specification` agent: requirements, acceptance criteria, constraints
   - Quality gate: all requirements testable
2. **Pseudocode** → spawn `pseudocode` agent: algorithm design, data structures, complexity
   - Quality gate: algorithm handles all spec edge cases
3. **Architecture** → spawn `architecture` agent: system design, Mermaid diagram, file structure
   - Quality gate: components match requirements
4. **Refinement** → spawn `refinement` agent: TDD red-green-refactor, implement, optimize
   - Quality gate: tests pass, coverage > 80%
5. **Completion** → integration test, docs update, PR ready

Use `sparc-orchestrator` agent to coordinate if available. Fall back to standard wave-based execution if agents-sparc is not installed.

### Agent Recommendations by Category

When spawning agents, prefer specialized agents from installed plugins:
- **Code review**: use `code-reviewer` (agents-core) over generic inline sub-agent
- **Security**: use `security-expert` (agents-pro) for security review wave
- **Testing**: use `tester` or `tdd-london` (agents-core) for test writing
- **TypeScript**: use `typescript-pro` (agents-domain) for TS-specific work
- **Architecture**: use `architect-reviewer` (agents-pro) for arch review

If agent plugins are not installed, fall back to inline sub-agents as before.

Present plan, wait for approval.

## Step 6: Execute Wave by Wave

For each wave:
1. Announce: "Starting Wave [N]: [Goal] — [M] agents..."
2. Launch agents in parallel (each gets: plan, specific task, relevant files)
3. Wait for ALL agents in wave to complete
4. Report results + verify before next wave

## Step 7: Quality Pipeline

### Tactical:
```
Run tests → Report results → Done
```

### Standard:
```
1. FORMAT  — auto-format (prettier, ruff format, cargo fmt)
2. LINT    — 0 errors (eslint, ruff check, clippy)
3. TYPES   — 0 errors (tsc, mypy, pyright)
4. TESTS   — all pass (existing + new)
5. SUMMARY — changes, files, test count
```

### Deep:
```
1. FORMAT     — auto-format
2. LINT       — 0 errors
3. TYPES      — 0 errors
4. UNIT       — all unit tests pass
5. E2E        — all E2E/integration tests pass
6. AUDIT      — launch 2+ review agents:
                 a) Code quality (logic, edge cases, error handling)
                 b) Architecture (patterns, coupling, backward compat)
7. FIX        — fix all CRITICAL/HIGH findings
8. RE-VERIFY  — repeat steps 1-5 AFTER audit fixes (don't trust previous run)
9. SMOKE      — build/install in clean env, verify import + version
```

## Step 8: Evidence & Close-out

### Tactical:
```
Commit with conventional message → Done
```

### Standard:
```
1. Commit with refs (PRD/FR numbers if available)
2. Evidence summary:
   | Check | Result |
   |---|---|
   | Tests | N passed |
   | Lint | pass |
   | Types | pass |
3. If forgeplan available: suggest evidence creation
```

### Deep:
```
1. Evidence Table (include in output and PR body):
   | Layer | Tests | Result |
   |---|---|---|
   | Unit | N passed, M new | pass/fail |
   | E2E | N passed | pass/fail |
   | Type check | N files | pass/fail |
   | Lint | — | pass/fail |
   | Audit | N agents, N findings | N fixed |
   | Smoke | install + import | pass/fail |

2. Version bump (if releasing):
   - Update version in ALL manifest files (same version everywhere)
   - Update CHANGELOG
   - Commit → PR → merge → tag → push tag

3. Close-out:
   - If forgeplan: create evidence, link to PRD, activate
   - If memory (Hindsight/mem0): save key decisions
   - Update CLAUDE.md/TODO.md if needed
   - Clean up: delete temp files, close branch
```

## Error Handling

- Agent failure → report to user, attempt fix, ask if non-trivial
- Test failure → show errors, fix, re-run affected tests
- Audit findings → fix CRITICAL/HIGH, then RE-VERIFY everything
- Never silently skip failures — they may block later waves

## Sprint Checklist (Deep scale — for reference)

```
[ ] Context researched (CLAUDE.md, git, project structure)
[ ] ADI checkpoint: alternatives considered, approach justified
[ ] Sprint plan approved by user
[ ] Waves executed, all agents completed
[ ] Format: 0 changes needed
[ ] Lint: 0 errors
[ ] Types: 0 errors
[ ] Tests: all pass (unit + E2E)
[ ] Audit: 2+ agents, 0 CRITICAL/HIGH remaining
[ ] Re-verify: pipeline re-run after fixes
[ ] Smoke: build/install works in clean env
[ ] Evidence table generated
[ ] Commit + PR (with evidence in body)
[ ] Close-out: forgeplan/memory/docs updated
```
