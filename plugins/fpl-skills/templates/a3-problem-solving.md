# A3 Problem Solving Template (Toyota-style, one-sheet discipline)

> **One sheet is the method**: A3 forces the whole story — problem, analysis, countermeasures,
> follow-up — into one connected narrative. If it does not fit, the analysis is not done, not
> the sheet too small.
> Source pattern: Toyota A3 / Shook, "Managing to Learn".
> **Hard limit**: ≤300 lines. Padding an A3 defeats it.
> **Used in**: `tech-debt` context (smith row 11; ADR-024 wave 3 D7 — the artifact
> `sections/11-tech-debt.md` step 2 promises). Body of a NOTE (debt portfolio) or PROBLEM
> (single systemic debt item). Gated at close by `/gate-check <ID> --loop debt_close`.
> **7 sections, all MUST.** The Plan table and Follow-up rows are parseable — do not free-form them.

---

# A3: <debt cluster or problem — one sentence, factual>

| Field | Value |
|---|---|
| Status | Draft |
| Date | YYYY-MM-DD |
| Owner | <who carries this sheet — a person/agent, not a team name> |
| Scope | <module / package / boundary the sheet covers> |
| Linked artifacts | <PROBLEM-NNN / NOTE-NNN of the debt inventory; ADRs touched> |

## Background

<Why this matters NOW. What changed — a failed release, a slowed team, a measured trend.
2-4 sentences. "The code is ugly" is not a background; "onboarding a feature into module X
took 3× the estimate twice in a row" is.>

## Current state

<Facts with sources, not impressions. The debt inventory rows that belong to this sheet
(from `code-analyzer`'s NOTE: complexity hotspots, deprecated deps, TODO/FIXME density,
coverage gaps) — each with the number and where it was measured. A current state without
numbers cannot produce a measurable target.>

## Target state

<The condition, stated so its achievement is checkable: "module X buildable in isolation",
"zero deprecated deps in the lockfile", "hotspot Y under complexity threshold Z". One target
per line. Each target must be falsifiable against the Current state's own numbers.>

## Analysis

<The systemic-vs-local walk: 5 Whys per major item, or a Fishbone across categories
(process / tooling / architecture / knowledge). Name the ROOT, not the symptom — "tests are
slow" is a symptom; "the test suite boots the full app because module seams are missing" is
a root. Debt items sharing a root belong to ONE countermeasure below.>

## Countermeasures

<One row per root cause — what will change, structurally. Prefer the smallest change that
removes the root over the largest that removes symptoms. Where a countermeasure supersedes
an ADR, say so here: the supersede MUST carry a delta-spec (Sprint Z8 discipline — the
`debt_close` gate checks it).>

| # | Root cause | Countermeasure | Supersedes ADR? |
|---|---|---|---|
| 1 | <root> | <change> | <ADR-NNN or —> |

## Plan

<Parseable, owner and due per row — the `debt_close` gate reads structure, not prose.>

| # | Action | Owner | Due | Done? |
|---|---|---|---|---|
| 1 | <action> | <owner> | YYYY-MM-DD | no |

## Follow-up

<How we will know the countermeasures held — `**Kind**:` rows per the smith-family
convention (date FIRST; `date` kind only — event/metric rows surface as PENDING in the
scanners and are never forced, ADR-024 DD-8):>

- [ ] **Kind**: date — YYYY-MM-DD — <re-measure the Current-state number this sheet targeted; state the command> — <source: this A3 / PROBLEM-NNN> — last_checked YYYY-MM-DD

---

## How to use this template

1. Copy the body into the NOTE/PROBLEM created for the debt portfolio (smith row 11 step 2 —
   the orchestrator persists it; `research-analyst` is read-only and returns the synthesis).
2. Fill top-to-bottom — the order IS the reasoning; a Countermeasure written before the
   Analysis is a solution looking for a justification.
3. Close via `/gate-check <ID> --loop debt_close` — it checks the A3 is linked and any
   superseded ADRs carry delta-specs. It does not judge the analysis; `architect-reviewer`
   does (row 11 step 3).
