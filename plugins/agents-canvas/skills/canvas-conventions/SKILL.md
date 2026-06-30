---
name: canvas-conventions
description: "CANVAS DS-build conventions knowledge base — the rule set the canvas-guardian audits a Pencil Design System against (HOW it was built, not whether it matches requirements). Single-source refs/slots/no-detach, $--token usage + Category/Variant naming, atomic layering + screens-not-reusable, and snapshot-layout health (clipping/spacing). Use when auditing a DS snapshot, running /canvas-audit, or learning a single DS convention. Triggers on: ds audit, design system conventions, canvas guardian, ref vs detach, reusable component, token usage, atomic layering, screens not reusable, clipping, height-aware spacing, snapshot_layout, Category/Variant naming, проверь дизайн-систему, конвенции DS, аудит дизайн-системы."
---

# CANVAS Conventions — DS-build Rule Knowledge Base

The rule set the **`canvas-guardian`** (CANVAS phase **A — Audit**) checks a Pencil **Design System
snapshot** against. It audits **how the DS was built** — single-source refs, slots, token usage,
naming, atomic layering, anti-patterns, layout health — **not** whether the DS satisfies the ForgePlan
requirements (that is `canvas-tester` / phase **N — Norm-check**, KB `canvas-truth-map`).

The Guardian is the **DS-build conscience**: it reads the **exported DS snapshot** (manifest JSON +
reference screenshots + `snapshot_layout` dump), never live Pencil — a fresh sub-agent context is the
real independence (generator != verifier, ADR-009). It emits a **C4 EVID** with a PASS/FAIL verdict.

Rules are distilled from the design-suite-methodology spec section 2.3 (`canvas-guardian` responsibilities)
and the `DS-ORGANIZATION-GUIDE` (grid / spacing / naming / theming conventions).

## How to use (agentic RAG)

This skill is **agentic RAG** — load only the section relevant to the finding you are chasing. Each
section `_index.md` is a **self-contained rule page** (no per-rule leaf files): rule ID, what it checks,
how to detect it in the snapshot, severity, and the canonical fix.

### Step 1 — pick the section by the concern

| Concern in the snapshot | Section |
|---|---|
| A primitive rebuilt from raw frames instead of `ref`'d; a detached instance; a duplicate Component; a `reusable:true` used once | [01-single-source](sections/01-single-source/_index.md) |
| A literal `#RRGGBB`/`rgb()`/magic px instead of `$--var`; a theme axis missing a value; a name that is not `Category/Variant` | [02-tokens-naming](sections/02-tokens-naming/_index.md) |
| An atom outside the ATOMS zone; a **screen** marked `reusable:true`; an atom that refs an organism; nesting too deep; a cross-file ref | [03-atomic-layering](sections/03-atomic-layering/_index.md) |
| `fully clipped` / `partially clipped` in the layout dump; overlapping boxes; off-grid columns; non-canonical gaps; a component beyond the DS Frame | [04-layout-health](sections/04-layout-health/_index.md) |

### Step 2 — read the section, map each finding to a rule ID

Open the section `_index.md`, find the matching rule, and record the finding as
`<RULE-ID> · <Severity> · node-id <id> · <one-line fix>`.

### Step 3 — bucket and emit

Bucket findings into **Critical / Warning / Suggestion** (legend below), compute the verdict
(any open Critical -> FAIL), and emit the C4 EVID (shape below). For a one-shot run use `/canvas-audit`.

## Section INDEX

| # | Section | Rules | Audits |
|---|---|:---:|---|
| 01 | [single-source](sections/01-single-source/_index.md) | SS-1..8 | Refs vs rebuild/detach, slots, duplicate Components, reuse threshold, reuse/extend-variant/new tree (SS-7), cousin-duplicate (SS-8) |
| 02 | [tokens-naming](sections/02-tokens-naming/_index.md) | TN-1..6 | `$--var` usage vs hardcoded values, theme axes, `Category/Variant` naming |
| 03 | [atomic-layering](sections/03-atomic-layering/_index.md) | AL-1..6 | Atom-in-ATOMS placement, screens-not-reusable, composition direction, depth, cross-file refs |
| 04 | [layout-health](sections/04-layout-health/_index.md) | LH-1..6 | Clipping, height-aware spacing, canonical gaps, grid alignment, frame fit |

## Quick reference — the full rule catalog

| Rule | Section | Default severity | One-liner |
|---|---|---|---|
| **SS-1** | single-source | Warning | A `reusable:true` Component is referenced >= 2 times (one use = de-componentize or it is a screen) |
| **SS-2** | single-source | Critical | Instances are `type:"ref"` to a base, never hand-rebuilt frames duplicating a Component |
| **SS-3** | single-source | Critical | Variation is done via `descendants`/`slot` overrides, never by detaching the instance |
| **SS-4** | single-source | Critical | No detach for a minor edit (label/icon/color) — use a `descendants` override |
| **SS-5** | single-source | Warning | No two base Components with identical structure/name (no duplicate refs) |
| **SS-6** | single-source | Warning | Containers that receive variable content expose `slot: []`, not hardcoded children |
| **TN-1** | tokens-naming | Critical | Colors/spacing/typography reference `$--var`, never literal `#hex`/`rgb()`/magic px |
| **TN-2** | tokens-naming | Warning | Every brand color/spacing/font in use has a backing variable in `get_variables` |
| **TN-3** | tokens-naming | Warning | Each themed variable has a value per theme axis (Mode: Light/Dark) |
| **TN-4** | tokens-naming | Warning | Component names follow `Category/Variant` (or `/Size/` , `/State`) |
| **TN-5** | tokens-naming | Suggestion | Variant + state ordering is canonical (Default -> Secondary -> Destructive -> Outline -> Ghost) |
| **TN-6** | tokens-naming | Suggestion | Section headers are uppercase, `$--muted-foreground`, weight 600, letterSpacing 2 |
| **AL-1** | atomic-layering | Warning | A component sits in its correct atomic zone (atom under ATOMS, molecule under MOLECULES, ...) |
| **AL-2** | atomic-layering | Critical | Screen/page frames are NOT `reusable:true` |
| **AL-3** | atomic-layering | Critical | Composition flows up only: molecules ref atoms, organisms ref molecules/atoms — never the reverse |
| **AL-4** | atomic-layering | Warning | Ref/descendant nesting depth is bounded (<= ~10) |
| **AL-5** | atomic-layering | Critical | Every `ref` resolves within the same `.pen` file — no cross-file refs |
| **AL-6** | atomic-layering | Suggestion | Each declared atomic zone has a section header + its core categories |
| **LH-1** | layout-health | Critical | `snapshot_layout(problemsOnly:true)` returns no `fully clipped` / `partially clipped` |
| **LH-2** | layout-health | Critical | Vertical placement follows `nextY = prevY + prevHeight + gap` — no overlap |
| **LH-3** | layout-health | Warning | Canonical gaps: variant 80 / component 160 / category 320 / section 600 |
| **LH-4** | layout-health | Warning | DS Frame is tall/wide enough — no component spills past frame bounds |
| **LH-5** | layout-health | Suggestion | Columns align to canonical X bands (200 / 600 / 1100 / 1700 / 2400 / 3100) |
| **LH-6** | layout-health | Warning | The snapshot includes a clean `problemsOnly` dump (the Designer ran the verify loop) |

## What the Guardian reads (snapshot inputs)

The Designer's final step exports a **DS snapshot** to `design/snapshots/<ts>/` (spec section 2.2 / LOCKED
DECISION 6). The Guardian audits that frozen directory, not live Pencil:

- **manifest** — `export_nodes` JSON: node ids, `type` (`frame`/`ref`/`text`/...), `ref` targets,
  `reusable`, `name`, `descendants`, `slot`, `fill`/`stroke` values, x/y/width/height.
- **reference screenshots** — `get_screenshot` per zone/component (the visual oracle).
- **layout dump** — `snapshot_layout` (full + `problemsOnly`) for clipping/overlap detection.
- **variables** — `get_variables` for token/theme coverage (TN-2, TN-3).

If a needed field is absent from the manifest (export fidelity gap, spec Open Question 1), record it as a
**Warning: "snapshot incomplete — <field> not exported"**, never a silent PASS.

## What the Guardian emits (C4 EVID)

One EVIDENCE artifact per audit, created via `forgeplan_new(kind="evidence", parent_id=<scope>)` +
`forgeplan_update`. The body MUST contain:

- `## Findings` — Critical / Warning / Suggestion buckets; every finding carries `RULE-ID`, the
  **node-id**, and a concrete **fix**.
- `## Structured Fields` — `verdict` (`supports` on PASS / `weakens` on Warnings-only / `refutes` on
  Critical), `congruence_level: CL3` (same — internal audit of the target DS), `evidence_type:
  convention-audit`. Without this section the parser silently assigns CL0 and R_eff collapses to 0.1.
- `## Pinned revision` — the snapshot dir path + timestamp/revision the verdict is pinned to (so the
  PASS is anchored to an exact, frozen DS state).

Verdict rule: **any open Critical -> FAIL**; Warnings/Suggestions alone -> PASS with a remediation list.

## Severity legend

- **Critical** — breaks the single-source-of-truth or makes the DS unportable (a forked token, a detached
  instance, a `reusable:true` screen, a cross-file ref, real clipping/overlap). Blocks the gate.
- **Warning** — degrades maintainability or consistency (off-zone placement, missing theme value,
  non-canonical gap). Does not block, but is listed for remediation.
- **Suggestion** — polish (ordering, header styling, grid alignment).

## Related

- `canvas-guardian` agent — the read-only reviewer that loads this KB (`agents/canvas-guardian.md`).
- `/canvas-audit` — one-shot DS-convention audit (Guardian-as-command).
- `canvas-truth-map` — the **other** gate-A KB: DS <-> PRD/ADR/EVID coverage + provenance (phase N, the
  `canvas-tester`). This skill audits build quality; that one audits requirement coverage.
- `canvas-design` — the design-time KB the `canvas-designer` follows; this skill is its mirror-image
  auditor (every convention here corresponds to a rule the Designer is told to honor).
- `/canvas` — the methodology entry; ADR-010 (the contract); the `design-suite-methodology` blueprint.
