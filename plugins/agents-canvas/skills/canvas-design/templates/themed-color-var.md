# Template — Themed color variable (Light / Dark)

**Use when:** defining or updating a brand color token that re-themes across the Mode axis. Tokens are the
single source of truth; nodes reference them as `$--var` (§04). **Confirm values against the active tokens
RFC / brand ADR** — the hexes below are an *example* brand starter preset (§05), not law. The real values
come from your project's chosen brand as recorded in the scope artifact.

**Step 1 — inspect what exists (reuse, don't duplicate):**
```
get_variables({ filePath:"<.pen>" })   // current tokens + declared theme axes
```

**Step 2 — declare the axis once (if not present):**
```
set_variables({ filePath:"<.pen>", variables:{ themes:{ Mode:["Light","Dark"] } } })
```

**Step 3 — define the themed color (default = Light, plus a Dark override). The hexes below are *example*
tokens from one chosen brand — replace each with your project's recorded brand values:**
```
set_variables({ filePath:"<.pen>", variables:{
  "--background": { type:"color", value:[
    { value:"#FAF6EF" },                         // example token from a chosen brand — Light bg
    { value:"#1A1714", theme:{ Mode:"Dark" } }   // example token from a chosen brand — Dark bg
  ]},
  "--foreground": { type:"color", value:[
    { value:"#2B2620" },                         // example token from a chosen brand — Light fg
    { value:"#EDE6D8", theme:{ Mode:"Dark" } }   // example token from a chosen brand — Dark fg
  ]},
  "--accent": { type:"color", value:[
    { value:"#B5532A" },                         // example token from a chosen brand — Light accent
    { value:"#D8743E", theme:{ Mode:"Dark" } }   // example token from a chosen brand — Dark accent
  ]}
}})
```

**Step 4 — apply the axis on the DS frame / screens, reference the token on nodes:**
```
U("<dsFrameId>", { theme:{ Mode:"Dark" }, fill:"$--background" })
// nodes: { fill:"$--background" } / { fill:"$--foreground" } — never raw hex
```

**Rules:**
- `get_variables` first — reuse an existing token; never redefine under a new name (§04).
- Every themed color carries **both** Light and Dark values; verify contrast passes **AA** in both (§07).
- Keep axis names stable (`Mode`) — they map straight to Storybook theme globals + the token tool in the
  port (`canvas-port` §01).

**context7 obligation:** when these tokens become `tokens.json` / token-tool config, consult context7
(`resolve-library-id "<your token tool, e.g. Style Dictionary>"` → `query-docs`) **before** writing the config, and prompt the user
to use context7 on any version question (§04).

**Verify:** `get_variables` echoes the new token; `get_screenshot` of a frame in each Mode looks right.
