---
name: audit
description: Multi-expert audit of code, architecture, or a finished feature — at least 4 parallel reviewer agents, each with a specialization (logic, architecture/SOLID, typing, security; optionally tests, backend patterns, frontend, task-completion). Each runs its own checklist. Output is cross-validation, score, verdict, and action plan. On completion, **automatically writes an EvidencePack via forgeplan MCP** (`mcp__forgeplan__forgeplan_new` + `forgeplan_update` + `forgeplan_link`) so the audit lands in the artifact graph and R_eff reflects it — no manual step required (CLI fallback if MCP not connected). Use when the user wants a sharp second pair of eyes on code, a PR, a branch diff, or a sprint. Triggers (EN/RU) — "audit", "review", "проверь код", "ревью", "оцени качество", "всё ли правильно", "code audit", "expert review", "/audit".
origin: forgeplan
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

## Architecture (5 Phases)

| Phase | What it does |
|---|---|
| **1. Scope Analysis** | Identify what to review; find the original spec (RFC/TODO/issue); pick the panel |
| **2. Parallel Review** | Spawn 4–6 agents in parallel via TeamCreate |
| **3. Task Completion Check** | Compare "delivered vs. requested" |
| **4. Synthesis & Verdict** | Cross-validation, score, verdict, action plan |
| **5. Evidence Capture (MANDATORY)** | Auto-publish EVID via `mcp__forgeplan__forgeplan_new` + `forgeplan_link`; prompt for activation; CLI fallback if MCP missing |

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

## Phase 5: Evidence Capture (MANDATORY)

**Why this phase exists.** Without an EvidencePack, an `/audit` run disappears: `forgeplan score` won't reflect it, `forgeplan health` reports blind spots on the audited artifact, and the next session has no record the review happened. The skill — not the user — is responsible for closing the loop. Skipping this phase silently is a contract violation (PRD-077 FR-011).

### 5a. Detect target artifact(s)

From Phase 1 scope, extract any forgeplan IDs the audit covered:

| Source | How to extract |
|---|---|
| `/audit PRD-NNN` form | `ARTIFACT_IDS = ["PRD-NNN"]` (explicit) |
| Branch name `feat/prd-NNN-…` | Regex `(PRD|RFC|ADR|SPEC|EPIC|PROB)-\d+` against the branch |
| RFC/TODO reference found in Phase 1b | Use that ID |
| Commit body `Refs: PRD-NNN, RFC-MMM` | Parse `Refs:` lines from `git log` |
| **No artifact** (ad-hoc code audit, no spec) | `ARTIFACT_IDS = []` — handled in 5d |

### 5b. Probe MCP availability (one call)

```python
# True if forgeplan MCP server is wired in this session
have_mcp = "mcp__forgeplan__forgeplan_new" in available_tools
```

If `have_mcp` is unclear, attempt `mcp__forgeplan__forgeplan_health()`. Connection error → `have_mcp = False`, proceed to **5e fallback**, never silently skip.

### 5c. Map verdict → structured fields

| Final Verdict (from 4c) | `verdict:` field | Rationale |
|---|---|---|
| APPROVE | `supports` | Audit confirms the artifact is correct |
| APPROVE_WITH_FIXES | `supports` | Net positive — fixes are minor warnings |
| REQUEST_CHANGES | `weakens` | Significant gaps but not fundamental |
| REJECT | `refutes` | Audit refutes the implementation's claim of done |

Constants for every audit EVID:
- `congruence_level: 3` — `/audit` reads the actual code under review (CL3 same-context)
- `evidence_type: code_review`

### 5d. MCP-first flow (have_mcp = True)

```python
# 5d.1 — Create the EvidencePack (draft)
scope_label = "<panel-summary>"   # e.g. "PRD-077 backend feature" or "ad-hoc src/auth/"
crit_n  = len(consensus_critical + unique_critical)
high_n  = len(consensus_high  + unique_high)
defer_n = len([f for f in findings if f.deferred])

evid = mcp__forgeplan__forgeplan_new(
    kind="evidence",
    title=f"{scope_label}: audit — {n_reviewers} reviewers, "
          f"{crit_n} CRIT/HIGH closed, {defer_n} deferred"
)
EVID_ID = evid["id"]   # e.g. "EVID-142"

# 5d.2 — Fill the body (full Phase 4d report + Structured Fields)
body = textwrap.dedent(f"""\
## Structured Fields

verdict: {verdict_field}            # supports | weakens | refutes — see 5c
congruence_level: 3                 # CL3 — direct same-context code review
evidence_type: code_review

## Audit Summary

- **Panel**: {panel_with_subagent_types}
- **Files reviewed**: {n_files} files, ~{loc} LOC
- **Original task ref**: {rfc_todo_ref or "ad-hoc"}
- **Overall score**: {overall_score}/10
- **Task completion**: {done}/{total} ({pct}%)
- **Final verdict**: {final_verdict}

## Findings

{findings_table}                    # consensus + unique, severity-sorted

## Reproduction

For each finding:
- **File**: `{file}:{line}`
- **Reproduce**: `{command_or_test}`
- **Fix**: {one-line remediation}

## Pipeline Gate Results

```
{cargo_fmt_result}
{cargo_check_result}
{cargo_test_result}
{cargo_clippy_result}
```

## Recommendation

{key_recommendation}
""")

mcp__forgeplan__forgeplan_update(id=EVID_ID, body=body)

# 5d.3 — Link to every target artifact (informs relation)
for target in ARTIFACT_IDS:
    mcp__forgeplan__forgeplan_link(
        source=EVID_ID,
        target=target,
        relation="informs"
    )

# 5d.4 — Score parent artifacts (so user sees R_eff move immediately)
for target in ARTIFACT_IDS:
    mcp__forgeplan__forgeplan_score(id=target)
```

**If `ARTIFACT_IDS` is empty** (ad-hoc code audit, no spec found in 5a):
- Skip the `forgeplan_link` loop entirely.
- The EVID stands alone — still discoverable via `forgeplan list -k evidence` and `forgeplan search`.
- Add a `note:` line in the body: `note: ad-hoc audit — no parent artifact (no link emitted)`.
- Optional: also create a Note artifact (`forgeplan_new(kind="note", title="Ad-hoc audit of <scope>")`) and link the EVID to it, if the audit produced reusable lessons. Don't force this — let the user decide.

### 5e. Shell fallback (have_mcp = False)

Warn the user explicitly — **do NOT silently skip**:

```
⚠️  forgeplan MCP not connected — falling back to CLI.
   Run `/mcp` to verify, or `/fpl-init` to wire it up.
   Evidence capture is mandatory — copy/paste these commands now:

EVID_ID=$(forgeplan new evidence "<scope>: audit — <N> reviewers, <X> CRIT/HIGH closed, <Y> deferred" --json | jq -r '.id')
$EDITOR ".forgeplan/evidence/${EVID_ID}-"*.md   # fill Structured Fields + body
forgeplan link "$EVID_ID" <ARTIFACT-ID> --relation informs    # repeat per target
forgeplan score <ARTIFACT-ID>
forgeplan activate "$EVID_ID"
```

If `forgeplan` CLI is also missing → print the manual artifact path and contents the user must write, and surface this as a `WARN` in the final report.

### 5f. Activation prompt

```
EVID-{ID} drafted and linked to {", ".join(ARTIFACT_IDS) or "(no parent)"}.

Activate EVID-{ID} now? [y/N]
  y → mcp__forgeplan__forgeplan_activate(id="EVID-{ID}")  (or CLI: forgeplan activate EVID-{ID})
  N → keep as draft; activate later with:
      forgeplan activate EVID-{ID}
```

On `y`: call `mcp__forgeplan__forgeplan_activate(id=EVID_ID)`. If validation gate fails (missing structured fields, etc.), surface the error and keep the EVID in draft — don't retry silently. Relay any `_next_action` hint from the MCP response verbatim.

### 5g. Final user-facing output

Append to the bottom of the Phase 4d report so the user sees the EVID landed prominently:

```markdown
---

### 📎 Evidence Captured

- **EVID**: `EVID-{ID}` ({draft|active})
- **Verdict**: {supports|weakens|refutes} · CL3 · code_review
- **Linked to**: PRD-NNN, RFC-MMM   (or "ad-hoc — no parent")
- **R_eff impact**: see `forgeplan score PRD-NNN`
- **Tool path**: MCP (forgeplan_new + link + activate)   ← or "CLI fallback (MCP not connected)"
```

### 5h. Post-hoc / retroactive EVID (sibling pattern)

The auto-flow above covers work that just completed. For work **already done in a prior session** that never got an EVID (e.g. cross-worktree race fix shipped in v0.31.0 but unlinked) the skill cannot reconstruct the audit from scratch. Use this manual template once, then return to the auto-flow:

```python
# Post-hoc EVID for past work — manual, one-shot
evid = mcp__forgeplan__forgeplan_new(
    kind="evidence",
    title=f"{PROB_ID} retro: <fix summary> shipped <version>"
)
mcp__forgeplan__forgeplan_update(id=evid["id"], body=textwrap.dedent(f"""\
## Structured Fields

verdict: supports
congruence_level: 2          # CL2 — reconstructed from git log + commit refs, not live review
evidence_type: measurement   # or audit/test depending on what's being recorded

## Reconstruction Source

- **Commits**: {git_log_oneline_range}
- **Files touched**: {git_diff_stat_summary}
- **Tests added**: {test_paths}
- **Shipped in**: <version-or-tag>

## Why retro (not auto)

<one-line reason — e.g. "work predates FR-011 autopublish; PROB-067 closure
identified in 2026-05-13 audit retrospective">

## Outcome

<verdict + measured impact>
"""))
mcp__forgeplan__forgeplan_link(source=evid["id"], target=PROB_ID, relation="informs")
# Optionally: forgeplan_link to the merged PR commit SHA as a Note
mcp__forgeplan__forgeplan_activate(id=evid["id"])
```

Use CL2 (not CL3) for retro EVIDs — you reconstructed the evidence from `git log` and diffs, not from a live multi-reviewer audit. This is honest about the lower congruence and keeps `forgeplan score` calibrated.

**When this is the right tool**: closing a PROB whose fix shipped without an evidence link, recording a measurement that was taken but never persisted, or formalising an ADR's empirical outcome long after the decision.

**When this is NOT the right tool**: live audits (use Phase 5a-5g); future planning (use a Note); speculative claims without git/test backing (don't fabricate evidence).

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
- **Skipping Phase 5 ("I'll write the evidence later")** — violates the PRD-077 FR-011 contract. The skill MUST emit an EVID (MCP) or print the CLI fallback with a `WARN`. Never "silently succeed" without evidence.
- **Activating EVID with empty Structured Fields** — `congruence_level` defaults to CL0 (penalty 0.9), R_eff collapses to 0.1. Always fill `verdict:` + `congruence_level: 3` + `evidence_type: code_review` before activating.
- **Inventing a parent artifact ID just to have one to link** — if Phase 5a finds no real artifact, leave `ARTIFACT_IDS` empty and let the EVID stand alone. Fabricated links pollute the dependency graph.

---

## Forgeplan integration

This skill is **forgeplan-aware** and **forgeplan-active**: Phase 5 above is mandatory, not advisory. The skill itself calls `mcp__forgeplan__forgeplan_new` + `forgeplan_update` + `forgeplan_link` + (on user opt-in) `forgeplan_activate`. No `/audit` run ends without an EVID drafted (or, if neither MCP nor CLI are reachable, an explicit `WARN` and copy-paste recovery block).

### Anti-pattern: "I'll write the evidence later"

Historically `/audit` only *recommended* `forgeplan new evidence`. Users routinely forgot the step, blind spots accumulated, and `forgeplan health` reported `unhealthy` on artifacts that had in fact been reviewed. PRD-077 FR-011 closed this gap by making EVID emission part of the skill flow, not a follow-up checklist item. **Do not "save it for later"** — by the next prompt, the audit context is gone.

### Companion skill

Install [`forgeplan-workflow`](../../../../plugins/forgeplan-workflow/README.md) and use `/forge-audit` for the artifact-scoped variant (claim slot + 6 reviewers including Performance & Documentation + identical evidence emission). `/audit` (this skill) is the general-purpose flavour; `/forge-audit` is `/audit` pre-bound to a forgeplan artifact ID with multi-agent claim/release wiring.
