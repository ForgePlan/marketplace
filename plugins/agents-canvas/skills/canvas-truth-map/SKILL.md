---
name: canvas-truth-map
description: "Map a Pencil design system to the ForgePlan source of truth (PRD/ADR/EVID) — the CANVAS Norm-check (N) knowledge base. Use when validating a DS snapshot for coverage (does every required capability have a component, and does every component have a backing requirement) and provenance/traceability (does each component and token trace to an active decision, and do the snapshot tokens match the ADR palette). Produces a requirement->component->artifact traceability matrix + a C4 EVID. Triggers on: norm-check, design system coverage, DS to PRD traceability, requirement to component matrix, scope creep detection, token provenance, gap analysis, DS source of truth, canvas tester."
---

# canvas-truth-map — DS ↔ ForgePlan (PRD/ADR/EVID) mapping

This is the **CANVAS phase N (Norm-check)** knowledge base, used by `canvas-tester`. Where `canvas-conventions`
(Guardian / phase A) audits **how the DS was built** (refs, slots, tokens-naming, atomic layering —
*internal* consistency), this skill audits **whether the DS matches the external source of truth** — the
active ForgePlan PRD/ADR/EVID set. Two orthogonal axes; both gate the same DS snapshot in parallel.

The Norm-check answers two questions, and nothing else:

1. **Coverage** — is the DS *complete* (every required capability has a component) and *not bloated* (every
   component has a backing requirement)? → `sections/01-coverage/_index.md`
2. **Provenance** — is the DS *authorized* (every component + token traces to an **active** decision, and the
   snapshot tokens match the recorded ADR palette)? → `sections/02-provenance/_index.md`

## How to use (agentic RAG)

This skill is a navigation map. Load only the section the current check needs.

### Step 1 — pick the concern

| What you are checking | Section |
|---|---|
| A required capability/component in the scope PRD has **no** DS component (a **gap**) | [01-coverage](sections/01-coverage/_index.md) |
| A DS component has **no** backing requirement (**scope creep**) | [01-coverage](sections/01-coverage/_index.md) |
| Each DS component traces to an **active** PRD/ADR/EVID decision (not draft, not superseded) | [02-provenance](sections/02-provenance/_index.md) |
| The snapshot's tokens match the palette decision an ADR recorded via `set_variables` | [02-provenance](sections/02-provenance/_index.md) |
| Atomic-layering / brand-token rules an ADR fixed are honored by the snapshot | [02-provenance](sections/02-provenance/_index.md) |

### Step 2 — build the matrix, then emit the EVID

1. Read the section `_index.md` for the concern.
2. Enumerate **requirements** from the scope artifacts and **components** from the snapshot manifest (never
   from the coordinator's summary — read both ground truths yourself).
3. Build the **requirement → component → backing-artifact → verdict** traceability matrix.
4. Record it in a **C4 EVID** with `## Structured Fields` (bold-pattern — see the scoring reminder below).

## Section INDEX

| # | Section | Covers |
|---|---|---|
| 01 | [Coverage](sections/01-coverage/_index.md) | Bidirectional coverage: enumerate requirements + components, match them semantically, flag gaps (req without component) and scope creep (component without req), set the coverage verdict. |
| 02 | [Provenance](sections/02-provenance/_index.md) | Traceability + authorization: every component/token traces to an **active** artifact; snapshot tokens match the ADR palette; the requirement→component→artifact→verdict matrix; how to record it in the EVID. |

## Inputs / Outputs

- **Inputs:** the **DS snapshot directory** (`export_nodes` manifest JSON + reference screenshots +
  `snapshot_layout` dump) the Designer produced; the **active scope PRD/ADR/EVID set** (read via forgeplan
  READ tools, never assumed from the prompt).
- **Outputs:** a **traceability matrix** (requirement → component → backing artifact → verdict), a **coverage
  gap + scope-creep list**, a **token-provenance verdict**, and a **C4 EVID** carrying all of it. A binary
  **PASS / CONCERNS / BLOCKER** verdict.

## Relationship to canvas-guardian (Audit)

| Axis | Phase A — `canvas-guardian` (`canvas-conventions`) | Phase N — `canvas-tester` (this skill) |
|---|---|---|
| Question | *How* was the DS built? | Does the DS match the *source of truth*? |
| Reference | DS-build conventions (internal) | ForgePlan PRD/ADR/EVID (external) |
| Failure it catches | Detached instances, hardcoded hex, screen-as-reusable, clipping | Missing capability (gap), unbacked component (scope creep), token drift from the ADR palette |

Both read the **same** exported snapshot, both are read-only, both run **in parallel** as fresh-context
sub-agents (generator != verifier, ADR-009). A DS can pass Audit (built cleanly) yet fail Norm-check (built
the *wrong* thing) — and vice-versa. Neither subsumes the other.

## EVID + scoring reminders (load-bearing)

- The C4 EVID body MUST carry the **bold-pattern** Structured Fields, NOT YAML frontmatter — the scorer reads
  only `**Verdict**:`, `**Congruence level**:` (integer 0..3, not "high"), `**Evidence type**:`. YAML
  frontmatter with the same names is silently ignored and collapses R_eff to ~0.1.
- The traceability matrix is the *evidence*, not a summary — paste the actual requirement IDs, component
  Category/Variant names, and backing artifact IDs you observed, so a guardian can re-check them.

## Related

- `canvas-tester` agent — the phase-N reviewer that drives this skill (`agents/canvas-tester.md`).
- `canvas-conventions` — the sibling phase-A (Audit) KB; `canvas-guardian` drives it.
- `canvas` / `/canvas` — the methodology entry; `sections/02-gates/_index.md` defines the A+N parallel gate.
- `forgeplan-workflow:forgeplan-methodology` — R_eff, congruence levels, the lifecycle the EVID lands in.
- ADR-010 (the sub-cycle contract), ADR-009 (generator != verifier), the design-suite-methodology blueprint.
