# §07 — UX task map (law → Pencil node constraint)

The `laws-of-ux` hook keys on frontend file extensions + Write/Edit, so it **never fires on `.pen` edits**
(those go through `mcp__pencil__*`). CANVAS therefore applies the UX laws **explicitly at design time** —
this section translates each law into a concrete Pencil `batch_design` constraint, so the design is
UX-correct *before* it becomes code. The Gate Code C4 later re-checks the emitted `*.tsx/*.css` with
`/laws-of-ux:ux-review` (close-the-loop).

**Load the KB:** call `Skill(laws-of-ux:ux-laws)` proactively at design start; do mid-design lookups with
`/laws-of-ux:ux-law <name>`. This section is the *Pencil-side* of that KB.

---

## Task → law → Pencil constraint

| Designing… | Laws in play | Translate to a Pencil node constraint |
|---|---|---|
| **Navigation / sidebar** | Hick's Law, Choice Overload, Serial Position, Miller | Top-level sidebar **≤7 modules**; deeper choices in the SubSidebar (progressive disclosure). Most-used module first, rarest last. Group items in chunks of **7±2**. |
| **Interactive targets** (buttons, nav items, icon buttons) | Fitts's Law | Hit area **≥44×44px** (icon-only: pad a 24px icon to 44 — `padding:12`). **≥8px** gap between adjacent clickables (12 on touch). Primary actions in reachable zones, not corners. |
| **Primary action / CTA** | Von Restorff, Aesthetic-Usability | **Exactly one** distinct primary CTA per screen — brand accent (`$--accent`). Everything else secondary/ghost. Destructive actions smaller and **separated** from primary. |
| **Forms** | Cognitive Load, Tesler, Postel, Parkinson, Goal-Gradient | Minimize fields; chunk long forms into steps with a progress indicator; design forgiving inputs; show progress to the goal. |
| **Lists / tables / grids** | Miller, Chunking, Proximity, Similarity, Common Region | Group rows/columns; consistent row rhythm; the **actions (`⋯`) column right-aligned** (`justifyContent:"flex_end"`) — see [`table-actions-right`](../../templates/table-actions-right.md). |
| **Dashboards** | Cognitive Load, Selective Attention, Pareto | Surface the vital 20%; one focal metric (Von Restorff); demote the rest. |
| **Loading / async** | Doherty Threshold, Flow | **Design the loading/skeleton state**, not just the happy state. Target perceived response <400ms; skeleton frames for MainArea. |
| **Cards / content blocks** | Common Region, Prägnanz, Proximity | A bounded region (border/`$--surface` fill) groups related content; simple shapes; tight internal proximity, clear gaps between cards. |
| **Spacing / grouping** | Proximity, Common Region, Uniform Connectedness | Related items closer than unrelated; shared container or border to bind a group; **verify grouping with `snapshot_layout`** (gaps reveal the perceived groups). |
| **Familiar patterns** | Jakob's Law, Mental Model | Match platform conventions (search top-right, primary action where users expect); don't reinvent standard controls. |

---

## The six constraints that come up most (bake these in)

1. **Fitts** → every clickable ≥44px hit area, ≥8px neighbour gap.
2. **Hick / Choice Overload** → ≤7 top-level nav items; progressive disclosure for the rest.
3. **Miller / Chunking** → group into 7±2; never a flat list of 20 unsegmented options.
4. **Doherty / Flow** → a *designed* skeleton/loading state exists for every async surface.
5. **Von Restorff** → exactly one visually distinct primary CTA per screen.
6. **Gestalt Proximity / Common Region** → grouping is real (measured via `snapshot_layout`), not implied.

Apply them as you place nodes; record non-obvious trade-offs in the Design NOTE.

---

## Good / bad component library (design-time patterns)

| Pattern | ✅ Good (do in Pencil) | ❌ Bad (Guardian/ux-review will flag) |
|---|---|---|
| Icon button | 24px icon + `padding:12` → 48px target; `aria`-able label in the port | Bare 16px icon, 16px box — sub-target, mis-tap city |
| Nav list | ≤7 items, grouped, active item distinct (`$--foreground` + filled bg) | 18 flat items, no grouping, active state = color-only |
| Primary CTA | one accent button; secondaries are ghost/outline | three "primary" buttons competing; no focal action |
| Destructive action | smaller, separated, `$--destructive`, away from primary | "Delete" flush against "Save", same size/weight |
| Table actions | right-aligned `⋯` column, menu opens right | actions scattered per-column, left-aligned |
| Loading state | skeleton frames mirroring the loaded layout | spinner-only, or no loading state designed at all |
| Card group | bounded region + consistent gap; tight internal proximity | shadow-only separation, uneven gaps, ambiguous grouping |
| Long form | chunked steps + progress | 22 fields in one ungrouped column |

---

## Translate a law to a `batch_design` — worked example (Fitts)

```
// Icon-only action that meets Fitts: 24px icon padded to a 44px+ target, 8px from its neighbour
row = I(parent, { type:"frame", layout:"horizontal", gap:8 })            // Fitts: >=8px neighbour gap
btn = I(row, { type:"ref", ref:"<ICON_BUTTON_ID>" })                      // ref-first (HARD RULE 1)
U(btn, { width:44, height:44, padding:12 })                              // Fitts: >=44px hit area
// verify: snapshot_layout(problemsOnly:true) + get_screenshot
```

Then, in the Storybook port, the Coder carries the same rule into CSS
(`min-width:44px;min-height:44px;gap:8px`) and the Gate Code `/laws-of-ux:ux-review` confirms it — the law
survives the whole Pencil → code arc.

---

## laws-of-ux integration (how the loop closes)

| Stage | laws-of-ux usage |
|---|---|
| **Design start** | `Skill(laws-of-ux:ux-laws)` — load the KB; classify each screen/component by type → relevant laws. |
| **Mid-design** | `/laws-of-ux:ux-law <name>` — pull a specific law's *Frontend Implications + Checklist*; translate to a node constraint here. |
| **Gate Code (C4)** | `/laws-of-ux:ux-review` runs on the generated `*.tsx/*.css` (the hook can't see `.pen`, so the audit happens at the code boundary). Findings feed back into Pencil via `batch_design`. |
| **Gate Parity (C4)** | `/laws-of-ux:ux-review` re-runs per target framework's emitted code. |

## Cross-references

- Where these constraints land in the shell → [§02 layout-b](../02-layout-b/_index.md).
- The brand accent for the single CTA → [§05 style-guides](../05-style-guides/_index.md).
- The full UX-law KB → `laws-of-ux:ux-laws` (sections 01-heuristics … 05-code-patterns).
- Templates: [`table-actions-right`](../../templates/table-actions-right.md), [`ref-plus-descendants`](../../templates/ref-plus-descendants.md).
