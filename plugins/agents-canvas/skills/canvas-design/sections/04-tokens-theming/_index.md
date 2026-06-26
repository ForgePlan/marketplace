# §04 — Tokens & theming (`$--vars`, the Mode axis, the Style-Dictionary seam)

Tokens are the **single source of truth** for color/spacing/typography. In Pencil they are `variables`
referenced as `$--var`; downstream they compile through **Style-Dictionary → CSS custom properties** from a
single `tokens.json` (the CANVAS topology, LOCKED). One source, never forked. **This section is where the
context7 obligation begins.**

---

## Reference tokens in nodes with `$--var`

Never hardcode a hex when a token exists. The Guardian FAILs hardcoded hex where a `$--var` is available
(`canvas-conventions` §02).

```
// CORRECT — token reference (re-themes automatically, audits clean)
{ type:"frame", fill:"$--background", stroke:"$--border" }
{ type:"text",  fill:"$--foreground", fontFamily:"$--font-primary" }

// WRONG — raw hex (no theme, Guardian FAIL when a token exists)
{ type:"frame", fill:"#FAF6EF" }
```

Common token names (values come from your project's chosen brand — see §05 for how to choose/record one and
worked examples; confirm against the active tokens RFC):
`$--background`, `$--foreground`, `$--muted`, `$--muted-foreground`, `$--border`, `$--accent`,
`$--destructive`, `$--success`, `$--warning`, `$--radius-md`, `$--font-primary`.

---

## Read and write variables

```
get_variables({ filePath:"<.pen>" })           // inspect the current token set + theme axes
set_variables({ filePath:"<.pen>", variables:{ ... } })   // define / update tokens
```

`get_variables` first — see what exists and which theme axes are declared before adding anything. A token
that already exists must be reused, not redefined under a new name.

---

## The theme axis (Mode: Light / Dark)

A token holds **per-theme values**. The DS frame (and screens) declare which theme they render under.

```
// a themed color: default (Light) + a Dark override
// (example values from a chosen brand — here a warm-paper one; use your recorded brand's values)
"--background": {
  type:"color",
  value:[
    { value:"#FAF6EF" },                          // Light (example: warm paper)
    { value:"#1A1714", theme:{ Mode:"Dark" } }    // Dark (example: warm ink)
  ]
}
```

```
// declare the axis
{ themes:{ Mode:["Light","Dark"] } }
// apply it on a frame
{ type:"frame", name:"Design System", theme:{ Mode:"Dark" }, fill:"$--background" }
```

Define a themed color end-to-end with [`themed-color-var`](../../templates/themed-color-var.md). Keep both
theme values balanced for contrast (WCAG AA) — see §07 (Aesthetic-Usability / contrast).

**Theme axes map straight to Storybook globals** in the port: Pencil `Mode:Light/Dark` → a Storybook
`theme` global toolbar + a Style-Dictionary theme axis. Keep the axis names stable so the port is mechanical
(`canvas-port` §01).

---

## The Style-Dictionary → CSS-var seam (context7 MANDATORY here)

The CANVAS port compiles the Pencil `variables` into a single `tokens.json` that **Style-Dictionary**
transforms into CSS custom properties consumed by the Web Component shadow DOM (and JS token exports). The
mapping is 1:1 and must never fork values:

```
Pencil  $--background           (the design-time source, mirrored into tokens.json)
        →  tokens.json  { "color": { "background": { "value": "#FAF6EF" } } }
        →  Style-Dictionary build
        →  CSS  :root { --background: #FAF6EF; }   /* consumed in WC shadow DOM */
```

**Before** you author or modify any Style-Dictionary config, the `tokens.json` schema, the transform
groups, or the theme/platform setup — **consult context7**:

```
resolve-library-id  "Style Dictionary"     → query-docs  "<your config / theme / transform question>"
resolve-library-id  "Storybook"            → query-docs  "web-components theme globals from CSS variables"
```

And **prompt the user to use context7** on any Style-Dictionary / Storybook / Lit version question. This is
a hard obligation for `canvas-design` the moment it touches the token-compile seam, and for
`canvas-coder` / `canvas-porter-*` always. Design-time Pencil token work needs no context7; the compile
step does.

> **Single-source invariant.** The Pencil `variables`, the `tokens.json`, and the emitted CSS vars are
> three faces of **one** value set. A hex that appears in a component but not in `tokens.json` is a forked
> source — CANVAS's #1 anti-pattern, and what the tokens-gate (Gate V) exists to catch.

---

## Token discipline checklist

- [ ] `get_variables` before defining — reuse existing tokens, never duplicate under a new name.
- [ ] Every color/spacing/font in a node is a `$--var`, not a raw literal (where a token exists).
- [ ] Themed colors carry both Light and Dark values; contrast passes AA in both.
- [ ] Axis names (`Mode`) are stable and mirror what the port expects.
- [ ] When the token set becomes `tokens.json` / Style-Dictionary config → context7 first, then write.

## Cross-references

- How to **choose & record** the brand whose values fill these tokens (plus worked examples — warm-paper, Expo monochrome) → [§05 style-guides](../05-style-guides/_index.md).
- Where `$--background` etc. get applied on the DS frame → [§03 ds-organization](../03-ds-organization/_index.md).
- The full token-contract → CSS-var → framework mapping → `canvas-port` §01-token-contract.
- Template: [`themed-color-var`](../../templates/themed-color-var.md).
