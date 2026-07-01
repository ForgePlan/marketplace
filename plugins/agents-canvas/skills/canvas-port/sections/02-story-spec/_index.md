# 02 — Story spec (Storybook, resolved-framework renderer -> per-component contract)

For every component in the approved Pencil DS, the porter produces a **story spec**: the name, the
**variant matrix**, the **slot map**, and the **descendant-override points**. The Coder turns each spec
into one `*.stories.ts` file on the Storybook renderer **for the project's resolved framework** (resolved
in Step 0 — see below). The stories are the **behavioural contract** — Gate Code asserts the code against
them. (Only if the user makes an explicit multi-framework request do the optional wrappers of section 04
also achieve parity against these same stories; the default single-framework build has no wrappers.)

> **context7 first.** Storybook's story format (CSF), the renderer for the resolved framework, and
> `args`/`argTypes` evolve across majors. Run `resolve-library-id("Storybook")` ->
> `query-docs(<id>, "<resolved-framework> renderer CSF story with args, argTypes, render function")` and
> `resolve-library-id("<resolved framework>")` ->
> `query-docs(<id>, "component template, props, slots/children")` before writing. (When the resolved
> framework is Web Components, that renderer is `web-components` and the library is Lit.)

## Step 0 — resolve the target framework (do this before any spec)

The project's **framework is an INPUT**, not a CANVAS default. Before authoring any story spec, resolve it:
detect the stack from `AGENTS.md` / `CLAUDE.md` / `package.json` (and any DS/coordinator scope artifact).
**Announce** the detected framework to the user; if nothing is detectable, **force-ask** — never silently
assume one. CANVAS then generates **natively** in that one resolved framework: the stories, the component
code, and the visual tests all target it. **Web Components (Lit) is one selectable target** — chosen only
when the project's declared stack IS Web Components — not the canonical output. Record the resolved
framework so Gate Code and section 03 assert against the right renderer.

## Step 1 — walk the DS top-down

Read the approved DS atomic layers in order via Pencil MCP (or the exported snapshot):
`ATOMS -> MOLECULES -> ORGANISMS -> TEMPLATES`. For each reusable component (`reusable:true`) capture:

- **name** — `Category/Variant` from Pencil maps to a component in the resolved framework's idiom, named
  `Canvas<Category>` (e.g. `Button/Primary` -> a `Canvas Button` with `variant="primary"`). When the
  resolved framework is Web Components this is the custom-element tag `canvas-<category>`
  (`<canvas-button variant="primary">`); in a component framework it is the native component
  (`<CanvasButton variant="primary" />`). The worked examples below use the Web-Components instantiation.
- **props/variants** — every Pencil component property + every variant/state.
- **slots** — every named content region.
- **descendant-override points** — the nodes a Pencil instance customizes via `descendants` (these become
  CSS Custom Properties / parts / slotted overrides, NOT detached forks).

## Step 1.5 — reuse vs extend-variant vs new (run before emitting each spec entry)

Before you emit a spec entry for a candidate Pencil node, decide whether it is a **new component at
all**. Compare the candidate against the components already in the manifest (and the DS's existing
tags) on **four axes**:

| Axis | Question |
|---|---|
| **visual** | Same shape/role in the layout — does it look like an existing component? |
| **functional** | Same job — does it do the same thing (submits, groups, navigates)? |
| **behavioral** | Same interactions — same triggers + expected reactions (Step 3.6)? |
| **contextual** | Same place in the hierarchy — same atomic layer / same parent contexts? |

Three outcomes:

- **reuse** — all four axes match an existing component -> use it as-is, emit **no** new spec entry.
- **extend-variant** — differs in **exactly one** axis -> add a `variant`/`size` to the **existing**
  component's variant matrix (Step 2), **never a new tag**. Grow that component's `spec.yaml` matrix;
  do not fork a component.
- **new** — the **functional** axis differs (or two-plus axes differ) -> a new tag + a new `spec.yaml`.

> Anti-pattern: minting `PrimaryButton` / `DangerButton` / `LargeButton` as separate components.
> `"PrimaryButton"` is a `variant` of `<canvas-button>`, **not** a new component — a different *look*
> or *size* is a matrix row, not a new tag. A new tag is justified only by a different **function**.

## Step 2 — the variant matrix

Enumerate the full cross-product the DS actually uses (not every theoretical combination — the ones the
design defines). This is the matrix the Coder writes a story per (and, on the optional multi-framework
path only, the matrix each wrapper must render equivalently):

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

Distinguish the three composition mechanisms so the Coder implements them correctly in the resolved
framework (and, on the optional multi-framework path, so any wrappers forward them):

| Pencil concept | Resolved-framework mechanism (Web Components shown) | In the story |
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

## The acceptance oracle — Steps 2 + 3.5 + 3.6

> **Meta-pattern (RFC-021 C4 / ADR-010).** The porter authors the per-component **acceptance oracle**:
> the variant matrix (Step 2) + the data states (Step 3.5) + the interactions (Step 3.6). The Storybook
> validator then runs *that spec-derived checklist* — **not only its fixed six checks**. The spec IS the
> per-component test plan: a variant, data state, or interaction the porter omits is a check the
> validator can never run. Completeness of the oracle is load-bearing — author it, do not assume the
> validator will infer it.

## Step 3.5 — data states (the data oracle — MANDATORY for data-driven layers)

A **data state** is the shape of the *data* the component renders — orthogonal to a *visual* state.
For every component on the **ORGANISM / TEMPLATE / PAGES** layers (the layers that bind to data) the
spec MUST enumerate the data states, and the DS must have **one story per data state**:

| Data state | What it renders |
|---|---|
| `empty` | no data yet — the zero/empty-state design |
| `loading` | data in flight — skeleton / spinner |
| `error` | the fetch/validation failed — the error design |
| `success` | a transient success acknowledgement (only if the design defines one) |
| `populated` | the normal case — data present and rendered |

```yaml
data_states: [empty, loading, error, populated]   # ORGANISM/TEMPLATE/PAGES — one story EACH
# add `success` only when the design defines a distinct success acknowledgement
```

**ATOMS / MOLECULES that bind no data are exempt** — write `data_states: n/a` **explicitly** (never
omit the key). A `<canvas-button>` has no data states; a `<canvas-order-table>` MUST cover them.

**Data states are NOT visual states.** `hover` / `focus-visible` / `active` / `disabled` stay in the
**variant matrix** (Step 2, `states (visual)`). `empty` / `loading` / `error` are *data* and live
here, one named story export each (the validator counts them). Do not conflate the two axes.

## Step 3.6 — interactions (the interaction oracle — every affordance accounted for)

For **every interactive affordance** the component exposes, list a row of
`(affordance | trigger | expected reaction)`:

```yaml
interactions:
  - affordance: submit button        # the thing the user can act on
    trigger: click | Enter           # how it is actuated
    reaction: emits `submit` event, sets loading=true     # the observable expected reaction
  - affordance: row checkbox
    trigger: click | Space
    reaction: toggles row selection, emits `selection-change`
  - affordance: decorative banner    # not interactive
    trigger: —
    reaction: static                 # explicitly marked — never silently skipped
```

**ANTI-OMISSION.** Every affordance that appears in the variant matrix is **either** spec'd with an
expected reaction **or** explicitly marked `static`. An affordance that is neither is a spec gap, not
a passing component — never silently skip one (HARD RULE 7).

## Step 4 — the CSF story (illustrative — confirm via context7)

One file per component, on the **resolved framework's Storybook renderer**, its render function, and
`argTypes` driving the variant matrix. The example below is the **Web-Components instantiation**
(`web-components` renderer + Lit `html`); on another resolved framework use that framework's renderer and
render function (verify the exact CSF shape via context7):

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

> Note the Lit boolean-attribute binding `?disabled=${...}` and property binding `.prop=${...}` — when the
> resolved framework is Web Components these are the interop seams; on the optional multi-framework path
> (section 04) any wrappers must reproduce them. Get the bindings right in the canonical story and the
> parity tests have a clean target.

## Step 5 — the port-manifest entry

Each component's spec is one entry in the manifest under `packages/design-system/.canvas-port/`:

```
.canvas-port/
  components/
    canvas-button/
      spec.yaml          # name + variant matrix + slot map + override points + data_states + interactions (steps 1.5-3.6)
      refs/              # reference screenshots per canonical variant + state (section 03)
```

The Coder reads `spec.yaml` + `refs/` and emits the component in the resolved framework (e.g.
`canvas-button.ts` for a Web-Components/Lit target) + its `canvas-button.stories.ts` +
the visual tests. No spec entry -> no component -> the Tester flags a coverage gap. The `spec.yaml`
acceptance oracle (variant matrix + `data_states` + `interactions`) is also the Storybook validator's
spec-derived checklist — an omitted oracle row is a check that never runs.

## HARD RULES (this section)

1. **One story file per component**, on the resolved framework's Storybook renderer (`web-components` only
   when the resolved framework IS Web Components), named by the Pencil `Category/Variant`.
2. **The variant matrix is the DS's actual cross-product**, not every theoretical combination — cover
   what the design defines, one canonical story per variant for the oracle.
3. **Slots and override points are composition, never detach.** A Pencil instance that re-structures a
   descendant is a detach — flag it as a Guardian finding, do not encode it as a story variant.
4. **`args`/`argTypes` drive variants** so controls match the design's real props; hidden hardcoded
   variants are untestable.
5. **context7 before writing CSF** — verify the Storybook story shape for the resolved framework's renderer
   and that framework's binding syntax (the `web-components`/Lit shape when the resolved framework is Web
   Components); prompt the user to use context7 on any version question.
6. **`data_states` is mandatory for ORGANISM/TEMPLATE/PAGES**, one story per state
   (`empty`/`loading`/`error`/`populated`, `success` if defined); data-less atoms/molecules write
   `data_states: n/a` explicitly. Data states are NOT visual states — `hover`/`focus`/`disabled` stay
   in the variant matrix (Step 3.5).
7. **Anti-omission: every affordance is accounted for.** Each affordance in the variant matrix is
   either spec'd in `interactions` with an expected reaction **or** explicitly marked `static` — never
   silently skipped (Step 3.6).
8. **Reuse vs extend-variant vs new (Step 1.5).** A look/size-only difference grows an existing
   component's variant matrix — it is NEVER a new tag. Mint a new tag only for a different function.
