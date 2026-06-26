# 02 — Interaction / play tests (`storybook/test`)

A **`play` function** runs after a story renders and drives + asserts on the component. It is how behaviour
(clicks, typing, focus, spied callbacks) becomes a test. Utilities come from the **`storybook/test`**
package — `userEvent`, `expect`, `within`, `waitFor`, `fn`, `screen`. (Note: it is `storybook/test`, not
the old `@storybook/test` — confirm via context7 for your version.)

> **context7 first.** The `play` argument shape changed: CSF Next passes `canvas` and `userEvent`
> **directly** in the context, while older CSF used `within(canvasElement)`. Run
> `query-docs(<id>, "play function storybook/test userEvent expect canvas argument")` before writing.

```ts
// canvas-button.stories.ts  (illustrative — verify the play args + import via context7)
import { expect, fn, userEvent, within } from 'storybook/test';
import './canvas-button';                       // registers the <canvas-button> custom element

export default {
  title: 'Atoms/Button',
  args: { onClick: fn() },                      // fn() spies the callback
};

export const ClicksOnce = {
  args: { label: 'Submit' },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /submit/i }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};
```

For multi-step flows, group with `step()` and **await asynchronous state** with `waitFor` / `findBy*`:

```ts
play: async ({ args, canvas, step, userEvent }) => {          // CSF Next: canvas + userEvent in context
  await step('fill the form', async () => {
    await userEvent.type(canvas.getByLabelText(/email/i), 'hi@example.com');
  });
  await step('submit', async () => {
    await userEvent.click(canvas.getByRole('button', { name: /save/i }));
  });
  await waitFor(() => expect(args.onSubmit).toHaveBeenCalled());
};
```

## Good vs bad

- **GOOD** — query by **role / accessible name** (`getByRole('button', { name })`), spy callbacks with
  `fn()`, and await real signals with `waitFor` / `findBy*`. One story = one behaviour; the assertion
  reflects what a user observes.
- **BAD** — `await new Promise(r => setTimeout(r, 500))` to "wait for" the UI, or asserting on internal
  class names / DOM structure. Sleeps are flaky and structure-coupled assertions break on every refactor —
  use `waitFor`/`findBy*` and accessible queries instead.

## HARD RULES (this section)

1. **Import from `storybook/test`** (not `@storybook/test`); confirm the exact `play` arg shape via context7.
2. **Query by role / accessible name**, never by brittle CSS selectors or class names.
3. **Await async with `waitFor` / `findBy*`** — never `setTimeout`. A sleep-based test is a flaky test.
4. **Spy callbacks with `fn()`** and assert `toHaveBeenCalled*` rather than reaching into component state.
5. **A play that asserts nothing is not an interaction test** → CONCERNS; every behaviour story needs an
   `expect`.
