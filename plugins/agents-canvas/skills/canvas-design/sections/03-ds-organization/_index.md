# §03 — DS organization (atomic layering, the canvas grid, height-aware spacing, the snapshot)

Where every component physically lives, how the DS canvas is laid out, and how to space components without
overlap. **HARD RULE 3 (≤25 ops) and HARD RULE 4 (verify + height-aware Y) live here.**

---

## Atomic layering — four frames, not one

The modern DS is **four reusable frames**, one per atomic tier. (A legacy single-frame DS — one big frame
with mixed sections — is described in §06; if you find one, that is the old shape to migrate away from.)

| Tier | Holds | Examples |
|---|---|---|
| **ATOMS** | indivisible primitives | Button, Input, Badge, Avatar, Icon, Typography, Toggle, Separator, Loader |
| **MOLECULES** | small compositions of atoms | Card, StatCard, FormField, NavItem, Dropdown, Toast, Chart, Progress |
| **ORGANISMS** | large self-contained sections | DataTable, Sidebar, Header, Dialog, PageHeader, Tabs, Panel, Console, CommandPalette |
| **TEMPLATES** | screen skeletons (Layout B variants) | Screen-List, Screen-Detail, Screen-Form, Screen-Dashboard, Screen-Auth |

**Atomic placement is audited.** An atom must live in ATOMS, a molecule in MOLECULES, etc. Putting a Card in
ATOMS or a Button in MOLECULES is a Guardian FAIL (`canvas-conventions` §03). When you create a new
component, place it in the tier that matches what it *is*, not where it is convenient.

> Find the four frame IDs by name: `batch_get({patterns:[{name:"ATOMS"}]})`, etc. Reference-file IDs were
> `xGz08`/`eAPmi`/`MEUF6`/`VlVNF` — yours differ.

---

## The DS canvas grid

A DS frame uses **`layout:"none"`** (absolute positioning) so each component sits at an explicit `(x,y)`.
Columns are X bands by tier/category; rows are Y bands by variant. A roomy frame (≈5000×3500) holds 6–8
columns.

```
DS Frame (layout:"none", fill:$--background, theme:{Mode:"Dark"})
  x≈200  ATOMS col 1     x≈600  ATOMS size-variants    x≈1100 MOLECULES
  x≈1700 ORGANISMS       x≈2400 LAYOUT                  x≈3100 TEMPLATES
```

**Spacing scale (vertical gaps between siblings):**

| Between | Gap |
|---|---|
| Variant → variant (Button/Default → Button/Secondary) | **80** |
| Component → component (within a category) | **160** |
| Category → category (Buttons → Inputs) | **320** |
| Section → section (ATOMS → MOLECULES) | **600** |
| Size-variant X offset (Default ↔ Large) | **200** |
| Column → column | **400–500** |

---

## ⚠️ Height-aware Y — the formula that prevents clipping

**Never use a fixed Y step.** A fixed `+80` works for 32px buttons and silently buries a 150px card inside
the next one. Always:

```
nextY = prevY + prevHeight + gap
```

where `prevHeight` comes from the **actual** layout — read it, do not assume:

```
snapshot_layout({ parentId:"<dsFrameId>", maxDepth:1 })
// → children:[ { id, x, y, width, height }, ... ]   ← use each real height
```

Worked example (mixed heights):

```
Button/Default     y=200   h=32   → next = 200 + 32 + 80  = 312
Button/Secondary   y=312   h=32   → next = 312 + 32 + 80  = 424
Card/Default       y=600   h=150  → next = 600 + 150 + 80 = 830   (NOT 680!)
```

**Repair loop when clipping appears:**
1. `snapshot_layout({parentId:"<dsFrameId>", problemsOnly:true})` → any `fully clipped` / `partially clipped`?
2. `snapshot_layout({parentId:"<dsFrameId>", maxDepth:1})` → real heights.
3. Recompute every `y` bottom-up with the formula; emit `U("<id>", {y:<correctY>})` ops.
4. If components run past the frame edge (`fully clipped`), **grow the DS frame height** too.
5. Re-verify `problemsOnly:true` → empty.

Full copy-paste loop: [`height-aware-spacing`](../../templates/height-aware-spacing.md).

---

## Section headers

Each tier/category gets an uppercase label so the canvas reads as a catalog:

```
{ type:"text", content:"ATOMS", fill:"$--muted-foreground",
  fontFamily:"$--font-primary", fontSize:14, fontWeight:"600", letterSpacing:2 }
```

All-caps, 14px, weight 600, `letterSpacing:2`, muted color. Template:
[`ds-section-header`](../../templates/ds-section-header.md).

---

## Naming convention

`Category/Variant` · `Category/Size/Variant` · `Category/State`

| Pattern | Examples |
|---|---|
| Base | `Button/Default`, `Input/Default`, `Card` |
| Variant | `Button/Secondary`, `Button/Destructive`, `Button/Ghost` |
| Size | `Button/Large/Default`, `Button/Small/Outline` |
| State | `Checkbox/Checked`, `Sidebar Item/Active`, `Tab Item/Active` |
| Semantic | `Alert/Success`, `Badge/Error` |

Variant order (top→bottom): Default · Secondary · Destructive · Outline · Ghost.
State order: Default/Unchecked/Inactive · Checked/Active/Selected · Disabled · Error. The Guardian checks
`Category/Variant` naming (`canvas-conventions` §02).

---

## The DS snapshot (the Designer's final hand-off)

The downstream gates (Guardian, Tester) run as **sub-agents in fresh contexts** and cannot drive Pencil —
they read an **offline snapshot** the Designer exports as the last Capture step. Produce it into
`design/snapshots/<timestamp>/`:

1. **Manifest** — `export_nodes` over the DS frames (the structural dump: nodes, `ref`/`reusable`/`slot`/
   `descendants`/token-var metadata).
2. **Reference screenshots** — `get_screenshot` per component + per screen (the visual oracle the Coder's
   visual-regression tests later compare against; see `canvas-port` §03).
3. **Layout dump** — `snapshot_layout({problemsOnly:true})` (must be clean) + a `maxDepth` structural dump.

This snapshot is the audit input. If `export_nodes` does not faithfully capture ref/reusable/slot/token
metadata, the Guardian/Tester audit is degraded — flag it and surface to the coordinator rather than
shipping a blind snapshot.

## Cross-references

- What can be a component vs frame → [§01 entities-refs](../01-entities-refs/_index.md).
- Theming the `$--background` etc. used here → [§04 tokens-theming](../04-tokens-theming/_index.md).
- Clipping deep-dive + legacy single-frame DS → [§06 gotchas](../06-gotchas/_index.md).
- Guardian's atomic-layering + naming criteria → `canvas-conventions` §02, §03.
