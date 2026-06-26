# 02 — Provenance (traceability + authorization)

Coverage (01) proves the DS is *complete* and *not bloated*. Provenance proves each covered element is
**authorized**: it traces to an **active** ForgePlan decision, and its tokens match the palette an ADR froze.
A component can be "covered" (a requirement exists) yet **unprovenanced** (the backing artifact is still
`draft`, or the tokens drifted from the ADR) — that is the failure this section catches.

## The provenance chain

CANVAS extends the project's provenance-first rule (every entity keeps its chain of references) to the DS:

```
requirement (PRD FR-NN)  →  decision (ADR-NNN)  →  DS component (snapshot node, Category/Variant)  →  evidence (EVID)
        what is needed         how it was decided        what exists in the .pen DS                    why we trust it
```

A DS component is **provenanced** when you can walk this chain backward from the snapshot node to an **active**
artifact and the artifact actually contains the decision the component embodies. A break anywhere in the chain
is a finding.

## Check 1 — every covered component traces to an ACTIVE artifact

For each `covered` row from the coverage matrix:

1. `forgeplan_get(id=<backing artifact>)` — read it yourself; do not trust the prompt's claim that "PRD-140
   requires this".
2. Confirm the artifact **status is `active`** (not `draft`, not `superseded`, not `deprecated`). A component
   backed only by a draft requirement is **not yet authorized** — the decision is not frozen.
3. Confirm the artifact body **actually contains** the decision the component embodies (grep the returned body
   for the capability/token/rule). A backing link with no matching content is a phantom — **BLOCKER**
   (`provenance gap: backing artifact does not actually record this decision`).

## Check 2 — token-decision provenance (the high-value check)

The DS tokens are the single source of truth for the whole Spread (React/Vue/Svelte/Angular/Solid wrap the
same tokens). If they drift from the recorded palette, every downstream framework inherits the drift. So:

1. Read the snapshot's token set — the `variables` block in the manifest the Designer exported (or a
   `get_variables` dump captured into the snapshot). You are a sub-agent: read the **snapshot**, never live
   Pencil.
2. Find the **palette decision** an ADR recorded (the ADR that fixed the `set_variables` values — names,
   roles, theme axes like `Mode:Light/Dark`, the warm-paper brand surface).
3. Compare **value-by-value and name-by-name**:
   - A token whose value differs from the ADR-frozen value → **BLOCKER** (`token drift: <name> = <snapshot>
     but ADR-NNN froze <value>`). The DS contradicts a frozen decision.
   - A token present in the snapshot but absent from the ADR → **CONCERNS** (un-decided token — propose it as
     a new palette entry, do not silently bless it).
   - A theme axis the ADR requires (e.g. dark mode) absent from the snapshot → **CONCERNS / BLOCKER** per
     whether the ADR makes it a MUST.

> Token provenance is where Norm-check earns its keep — it is the cheapest place to stop a fork of the
> single-source-of-truth before the tokens RFC freezes and the Coder builds against it.

## Check 3 — fixed rules (atomic layering, brand invariants)

Some ADRs fix *structural* rules, not values: an atomic-layering rule (atom-in-ATOMS), a "one distinct primary
CTA per screen" brand invariant, a "warm-paper, never pure-white surface" rule. For each such rule the scope
ADR records, confirm the snapshot honors it (the layout dump + manifest show the rule satisfied). A violation
of a *recorded* rule is a provenance finding here (a violation of an *unrecorded* build convention is
Guardian's job, not yours — do not double-report it).

## The traceability matrix (the EVID payload)

This is the artifact the C4 EVID exists to carry. One row per covered requirement:

| Requirement | Backing artifact (status) | DS component | Decision content present? | Token match | Verdict |
|---|---|---|---|---|---|
| `FR-12 status badge` | ADR-052 (**active**) | `Badge/Status` @ ATOMS | ✅ yes | ✅ palette match | PASS-eligible |
| `FR-09 surface color` | ADR-052 (**active**) | token `--surface` | ✅ yes | ❌ `#FFFFFF` vs frozen `#FAF6EE` | **BLOCKER** |
| `FR-20 dark mode` | PRD-140 (**draft**) | `Mode:Dark` axis | ⚠️ requirement not yet active | n/a | **CONCERNS** |

## Recording provenance in the EVID

In the C4 EVID body, place this matrix under a `## Traceability matrix` section, and the token comparison under
`## Token provenance`, **after** the `## Ground-truth verification` section (which pastes the literal
`forgeplan_get` excerpts + snapshot manifest reads that prove the rows). The matrix cells must cite real IDs and
observed values — they are the proof a guardian re-checks, not a summary.

## Anti-patterns

- **Trusting the coordinator's summary** that "everything traces to PRD-140" — `forgeplan_get` each backing
  artifact and read its body yourself.
- **Name-only matching** — a link to ADR-052 whose body never mentions the token is a phantom, not provenance.
- **Passing on a draft backer** — an `active` component backed by a `draft` requirement is unauthorized; the
  decision is not frozen. CONCERNS at best.
- **Re-reporting Guardian's build conventions** — token *naming* (`$--var` vs hex) is Audit (phase A); token
  *value vs the ADR palette* is Norm-check (here). Stay on your axis.

Back to [01 — Coverage](../01-coverage/_index.md) · up to [canvas-truth-map](../../SKILL.md).
