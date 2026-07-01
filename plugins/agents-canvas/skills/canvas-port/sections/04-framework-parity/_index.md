# 04 — Framework parity (OPTIONAL multi-framework path — out of the default pipeline)

> **This section is OPTIONAL and out of the default pipeline.** The default CANVAS build generates
> **natively in the project's single resolved framework** (detected in Step 0 — see section 02) and has
> **no master + no wrappers + no parity step**. Only when the user makes an **explicit multi-framework
> request** (ship the same design system to more than one framework) does the coordinator dispatch this
> path. The multi-framework wrapper topology below is **deferred to a future ADR-016** — it is not part of
> the default single-framework contract.

The optional **multi-target port** (`canvas-porter-framework`, SUB — an OPTIONAL porter, dispatched
**only** on an explicit multi-framework request) ports the components to the requested target frameworks.
When this path is taken, the topology is: one **master** implementation (built in whichever stack the user
picks as the shared base — e.g. Web Components / Lit when the shared base IS Web Components) and each
additional framework ships a **thin wrapper** over the **same** underlying elements. There is exactly one
implementation of behaviour (the master element) and one token source (`tokens.json`, section 01). Wrappers
add framework-idiomatic ergonomics (typed props, events, slots, SSR) — they **never** re-implement the
component and **never** fork a token value.

> **context7 is MANDATORY here, per framework.** Each framework's interop story differs and changes by
> version. Before writing a wrapper run, for that framework:
> `resolve-library-id("<target framework>")` ->
> `query-docs(<id>, "wrap the master element: properties vs attributes, events, refs, SSR")`, and — when
> the shared base is Web Components — `resolve-library-id("Lit")` ->
> `query-docs(<id>, "framework wrappers @lit/react createComponent, SSR declarative shadow DOM")`. Prompt
> the user to use context7 on any version question.

## The parity contract

A wrapper passes parity when, for **every** row of the component's variant matrix (section 02):

1. it renders the **same** master element with the **same** attributes/properties;
2. it reaches **visual** parity against the **same** reference screenshots (section 03);
3. it forwards **slots**, **events**, and **descendant-override points** idiomatically;
4. it reads tokens **only** from the compiled CSS vars / JS export — **zero** forked values.

Parity is asserted against the **stories**, not a re-reading of the design. The story is the behavioural
contract; the screenshot is the visual contract.

## Per-framework WC-interop gotchas (when the shared base is Web Components — verify each via context7)

| Framework | Props vs attributes | Events | Gotcha to handle in the wrapper |
|---|---|---|---|
| **React** | React (≤18) sets everything as **attributes** and stringifies objects; non-string props (objects/arrays/booleans-as-props) need a `ref` or `@lit/react` `createComponent`. React 19 improves custom-element prop handling. | DOM `CustomEvent`s don't map to `onX` JSX props pre-19 — bind via `ref.addEventListener`. | Prefer the official **`@lit/react`** wrapper to get typed props + `onEvent` callbacks; otherwise wrap with a `ref`. |
| **Vue 3** | Binds **properties** when they exist; works well out of the box. | `@my-event` listens to `CustomEvent`. | Tell the compiler the tag is a custom element (`compilerOptions.isCustomElement` / `app.config.compilerOptions`) so Vue doesn't warn/resolve it as a component. |
| **Svelte** | Binds attributes/properties; good native CE support. | `on:my-event` works. | Boolean attributes + non-string props: bind as properties; SSR emits the tag, hydration upgrades it. |
| **Angular** | Property + attribute binding via templates. | `(my-event)` event binding works. | Add **`CUSTOM_ELEMENTS_SCHEMA`** to the module/component so Angular accepts unknown `<canvas-*>` tags. |
| **Solid** | Sets **attributes** by default; use `prop:foo` to set a property and `attr:foo` to force an attribute. | `on:my-event` for CustomEvents. | Use `prop:`/`attr:` namespaces deliberately for non-string props; refs for imperative access. |

> **SSR / hydration.** Web Components SSR uses Declarative Shadow DOM. If a target app is SSR'd
> (Next/Nuxt/SvelteKit/Angular Universal/SolidStart), confirm the framework's DSD + custom-element
> hydration story via context7 and gate it behind a feature check — do not assume SSR parity without a
> snapshot.

## Wrapper shape (illustrative — confirm APIs via context7)

```tsx
// React wrapper via @lit/react (preferred) — typed props + events, zero re-implementation
import { createComponent } from '@lit/react';
import * as React from 'react';
import { CanvasButton as CanvasButtonWC } from '@canvas/design-system';

export const CanvasButton = createComponent({
  react: React,
  tagName: 'canvas-button',
  elementClass: CanvasButtonWC,
  events: { onPress: 'canvas-press' },   // CustomEvent('canvas-press') -> onPress prop
});
// Props (variant/size/disabled/loading) are typed from the element class — no forked enums.
```

```vue
<!-- Vue 3 wrapper — declare the custom element, forward props/slots/events -->
<script setup lang="ts">
import '@canvas/design-system/canvas-button';
defineProps<{ variant?: string; size?: string; disabled?: boolean; loading?: boolean }>();
</script>
<template>
  <canvas-button :variant="variant" :size="size" :disabled="disabled" :loading="loading"
                 @canvas-press="$emit('press')"><slot /></canvas-button>
</template>
<!-- vite/vue compilerOptions.isCustomElement must match /^canvas-/ -->
```

The Svelte/Angular/Solid wrappers follow the same shape: import the registered element, forward the
matrix props, forward slots, re-emit the `CustomEvent`s as idiomatic events. **No wrapper imports
`tokens.json` or redeclares a value** — it inherits the shadow-DOM vars from the Lit base.

## Parity tests

For each framework, mount each canonical story's element through the wrapper and assert:

1. **Render parity** — the wrapper produces the expected `<canvas-*>` with the expected attrs/props
   (DOM assertion).
2. **Visual parity** — Playwright screenshot of the wrapper-mounted element matches the **same**
   reference baseline as the canonical Storybook story (reuse section 03 baselines; do not fork them).
3. **Event parity** — firing the element's `CustomEvent` invokes the wrapper's idiomatic callback.
4. **Token parity** — computed styles resolve to the **same** CSS custom-property values; a different
   resolved hex/px is a forked-token CRITICAL.

```ts
// react/canvas-button.parity.spec.tsx (illustrative — confirm Playwright CT / RTL via context7)
test('react wrapper reaches visual parity with the canonical Primary story', async ({ mount, page }) => {
  await mount(<CanvasButton variant="primary" size="md">Publish</CanvasButton>);
  await expect(page.locator('canvas-button')).toHaveAttribute('variant', 'primary');
  await expect(page).toHaveScreenshot('primary-md-light.png', { maxDiffPixelRatio: 0.02 }); // shared baseline
});
```

## What Gate Parity checks

`code-reviewer` + `tester` (SUB) verify, per framework:

- **Variant coverage** — every matrix row renders equivalently across all requested wrappers.
- **No forked tokens** — grep the wrapper packages for literal hex/px that should be a token var; any hit
  is a CRITICAL.
- **No re-implementation** — a wrapper that re-draws the component (instead of wrapping the element) is a
  topology violation -> BLOCKER.
- **Idiomatic interop** — props/events/slots use each framework's native mechanism (the gotchas table),
  not string-only attribute hacks where a property is required.

## HARD RULES (this section)

0. **This section is OPTIONAL and out of the default pipeline.** It runs **only** on an explicit
   multi-framework request. The default CANVAS build is single-framework native — no master, no wrappers,
   no parity step. The multi-framework wrapper topology is deferred to a future ADR-016.
1. **One master, N wrappers (multi-framework path only).** Wrappers wrap the shared master element; they
   never re-implement behaviour or structure. The master is built in whichever stack the user picks as the
   shared base (Web Components / Lit only when that shared base IS Web Components).
2. **Never fork token values.** Wrappers read the compiled CSS vars / JS export only. Missing value ->
   add to `tokens.json` + recompile (section 01), never inline.
3. **Parity is against the stories + the shared screenshots**, not a re-reading of the design; reuse the
   section 03 baselines across the requested frameworks.
4. **Handle each framework's interop seam explicitly** — props-vs-attributes, events, SSR, and (for a
   Web-Components shared base) `CUSTOM_ELEMENTS_SCHEMA`/`isCustomElement`/`prop:`, CustomEvents, DSD — per
   the gotchas table.
5. **context7 before each wrapper** — resolve + query that framework's interop and (when the shared base
   is Web Components) Lit's wrapper utilities; prompt the user to use context7 on any version question.
