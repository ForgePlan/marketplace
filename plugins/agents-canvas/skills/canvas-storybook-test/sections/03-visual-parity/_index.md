# 03 — Visual parity vs the Pencil oracle

The validator certifies that the rendered Storybook **looks like the Pencil design**. The **Pencil
reference screenshots** (captured per canonical variant + state during the port — see `canvas-port`
section 03) are the **intent oracle**; the committed browser baseline is the **regression target**. Two
complementary mechanisms:

- **Chromatic (native, cloud).** When visual testing is enabled, **every story is automatically turned
  into a visual test**: Chromatic snapshots each story cross-browser and diffs it against the last
  approved baseline, with feedback surfaced inside Storybook. Configured via `chromatic.config.json`
  (`projectId`, `buildScriptName`). Catches a large subset of regressions with no test code.
- **Test-runner `postVisit` hook + `jest-image-snapshot` (Node side).** For self-hosted pixel diffing:
  the hook runs in Node after each story renders in a real browser, takes a Playwright screenshot, and
  diffs it with `toMatchImageSnapshot`. **Always `await waitForPageReady(page)` first** so fonts/assets
  settle — otherwise the snapshot is non-deterministic.

> **context7 first.** The `postVisit` signature, `waitForPageReady`, and the Chromatic config keys change
> across versions. Run `query-docs(<id>, "test-runner postVisit waitForPageReady toMatchImageSnapshot
> visual testing chromatic")` before wiring.

```ts
// .storybook/test-runner.ts  (illustrative — confirm hook + matcher via context7)
import type { TestRunnerConfig } from '@storybook/test-runner';
import { waitForPageReady } from '@storybook/test-runner';
import { toMatchImageSnapshot } from 'jest-image-snapshot';

const config: TestRunnerConfig = {
  setup() { expect.extend({ toMatchImageSnapshot }); },
  async postVisit(page, context) {
    await waitForPageReady(page);                          // fonts + assets + custom-element upgrade
    const image = await page.screenshot();                 // full frame includes shadow DOM content
    expect(image).toMatchImageSnapshot({
      customSnapshotsDir: `${process.cwd()}/__image_snapshots__`,
      customSnapshotIdentifier: context.id,                // story id -> stable file name
    });
  },
};
export default config;
```

## Good vs bad

- **GOOD** — `await waitForPageReady` before every screenshot; review the first browser baseline **against
  the Pencil reference** (color, spacing, hierarchy) before committing it; both `Mode:Light` and
  `Mode:Dark` are snapshotted. The baseline is approved against the oracle, not auto-trusted.
- **BAD** — bumping `failureThreshold` / `maxDiffPixelRatio` until a real diff passes, or committing the
  auto-generated first baseline without comparing it to the Pencil ref. That makes the suite green while
  the component drifts from the design — fix the component or the token contract, never the tolerance.

## HARD RULES (this section)

1. **The Pencil reference is the intent oracle**; the committed browser baseline is the regression target.
   Never edit the threshold to mask a real visual diff.
2. **Await readiness** (`waitForPageReady` / custom-element upgrade + fonts) before snapshotting — flake is
   fixed by awaiting, not by retries.
3. **Every canonical variant + state, both theme axes, has a snapshot.** An un-snapshotted variant is an
   untested variant → CONCERNS.
4. **A snapshot suite with no committed baseline is vacuous** → FAIL; a first auto-baseline must be
   reviewed against the Pencil oracle before it is trusted.
5. **context7 before wiring** — verify the `postVisit` signature + Chromatic config keys.
