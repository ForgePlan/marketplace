# 01 — The Vitest addon (primary) vs the test-runner (fallback)

Storybook Test runs your stories **as tests**. There are two harnesses; the validator picks by stack.

- **Vitest addon (`@storybook/addon-vitest`) — PRIMARY on a Vite-powered Storybook (CANVAS's `web-components`
  framework is Vite).** A Vitest plugin automatically transforms every story into a real Vitest test, run
  in **Vitest browser mode** (Playwright provider). Benefits the docs call out: faster than the Jest
  test-runner, **no need to build Storybook to test**, out-of-the-box **accessibility** testing, and
  **coverage via Vitest's own `--coverage`** (add `@storybook/addon-coverage` to instrument the source —
  section 06). This is the full "Storybook Test" experience — interaction + a11y + visual from one command.
- **Test-runner (`@storybook/test-runner`) — FALLBACK (Jest + Playwright).** Superseded by the Vitest
  addon but still the path when Storybook is not Vite-powered, or for Node-side hooks (`postVisit`) used
  for image snapshots (section 03).

> **context7 first.** The addon package name, the `vitest.config` plugin shape, and the browser-mode
> provider config drift between releases. Run `resolve-library-id("Storybook")` ->
> `query-docs(<id>, "vitest addon setup browser mode storybookTest plugin")` before wiring it.

## composeStories().run() — portable stories

Stories are portable: `composeStories` applies all `meta` + project + story annotations, and each composed
story exposes `.run()` so any test runner can render it. The validator uses this to assert a story renders
and to override args without touching the component:

```ts
// Button.test.ts  (illustrative — confirm the import path via context7)
import { test, expect } from 'vitest';
import { screen } from '@testing-library/dom';
// Replace your-framework with the renderer, e.g. web-components-vite
import { composeStories } from '@storybook/your-framework';
import * as stories from './canvas-button.stories';

const { Primary } = composeStories(stories);

test('primary renders the default args', async () => {
  await Primary.run();                                   // runs annotations + the play function
  expect(screen.getByRole('button')).not.toBeNull();
});

test('renders an overridden label', async () => {
  await Primary.run({ args: { ...Primary.args, label: 'Hello' } });
  expect(screen.getByText(/Hello/i)).not.toBeNull();
});
```

## Good vs bad

- **GOOD** — run the suite via the addon (`vitest`); every `*.stories.ts` variant **auto-becomes** a test,
  and the validator reads the aggregate PASS/FAIL. The story file stays the single contract; tests follow it.
- **BAD** — hand-writing a parallel RTL/Jest suite that re-renders the component **outside** the story.
  It drifts from the variant matrix, double-maintains the same cases, and tests a render the design gate
  never approved. Compose the stories instead — don't fork them.

## HARD RULES (this section)

1. **Vitest addon on Vite, test-runner only as the fallback.** Don't reach for the Jest test-runner on a
   Vite stack except for Node-side snapshot hooks.
2. **Assert through `composeStories().run()`**, not a re-implemented render — the story is the contract.
3. **A run with zero stories executed is vacuous green** → FAIL. Confirm the suite actually discovered the
   `*.stories.ts` files before trusting a green result.
4. **context7 before config** — verify the addon name + `vitest.config` plugin + browser provider.
