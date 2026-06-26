# Template — Ref + descendants (customize without detaching)

**Use when:** placing any DS component and changing its text / color / icon / visibility — i.e. almost every
component placement. The canonical way to customize while **keeping the DS link** (HARD RULES 1, 5).

**Step 1 — find the component + its child IDs:**
```
batch_get({ patterns:[{ name:"Button/Default" }] })       // → <COMPONENT_ID>
batch_get({ nodeIds:["<COMPONENT_ID>"], readDepth:3 })    // → child IDs (label, icon, bg, …)
```

**Pattern A — at insert time (`descendants` block):**
```
btn=I(parent, {
  type:"ref",
  ref:"<COMPONENT_ID>",
  descendants:{
    "<LABEL_ID>": { content:"Publish" },
    "<ICON_ID>":  { iconFontName:"send", fill:"$--foreground" }
  }
})
```

**Pattern B — after insert (`U` per child, via the `/childId` path):**
```
btn=I(parent, { type:"ref", ref:"<COMPONENT_ID>" })
U(btn + "/<LABEL_ID>", { content:"Publish" })
U(btn + "/<ICON_ID>",  { iconFontName:"send" })
```

**Pattern C — copy a template with overrides (`C`):**
```
card=C("<CARD_TEMPLATE_ID>", parent, {
  descendants:{
    "<TITLE_ID>": { content:"Story queue" },
    "<DESC_ID>":  { content:"12 awaiting review" }
  }
})
```

**What `descendants` can do:** change `content`, `fill`, `fontSize`, `fontWeight`, `iconFontName`; hide via
`{ visible:false }` or `{ enabled:false }`; override any style — **anything that is not structural**.

**What it must NOT become:** a detach. If you need a *structural* change, build a **new component** and ref
it (§01) — never detach to "just tweak" (HARD RULE 5).

**Use tokens, not hex:** prefer `$--foreground` / `$--accent` over literals (§04).

**Verify (HARD RULE 4):** `get_screenshot({ nodeId:"<btn>" })`.
