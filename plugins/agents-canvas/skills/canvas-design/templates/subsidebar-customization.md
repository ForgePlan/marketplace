# Template — SubSidebar customization

**Use when:** setting a screen's module nav — the SubSidebar's header icon/title and its active/inactive
items. One component reused across modules; you parameterize it via `descendants` (HARD RULE 1, no detach).

**Step 1 — find the SubSidebar child IDs (file-specific):**
```
batch_get({ patterns:[{ name:"Sidebar/Sub" }] })          // → <SUBSIDEBAR_REF>
batch_get({ nodeIds:["<SUBSIDEBAR_REF>"], readDepth:3 })  // → header icon/title + per-item icon/label/bg IDs
```

**Step 2 — customize (`batch_design`):**
```
subSidebar=I(content, {
  type:"ref",
  ref:"<SUBSIDEBAR_REF>",
  descendants:{
    // module header
    "<HDR_ICON_ID>":  { iconFontName:"<module-icon>" },
    "<HDR_TITLE_ID>": { content:"<Module>" },

    // ACTIVE item — foreground + filled background
    "<ACT_ICON_ID>":  { iconFontName:"<item-icon>", fill:"$--foreground" },
    "<ACT_LABEL_ID>": { content:"<Active Item>", fill:"$--foreground", fontWeight:"500" },
    "<ACT_BG_ID>":    { fill:"$--accent" },        // or $--muted — confirm via tokens (§04/§05)

    // INACTIVE item — muted + transparent background
    "<INA_ICON_ID>":  { iconFontName:"<item-icon>", fill:"$--muted-foreground" },
    "<INA_LABEL_ID>": { content:"<Inactive Item>", fill:"$--muted-foreground", fontWeight:"normal" },
    "<INA_BG_ID>":    { fill:"transparent" }
    // …repeat the inactive trio per remaining item
  }
})
```

**Active/inactive convention:** active = `$--foreground` + weight 500 + filled bg; inactive =
`$--muted-foreground` + normal weight + transparent bg. (Your project's chosen brand adapts the exact accent — §05.)

**Module → items** (reference taxonomy — replace with the active product's modules from the scope PRD):
IAM · Pipelines · Observe · Knowledge · Discovery · AI · Settings (see [§02](../sections/02-layout-b/_index.md)).
For an editorial product, for example, expect modules like Sources / Stories / Variants / Schedule / Publish —
always read your app's modules from the active scope PRD.

**Apply UX laws (§07):** keep items grouped (Miller 7±2), the active one distinct (Von Restorff), targets
≥44px (Fitts).

**Verify (HARD RULE 4):** `get_screenshot({ nodeId:"<subSidebar>" })` — confirm exactly one active item.
