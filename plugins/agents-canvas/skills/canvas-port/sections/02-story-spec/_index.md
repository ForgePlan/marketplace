# 02 — Story spec (Storybook `web-components` -> per-component contract)

For every component in the approved Pencil DS, the porter produces a **story spec**: the name, the
**variant matrix**, the **slot map**, and the **descendant-override points**. The Coder turns each spec
into one `*.stories.ts` file on the Storybook **`web-components`** framework. The stories are the
**behavioural contract** — Gate Code asserts the code against them, and the framework wrappers (Spread)
achieve parity against them, not against a fresh reading of the design.

> **context7 first.** Storybook's story format (CSF), the `web-components` renderer, and `args`/`argTypes`
> evolve across majors. Run `resolve-library-id("Storybook")` ->
> `query-docs(<id>, "web-components framework CSF story with args, argTypes, render with lit html")` and
> `resolve-library-id("Lit")` -> `query-docs(<id>, "render template, properties, slots")` before writing.

## Step 1 — walk the DS top-down

Read the approved DS atomic layers in order via Pencil MCP (or the exported snapshot):
`ATOMS -> MOLECULES -> ORGANISMS -> TEMPLATES`. For each reusable component (`reusable:true`) capture:

- **name** — `Category/Variant` from Pencil maps to a custom element tag `canvas-<category>` (e.g.
  `Button/Primary` -> `<canvas-button variant="primary">`).
- **props/variants** — every Pencil component property + every variant/state.
- **slots** — every named content region.
- **descendant-override points** — the nodes a Pencil instance customizes via `descendants` (these become
  CSS Custom Properties / parts / slotted overrides, NOT detached forks).

## Step 2 — the variant matrix

Enumerate the full cross-product the DS actually uses (not every theoretical combination — the ones the
design defines). This is the matrix the Coder writes a story per, and the wrappers must render
equivalently:

```yaml
component: canvas-button
tag: <canvas-button>
props:
  variant: [primary, secondary, ghost, danger]   # Pencil Button/* variants
  size:    [sm, md, lg]
  disabled: [false, true]
  loading:  [false, true]
states (visual):  [default, hover, focus-visible, active, disabled]
themes: [light, dark]                              # the two token axes (section 01)
matrix_note: |
  Canonical stories cover each `variant` x `size` once + the boolean states as separate stories
  (Disabled, Loading). Hover/focus/active are exercised by the play function, not separate stories.
```

Each row of the matrix becomes either a named export (a story) or an `args` permutation under one story.
Keep one **canonical** story per variant for the visual oracle (section 03) plus state stories for the
booleans.

## Step 3 — the slot map + descendant-override points

Distinguish the three composition mechanisms so the Coder implements them correctly and the wrappers
forward them:

| Pencil concept | Web Component mechanism | In the story |
|---|---|---|
| named content region | named `<slot name="...">` | story passes slotted light-DOM children |
| instance customizes a descendant's text/icon | default `<slot>` or a `name`d slot | story varies the slotted content |
| instance customizes a descendant's *style* | a CSS Custom Property hook (`--canvas-button-radius`) or `::part(...)` | story sets the part/custom-prop |
| instance changes structure | **NOT allowed** — that is a detach in Pencil; flag it | n/a |

```yaml
slot_map:
  canvas-card:
    default: "card body content"
    slots:
      header: "title + optional action"
      footer: "actions row"
    override_points:
      "--canvas-card-radius": "radius token hook (default radius.md)"
      "::part(surface)": "background surface, themed via token vars"
    never: "detached structural forks — a Card instance must not re-arrange header/body/footer"
```

## Step 4 — the CSF story (illustrative — confirm via context7)

One file per component, `web-components` renderer, Lit `html` render functions, `argTypes` driving the
variant matrix:

```ts
// canvas-button.stories.ts  (Storybook web-components — verify CSF shape via context7)
import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import './canvas-button';

const meta: Meta = {
  title: 'Atoms/Button',
  component: 'canvas-button',
  argTypes: {
    variant: { options: ['primary', 'secondary', 'ghost', 'danger'], control: { type: 'select' } },
    size:    { options: ['sm', 'md', 'lg'], control: { type: 'inline-radio' } },
    disabled: { control: 'boolean' },
    loading:  { control: 'boolean' },
  },
  render: ({ variant, size, disabled, loading }) => html`
    <canvas-button variant=${variant} size=${size} ?disabled=${disabled} ?loading=${loading}>
      Publish
    </canvas-button>`,
};
export default meta;
type Story = StoryObj;

export const Primary:   Story = { args: { variant: 'primary', size: 'md' } };   // canonical -> visual oracle
export const Secondary: Story = { args: { variant: 'secondary', size: 'md' } };
export const Danger:     Story = { args: { variant: 'danger', size: 'md' } };
export const Disabled:   Story = { args: { variant: 'primary', size: 'md', disabled: true } };
export const Loading:    Story = { args: { variant: 'primary', size: 'md', loading: true } };
```

> Note the Lit boolean-attribute binding `?disabled=${...}` and property binding `.prop=${...}` — these
> are the WC-interop seams the framework wrappers must reproduce (section 04). Get them right in the
> canonical story and the parity tests have a clean target.

## Step 5 — the port-manifest entry

Each component's spec is one entry in the manifest under `packages/design-system/.canvas-port/`:

```
.canvas-port/
  components/
    canvas-button/
      spec.yaml          # name + variant matrix + slot map + override points (steps 2-3)
      refs/              # reference screenshots per canonical variant + state (section 03)
```

The Coder reads `spec.yaml` + `refs/` and emits `canvas-button.ts` (Lit) + `canvas-button.stories.ts` +
the visual tests. No spec entry -> no component -> the Tester flags a coverage gap.

## HARD RULES (this section)

1. **One story file per component**, `web-components` framework, named by the Pencil `Category/Variant`.
2. **The variant matrix is the DS's actual cross-product**, not every theoretical combination — cover
   what the design defines, one canonical story per variant for the oracle.
3. **Slots and override points are composition, never detach.** A Pencil instance that re-structures a
   descendant is a detach — flag it as a Guardian finding, do not encode it as a story variant.
4. **`args`/`argTypes` drive variants** so controls match the design's real props; hidden hardcoded
   variants are untestable.
5. **context7 before writing CSF** — verify the Storybook `web-components` story shape and the Lit
   binding syntax; prompt the user to use context7 on any version question.
</content>
