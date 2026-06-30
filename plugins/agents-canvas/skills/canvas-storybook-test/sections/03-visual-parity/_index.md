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

## Vision-first verdict — method by content level

The committed pixel-diff is a **regression** signal against the coder's own baseline; it is NOT, by
itself, a parity verdict against the design. The validator leads with **vision**: it takes its OWN
screenshot of the rendered story and compares it — by eye, semantically — to the frozen Pencil reference
(`.canvas-port/components/<tag>/refs/<id>.png`). The pixel number is secondary triage. Diffing vs the
Pencil oracle rather than the coder's baseline is what hardens generator≠verifier: a baseline that
drifted from the design passes its own diff, so re-running it certifies nothing.

**Pick the method by the story's content level** — pixel-exactness is only reliable when the content is
fixed:

| Story level | Content vs the master design | Method |
|---|---|---|
| **Fixed-content** (the canonical variant rendered with the master's exact copy/data) | identical | **Pixel-diff exact** — a tight `matchPercent` is meaningful; a real diff is a real finding. |
| **Component** (the variant rendered with placeholder/dynamic data, a different locale, or different copy) | differs from the master on purpose | **Style-comparison (vision)** — pixel-diff is unreliable (the text differs by design), so judge form/border/fill/colors/typography/icon-slot/padding/radius by eye against the ref; do NOT fail on a `matchPercent` that only reflects the content difference. |

On a **vision↔number disagreement, trust vision**: a 99.9%-match that reads as the wrong icon is a
Critical; a 3% diff that is only sub-pixel anti-aliasing is not a finding. Record why you overrode the
number in the EVID.

### Defect taxonomy for the vision pass

A verdict needs a concrete **named** semantic delta, not just a percentage. When comparing your render to
the Pencil ref, check for:

- **Truncated block** — text/content clipped or `…`-ellipsised where the design shows it in full.
- **Layout shift** — element in the wrong position / order / alignment vs the ref.
- **Wrong-or-missing icon** — a different glyph, or an empty icon slot the design fills.
- **Missing state** — the rendered story omits a state the design shows (focus ring, badge, selected).
- **Content overflow** — content escapes its container / overlaps a neighbour.
- **Wrong font** — the rendered typography is a fallback face, not the contracted family (cross-check the
  web-font-load assertion in `05-token-fidelity` — a token can resolve while the `.woff2` never loaded).

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
6. **A `matchPercent` without a named semantic delta is NOT a finding.** The pixel number is triage; the
   finding is the named defect (the taxonomy above). Conversely, a named semantic delta IS a finding at
   any `matchPercent` — on a vision↔number conflict, trust vision and record why.
7. **Compare your OWN render against the Pencil `refs/` oracle, never only the coder's committed
   baseline.** A drifted baseline passes its own diff; diffing vs the frozen oracle is what keeps the
   verifier distinct from the producer (generator≠verifier).
8. **Zero console errors during a story's render is a gate condition.** Capture the browser console per
   story; any console error → CONCERNS with the messages verbatim in the EVID — a pixel-correct story
   that throws in the console is not a clean PASS.
9. **Record the visual threshold used + its calibration basis** (the render-vs-render noise floor you
   measured) in the EVID — never an arbitrary inline number. A threshold with no stated basis is itself
   a finding.
