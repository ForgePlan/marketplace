# 05 — Token fidelity (computed style → the token tool's CSS vars)

CANVAS has **one** token source: `tokens.json` → the project's token tool (Style-Dictionary is one option) → **CSS custom properties** consumed by
the Web Component shadow DOM (see `canvas-port` section 01). Token fidelity is the certification that the
**rendered** component actually resolves its values **from those custom properties** — proving no value
was hardcoded around the contract. The check is a **computed-style assertion** inside a `play` function:
read `getComputedStyle(el)` on the rendered element and confirm the value matches the compiled token.

> **context7 first.** Querying computed styles across the shadow boundary and the exact assertion API
> evolve. Run `query-docs(<id>, "play function getComputedStyle assert computed style CSS custom property")`
> before writing the check.

```ts
// canvas-button.stories.ts  (illustrative — confirm queries via context7)
import { expect, within } from 'storybook/test';
import './canvas-button';

export const TokenFidelity = {
  args: { label: 'Submit', variant: 'primary' },
  play: async ({ canvasElement }) => {
    const host = within(canvasElement).getByRole('button').closest('canvas-button')!;

    // 1) the custom property is defined (resolves to the compiled token value, not empty)
    const tokenValue = getComputedStyle(host).getPropertyValue('--canvas-color-primary').trim();
    await expect(tokenValue).not.toBe('');

    // 2) the rendered background is THE token value, not an inlined literal
    const btn = host.shadowRoot!.querySelector('button')!;
    await expect(getComputedStyle(btn).backgroundColor).toBe(tokenValue);
  },
};
```

The assertion compares the rendered computed value to the **resolved token custom property** — so a
designer changing `tokens.json` and recompiling propagates here automatically. A component that inlined a
hex would fail step 2 because the computed background would not equal `--canvas-color-primary`.

## Good vs bad

- **GOOD** — assert the computed style **equals the resolved custom property** (`getPropertyValue('--canvas-…')`).
  The single source of truth stays load-bearing; the test follows the token contract and survives a token
  re-compile without edits.
- **BAD** — asserting a **raw literal** (`expect(bg).toBe('rgb(37, 99, 235)')`). That re-hardcodes the very
  value the token contract exists to centralise: the test now passes even when the component forked the
  token, and it breaks the moment `tokens.json` legitimately changes. Compare to the var, not the literal.

## Typography: assert the web font actually LOADED (not a silent fallback)

A `--font-*` token resolving to a non-empty string proves the *custom property* is wired — it does NOT
prove the **web font file loaded**. If the `.woff2` never arrived, the browser silently renders a system
fallback while `getComputedStyle(el).fontFamily` still reports the contracted family string. Typography
fidelity therefore has a second half: assert the contracted face is **actually loaded and active**.

> **context7 first.** The Font Loading API surface (`document.fonts.ready`, `FontFaceSet.check`) and how
> Storybook waits for fonts evolve. Run `query-docs(<id>, "document.fonts.ready FontFaceSet check await
> fonts loaded play function")` before writing the check.

```ts
// canvas-button.stories.ts  (illustrative — confirm the Font Loading API via context7)
import { expect, within } from 'storybook/test';
import './canvas-button';

export const FontLoaded = {
  args: { label: 'Submit', variant: 'primary' },
  play: async ({ canvasElement }) => {
    const host = within(canvasElement).getByRole('button').closest('canvas-button')!;
    const btn = host.shadowRoot!.querySelector('button')!;

    // the contracted typography token's family (from the tokens RFC)
    const family = getComputedStyle(btn).getPropertyValue('--canvas-font-family-base').trim()
      .split(',')[0].replace(/['"]/g, '');

    // 1) wait for fonts to settle, then assert the contracted face is LOADED — not a system fallback
    await document.fonts.ready;
    await expect(document.fonts.check(`16px "${family}"`)).toBe(true);

    // 2) the rendered element actually uses that family (computed, not just the token string)
    await expect(getComputedStyle(btn).fontFamily).toContain(family);
  },
};
```

The first assertion is the load-bearing one: `document.fonts.check('16px <family>')` returns `false` when
the `.woff2` never loaded, even though the `--font-*` custom property still resolves to the family string.
A token that resolves while the font silently fell back to a system face MUST **FAIL** the gate — a
green token assertion over a fallback render is exactly the drift this certification exists to catch.

> **The DS owns the font FILE, not just the token.** A typography token is only honoured if the design
> system also ships and serves the actual `.woff2`/`.woff` and declares its `@font-face`. A token without
> a loadable file is a half-wired contract — fidelity covers both the variable and the file.

## HARD RULES (this section)

1. **Assert against the resolved CSS custom property**, never a hardcoded hex/rgb literal — that defeats the
   single-source-of-truth invariant.
2. **A hardcoded value found in a component is a CRITICAL token-fidelity finding** (forked token); the fix is
   add-to-`tokens.json`-and-recompile, never inline.
3. **Reach shadow-DOM internals via `shadowRoot`** / shadow-piercing queries to read the rendered value.
4. **context7 before writing** — verify the computed-style + shadow-boundary query API for your version.
5. **Typography fidelity = the token resolves AND the web font loaded.** `await document.fonts.ready` then
   `document.fonts.check('16px <family>')`; a `--font-*` token that resolves to a string while the `.woff2`
   never loaded (silent system fallback) is a CRITICAL token-fidelity FAIL, not a pass.
6. **The DS owns the font file, not just the token.** A typography token with no shipped/served `.woff2` +
   `@font-face` is a half-wired contract; this certification covers the file, not only the variable.
