---
name: canvas-storybook-test
description: "CANVAS Storybook-gate validation toolkit (RFC-021 FR-4) — the knowledge base read by canvas-storybook-validator (the C4 Storybook-gate, a SUB Task agent) when it certifies the BUILT Storybook against the Pencil source ONLY. Covers the six certifications: (1) story coverage vs the port-manifest variant matrix, (2) visual parity vs the Pencil reference screenshots (visual-regression — Playwright / Chromatic), (3) interaction/play tests (play functions + storybook/test userEvent + expect), (4) structural accessibility via the a11y/axe addon (WCAG), (5) token fidelity (computed styles resolve to the token tool's CSS custom properties, no hardcoded values), (6) coverage thresholds. Documents the Vitest addon (primary, Vite) vs the legacy test-runner (Jest+Playwright fallback), composeStories().run() portable stories, and where this gate sits (generator!=verifier vs canvas-coder — a fresh isolated context). Use when running or reviewing Storybook tests, wiring the validator gate, or writing *.stories.ts test code. Triggers on: Storybook test, Vitest addon, addon-vitest, test-runner, composeStories, portable stories, play function, storybook/test, userEvent, interaction test, visual regression, visual parity, Chromatic, toMatchImageSnapshot, postVisit, a11y addon, axe, WCAG, accessibility test, token fidelity, computed style, CSS custom properties, coverage threshold, Storybook gate, canvas-storybook-validator."
---

# canvas-storybook-test — the Storybook-gate validation toolkit

The knowledge base for **`canvas-storybook-validator`** — the C4 verifier at **Gate Storybook**
(RFC-021 FR-4). The validator is an ordinary **SUB `Task` agent** dispatched by `canvas-coordinator`
in a **fresh isolated context** (generator≠verifier vs `canvas-coder`, the Assemble producer). It
validates the **BUILT Storybook against the Pencil source ONLY** (Figma is a future seam), writes no
code, and emits one C4 EVID with a PASS/FAIL verdict + a `## Findings` section.

It certifies **six** things, each a section below:

| # | Certification (FR-4) | Read |
|---|----------------------|------|
| 1 | Story coverage vs the port-manifest variant matrix | [06-coverage](sections/06-coverage/_index.md) |
| 2 | Visual parity vs the Pencil reference screenshots | [03-visual-parity](sections/03-visual-parity/_index.md) |
| 3 | Interaction / play tests | [02-interaction-play](sections/02-interaction-play/_index.md) |
| 4 | Structural accessibility (axe → WCAG) | [04-a11y](sections/04-a11y/_index.md) |
| 5 | Token fidelity (computed style → the token tool's CSS vars) | [05-token-fidelity](sections/05-token-fidelity/_index.md) |
| 6 | Coverage thresholds | [06-coverage](sections/06-coverage/_index.md) |

All six run on **one harness** — the Vitest addon (primary) or the test-runner (fallback):

| # | Section | What it covers |
|---|---------|----------------|
| 01 | [vitest-addon](sections/01-vitest-addon/_index.md) | The Vitest addon (`@storybook/addon-vitest`) — turns every story into a Vitest browser-mode test — vs the legacy `@storybook/test-runner` (Jest+Playwright). `composeStories().run()` portable stories. The harness the other five sections assert through. |
| 02 | [interaction-play](sections/02-interaction-play/_index.md) | `play` functions + the `storybook/test` package (`userEvent`, `expect`, `within`, `waitFor`, `fn`) — behavioural assertions on the rendered story. |
| 03 | [visual-parity](sections/03-visual-parity/_index.md) | Visual-regression: Chromatic (native) or the test-runner `postVisit` hook + `toMatchImageSnapshot`, asserted against the Pencil reference screenshots (the oracle). |
| 04 | [a11y](sections/04-a11y/_index.md) | The a11y/axe addon → `parameters.a11y.test: 'error'` fails on WCAG violations. Structural, distinct from the `/laws-of-ux:ux-review` heuristic pass. |
| 05 | [token-fidelity](sections/05-token-fidelity/_index.md) | Computed-style assertions that the rendered value resolves to a token-tool CSS custom property — proving no value was hardcoded. |
| 06 | [coverage](sections/06-coverage/_index.md) | Code-coverage thresholds (Vitest built-in) + story coverage vs the variant matrix. |

## context7 is MANDATORY for every Storybook API touch

Before writing **any** test config, `play` function, snapshot hook, a11y wiring, or coverage gate, the
validator **MUST** consult the **context7 MCP**:

```
resolve-library-id("Storybook")  ->  query-docs(<id>, "<specific testing question>")
```

The Storybook testing surface moved fast: the **Vitest addon superseded the test-runner**, the test
package is now imported as **`storybook/test`** (not `@storybook/test`), and `play` arguments changed
(CSF Next passes `canvas` + `userEvent` directly). Verify the current API with context7 first — the leaf
sections show illustrative shapes, confirmed-against-context7 starting points, never a substitute for it.
Also prompt the user to use context7 on any version question (global context7 rule).

## Where this gate sits in CANVAS

```
Assemble   canvas-coder            (SUB) → Web-Components code + *.stories.ts + visual-regression tests
  ──[Gate Storybook (C4): canvas-storybook-validator → EVID PASS/FAIL vs the Pencil oracle]──►
  ──[Gate Code (C4):      code-reviewer + tester + /laws-of-ux:ux-review → EVID]──►
```

Gate Storybook is a **different context** from Assemble. `canvas-coder` wrote the stories + tests;
`canvas-storybook-validator` **runs and reads** them and judges them against the Pencil source. The
validator does not fix what it finds — on FAIL the master (`canvas-coordinator`) returns to `canvas-coder`.

## HARD RULES (gate discipline)

1. **Generator≠verifier.** You validate `canvas-coder`'s output from a fresh isolated context. Never
   re-run the producer's own self-report as the gate; run the suite yourself and read the result.
2. **context7 before any test code.** Resolve + query Storybook testing docs (Vitest addon, `play`,
   a11y, snapshot, coverage) before writing or reviewing config; prompt the user to use context7.
3. **The Pencil source is the oracle.** Visual parity, story coverage, and token fidelity are judged
   against the Pencil design + its reference screenshots — not against a re-reading of the code.
4. **All six certifications are mandatory.** A skipped certification is a CONCERNS, never a silent PASS.
   An un-snapshotted variant, an `a11y.test: 'off'`, or coverage with no threshold each fails the gate.
5. **No code writes.** The validator denylist forbids `Write`/`Edit`/`NotebookEdit` + `mcp__pencil__*`
   mutations + `forgeplan_activate`. You emit an EVID with a verdict; you never patch the component.
6. **Empty / vacuous green is FAIL.** A green run with zero stories executed, a snapshot suite with no
   committed baseline, or coverage that ran on nothing is a null result — report it as FAIL/CONCERNS.

## Related

- `/canvas` — the methodology entry; `canvas-port` — the Vectorize/Assemble/Spread port contract this
  validates against (the variant matrix + token contract + visual oracle live there).
- Agents: `canvas-storybook-validator` (owns this skill), `canvas-coder` (the producer it verifies),
  `canvas-coordinator` (the master that dispatches this gate).
- `/laws-of-ux:ux-review` — the **heuristic** UX pass at the code-gate; section 04's axe check is the
  **structural** WCAG pass — the two are distinct gates, never conflated.
