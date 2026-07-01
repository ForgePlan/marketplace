# 03 — Visual oracle (reference screenshots -> visual-regression)

The **visual oracle** is the porter's set of **reference screenshots**, one per canonical variant + state
(section 02). It is the source of truth for the Coder's **visual-regression** tests: the rendered
Storybook story must match the screenshot captured from the approved Pencil design. This closes the loop
that text specs cannot — "does the code *look* like the design" is decided by pixels, not by prose.

> **context7 first.** The Storybook **test-runner** and **Playwright** snapshot APIs change across
> versions (the test-runner exposes `preVisit`/`postVisit` hooks running in Node where Playwright lives).
> Run `resolve-library-id("Storybook")` -> `query-docs(<id>, "test-runner postVisit visual snapshot
> playwright toMatchImageSnapshot")` before wiring tests.

## Step 1 — capture references (porter-storybook, MAIN, Pencil)

For every **canonical** story (one per variant) and every boolean **state** story, capture a reference
screenshot from Pencil and store it beside the spec:

```
get_screenshot(node_id=<component instance>, ...)   # per canonical variant + state
```

```
.canvas-port/components/canvas-button/refs/
  primary-md-light.png      secondary-md-light.png    danger-md-light.png
  disabled-md-light.png     loading-md-light.png
  primary-md-dark.png       ...                        # both theme axes
```

Naming mirrors the story export + theme axis so the test can map story -> reference deterministically.
Capture **both** `Mode:Light` and `Mode:Dark` — a theme that isn't snapshotted isn't oracle-backed.

> Pencil rendering and browser rendering are not pixel-identical (font hinting, sub-pixel AA). The
> reference is the **intent oracle**, not a byte target. Establish the browser baseline on first green run
> (see step 3) and assert future diffs against that baseline with a tolerance; use the Pencil refs for the
> human PASS/FAIL judgement at Gate Code and as the regenerate-from-design source when the design changes.

## Step 2 — the test target: Storybook + Playwright

On the resolved framework's Storybook renderer, drive visual-regression two complementary ways:

1. **Storybook test-runner `postVisit` hook** — runs in Node after each story renders in a real browser;
   take a Playwright screenshot and diff it. This is the per-story visual gate.
2. **Playwright component/e2e specs** — for interaction-driven states (hover/focus/active) exercised by a
   `play` function before the snapshot.

```ts
// .storybook/test-runner.ts  (illustrative — verify hook + matcher via context7)
import type { TestRunnerConfig } from '@storybook/test-runner';
import { toMatchImageSnapshot } from 'jest-image-snapshot';

const config: TestRunnerConfig = {
  setup() { expect.extend({ toMatchImageSnapshot }); },
  async postVisit(page, context) {
    // wait for the component to mount (custom-element upgrade on the WC target) + fonts to settle before snapshotting
    await page.locator('canvas-button, [data-canvas-ready]').first().waitFor();
    const image = await page.screenshot();
    expect(image).toMatchImageSnapshot({
      customSnapshotsDir: `${process.cwd()}/__image_snapshots__`,
      customSnapshotIdentifier: context.id,        // story id -> stable file name
      failureThreshold: 0.02, failureThresholdType: 'percent',
    });
  },
};
export default config;
```

For interaction states, snapshot inside a Playwright `play`/spec after driving the state:

```ts
// canvas-button.visual.spec.ts  (illustrative — confirm Playwright API via context7)
import { test, expect } from '@playwright/test';

test('button focus-visible matches the design', async ({ page }) => {
  await page.goto('/iframe.html?id=atoms-button--primary');
  await page.locator('canvas-button').focus();
  await expect(page).toHaveScreenshot('primary-md-light-focus.png', { maxDiffPixelRatio: 0.02 });
});
```

> **Shadow DOM gotcha (Web Components target only).** When the resolved framework is Web Components,
> custom-element internals live in a shadow root: use Playwright's shadow-piercing locators / `::part()`
> selectors when targeting internals. (Light-DOM frameworks like React/Vue/Svelte do not need this.) Either
> way, a full-frame `page.screenshot()` already includes the rendered content, so prefer it for the visual diff.

## Step 3 — establish + review the baseline

1. First run: no committed baseline -> the runner writes the browser baseline. **Do not auto-trust it.**
2. The porter (or Coder) compares each new browser baseline against the Pencil reference visually and
   confirms intent parity (color, spacing, hierarchy, the project's chosen brand). Mismatch -> fix the component
   or the token contract, not the threshold.
3. Commit the approved baselines under `__image_snapshots__/`. Subsequent runs diff against them; a real
   visual regression fails CI.

## Step 4 — what Gate Code checks here

The Gate Code C4 (`code-reviewer` + `tester` + `/laws-of-ux:ux-review`) treats the oracle as a first-class
input:

- **Coverage** — every canonical variant + state story has a reference and a passing snapshot. An
  un-snapshotted variant is an untested variant -> CONCERNS.
- **Both themes** — Light + Dark snapshots exist and pass.
- **No threshold inflation** — a suspiciously high `failureThreshold` to "make it pass" is a finding; the
  fix is the component, not the tolerance.
- **Determinism** — flaky snapshots (un-awaited fonts/animations/custom-element upgrade) are fixed by
  awaiting readiness, not by retries.

## HARD RULES (this section)

1. **Capture a reference per canonical variant + state, in both theme axes.** No reference -> no oracle.
2. **The Pencil reference is the intent oracle**; the committed browser baseline is the regression target.
   Never edit the threshold to mask a real visual diff.
3. **Await readiness before snapshot** — component mount (custom-element upgrade on the WC target) + fonts +
   animation-end — to keep snapshots deterministic.
4. **Snapshot interaction states via `play`/Playwright**, canonical variants via the test-runner
   `postVisit` hook.
5. **context7 before wiring** — verify the test-runner hook signature and the screenshot matcher API;
   prompt the user to use context7 on any version question.
