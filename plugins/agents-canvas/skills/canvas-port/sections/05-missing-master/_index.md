# 05 — Missing master (the no-fabrication loop)

When a scope-required component or variant has **no Pencil master** — or a master too incomplete to
port **1:1** — the porter does **not** invent a design. Fabricating a component the design system
never defined forks the single source of truth (the Pencil DS) the same way an inlined hex value forks
`tokens.json`. The porter tickets the gap and keeps going.

This loop is the porter's side of the methodology's generator≠verifier discipline (RFC-021 / ADR-010):
the porter ports what the design **defines** and refuses to author design it was **not given**. A
fabricated component would sail through the downstream gates (it matches a spec the porter itself
invented) — exactly the self-verification the contract forbids.

## The rule

When a scope-required component/variant has no portable master:

1. **Never fabricate.** Do not guess a layout, invent variants, or "fill in" a half-drawn component.
2. **Emit a forgeplan PROBLEM** — `forgeplan_new(kind="problem")`, title `missing-master: <Component>`,
   tag `missing-master`, owner `canvas-designer`, then `forgeplan_link` it to the scope PRD. The body
   states which component/variant scope requires, what is missing (absent vs incomplete), and what a
   portable master must contain.
3. **Mark that component blocked** — emit **no** `spec.yaml` for it (an emitted spec would imply a
   portable master exists, and the validator would run a checklist against a fiction).
4. **Keep porting the independent components.** The blocked component does not block the file-disjoint
   ones — continue emitting specs for every other reusable component whose master IS portable.
5. **Return a `## Blocked components` handoff** naming each PROBLEM id. The coordinator re-dispatches
   `canvas-designer` to author the missing master, then re-dispatches the porter to vectorize it.

## Partial master (variant-level gap)

If the **component** exists but a **required variant** does not (e.g. `Button/{primary,secondary}`
drawn, `Button/danger` required by scope but never drawn): port the variants that exist into the
`spec.yaml` matrix, and ticket **only the missing variant** as a `missing-master` PROBLEM (note
`partial` in the body). Do not fabricate the missing variant, and do not block the variants that are
present.

## The handoff shape

```
## Blocked components
- <Component>           — PROB-NNN (missing-master)          — absent | incomplete — owner canvas-designer
- <Component>/<variant> — PROB-NNN (missing-master, partial) — required variant not drawn
```

The coordinator (the design->code master) reads this block, re-dispatches `canvas-designer` to author
the missing master(s), takes them back through Capture -> Audit -> Norm-check, then re-dispatches the
porter for a second Vectorize pass over the now-portable components.

## HARD RULES (this section)

1. **Never fabricate a design.** No master (or no portable master) -> a `missing-master` PROBLEM, never
   an invented `spec.yaml`. Fabrication forks the single source of truth and defeats generator≠verifier.
2. **One PROBLEM per missing component/variant**, tagged `missing-master`, owner `canvas-designer`,
   linked to the scope PRD.
3. **A blocked component never blocks an independent one.** Keep porting every file-disjoint component
   whose master is portable; only the gap is ticketed.
4. **Partial master -> port what exists, ticket what's missing.** Never block present variants; never
   fabricate the absent one.
5. **The `## Blocked components` handoff is mandatory** whenever any gap exists — name every PROBLEM id
   so the coordinator can re-dispatch `canvas-designer` then re-dispatch the porter.
