# 05 — Token fidelity (computed style → Style-Dictionary CSS vars)

CANVAS has **one** token source: `tokens.json` → Style-Dictionary → **CSS custom properties** consumed by
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

    // 1) the custom property is defined (resolves to the Style-Dictionary value, not empty)
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

## HARD RULES (this section)

1. **Assert against the resolved CSS custom property**, never a hardcoded hex/rgb literal — that defeats the
   single-source-of-truth invariant.
2. **A hardcoded value found in a component is a CRITICAL token-fidelity finding** (forked token); the fix is
   add-to-`tokens.json`-and-recompile, never inline.
3. **Reach shadow-DOM internals via `shadowRoot`** / shadow-piercing queries to read the rendered value.
4. **context7 before writing** — verify the computed-style + shadow-boundary query API for your version.
