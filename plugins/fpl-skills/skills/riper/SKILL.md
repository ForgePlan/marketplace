---
name: riper
description: RIPER methodology orchestrator — Research → Innovate → Plan → Execute → Review. Thin wrapper that walks a task through the five RIPER phases by delegating to existing fpl-skills (/research, /refine or /fpf-decompose, /rfc create, /sprint or /forge-cycle, /audit) with explicit phase tracking. Pairs with /forge-cycle for users who prefer RIPER terminology over forgeplan's native Route/Shape/Build/Evidence/Activate. Triggers (EN/RU) — "riper", "research innovate plan execute review", "/riper", "пройди riper", "RIPER цикл".
disable-model-invocation: true
allowed-tools: Read Write Edit Bash(test *) Bash(forgeplan *) Bash(command *) Bash(grep *) Bash(ls *)
---

# riper — RIPER methodology orchestrator

Walks a task through the five RIPER phases — **Research → Innovate → Plan → Execute → Review** — by delegating to the right existing fpl-skill at each phase, with explicit progress tracking. RIPER is not a separate engine; it's a vocabulary overlay on top of skills you already have.

> **Don't pick `/riper` over `/forge-cycle` unless you specifically want RIPER terminology.** Forgeplan's native lifecycle (Route → Shape → Build → Evidence → Activate) is mostly equivalent and is what `/forge-cycle` orchestrates. Use `/riper` when your team already speaks RIPER and switching vocabularies is friction.

---

## Phase mapping

| RIPER phase | Delegates to | Output |
|---|---|---|
| **R**esearch | [`/research <topic>`](../research/SKILL.md) | `research/reports/<topic>/REPORT.md` |
| **I**nnovate | [`/refine <plan>`](../refine/SKILL.md) OR [`/fpf-decompose`](../../../fpf/skills/fpf-knowledge/SKILL.md) OR [`/ddd-decompose`](../ddd-decompose/SKILL.md) (DDD-flavoured) | Draft PRD/RFC/ADR + decomposition map |
| **P**lan | [`/rfc create`](../rfc/SKILL.md) | RFC formalising the chosen approach |
| **E**xecute | [`/sprint`](../sprint/SKILL.md) OR [`/forge-cycle`](../../../forgeplan-workflow/) | Code + tests + Evidence |
| **R**eview | [`/audit`](../audit/SKILL.md) | Multi-expert findings, decision to ship or revise |

The skill **does not reimplement** any phase. It picks the right downstream skill, runs it, captures the artifact, and moves to the next phase.

---

## When to use

- Your team uses RIPER terminology and you want one orchestrator command that maps to it.
- You want explicit phase tracking visible during the run (a kind of progress bar across the cycle).
- User explicitly invokes `/riper` or asks "do this with RIPER", "пройди RIPER".

## When NOT to use

- You're fine with `/forge-cycle` — it does the same work in forgeplan's native phase names. `/riper` is a thin overlay; `/forge-cycle` is the canonical orchestrator.
- The task is single-phase (just code review, just research) — call that skill directly.
- The task is fully open-ended exploration — use `/research` standalone.

---

## Process

### 1. Orient

```bash
pwd
test -d .forgeplan && echo "forgeplan workspace" || echo "no forgeplan"
command -v forgeplan
ls ~/.claude/plugins/cache/marketplaces/ForgePlan-marketplace/plugins 2>/dev/null | grep -E 'forgeplan-workflow|fpf|fpl-skills'
```

If `forgeplan-workflow` is installed → Execute phase will use `/forge-cycle` (artifact-aware). Otherwise → `/sprint` standalone.

### 2. Plan + ask once

Show the user the planned phase chain before starting:

```
RIPER cycle plan for "<task>":

  R — Research      → /research "<topic>"
  I — Innovate      → /refine + /fpf-decompose
  P — Plan          → /rfc create
  E — Execute       → /forge-cycle (forgeplan-workflow detected)
                      OR /sprint (standalone)
  R — Review        → /audit (4 reviewers)

Estimated time: 30-90 min depending on task scope.
Stops on red lines (push to main, secrets, deploys).

Proceed? [y/n/skip-research/skip-innovate]
```

Allow user to skip phases they've already done. Common: skip Research if context is in chat already, skip Plan if RFC already exists.

### 3. Execute phase by phase

For each phase:

- **Announce**: `▶ Phase 1: Research — invoking /research <topic>`
- **Run** the delegated skill
- **Capture** the artifact path or forgeplan ID produced
- **Confirm** to user (1 line) before moving on: `✓ Research complete → research/reports/auth/REPORT.md. Continue to Innovate? [y/n]`

If user says no — stop, capture progress so far, exit cleanly. The skill is **resumable** — re-running picks up where it left off.

### 4. Track and report

Maintain a phase tracker in chat:

```
[██████████░░░░░░░░░░░░░░] 2/5 phases complete

  ✓ Research      research/reports/auth/REPORT.md
  ✓ Innovate      PRD-NNN, ADR-MMM
  ▶ Plan          (in progress: drafting RFC)
  ⏳ Execute       pending
  ⏳ Review        pending
```

### 5. Final report

After all 5 phases:

```
RIPER cycle complete for "<task>".

  R   Research    → research/reports/auth/REPORT.md
  I   Innovate    → PRD-042, ADR-019 (auth strategy decision)
  P   Plan        → RFC-031 (magic-link implementation)
  E   Execute     → 18 files changed, 47 tests added, all passing
  R   Review      → 9 findings: 2 HIGH (resolved), 5 MED, 2 LOW

Forgeplan artifacts created/updated:
  PRD-042 → active (R_eff = 0.85)
  ADR-019 → active
  RFC-031 → active
  EVID-027 → linked

Next: gh pr create (you do this; the skill stops here for safety).
```

---

## Forgeplan integration

When `forgeplan` CLI is on `$PATH`, each phase produces forgeplan artifacts that can be linked:

| Phase | Forgeplan artifacts |
|---|---|
| Research | (Optional) `forgeplan new note "research outcome"` linked to a future PRD |
| Innovate | `forgeplan new prd "<task>"` + `forgeplan new adr "<key decision>"` |
| Plan | `forgeplan new rfc "<approach>"` linked to PRD via `based_on` |
| Execute | `forgeplan new evidence "<task>: tests pass, smoke OK"` linked to PRD |
| Review | `forgeplan new evidence "<task>: audit findings — N HIGH resolved"` |

After all phases: `forgeplan link RFC PRD --relation based_on`, `forgeplan link EVID PRD`, `forgeplan score PRD`, `forgeplan activate PRD` (if R_eff > 0).

### Want this orchestrated for you?

`/forge-cycle` (in [`forgeplan-workflow`](../../../forgeplan-workflow/README.md)) does the same job with forgeplan's native phase names (Route → Shape → Build → Evidence → Activate). Functionally equivalent; choose based on which vocabulary your team prefers.

The two commands are interchangeable — running `/riper "<task>"` and `/forge-cycle "<task>"` on the same task produces the same forgeplan artifact graph (different phase **labels** in the progress output).

---

## Decision: `/riper` vs `/forge-cycle` vs `/autorun`

| Command | Phase names | When to pick |
|---|---|---|
| `/riper` | Research → Innovate → Plan → Execute → Review | Team uses RIPER terminology |
| `/forge-cycle` | Route → Shape → Build → Evidence → Activate | Default; forgeplan's native vocabulary |
| `/autorun` | Same as `/forge-cycle` (delegates to it) | Unattended overnight runs (no checkpoints) |

All three converge on the same forgeplan artifact graph. The difference is **vocabulary** + **interactivity** (checkpoints vs none).

---

## Anti-patterns

- ❌ **Reimplementing phase logic in this skill.** Always delegate. If `/research` doesn't do what you need — fix `/research`, don't reimplement it inside `/riper`.
- ❌ **Running both `/riper` and `/forge-cycle` on the same task.** They produce overlapping artifacts. Pick one.
- ❌ **Skipping Review at the end.** RIPER's loop closure is the Review phase. Without it, the loop is incomplete and the methodology contract isn't honoured.
- ❌ **Using RIPER vocabulary in commit messages or PRD bodies.** The artifacts go into forgeplan which uses native vocabulary. Translate at the artifact boundary.
- ❌ **Treating `/riper` as different from `/forge-cycle` in capability.** They're the same engine with different phase labels. Choose by vocabulary preference, not capability.

---

## Companion skills

- [`/forge-cycle`](../../../forgeplan-workflow/) — equivalent orchestrator with forgeplan's native phase names
- [`/autorun`](../autorun/SKILL.md) — unattended overnight variant
- [`/do`](../do/SKILL.md) — interactive variant of `/autorun`
- [`/research`](../research/SKILL.md), [`/refine`](../refine/SKILL.md), [`/rfc`](../rfc/SKILL.md), [`/sprint`](../sprint/SKILL.md), [`/audit`](../audit/SKILL.md) — phase-level skills called by `/riper`

For methodological context: see [`docs/METHODOLOGIES.md`](../../../../docs/METHODOLOGIES.md) — RIPER vs forgeplan's lifecycle.
