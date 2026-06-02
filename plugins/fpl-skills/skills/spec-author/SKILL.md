---
name: spec-author
description: Author a forgeplan SPEC in the spec-driven LIGHT pipeline (OpenSpec/SpecKit-style on the SPEC kind) — iterate until "ideal", then freeze for implementation. Produces a SPEC where `## Requirements` (`### Requirement` + `#### Scenario` GIVEN/WHEN/THEN) is the PRIMARY, frozen, reviewed oracle, plus `## Behavioral Contract` (pseudocode + invariants), `## Contracts`, and an OPTIONAL `## Conformance Vectors` block (pure algorithmic cores / multi-language conformance only). Self-validates via `forgeplan_validate` + `forgeplan_reason`, then hands to guardian; the per-language coder turns each frozen scenario into a test (TDD) and may NOT edit the scenarios. Use when shaping a feature or behaviour into a testable spec BEFORE any code. Triggers (EN/RU) — "author a spec", "write a SPEC", "spec-driven", "scenarios for this feature", "напиши спеку", "оформи поведение в спеку", "сценарии для фичи", "/spec-author". Not for: tactical one-line fixes (Row 5), non-behavioral docs, or the heavy conformance corpus as a default (it is optional — see ADR-008).
origin: forgeplan
---

# /spec-author — author a light-path SPEC (scenarios are the oracle)

Author a forgeplan **SPEC** in the spec-driven LIGHT pipeline. The behavioural **Scenarios** (GIVEN/WHEN/THEN) are the primary oracle: they are authored, reviewed, and **frozen before any code**, and the per-language implementer turns each scenario into a test (TDD red → green) **without editing the scenarios**. This is the "don't grade your own homework" discipline in its light form — no separate conformance corpus is needed for ordinary single-language work.

Foundation: **ADR-008** (spec-driven development on the SPEC kind is the pipeline spine; frozen-corpus conformance is an OPTIONAL gate). Parent: **PRD-072**. Template source: **NOTE-020**. Worked example: **SPEC-001** (semver-compare).

---

## When to use

- You are about to build a feature/behaviour and want the intent pinned + testable **before** code (smith Rows 1 greenfield, 3 feature).
- You want a language-neutral spec the project can implement on whatever language its stack ADR chose.
- You are reframing a vague PRD requirement into something a coder (or coding agent) can implement without inventing behaviour.

## When NOT to use

- Tactical one-line fixes (typo, link) — Row 5, just do it.
- Non-behavioural documentation (use a NOTE/RFC).
- "I need byte-identical output across languages" — that is the OPTIONAL heavy path; only add `## Conformance Vectors` when the behaviour is a pure algorithmic core OR you genuinely build it on 2+ languages (ADR-008). Most specs do not need it.

---

## The authoring loop (iterate until "ideal")

> **Profile scoping (important).** Steps 1–8 are executed by the **Profile A** spec-author agent (which may call `forgeplan_reason` / `forgeplan_validate` / `forgeplan_new`). The **Profile B** reviewer / guardian enters ONLY at Step 7 and exits after issuing its review EVID — it MUST NOT call `forgeplan_reason` or any forgeplan mutator (those are on Profile B's denylist). Do not read Steps 1–8 as a single agent's procedure.

```
1. forgeplan_new spec "<title>"                 → scaffold
2. Fill the skeleton (below): Requirements + Scenarios + Behavioral Contract + Contracts
3. forgeplan_reason <SPEC-ID>                    → ADI: surface hidden cases / hypotheses
4. forgeplan_validate <SPEC-ID>                  → schema + section completeness
5. Self-critique (the gates):
     - does EVERY ### Requirement have >=1 #### Scenario?
     - is every SemVer-/domain rule pinned by a SCENARIO (not only in pseudocode or vectors)?
     - are the scenarios observable (GIVEN/WHEN/THEN), not implementation talk?
     - are error/edge cases covered?
6. Revise → repeat 3-5 until validate is clean AND every requirement maps to a scenario
7. Profile B adversarial review (guardian / artifact-reviewer) — >=1 finding
8. forgeplan_activate <SPEC-ID>                  → FREEZE. From here scenarios are read-only.
```

The loop is what "the spec is iterated until ideal" means — it is OpenSpec's `validate --strict` discipline expressed through `forgeplan_validate` + a self-critique pass. The single hard gate before freeze is: **every Requirement has a Scenario, and every behavioural rule is pinned by a Scenario** (so a scenarios-only implementer loses nothing).

---

## SPEC skeleton (copy into the new SPEC body)

```markdown
## Summary
<one sentence: what this SPEC specifies>

## Scope
- IN: <what this covers>
- OUT: <explicitly excluded — separate specs>

## Requirements
### Requirement: <name>
<normative statement — MUST / SHALL / SHOULD / MAY (RFC-2119)>
#### Scenario: <name>
- GIVEN <precondition / initial state>
- WHEN  <action>
- THEN  <observable result>
- AND   <additional observable result>
<!-- repeat Scenarios; EVERY Requirement MUST have >=1 Scenario — this is the oracle.
     EVERY behavioural rule must be pinned by a Scenario, not only by pseudocode/vectors. -->

## Behavioral Contract
### Signature
<language-neutral signature: inputs, output, errors, purity>
### Pseudocode
<precise step-by-step semantics — the durable home for SPARC Pseudocode>
### Invariants
- INV-1: <always-true property, language-neutral>

## Contracts
<API/data contracts: endpoints, request/response schemas, error codes (SpecKit-style); or a contracts/ reference>

## Conformance Vectors   <!-- OPTIONAL: pure algorithmic cores / multi-language conformance ONLY -->
<!-- fenced JSON: input -> expected vectors + invariants; freeze + sha256 hash-pin.
     Add ONLY when prose Scenarios are insufficient (a pure function with many edge cases)
     OR you build the same behaviour on 2+ languages and must prove identity.
     Worked example: SPEC-001; reference multi-language harness: sandbox-sdd-tdd/. -->

## Validation Rules
| Field | Rule | Error |

## Versioning
| Version | Date | Changes |

## Related
- PRD-<id>, ADR-<id>
```

---

## Implementation discipline (what happens after freeze)

The per-language coder:

1. reads the frozen SPEC (Scenarios + Behavioral Contract + Contracts);
2. turns **each `#### Scenario` into a failing test** (TDD red) — the scenarios are the test source;
3. implements until the tests are green;
4. runs hooks (test + lint + format).

**Hard rule:** the coder may NOT edit the scenarios to make a test pass. A scenario that is wrong is a **SPEC change** (`/supersede` with an ADDED/MODIFIED/REMOVED delta), never an inline build edit. This is what keeps "passes its tests" meaningful (the oracle is fixed before generation, external to the implementer).

---

## When to add `## Conformance Vectors` (the optional layer)

Add the optional block ONLY when one of these holds (per ADR-008):

- the behaviour is a **pure algorithmic core** (parser, comparator, formatter, validator) with many edge cases where machine-checkable `input → expected` vectors beat prose;
- you implement the **same behaviour on 2+ languages** and must prove identical behaviour (then also add the cross-language equivalence gate — reference harness in `sandbox-sdd-tdd/`).

Otherwise omit it — the prose Scenarios are the spec. Filing the heavy add-on as a first-class plugin feature is tracked in `ForgePlan/marketplace#129`.

---

## Related

- **ADR-008** — spec-driven spine; corpus optional (the decision this skill implements).
- **PRD-072** — the spec-driven pipeline PRD.
- **NOTE-020** — the SPEC authoring template (this skill embeds its skeleton).
- **SPEC-001** — worked example (semver-compare): Requirements/Scenarios primary + optional Conformance Vectors (justified — it is a pure core).
- **`/supersede`** — for changing a frozen SPEC (delta-spec discipline, S12).
- **`/methodology-check <id>`** — pre-activation 4-layer coverage check.
