# 04 — Structural accessibility (axe → WCAG)

The validator runs **structural** accessibility checks with the **`@storybook/addon-a11y`** addon, which
uses **axe-core** to evaluate each story against WCAG rules. This is a mechanical, rule-based pass — it is
**distinct from** the `/laws-of-ux:ux-review` heuristic UX pass run at the code-gate (FR-4 is explicit
that the two are not conflated): axe catches missing labels, contrast failures, ARIA misuse; the UX review
judges design heuristics. The Storybook gate owns the axe pass.

The behaviour is controlled by **`parameters.a11y.test`**, settable at project / component / story level:

- `'off'` — do not run a11y tests (manual panel only)
- `'todo'` — run them; violations are **warnings** in the UI
- `'error'` — run them; violations **fail the test** in the Storybook UI and in CI

> **context7 first.** The `parameters.a11y` shape (`test`, `config.rules`, `options`, `context`) and the
> addon wiring evolve. Run `query-docs(<id>, "addon-a11y parameters a11y test error config rules axe")`
> before configuring.

```ts
// canvas-button.stories.ts  (illustrative — confirm the parameter shape via context7)
import './canvas-button';

export default {
  title: 'Atoms/Button',
  parameters: {
    a11y: {
      test: 'error',                       // 👈 violations FAIL the gate in CI
      config: {
        // Disable a rule only with a documented, design-justified reason:
        rules: [{ id: 'color-contrast', enabled: true }],
      },
    },
  },
};

export const Primary = { args: { label: 'Submit' } };
```

The **Vitest addon runs a11y out of the box**. The legacy test-runner wires it manually via
`axe-playwright` (`injectAxe` in `preVisit`, `checkA11y` + `configureAxe` in `postVisit`, reading
`storyContext.parameters.a11y.config.rules`) — confirm that shape via context7 if on the fallback harness.

## Good vs bad

- **GOOD** — `a11y: { test: 'error' }` at the component level so any WCAG violation fails the gate; if a
  rule must be disabled, do it narrowly with a written reason tied to the design. Accessibility is a
  blocking certification, not a warning.
- **BAD** — setting `test: 'off'` (or leaving everything at `'todo'`) to get a green gate, or treating the
  axe pass as the same thing as the UX review. Silencing axe hides real WCAG defects; conflating it with
  `/laws-of-ux:ux-review` drops the structural check entirely.

## HARD RULES (this section)

1. **`parameters.a11y.test: 'error'`** for the canonical stories — violations must FAIL, not warn.
2. **Disable a rule only narrowly, with a documented design reason** — never blanket-`'off'` a story to pass.
3. **The axe pass is structural and distinct** from `/laws-of-ux:ux-review` (heuristic) — run both, conflate
   neither.
4. **context7 before wiring** — verify the `parameters.a11y` shape and (on the fallback) the
   `axe-playwright` hook calls.
