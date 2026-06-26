# §02 — Layout B (the AppShell skeleton)

Every application screen uses one consistent shell — historically called **Layout B**, conceptually the
**AppShell** (Sidebar + TopBar + nested SubSidebar + ContentSlot + Console). Building every screen the same
way is what makes a 60-to-80-screen system coherent and lets a single ref update propagate everywhere.

> **IDs below are reference-file examples — rediscover yours.** The reference file used `Jw3rV` (header),
> `SFHBt` (sidebar), `Gb9A9` (subsidebar), `5dxv7` (console). In your `.pen` these are different —
> `batch_get({patterns:[{reusable:true}]})` and match by *name* (Header/Compact, Sidebar/Main,
> Sidebar/Sub, Console/Collapsed), then use the IDs you find.

---

## The skeleton

```
Screen (vertical, 1440x900, fill: $--background)        ← a Frame, NEVER reusable:true
├── header        (ref: <HEADER_REF>)        48px            full width
└── Body (horizontal, fill)
    ├── sidebar   (ref: <SIDEBAR_REF>)       48px            FULL HEIGHT (header bottom → screen bottom)
    └── RightSection (vertical, fill)
        ├── ContentRow (horizontal, fill)
        │   ├── subSidebar (ref: <SUBSIDEBAR_REF>)  180px    RightSection top → console top
        │   └── MainArea   (frame, vertical, fill, padding:24, gap:20)   ← your content goes here
        └── console   (ref: <CONSOLE_REF>)   40px            FULL WIDTH of RightSection (not the screen)
```

```
┌──────────────────────────────────────────────────────────────┐
│                    header  <HEADER_REF>  48px                  │
├────┬─────────────────────────────────────────────────────────┤
│    │   subSidebar  <SUBSIDEBAR_REF>  │        MainArea         │
│ s  │           180px                 │        (fill)           │
│ i  │                                 │                         │
│ d  ├─────────────────────────────────┴─────────────────────────┤
│ e  │          console  <CONSOLE_REF>  — full width  40px        │
│ b  │                                                            │
│ a  │                                                            │
│ r  │                                                            │
└────┴─────────────────────────────────────────────────────────┘
 48px
```

**Three placement facts people get wrong:**
- `sidebar` runs the **full screen height** (header bottom to screen bottom), `width:48`, `height:fill_container`.
- `console` belongs to **RightSection** and spans its **full width** — it starts after the sidebar, not under it.
- `subSidebar` reaches from RightSection's top **down to the console**, `width:180`, `height:fill_container`.

Build it with [`layout-b-from-scratch`](../../templates/layout-b-from-scratch.md). But prefer a template ref
(next section) whenever one fits.

---

## Prefer a screen-template ref over hand-building

Most screens match an existing **screen-template** Component. Ref the template, rename, customize MainArea +
SubSidebar via descendants — far fewer ops than rebuilding the shell. **First study the old screen**, then
match its dominant UI pattern:

| Dominant UI pattern | Screen template (rediscover ID by name) |
|---|---|
| List + table | `Screen-List` / `Template/Screen-List` |
| Detail + tabs | `Screen-Detail` |
| Create / edit form | `Screen-Form` |
| Dashboard + stat cards | `Screen-Dashboard` |
| Code editor | `Screen-Editor` |
| Graph / canvas | `Screen-Canvas` |
| Settings | `Screen-Settings` |
| Auth (no header/shell) | `Screen-Auth` |

Do **not** blindly drop everything into `Screen-List`. `batch_get({nodeIds:["<oldScreenId>"], readDepth:5})`
first; decide Table vs Cards vs Tabs vs Canvas vs Form vs Dashboard; pick the matching template. Use
[`screen-from-template-ref`](../../templates/screen-from-template-ref.md).

---

## SubSidebar customization (the module nav)

The SubSidebar is one component reused across modules; you set its icon, title, and active/inactive items
through `descendants`. Discover the child IDs with `batch_get({nodeIds:["<SUBSIDEBAR_REF>"], readDepth:3})`,
then map: header icon + title, the active item (icon + label + background), and each inactive item. Pattern
and a worked block live in [`subsidebar-customization`](../../templates/subsidebar-customization.md).

**Active vs inactive convention (adapt to your chosen brand — confirm via tokens, see §04/§05):**
- Active item: foreground fill (`$--foreground`), `fontWeight:"500"`, a filled background (`$--accent`/`$--muted`).
- Inactive items: `$--muted-foreground` fill, normal weight, `transparent` background.

**Module → item map (reference taxonomy — replace with the active product's modules):**

| Module | Items |
|---|---|
| IAM | Users, Teams, Roles, API Keys, Sessions, Audit |
| Pipelines | Jobs, ETL, Scheduler, History |
| Observe | Traces, Generations, Scores, Prompts, Datasets, Cost |
| Knowledge | Documents, Chunks, Ontology, Taxonomy, Domains |
| Discovery | Entities, Graph, Query, Communities, Vector |
| AI | Chat, Models, Providers, Prompts, Agents, Tools, Memory |
| Settings | General, Integrations, Security, Billing, Cache |

> These modules belong to the reference product. For the active scope PRD's app, the modules differ
> (e.g. an editorial product might have Sources, Stories, Variants, Schedule, Publish). Read the scope
> artifact and §07 before inventing nav.

---

## Apply UX laws while you build the shell

The shell is where most UX-law constraints land. As you place nodes, apply §07:
- **Hick / Choice Overload** → keep the top-level sidebar to **≤7 modules**; deeper choices live in the SubSidebar (progressive disclosure).
- **Fitts** → nav targets ≥44px hit area; ≥8px gaps between adjacent clickables.
- **Serial Position** → the most-used module first, the rarest last; primary action first in the PageHeader.
- **Von Restorff** → exactly **one** distinct primary CTA per screen; everything else secondary/ghost.
- **Doherty** → design the loading/skeleton state for MainArea, not just the happy state.

See [§07 ux-task-map](../07-ux-task-map/_index.md) for each law's exact Pencil-node translation.

---

## After building — verify

`get_screenshot({nodeId:"<screenId>"})` + `snapshot_layout({parentId:"<screenId>", problemsOnly:true})`.
If `console` or `subSidebar` shows `partially clipped` / `fully clipped`, the fill/height props are wrong —
see [§06 gotchas](../06-gotchas/_index.md).

## Cross-references

- Entity/ref/descendant mechanics → [§01 entities-refs](../01-entities-refs/_index.md).
- Where the screen sits on the canvas + module grid → [§03 ds-organization](../03-ds-organization/_index.md).
- Templates: [`layout-b-from-scratch`](../../templates/layout-b-from-scratch.md),
  [`screen-from-template-ref`](../../templates/screen-from-template-ref.md),
  [`subsidebar-customization`](../../templates/subsidebar-customization.md),
  [`table-actions-right`](../../templates/table-actions-right.md).
