# 03 - Atomic Layering (atom-in-ATOMS, screens-not-reusable, depth, cross-file)

Atomic design only pays off if the layers stay honest: an **atom** lives in the ATOMS zone, a
**molecule** composes atoms, an **organism** composes molecules/atoms, **templates/pages** compose
organisms — and composition flows **up only**. A screen is a composition, never a Component. This section
audits placement, the reusable/screen boundary, the composition direction, nesting depth, and ref
locality. These rules let the downstream port walk the DS top-down (ATOMS -> MOLECULES -> ORGANISMS ->
TEMPLATES) deterministically.

Audit inputs: the `export_nodes` manifest (`x/y/width/height`, `reusable`, `ref`, nesting) + the
DS-ORGANIZATION grid (zone X/Y bands) + the `snapshot_layout` tree for depth.

Canonical zone bands (DS-ORGANIZATION-GUIDE; rediscover the actual bands per `.pen` file — these are the
reference layout, not hardcoded truth):

```
ATOMS      x ~ 200..1000     MOLECULES  x ~ 1100..1600
ORGANISMS  x ~ 1700..2300    TEMPLATES  x ~ 3100+
section headers mark each zone; sections step down by ~600px (SECTION_GAP)
```

---

## AL-1 — A component sits in its correct atomic zone

**Rule.** A Component is placed in the zone that matches its atomic level: atoms under the ATOMS header,
molecules under MOLECULES, organisms under ORGANISMS, screen templates in the TEMPLATES column.

**Detect.** For each `reusable:true` Component, compare its `x`/`y` against the zone bands and the nearest
preceding section header. A `Card` (molecule) found in the ATOMS column, or a `Button` (atom) in
ORGANISMS, is misplaced.

**Severity.** Warning.

**Fix.** Move the Component into its zone (height-aware Y per LH-2). If it is genuinely the wrong level
(a "Button" that is actually a composed organism), rename + relevel it.

---

## AL-2 — Screens are NOT `reusable:true`

**Rule.** Screen / page frames (full app screens, templates rendered as pages) are **never**
`reusable:true`. A screen is a one-off composition of organisms, not a DS Component. Marking a screen
reusable pollutes the Component registry and invites SS-2/SS-3 detach anti-patterns on whole screens.

**Detect.** Find `reusable:true` frames that are screen-sized (e.g. width/height near a viewport, ~1000px+
or matching the template column) and/or sit in TEMPLATES/PAGES. Cross-check SS-1: a `reusable:true`
referenced 0-1 times that is screen-sized is almost always this.

**Severity.** Critical.

**Fix.** Set `reusable: false` on the screen. Keep its **organisms** reusable; the screen merely arranges
refs to them.

---

## AL-3 — Composition flows up only

**Rule.** Molecules ref atoms; organisms ref molecules and atoms; templates ref organisms. The reverse is
forbidden — an atom must never `ref` a molecule/organism, because that inverts the dependency and makes
the atom un-reusable.

**Detect.** For each `ref` edge, classify source and target by zone/level; flag edges where the source
level is **lower** than the target (atom -> organism). Also flag cycles.

**Severity.** Critical.

**Fix.** Invert the relationship: the higher-level component should ref the lower-level one. If an atom
truly needs another component inside it, that atom is actually a molecule — relevel + rename it.

---

## AL-4 — Bounded nesting depth

**Rule.** Ref/descendant nesting depth stays bounded (<= ~10). Very deep trees are slow to resolve, hard
to override, and usually signal a missing intermediate molecule.

**Detect.** Walk the `snapshot_layout` / manifest tree; record max depth per top-level Component; flag
depths > ~10.

**Severity.** Warning.

**Fix.** Extract an intermediate molecule/organism Component and ref it, flattening the deep branch.

---

## AL-5 — No cross-file refs

**Rule.** Every `ref` target resolves to an id **within the same `.pen` file**. Refs into another
document are unresolvable for downstream consumers and break the snapshot's self-containment.

**Detect.** For each `ref`, confirm the target id exists in this manifest. A `ref` whose target id is
absent from the file's node set is either a cross-file ref or a dangling ref.

**Severity.** Critical.

**Fix.** Rediscover the intended base Component in **this** file (`batch_get({patterns:[{reusable:true}]})`
re-run by the Designer) and repoint the ref. Never carry an id across `.pen` files — Pencil ids are
file-specific.

---

## AL-6 — Zone completeness

**Rule.** Each declared atomic zone has a section header and at least its core categories present (ATOMS
-> Buttons / Inputs / Form Controls / Indicators; MOLECULES -> Cards / Alerts / Form Groups; etc.), so
the DS reads as a complete library rather than a partial sketch.

**Detect.** Confirm a header text node exists per zone and that the zone is non-empty; list zones that are
declared (header present) but empty, or core categories that are missing for the slice in scope.

**Severity.** Suggestion (it is informational unless the scope PRD required that category — then it is a
coverage gap owned by `canvas-tester` / Norm-check, not the Guardian).

**Fix.** Note the gap in the EVID; the Designer fills it or the scope explicitly defers it.

---

## Cross-checks

- AL-2 (reusable screen) almost always co-occurs with SS-1 (single-use Component) — record both, fix AL-2.
- AL-1 (off-zone) plus a duplicate is SS-5 (the same atom placed twice).
- A missing category (AL-6) that the scope PRD demanded is a **Norm-check** gap — hand it to
  `canvas-tester` rather than failing the build-quality gate on it.
