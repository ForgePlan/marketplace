# 06 — Coverage (code thresholds + story coverage)

Two distinct coverages, both certified at this gate:

1. **Story coverage** — every variant + state in the **port-manifest variant matrix** (see `canvas-port`
   section 02) has a corresponding story. This is the FR-4 certification (1): a variant with no story is an
   untested variant, regardless of how high the code-coverage number is.
2. **Code coverage** — the line/branch/function coverage of the executed stories, gated by **thresholds**.

The **Vitest addon reports coverage through Vitest's own `--coverage`** (add `@storybook/addon-coverage`
to `.storybook/main` so the source is instrumented). Run it with `vitest --coverage`; the result reports
per-file coverage. The gate is enforced by **thresholds in the Vitest config** — a run that drops below
the bar **fails**:

> **context7 first.** The coverage config keys and the Storybook coverage wiring change between releases.
> Run `query-docs(<id>, "vitest addon coverage thresholds storybook test-coverage")` before setting them.

```ts
// vitest.config.ts  (illustrative — confirm keys via context7)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      // thresholds FAIL the run when coverage regresses below the bar (the actual gate):
      thresholds: { statements: 80, branches: 70, functions: 80, lines: 80 },
      // watermarks only COLOUR the report — they are not a pass/fail gate:
      watermarks: { statements: [50, 80] },
    },
  },
});
```

```jsonc
// package.json — coverage must actually be requested
{ "scripts": { "test": "vitest --coverage" } }
```

Note the difference the docs are explicit about: **`coverage.thresholds`** is the enforced pass/fail gate;
**`watermarks`** only set the red/yellow/green colours in the report and enforce nothing.

## Good vs bad

- **GOOD** — set explicit **`coverage.thresholds`** so a coverage regression fails CI, AND separately
  assert **story coverage** against the variant matrix (each matrix row → a story). Both numbers are
  enforced, not merely displayed.
- **BAD** — running `--coverage` and reporting the percentage with **no threshold** (a number nobody
  enforces — coverage can silently rot), or pointing at **`watermarks`** as if they gated the build. A
  reported-but-unenforced number is decoration, not a gate.

## HARD RULES (this section)

1. **Story coverage vs the variant matrix is a first-class certification** — a missing variant story is a
   CONCERNS even at 100% code coverage.
2. **Gate code coverage with `coverage.thresholds`** (the pass/fail control), not `watermarks` (display only).
3. **Coverage must actually be requested** (`vitest --coverage`); a coverage report from a run that executed
   no stories is vacuous → FAIL.
4. **context7 before configuring** — verify the coverage config keys for your Vitest + addon version.
