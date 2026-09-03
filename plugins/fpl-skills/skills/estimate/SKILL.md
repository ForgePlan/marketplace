---
name: estimate
description: |
  Estimates effort and risk for a named artifact at the `estimate` stage of the canonical pipeline:
  runs forgeplan estimate for per-item complexity and hours by grade, reports the confidence figure
  with the reasons behind it, and pairs the number with a current R_eff snapshot so the estimate is
  read alongside how much is actually known. Read-only — writes nothing, never activates. Says
  plainly when an artifact has no estimable items rather than inventing a figure.

  Triggers: "estimate this", "/estimate", "how long will this take", "effort estimate",
  "estimate the work", "what is this worth in hours", "оцени объём", "сколько это займёт",
  "оценка трудозатрат", "прикинь сроки", "estimate stage"
---

# estimate — the `estimate` stage

Between `design` and `gate`. Answers *how much work is this, and how much do we actually know*.

Until this skill shipped the stage was `primary: "inline"` in the dispatch matrix — a sentinel
meaning "the orchestrator writes a couple of lines" (marketplace#233). `forgeplan estimate` existed
and nothing on the pipeline path called it.

**Read-only.** Produces a report. Writes no artifact, mutates nothing.

---

## Process

### Step 1 — Estimate

```bash
forgeplan estimate <ARTIFACT-ID> --json
```

The payload sits under `result`:

| Field | What it is |
|---|---|
| `items[]` | per-FR `complexity` — a **label** (`Simple` / `Medium` / `Complex` / `Hard`), plus `score` (10 / 24 / 65 / 168), `task_type`, and `hours{junior,middle,senior,principal,ai}` |
| `totals` | the same five grades summed |
| `total_score` | complexity points |
| `confidence` | 0–1 |
| `confidence_reasons[]` | **why** — e.g. `has 16 FR items (+30%)`, `no RFC phases`, `has calibration evidence (+20%)` |
| `hints[]` | actionable ways to raise it, with the command |

**The Fibonacci number is not in the JSON.** The text table shows it under `Cmpl` (3 / 5 / 8) and
`--complexity FR-003=5` is written in it, but the JSON gives the label and `score` instead — so an
override is written in a scale the payload you just read never printed. Run the plain (non-`--json`)
form when you need the number the flag expects.

**Report `confidence_reasons` every time, not just the number.** "Confidence 60%" is not
actionable; "60% — no RFC phases" names the missing thing and `hints[]` gives the command that
fixes it.

### Step 2 — Pair the estimate with what is known

```bash
forgeplan score <ARTIFACT-ID> --json     # r_eff, fgr{grade}, r_eff_ci{evidence_count,low,high}
```

`score` does **not** wrap its payload in `result` — `estimate` does. Reading `["result"]` on a
score response raises `KeyError`, which is a two-minute detour every time.

An estimate on an artifact with no evidence is a guess with a decimal point. Report both side by
side so the reader sees the number and its footing at once.

### Step 3 — Pick a grade, or say you did not

`--grade <junior|middle|senior|principal|ai>` fixes one; `--my-grade` uses the profile from
`.forgeplan/config.yaml`. With neither, all five columns come back — report the range and name it
as a range, do not silently pick one.

`--complexity FR-001=5,FR-002=3` overrides individual items when the heuristic is visibly wrong.
Say in the report that an override was applied and why; an adjusted estimate that looks like a
computed one is worse than no estimate. `--llm-score` swaps the rule-based heuristic for an LLM
pass — it needs a configured provider and costs a call, so it is opt-in and belongs in the report
when used: two runs of the same artifact are not comparable across that switch.

### Step 3.5 — Check the items are work

The parser reads FR tables **and** phase-like lists, and it does not ask what the list means.
Measured 2026-09-03: `forgeplan estimate NOTE-013` returned 3 complexity points and 16 junior-hours
per row for a *deferred-items tracker* — it costed the tracking rows as if they were tasks.

Read the item table before reporting the total. If the rows are not work — checklist entries,
tracker rows, a glossary — say so and drop the number. A total is only as real as the items under
it.

### Step 4 — When there is nothing to estimate

```
  No estimable items found in EVID-228.
  ! No estimable work items found
    -> Add FR table to PRD or Phase checklist to RFC
```

Report exactly that and stop. **Do not produce a number.** An artifact with no FR table has not been
specified enough to estimate, and the fix is in the hint — this is a finding about the artifact, not
a failure of the tool.

---

## Report

```
estimate PRD-024 — Full SDLC Pipeline with Quality Gates

  16 items, 979 complexity points
  junior 366h · middle 275h · senior 183h · principal 128h · ai 66h

  confidence 60%
    + has 16 FR items (+30%)
    + has calibration evidence (+20%)
    − no RFC phases                    → forgeplan new rfc "<title>"   (+25%)

  footing: R_eff 0.30 · grade B · CI 0.37-0.63
  heaviest: FR-003 · FR-004 · FR-005 — Hard, 168 pts each
```

Name the heaviest items. A total tells you the size; the three biggest tell you where the risk is
and what to decompose next.

Measured 2026-09-03 against PRD-024. The estimate figures are deterministic and reproduce; the
footing line is a live-graph reading and moves — the linked-evidence count changed twice while this
skill was being reviewed, which is why it is not in the example.

---

## What this does not do

- **It does not judge whether the estimate is right.** The complexity heuristic reads FR text. An
  FR that says "integrate with the payment provider" scores like any other five-word requirement.
- **It does not gate.** `/gate-check` is the gate; this feeds it a number and moves on. An estimate
  is never a reason to block.
- **It does not write the estimate anywhere.** Nothing in forgeplan stores it. If the figure needs
  to survive the session, the orchestrator records it — in the artifact body or an EVID, not here.

## Neighbours

| Skill | Question |
|---|---|
| `/estimate` | how much work, and how well founded? |
| `/gate-check` | may this move to the next stage? |
| `/methodology-check` | which pipeline layers are covered? |

Reference: PRD-024 (`estimate` stage), RFC-002, marketplace#233.
