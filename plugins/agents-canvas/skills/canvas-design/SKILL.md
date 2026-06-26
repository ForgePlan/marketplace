---
name: canvas-design
description: "Pencil designer knowledge base for the CANVAS methodology — how to design and extend a .pen Design System with refs, slots, descendants, Layout B, atomic organization, themed tokens, style presets, and UX-law-driven node constraints. Use when designing or extending a Pencil DS, building screens/components, fixing layout clipping, organizing ATOMS/MOLECULES/ORGANISMS/TEMPLATES, wiring theme variables, or translating UX laws into Pencil nodes. Triggers on: pencil design, design in pencil, .pen, design system, batch_design, refs and descendants, Layout B, subsidebar, atomic design, design tokens, theme variables, screen template, table actions, clipping, snapshot_layout, get_screenshot, warm-paper brand, expo monochrome, style guide, ds organization, ux constraints in pencil."
---

# canvas-design — the fat lazy Pencil-designer KB

This is the knowledge base the **`canvas-designer`** agent (CANVAS phase **C — Capture**) and the MAIN
session use to design and extend a `.pen` Design System and produce the DS snapshot the downstream
gates audit. It is a **fat lazy agentic-RAG** skill: this `SKILL.md` is a thin nav-map — load only the
`sections/NN-*/_index.md` and `templates/*.md` relevant to the task at hand, never all of it.

It pairs with three sibling skills: `canvas-conventions` (the Guardian's audit rules — the conscience
that checks what you build here), `canvas-port` (Pencil → Storybook → framework porting), and
`canvas-truth-map` (DS ↔ PRD/ADR/EVID coverage). Design *to* the conventions; this KB and that one are
two sides of one coin.

---

## THE SIX HARD RULES (always loaded — non-negotiable Pencil discipline)

These are loaded on every use. The KB sections elaborate; these are the spine. Violating any one is a
DS-build defect the Guardian will FAIL.

1. **Ref-first.** Always `ref` a DS component and customize via `descendants` / `slot`. **Never** build a
   primitive (button, input, badge, card) from raw frames. → §01, §07.
2. **Check-DS-first.** `batch_get({patterns:[{reusable:true}]})` *before* creating anything. **Rediscover
   IDs per `.pen` file** — every node ID in this KB is a *file-specific example* from a reference file and
   does not exist in yours. → §01, §02.
3. **≤25 ops per `batch_design`.** Split larger work into multiple calls. → §03, every template.
4. **Verify-after-every-batch.** `get_screenshot` + `snapshot_layout({problemsOnly:true})` after *each*
   `batch_design`. Use height-aware spacing: `nextY = prevY + prevHeight + gap` — never a fixed step. → §03, §06.
5. **Never detach for minor edits. Never make a screen `reusable:true`.** Detach breaks the DS link;
   descendants preserve it. Screens are unique, not components. → §01, §06.
6. **Never delete/refactor without user approval** + an OLD-vs-NEW `get_screenshot` comparison. **Never
   `Read` / `Grep` a `.pen` file** — it is encrypted; the Pencil MCP tools are the only access. → §06.

---

## How to use (agentic RAG)

### Step 0 — schema first (mandatory)

If you do not have the current `.pen` schema in context, call
`pencil get_editor_state({include_schema:true})` **before any other Pencil tool**. The schema is required
to use `batch_get` / `batch_design` / `snapshot_layout`. (Server contract — see the Pencil MCP
instructions.)

### Step 1 — identify the design concern → jump to the section

| What you are doing | Load |
|---|---|
| Deciding Frame vs Component vs Instance; using refs / slots / descendants; avoiding detach | [§01 entities-refs](sections/01-entities-refs/_index.md) |
| Building a screen (the AppShell / Layout B skeleton, subsidebar map, screen-template table) | [§02 layout-b](sections/02-layout-b/_index.md) |
| Placing components in the DS canvas (ATOMS/MOLECULES/ORGANISMS/TEMPLATES, grid, height-aware Y) | [§03 ds-organization](sections/03-ds-organization/_index.md) |
| Wiring theme tokens (`$--vars`, Mode:Light/Dark, get/set_variables, Style-Dictionary seam) | [§04 tokens-theming](sections/04-tokens-theming/_index.md) |
| Choosing a visual style (warm-paper brand, Expo monochrome, reference products, **getdesign.md**) | [§05 style-guides](sections/05-style-guides/_index.md) |
| Debugging clipping, cross-file refs, file-specific IDs, legacy DS, deep nesting | [§06 gotchas](sections/06-gotchas/_index.md) |
| Translating a UX law into concrete Pencil node constraints (Fitts/Hick/Miller/Doherty/Von Restorff/Gestalt) | [§07 ux-task-map](sections/07-ux-task-map/_index.md) |

### Step 2 — grab the copy-paste template

The [`templates/`](templates/) directory is a library of ready `batch_design` blocks. Copy the one that
matches, swap the placeholder IDs for your rediscovered ones, run, verify. See the **Template index** below.

### Step 3 — verify, then produce the snapshot

After every `batch_design`: `get_screenshot` + `snapshot_layout({problemsOnly:true})`. When the slice is
clean, the Designer's final step is the **DS snapshot** (`export_nodes` manifest + reference screenshots +
a `snapshot_layout` dump → `design/snapshots/<ts>/`) — the hand-off Guardian/Tester read offline. See §03.

---

## Section INDEX

| # | Section | What it covers |
|---|---------|----------------|
| 01 | [entities-refs](sections/01-entities-refs/_index.md) | Frame vs Component vs Instance; `reusable:true`; `ref`; `descendants`; `slot`; detach (and why not) |
| 02 | [layout-b](sections/02-layout-b/_index.md) | The AppShell / Layout B skeleton, ref roles, SubSidebar module map, screen-template matching table |
| 03 | [ds-organization](sections/03-ds-organization/_index.md) | Atomic layering, the DS canvas grid (`layout:none`), spacing scale, **height-aware Y formula**, section headers, the snapshot |
| 04 | [tokens-theming](sections/04-tokens-theming/_index.md) | `$--var` tokens, the theme axis (Mode:Light/Dark), `get_variables`/`set_variables`, the Style-Dictionary → CSS-var seam (**context7**) |
| 05 | [style-guides](sections/05-style-guides/_index.md) | The **warm-paper** brand, the Expo monochrome preset, reference products by module, the **getdesign.md** reference workflow |
| 06 | [gotchas](sections/06-gotchas/_index.md) | Clipping, cross-file refs, file-specific IDs, legacy single-frame DS, nesting depth, encrypted `.pen` |
| 07 | [ux-task-map](sections/07-ux-task-map/_index.md) | Task → UX-law routing → Pencil node constraint; good/bad component library; `laws-of-ux` integration |

## Template index — copy-paste `batch_design` library

| Template | Use when |
|---|---|
| [layout-b-from-scratch](templates/layout-b-from-scratch.md) | New screen, no fitting template — build the AppShell skeleton from refs |
| [screen-from-template-ref](templates/screen-from-template-ref.md) | New screen that matches an existing screen-template (the preferred path) |
| [ref-plus-descendants](templates/ref-plus-descendants.md) | Customize any DS component instance without detaching |
| [subsidebar-customization](templates/subsidebar-customization.md) | Set the module icon/title + active/inactive nav items in the SubSidebar |
| [height-aware-spacing](templates/height-aware-spacing.md) | Lay out / repair DS canvas columns with no clipping |
| [table-actions-right](templates/table-actions-right.md) | A table/grid row with the actions (`⋯`) column right-aligned |
| [expo-monochrome-card](templates/expo-monochrome-card.md) | A flat, borderless-shadow, rectangular monochrome card (Expo preset) |
| [ds-section-header](templates/ds-section-header.md) | An uppercase section header label (ATOMS / MOLECULES / …) |
| [themed-color-var](templates/themed-color-var.md) | Define a Light/Dark themed color token via `set_variables` |
| [generate-image](templates/generate-image.md) | Fill a frame with a stock or AI image (`G(...)`) |

## Cheatsheet

[cheatsheet.md](cheatsheet.md) — the CAN / CANNOT one-pager. Read it when in doubt before a `batch_design`.

## context7 obligation (when this KB touches library code)

§04 (tokens-theming) and `canvas-port` reach into **Style-Dictionary** and **Storybook**. When you act on
that seam — config, build, the `tokens.json` → CSS-var compile — you **MUST** consult the **context7 MCP**
(`resolve-library-id` → `query-docs`) for Style-Dictionary / Storybook / Lit docs **before** writing any
config or code, and prompt the user to use context7 on any library/version question. Design-stage Pencil
work needs no context7; the moment a token contract becomes a compiled artifact, it does.

## Related

- Agent: `canvas-designer` (this KB's primary consumer) · Master: `canvas-coordinator` · Entry: `/canvas`.
- Siblings: `canvas-conventions` (audit rules), `canvas-port` (porting), `canvas-truth-map` (DS↔ForgePlan).
- UX: `laws-of-ux:ux-laws` (load proactively), `/laws-of-ux:ux-law <name>` (mid-design lookup).
- Pencil MCP: `get_editor_state`, `get_guidelines`, `batch_get`, `batch_design`, `snapshot_layout`,
  `get_screenshot`, `get_variables`, `set_variables`, `export_nodes`.
