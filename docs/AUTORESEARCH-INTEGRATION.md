[English](AUTORESEARCH-INTEGRATION.md) | [Русский](AUTORESEARCH-INTEGRATION-RU.md)

# Autoresearch ↔ ForgePlan integration

How to combine [`autoresearch`](https://github.com/uditgoenka/autoresearch) (the iterative goal-loop plugin by Udit Goenka, based on [Karpathy's autoresearch](https://github.com/karpathy/autoresearch)) with the ForgePlan workflow.

> **TL;DR**: ForgePlan handles **traceable artifact lifecycle** (PRD/RFC/ADR with R_eff scoring). Autoresearch handles **mechanical-metric-driven iteration** (Modify → Verify → Keep/Discard → Repeat). They compose naturally — autoresearch runs the loop, forgeplan stores what was learned as Evidence.

---

## What autoresearch is

A Claude Code (and OpenCode / Codex) skill plugin that turns any task with a **measurable metric** into a goal-directed loop:

```
Set GOAL → loop:
  Modify code → run verify → measure metric →
    if better: keep, commit
    if worse: discard, try alternative
  Stop when goal reached or budget exhausted
```

Five commands (v2.0.03):

| Command | Purpose |
|---|---|
| `/autoresearch:plan` | Analyse codebase, suggest metrics, dry-run verify command before launching |
| `/autoresearch:debug` | Iterative bug-fix loop with metric (test pass rate, perf number, etc.) |
| `/autoresearch:security` | Read-only security audit (with optional `--fix` for confirmed Critical/High) |
| `/autoresearch:predict` | One-shot 5-expert debate analysing existing code |
| `/autoresearch:reason` | Iterative refinement loop — competing candidates, critique, synthesis, blind-judging until convergence |

**Install** (separate from this marketplace):
```
/plugin marketplace add uditgoenka/autoresearch
/plugin install autoresearch@uditgoenka-autoresearch
```

---

## Why combine with ForgePlan

Autoresearch and ForgePlan optimise different things:

| | Autoresearch | ForgePlan |
|---|---|---|
| Optimises | Mechanical metric (test pass, perf number, security findings) | Traceability + decision provenance (PRD/ADR/Evidence with R_eff) |
| Loop | Modify → Verify → Keep/Discard | Route → Shape → Build → Evidence → Activate |
| What it produces | Improved code matching the metric | Artifact graph + scored decisions |
| What it does NOT capture | Why the change was made (intent, alternatives) | The thousand small experiments that produced the change |
| Reversibility | git history per iteration | Lifecycle states with valid_until |

Combined: autoresearch produces the **measured improvement**, forgeplan captures the **decision trail** + **scoring**.

---

## Three integration patterns

### Pattern A — Autoresearch as the Build phase of `/forge-cycle`

When `/forge-cycle` reaches Step 5 (Build) and the task has a clear mechanical metric (test pass rate, p95 latency, bundle size), delegate to `/autoresearch:plan` instead of `/sprint`:

```
/forge-cycle "reduce checkout p95 latency below 200ms"
  → Step 1: forgeplan health
  → Step 2: task confirmed
  → Step 3: route → Standard depth
  → Step 4: shape → PRD-NNN with success criterion "p95 < 200ms"
  → Step 5: BUILD → /autoresearch:plan "reduce p95 latency below 200ms"
                  (loop runs unattended, commits per iteration)
  → Step 6: audit
  → Step 7: forgeplan new evidence with the final p95 measurement
            verdict: supports
            congruence_level: 3
            evidence_type: measurement
  → Step 8: activate PRD-NNN if R_eff > 0
```

The PRD's success criterion becomes the autoresearch metric. The loop's final state becomes Evidence with high CL3 confidence (it's a direct measurement).

### Pattern B — Autoresearch on its own → Evidence into ForgePlan

For ad-hoc improvements you don't want a full PRD for, run autoresearch standalone and capture the outcome as a Note + Evidence:

```bash
# Run the loop
/autoresearch:debug "fix flaky test in test/auth.spec.ts"
# When done, capture in forgeplan:
forgeplan new note "fixed flaky auth test — root cause: race in token mock"
forgeplan new evidence "/autoresearch:debug 47 iterations; final pass rate 100/100; commit sha=abc123"
forgeplan link EVID-NNN NOTE-MMM
```

Lightweight — no PRD, no activation gate. Just a paper trail showing what the loop achieved.

### Pattern C — Autoresearch for security audit → Evidence

`/autoresearch:security` is read-only by default and produces a structured findings report. That's directly a candidate for Evidence:

```bash
/autoresearch:security
# After the report:
forgeplan new evidence "<scope>: autoresearch:security audit — 2 HIGH, 4 MED findings; 1 HIGH auto-fixed via --fix"
# Link to the relevant security PRD or ADR:
forgeplan link EVID-NNN ADR-MMM --relation informs
```

If you ran with `--fix` and applied auto-remediation — the changeset itself can be a separate Evidence (verdict: supports, evidence_type: code_review).

---

## Brownfield extraction with autoresearch

The [`forgeplan-brownfield-pack`](../plugins/forgeplan-brownfield-pack/README.md) skills can use autoresearch primitives as their loop engine:

| Brownfield skill | Autoresearch command | Mode |
|---|---|---|
| `intent-inferrer` (C3) | `/autoresearch:reason` | iterative refinement of competing hypotheses (matches ADI deduction → induction) |
| `hypothesis-triangulator` (C6) | `/autoresearch:predict` | 5-expert debate to triangulate which hypothesis survives evidence |
| `canonical-reproducer` (C10) | `/autoresearch:debug` | iterate until reproduction matches reality (metric: behavioural equivalence) |
| `reproducibility-validator` (C11) | autoresearch verify command | runs as the validation layer for C10 |

The brownfield pack ships a recipe at [`integration/autoresearch-hooks.md`](../plugins/forgeplan-brownfield-pack/integration/autoresearch-hooks.md) showing how each of the 12 extraction skills can plug into autoresearch v2.0.03 commands.

---

## Setup

```bash
# 1. Install autoresearch (separate marketplace)
/plugin marketplace add uditgoenka/autoresearch
/plugin install autoresearch@uditgoenka-autoresearch
/reload-plugins

# 2. ForgePlan side (if not already done)
/plugin install fpl-skills@ForgePlan-marketplace
/plugin install forgeplan-workflow@ForgePlan-marketplace
/reload-plugins

# 3. Verify
/autoresearch:plan --help    # autoresearch
forgeplan --version          # forgeplan CLI
```

---

## Decision matrix — which loop to use when

| Situation | Use |
|---|---|
| Task has a clear mechanical metric (perf, test rate, bundle size, security findings) | `/autoresearch:plan` (or skip straight to `:debug`/`:security`) |
| Task needs reasoning between alternatives without an objective metric | `/autoresearch:reason` (iterative refinement with blind judging) |
| One-shot analysis for a decision you'll make yourself | `/autoresearch:predict` (5-expert debate, no loop) |
| Task has multiple constraints + needs traceability | `/forge-cycle` (artifact lifecycle), with autoresearch in Build phase if metric exists |
| Pure feature implementation (no metric) | `/sprint` or `/forge-cycle`, no autoresearch needed |
| Brownfield extraction (intent inference, hypothesis triangulation) | `forgeplan-brownfield-pack` skills delegating to autoresearch |

---

## Anti-patterns

- ❌ **Running autoresearch without a metric.** The whole engine relies on `Modify → Verify` where Verify outputs a number. No metric = no signal = the loop wanders.
- ❌ **Capturing autoresearch results as a single Evidence with no CL.** Tag with `congruence_level: 3` (CL3 same-context) and `evidence_type: measurement` so R_eff scoring works.
- ❌ **Using autoresearch for tasks that need creative judgment** (UX decisions, naming, prioritisation). Use `/refine` or `/fpf-evaluate` instead.
- ❌ **Forgetting to commit before the loop.** Autoresearch commits per iteration but the **starting state** should also be in git so rollback works cleanly.
- ❌ **Running autoresearch in parallel with `/sprint` on the same files.** They'll fight over the same code. Pick one per task.

---

## See also

- Autoresearch repo — [github.com/uditgoenka/autoresearch](https://github.com/uditgoenka/autoresearch) (v2.0.03)
- Karpathy's original — [github.com/karpathy/autoresearch](https://github.com/karpathy/autoresearch)
- [METHODOLOGIES.md](METHODOLOGIES.md) — autoresearch listed as recommended companion
- [PLAYBOOK.md](PLAYBOOK.md) — use-case "metric-driven iteration"
- [`plugins/forgeplan-brownfield-pack/integration/autoresearch-hooks.md`](../plugins/forgeplan-brownfield-pack/integration/autoresearch-hooks.md) — per-skill mapping for the 12 brownfield skills
