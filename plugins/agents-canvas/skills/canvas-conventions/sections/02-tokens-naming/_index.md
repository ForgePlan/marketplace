# 02 - Tokens & Naming (`$--var` not hex, `Category/Variant` naming)

A portable DS has **no literal design values** and **predictable names**. Every color, spacing, radius,
and type value resolves through a `$--variable` (which becomes a single `tokens.json` -> CSS custom property downstream via the project's token tool — Style-Dictionary is one option, LOCKED DECISION 3 being the single-source `tokens.json` -> CSS-custom-property CONTRACT, not the tool); every Component name follows `Category/Variant` so
the atomic layering and the Storybook story matrix can be derived mechanically. A hardcoded hex is a
forked token; a freeform name breaks the port. This section pairs token-correctness with naming.

Audit inputs: the `export_nodes` manifest (`fill`/`stroke`/`fontFamily`/`gap`/`padding`/`name` per node)
and the `get_variables` dump (declared variables + their theme entries).

---

## TN-1 — Tokens, not literal values

**Rule.** Color, spacing, typography, and radius properties reference a `$--var` — never a literal
`#RRGGBB`, `rgb()/rgba()`, named color, or a magic pixel value that should be a spacing/radius token.

**Detect.** Scan node properties (`fill`, `stroke`, `fontFamily`, and where the DS defines spacing/radius
tokens) for values that do **not** start with `$--`. A `fill: "#FFFFFF"` where a `$--background` exists is
a Critical forked token.

**Severity.** Critical (this is the #1 portability defect — it forks the single token source).

**Fix.** Replace the literal with the variable:

```json
{ "type": "frame", "name": "Design System", "fill": "$--background" }
```

If no matching variable exists, that is also a TN-2 finding — add the variable first, then reference it.

---

## TN-2 — Token coverage

**Rule.** Every brand color / spacing step / font family actually used in the DS has a backing entry in
`get_variables`. A value used in three places but defined nowhere is an un-tokenized constant waiting to
drift.

**Detect.** Collect the distinct `$--` references used across nodes; diff against the keys in
`get_variables`. Flag references with no definition (dangling token) and frequently repeated literals
that have no variable at all (missing token).

**Severity.** Warning.

**Fix.** Add the missing variable to the DS variables, then point the nodes at it. Keep one source — do
not redefine the same value under two names.

---

## TN-3 — Theme-axis completeness

**Rule.** A themed variable supplies a value for **every** position on its theme axis. With a `Mode`
axis of `["Light","Dark"]`, a color variable must define both a base value and a `Dark` value.

**Detect.** For each axis in `get_variables` (e.g. `themes.Mode = ["Light","Dark"]`), find color
variables whose `value` array has fewer entries than the axis has positions, or that lack a
`theme: { Mode: "Dark" }` entry.

**Severity.** Warning (Critical if the DS Frame itself declares `theme: { Mode: "Dark" }` but a referenced
token has no Dark value — the dark snapshot will render a broken color).

**Fix.**

```json
"--background": { "type": "color", "value": [
  { "value": "#FFFFFF" },
  { "value": "#111111", "theme": { "Mode": "Dark" } } ] }
```

---

## TN-4 — `Category/Variant` naming

**Rule.** Component names follow the canonical grammar:

```
Category/Variant            Button/Secondary
Category/Size/Variant       Button/Large/Default
Category/State              Checkbox/Checked
Category (base only)        Card
```

**Detect.** Flag `reusable:true` Components whose `name` is freeform (no `/`) when sibling variants
exist, or that mix grammars inconsistently within one category (`Button/Secondary` next to
`SecondaryButton`).

**Severity.** Warning.

**Fix.** Rename to the grammar. Semantic variants use the semantic token name (`Alert/Success`,
`Badge/Error`), not a color (`Alert/Green`).

---

## TN-5 — Canonical variant + state ordering

**Rule.** Within a category, variants and states are laid out top-to-bottom in the canonical order so the
DS reads predictably and the Storybook variant matrix is stable:

- Variant order: `Default -> Secondary -> Destructive -> Outline -> Ghost`.
- State order: `Default/Unchecked/Inactive -> Checked/Active/Selected -> Disabled -> Error`.

**Detect.** Sort a category's instances by `y`; compare the variant/state sequence to the canonical order.

**Severity.** Suggestion.

**Fix.** Reorder Y positions (height-aware, see LH-2) so the sequence matches.

---

## TN-6 — Section-header styling

**Rule.** Atomic-zone section headers (`ATOMS`, `MOLECULES`, ...) are uppercase text using
`$--muted-foreground`, `fontWeight: 600`, `letterSpacing: 2`, ~14px — so zones are scannable.

**Detect.** Find the zone header text nodes; check `fill == "$--muted-foreground"`, `fontWeight >= 600`,
`letterSpacing ~= 2`, all-caps content.

**Severity.** Suggestion.

**Fix.**

```json
{ "type": "text", "content": "ATOMS", "fill": "$--muted-foreground",
  "fontFamily": "$--font-primary", "fontSize": 14, "fontWeight": "600", "letterSpacing": 2 }
```

---

## Cross-checks

- A TN-1 literal that exists because a variable was never created is also TN-2 — record both, fix TN-2
  first (add the token), then TN-1 (reference it).
- A miscategorized name (TN-4 `Card/...` placed in the ORGANISMS column) is also AL-1.
- Theme gaps (TN-3) surface visually in the Dark reference screenshot — cross-read the screenshot oracle.
