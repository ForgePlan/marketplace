---
name: canvas-audit
description: One-shot DS-convention audit (canvas-guardian as a command). Loads the canvas-conventions rule set, reads an exported Pencil DS snapshot (manifest + reference screenshots + snapshot_layout dump), and reports Critical/Warning/Suggestion findings - each with a RULE-ID, a node-id, and a concrete fix. Audits build quality (refs/slots/tokens/naming/atomic-layering/clipping), not requirement coverage. Usage: /canvas-audit [snapshot-dir]
---

# /canvas-audit — one-shot Design-System convention audit

`/canvas-audit` runs the **canvas-guardian** audit on demand, outside the full CANVAS walk. It checks
**how a Pencil Design System was built** against the **canvas-conventions** rule set and prints a bucketed
findings report. Use it for a quick conscience-check of a DS snapshot, or to re-audit after a fix, without
spinning up the whole `/canvas` pipeline. It audits **build quality only** — requirement coverage (DS <->
PRD/ADR) is `/canvas-tester` territory (phase N), and generated `*.ts/*.css` is `/canvas-review` territory.

> **Read the snapshot, never the live `.pen`.** This audit operates on the **exported DS snapshot**
> (`design/snapshots/<ts>/` — manifest JSON + reference screenshots + `snapshot_layout` dumps + variables),
> produced as the canvas-designer's final step. Never `Read`/`Grep` a `.pen` file (encrypted — Pencil MCP
> only), and never open live Pencil here. A fresh read of the frozen snapshot is what makes the audit
> independent (generator != verifier, ADR-009).

## Step 1 — locate the DS snapshot

If a snapshot directory is given as the argument, use it. Otherwise discover the latest:

- Glob for `design/snapshots/*/` (or the path the coordinator recorded) and pick the most recent
  timestamped directory.
- Confirm it contains the expected artifacts: the `export_nodes` **manifest** JSON, one or more
  **reference screenshots**, the `snapshot_layout` **full** dump, and the `snapshot_layout(problemsOnly)`
  dump, plus the `get_variables` dump.
- If no snapshot exists, stop and tell the user to run the Capture phase first (`/canvas` -> Designer, or
  the Designer's export step). Do not attempt to open live Pencil.

## Step 2 — load the convention rule set

Load the **canvas-conventions** skill (the Guardian's rule KB). It is agentic-RAG: read the SKILL.md
nav-map, then the section `_index.md` pages relevant to what you find:

1. `sections/01-single-source/_index.md` — SS-1..6: reusable used >= 2x; instances are refs not rebuilt
   frames; variation via `descendants`/`slot` not detach; no detach-for-minor-edit; no duplicate
   Components; slots for injected content.
2. `sections/02-tokens-naming/_index.md` — TN-1..6: `$--var` not literal hex/rgb/magic-px; token coverage;
   theme-axis completeness (Mode Light/Dark); `Category/Variant` naming; canonical variant/state ordering;
   section-header styling.
3. `sections/03-atomic-layering/_index.md` — AL-1..6: atom-in-ATOMS placement; **screens NOT
   reusable:true**; composition flows up only; nesting depth <= ~10; **no cross-file refs**; zone
   completeness.
4. `sections/04-layout-health/_index.md` — LH-1..6: no `fully/partially clipped`; height-aware
   `nextY = prevY + prevHeight + gap` (no overlap); canonical gaps (80/160/320/600); frame fits content;
   grid alignment; verify-loop dump present.

## Step 3 — audit the snapshot against every rule

Walk the manifest + the `snapshot_layout` dumps and map every defect to a rule id. Re-derive each verdict
from the **frozen artifacts** themselves (re-count refs for SS-1, re-scan `fill`/`stroke` for TN-1
literals, re-read `problemsOnly` for LH-1) — never assume a PASS from a handoff summary. If a needed field
is missing from the export, record a **Warning: "snapshot incomplete — <field> not exported"**, never a
silent PASS. Apply the **Reviewer discipline (ADR-013)** Pre-Report Gate: record a finding only if it is a
real defect against a convention, locatable to a node-id, and not a house-style preference.

## Step 4 — emit the bucketed report

```
# CANVAS DS Audit

**Snapshot**: design/snapshots/<ts>/
**Manifest nodes**: <count>   **Components (reusable:true)**: <count>   **Variables**: <count>
**Verdict**: PASS | FAIL | CONCERNS        (any open Critical -> FAIL)
**Findings**: <critical> Critical / <warning> Warning / <suggestion> Suggestion

---

## Critical (must fix — blocks the gate)

### <RULE-ID> — <rule one-liner>
- **Node**: <node-id> (`<name>`)
- **Issue**: what specifically violates the rule and why it forks the single source of truth / breaks portability
- **Fix**: the concrete change (e.g. replace the rebuilt frame with `{ type:"ref", ref:"<BaseID>", descendants:{...} }`)

---

## Warning (should fix)

[same format]

---

## Suggestion (polish)

[same format]

---

## Summary by section
- **01 single-source**: <n> (SS-...)
- **02 tokens-naming**: <n> (TN-...)
- **03 atomic-layering**: <n> (AL-...)
- **04 layout-health**: <n> (LH-...)
```

Rules: bucket by severity (Critical / Warning / Suggestion per the legend in canvas-conventions); every
finding cites a **RULE-ID + node-id + a concrete fix**; group multiple hits of the same rule together; if
the snapshot is clean, say so as **CONCERNS-with-justification** (name what you checked and why no gap was
found — an honest zero is never a silent PASS, never a manufactured finding).

## Step 5 — record a C4 EVID when this is a gate run

- **Inside a CANVAS cycle (GATE A+N):** dispatch the **canvas-guardian** sub-agent (fresh context) to
  produce the formal **C4 EVID** with `## Findings`, `## Structured Fields` (verdict + `congruence_level:
  CL3` + `evidence_type: convention-audit`), and `## Pinned revision` of the snapshot. The command output
  above is the human-readable view; the EVID is the audit record the gate trusts.
- **Standalone quick check:** the report is enough. Offer to record an EVID if the user wants it pinned to
  a scope PRD/ADR; do not auto-create one.

Either way, never `forgeplan_activate` — activation is the orchestrator's user-gated step.

## HARD RULES

1. **Audit the snapshot, never live Pencil or the `.pen` file.** A fresh read of the frozen export is the
   independence guarantee; the `.pen` is encrypted (Pencil MCP only) and live editing breaks generator !=
   verifier.
2. **Build quality only.** Requirement coverage is `/canvas-tester` (phase N); generated code is
   `/canvas-review`. Do not fail a build-quality audit on a missing requirement — note it and hand it off.
3. **Every finding cites RULE-ID + node-id + fix.** No vague "the spacing feels off".
4. **No silent PASS.** A clean snapshot is CONCERNS-with-justification; an incomplete snapshot is a Warning
   ("snapshot incomplete"); never manufacture a finding to look thorough (Reviewer discipline, ADR-013).
5. **Never activate.** This command reports (and, in a gate run, records an EVID); the orchestrator
   activates.

## Related

- `canvas-guardian` agent — the sub-agent this command embodies (`agents/canvas-guardian.md`).
- `canvas-conventions` skill — the rule KB (`skills/canvas-conventions/SKILL.md`).
- `/canvas-review` — the post-export code + UX gate (generated `*.ts/*.css`, wraps `/laws-of-ux:ux-review`).
- `/canvas-rule [name]` — look up a single DS convention or UX law.
- `/canvas` — the full Capture -> Audit -> Norm-check -> Vectorize -> Assemble -> Spread walk; ADR-010 C4.
