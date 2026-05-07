---
name: audit
description: Multi-expert audit of code, architecture, or a finished feature — at least 4 parallel reviewer agents, each with a specialization (logic, architecture/SOLID, typing, security; optionally tests, backend patterns, frontend, task-completion). Each runs its own checklist. Output is cross-validation, score, verdict, and action plan. Use when the user wants a sharp second pair of eyes on code, a PR, a branch diff, or a sprint. Triggers (EN/RU) — "audit", "review", "проверь код", "ревью", "оцени качество", "всё ли правильно", "code audit", "expert review", "/audit".
---

# Multi-Expert Audit

A panel of 4+ agents with different skills reviews code in parallel. Builds on
[`team`](../team/SKILL.md) (Mode A/B, cleanup) — the audit recipe and domain
checklists live here.

---

## Project Context (read first)

If `/setup` has been run in the project, concrete paths and commands live in:

- `@docs/agents/paths.md` — where source, tests, and docs live
- `@docs/agents/build-config.md` — build/test/lint/typecheck commands for post-audit verification
- `@CONTEXT.md` — domain glossary (use when reasoning about business logic)

Check via `test -f docs/agents/paths.md`. If present — pass the contents into each
reviewer's prompt. If not — auto-detect: glob over sources, read `package.json`,
`Cargo.toml`, or `go.mod` for commands.

Never assume specific paths or stack — read `docs/agents/*.md` or discover in the
current session.

---

## When to Use

- A feature, sprint, or PR is ready and needs a thorough review.
- The user says "review", "audit", "проверь", "оцени качество", "всё ли правильно".
- Before merging a large branch.
- After implementing an RFC — verify "delivered vs. requested".

## When Not to Use

- A few lines of code — a linter or typechecker is enough.
- A simple syntax fix — use code-reviewer as a single agent.
- Pure architectural advice without reading code — single agent with `architect-reviewer`.

---

## Core Rule: Minimum 4 Agents

Every audit = **at least 4 specialized agents**, running in parallel. Fewer is a
point review, not an audit. More than 6 = token explosion.

---

## Architecture (4 Phases)

| Phase | What it does |
|---|---|
| **1. Scope Analysis** | Identify what to review; find the original spec (RFC/TODO/issue); pick the panel |
| **2. Parallel Review** | Spawn 4–6 agents in parallel via TeamCreate |
| **3. Task Completion Check** | Compare "delivered vs. requested" |
| **4. Synthesis & Verdict** | Cross-validation, score, verdict, action plan |

---

## Phase 1: Scope Analysis

### 1a. What to Review

Parse `$ARGUMENTS`:

| Signal | Action |
|---|---|
| Specific files | Read them in full, embed in prompts |
| Feature / module | Glob + Grep, collect all relevant files |
| "latest changes" | `git diff HEAD~1` or `git diff --staged` |
| `PR #N` | `gh pr diff N` |
| RFC reference | Find the RFC file, extract phases/tasks |
| "sprint" / "sprint X" | Find all files changed during the sprint |

### 1b. Find the Original Task (for Phase 3)

Sources of "what was requested":

- RFC / design doc — Phase or Implementation TODO section.
- TODO file — specific `[x]/[ ]` items on the topic.
- Sprint plan (if [`sprint`](../sprint/SKILL.md) was used).
- Branch name (often references RFC/issue).
- GitHub Issue / Linear ticket (if mentioned).

If nothing is found — skip Phase 3 and note it in the final report.

### 1c. FILE_LIST

Up to 30 files. For files >500 lines — pass only relevant sections (or the
original diff).

### 1d. Panel Selection (min 4, max 6)

#### Mandatory 4 — always:

| # | Agent name | subagent_type (examples) | Focus | Checklist (see below) |
|---|---|---|---|---|
| 1 | `logic-reviewer` | `code-reviewer` / `general-purpose` | Logic + business correctness | Algorithms, edge cases, race conditions, idempotency |
| 2 | `arch-reviewer` | `architect-reviewer` / `architect-review` | SOLID + architecture | DI, dependency direction, patterns, over-engineering |
| 3 | `type-reviewer` | `typescript-pro` / `typescript-type-auditor` or (other languages) `general-purpose` | Typing / type safety | `any`/casts/non-null, generic constraints, schema↔type alignment |
| 4 | `security-reviewer` | `security-auditor` / `security-expert` | Security + error handling | OWASP, injection, PII, swallowed errors, DoS |

For non-TS projects, type-reviewer becomes `lint-reviewer` (static analysis,
mypy/clippy/etc).

#### Optional (by scope):

| # | Name | When |
|---|---|---|
| 5 | `test-reviewer` | Tests exist or should exist |
| 6 | `backend-reviewer` (`backend-architect` / `microservices-architect`) | Backend services, inter-service, persistence |
| 7 | `frontend-reviewer` (`frontend-developer` / `nextjs-developer`) | UI, state, UX |
| 8 | `task-reviewer` (`general-purpose`) | RFC/TODO with explicit checklist — completeness verification needed |

### 1e. Selection Matrix

| Scope | Panel (≥4) |
|---|---|
| Backend feature | logic + arch + type + security + test (5) |
| Full-stack feature | logic + arch + type + security + frontend + test (6) |
| Microservices | logic + arch + type + security + backend (5) |
| Types/interfaces only | logic + arch + type + security (4) |
| Sprint/RFC completion | logic + arch + type + security + test + task (6) |
| Quick review | logic + arch + type + security (4) |

---

## Phase 2: Parallel Review

`TeamCreate(team_name="audit-{scope}")` + spawn all agents in parallel in a single message.

### Prompt Template (shared)

```
## Expert Audit Assignment

**Role**: {your specialization}
**Scope**: {file list}
**Context**: {what was built / changed}
**Original Task**: {RFC/TODO ref — what was requested}

### Task
Review the code from YOUR expert perspective. Be CRITICAL but fair.
Read every file carefully. Focus on your domain expertise.

### Files to Review
{actual file contents pasted here}

### Domain Checklist (your area)
{domain-specific checklist — see below}

### IMPORTANT: Task Completion Check
Compare what was IMPLEMENTED against what was REQUESTED.
List items as:
- ✅ Done correctly
- ⚠️ Done but with issues
- ❌ Not done / missing
- 🔄 Done differently than requested (explain)

### Output Format (STRICT)

## {Your Role} Review

### Score: X/10

### Task Completion
- ✅ ...
- ⚠️ ...
- ❌ ...

### Critical Issues (must fix)
- [C1] file.ts:line — Description. Fix: what to do.

### Warnings (should fix)
- [W1] file.ts:line — Description. Suggestion: ...

### Positive Findings
- [P1] ...

### Verdict
ONE of: APPROVE | APPROVE_WITH_FIXES | REQUEST_CHANGES | REJECT

### Key Recommendation (1-2 sentences)
```

### Domain Checklists

#### logic-reviewer

- Algorithmic correctness.
- Edge cases: null, undefined, empty, 0, negative, very large.
- Race conditions: concurrent access, shared mutable state.
- Off-by-one, boundary conditions.
- Fire-and-forget — are errors lost silently?
- Caching: invalidation, stale data, thundering herd.
- Idempotency: is a repeated call safe?
- Resource cleanup (listeners, timers, connections, file handles).

#### arch-reviewer (SOLID + Architecture)

- **S**: Single Responsibility.
- **O**: Open/Closed — extension without modification.
- **L**: Liskov Substitution.
- **I**: Interface Segregation — interfaces not bloated.
- **D**: Dependency Inversion — depend on abstractions, not concrete classes.
- DI through constructors, no monkey-patching.
- Direction: no circular deps.
- Over-engineering vs under-engineering.
- Consistency with existing codebase patterns (study analogous modules).
- Error model — typed errors vs generic exceptions.

#### type-reviewer (TS / Rust / Python with type hints / etc.)

- `any` / `unknown` — every `any` is a potential runtime bug.
- `as` casts / unsafe coercions.
- Non-null assertions (`!`) — where a type guard would do.
- Generic constraints correct.
- Duck typing: does the shape match real data?
- Schema (Zod/Pydantic/etc.) ↔ type alignment.
- Discriminated unions for state machines.
- Inline types vs named exports (DRY).
- At boundaries — `unknown` + parsing instead of `any`.

#### security-reviewer

- OWASP Top 10: injection, XSS, SSRF, path traversal, IDOR, broken auth.
- Input validation at boundaries (user input, API params, file uploads).
- Output encoding (`encodeURIComponent`, HTML escape, SQL params).
- PII / sensitive data: not logged, not stored in plaintext.
- Error handling: try/catch, no swallowed errors without reason.
- DoS vectors: unbounded loops, arrays, memory growth.
- Limits on user input (size, rate, count).
- Tenant / authorization isolation at every layer.
- Secrets: no hardcoded values, env vars verified.

#### test-reviewer

- All public methods covered by tests.
- Edge cases: empty, error, timeout, null.
- Negative tests: what if everything breaks?
- Mock quality: realistic mocks, not stub placeholders.
- Backward compatibility: old code not broken.
- Integration: E2E flow covered?
- Determinism: tests not flaky.
- Test isolation: no shared state.
- Missing tests: concrete list with rationale.

#### backend-reviewer

- Service boundary violations.
- Inter-service communication: right mechanism?
- Tenant / auth isolation in every query / action.
- Idempotency and retry safety.
- Event-driven patterns: right transport?
- Error resilience: what if a dependency is down?
- Resource cleanup: connections, listeners.
- Observability: traces, metrics, structured logs.

#### frontend-reviewer

- State management: where state lives, no duplication.
- API data — in the right cache layer (Query/SWR), not in the client store.
- Components: composability, props vs context.
- Accessibility (a11y): ARIA, keyboard nav, contrast.
- Performance: rerenders, memoization, code splitting.
- UX: loading / error / empty states.
- Routing: correct router usage.

#### task-reviewer

- Every item from RFC / TODO / spec — implemented?
- Implemented literally or differently? If differently — why?
- Docs / changelog updated?
- Tests for each new item?

---

## Phase 3: Task Completion Check

After all reports — the leader builds a table:

```markdown
### Task Completion Matrix

| # | Original Task | Status | Details |
| - | ------------- | ------ | ------- |
| 1 | task from RFC | ✅ Done / ⚠️ Issues / ❌ Missing | what exactly |
| 2 | ...           | ...                            | ...          |

### Completion Rate: X/Y tasks (Z%)
```

If completion < 80% → verdict cannot be APPROVE.

---

## Phase 4: Synthesis & Verdict

### 4a. Cross-Reference

- **Consensus** (multiple agents flag the same issue) → high confidence.
- **Unique** (one agent caught it) → verify importance.
- **Conflict** (agents disagree) → present both sides.

### 4b. Overall Score

Weighted average (1-10):

| Agent | Weight | Reason |
|---|---|---|
| logic-reviewer | 1.3 | Logic bugs hardest to catch later |
| arch-reviewer | 1.2 | Architecture costly to fix |
| security-reviewer | 1.2 | Security bugs critical |
| type-reviewer | 1.0 | Type safety baseline |
| test-reviewer | 0.8 | Tests can be added later |
| backend-reviewer | 0.8 | Service patterns |
| frontend-reviewer | 0.8 | UI patterns |
| task-reviewer | 0.7 | Task completion |

### 4c. Final Verdict

| Condition | Verdict |
|---|---|
| All APPROVE + completion ≥ 80% | **APPROVE** |
| Majority APPROVE, some APPROVE_WITH_FIXES | **APPROVE_WITH_FIXES** |
| Any REQUEST_CHANGES | **REQUEST_CHANGES** |
| Any REJECT or completion < 50% | **REJECT** |

### 4d. Final Report

```markdown
# Audit Report: {target}

**Panel**: {agents used with skills}
**Files reviewed**: N files, ~M LOC
**Date**: YYYY-MM-DD
**Original Task**: {ref}

## Overall Score: X.X/10
## Task Completion: X/Y (Z%)
## Verdict: {APPROVE | APPROVE_WITH_FIXES | REQUEST_CHANGES | REJECT}

---

### Task Completion Matrix
| # | Task | Status | Details |

### Consensus Issues (2+ agents agree)
| # | Severity | Issue | Agents | File:Line |

### Unique Findings
| # | Agent | Severity | Issue | File:Line |

### Debate (agents disagree)
| Issue | For | Against | Recommendation |

### Positive Highlights
- top 5 things done well

### Action Plan (priority order)
1. [CRITICAL] ...
2. [WARNING] ...
3. [NICE-TO-HAVE] ...
```

### 4e. Ask the User

```
Options:
1. ✅ Apply ALL fixes (critical + warnings)
2. 🔧 Critical only
3. 📋 Walk through one by one
4. ❌ Reject — I'll do it myself
```

---

## Token Budget

- Max 6 agents per audit.
- Files — embed in the prompt (the agent should not re-read them).
- Large files (>500 lines) — only relevant sections / diff.
- Each prompt: ≤8000 tokens.
- Each response: ~1500–2500 tokens.

---

## Error Handling

| Symptom | Action |
|---|---|
| Agent crashed/timed out | Note in the report, don't block others |
| Empty scope | Ask the user |
| Scope > 30 files | Split or ask the user to narrow |
| All APPROVE, but type-check / build fails | Override to REQUEST_CHANGES |
| No RFC/TODO | Skip Phase 3, note in the report |

---

## Cleanup

After synthesis — shutdown teammates → `TeamDelete()` (Mode A) / just wait for
completion (Mode B). See cleanup checklist in [`team`](../team/SKILL.md).

---

## Related Skills

- [`team`](../team/SKILL.md) — foundation (Mode A/B, file ownership, cleanup).
- [`research`](../research/SKILL.md) — pre-audit research.
- [`sprint`](../sprint/SKILL.md) — audit usually follows a sprint.
- [`do`](../do/SKILL.md) — `sprint → audit` pipeline.
- [`rfc`](../rfc/SKILL.md) — update RFC after audit (Implementation Log + Insights).

## Anti-patterns

- **Fewer than 4 agents** — that's a point review, not an audit.
- **One agent with a giant "review everything" prompt** — domain focus is lost.
- **Score 8/10 without consensus issues** — suspicious, ask for cross-validation.
- **APPROVE at 50% completion** — violates the Phase 3 rule.
- **Files passed by reference instead of content** — agents re-read and burn tokens.

---

## Forgeplan integration

If the `forgeplan` CLI is on `$PATH`, this skill is **forgeplan-aware** — it recommends the right CLI calls but does not invoke them itself.

### After `/audit` completes

The audit produces severity-ranked findings (CRITICAL / HIGH / MEDIUM / LOW). Capture the verdict as Evidence:

```bash
forgeplan new evidence "<scope>: audit by N reviewers — X HIGH, Y MED resolved, Z LOW deferred"
forgeplan link EVID-MMM PRD-NNN --relation informs
# Add Structured Fields in the evidence body:
#   verdict: supports | weakens | refutes
#   congruence_level: 3      (CL3 same-context)
#   evidence_type: code_review
forgeplan score PRD-NNN            # R_eff updated
```

Without Evidence, an `/audit` pass disappears — `forgeplan score` won't reflect it, and `forgeplan health` may report blind spots on the audited artifact.

### Want this orchestrated for you?

Install [`forgeplan-workflow`](../../../../plugins/forgeplan-workflow/README.md) and use `/forge-audit` — it runs 6 parallel reviewers (logic, architecture, security, tests, performance, docs) and writes Evidence automatically.
