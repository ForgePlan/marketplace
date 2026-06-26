# Template — Screen from a screen-template ref

**Use when:** a new screen matches an existing screen-template (List / Detail / Form / Dashboard / Editor /
Canvas / Settings / Auth). **This is the preferred path** — a few ops vs rebuilding the shell.

**Step 1 — study the old screen first (don't blind-match):**
```
batch_get({ nodeIds:["<oldScreenId>"], readDepth:5 })
// decide the dominant pattern: Table? Cards? Tabs? Canvas? Form? Dashboard?
```

**Step 2 — match the pattern to a template (rediscover the ID by name):**
| Pattern | Template name |
|---|---|
| List + table | `Screen-List` |
| Detail + tabs | `Screen-Detail` |
| Create/edit form | `Screen-Form` |
| Dashboard + stats | `Screen-Dashboard` |
| Code editor | `Screen-Editor` |
| Graph/canvas | `Screen-Canvas` |
| Settings | `Screen-Settings` |
| Auth (no shell) | `Screen-Auth` |
```
batch_get({ patterns:[{ name:"Screen-List" }] })   // → its real <TEMPLATE_REF>
```

**Step 3 — instantiate + rename + customize (`batch_design`):**
```
screen=I(document, { type:"ref", ref:"<TEMPLATE_REF>" })
U("<screen>", { name:"Screen/<Name>" })
// SubSidebar via descendants → see subsidebar-customization.md
// MainArea content via refs → see ref-plus-descendants.md
```

**Notes:**
- The instantiated screen is a plain instance — **not** `reusable:true`.
- Customize through `descendants` / `slot`, **never detach** (HARD RULES 1, 5).
- Keep MainArea content as DS refs.

**Verify (HARD RULE 4):**
```
get_screenshot({ nodeId:"<screen>" })
snapshot_layout({ parentId:"<screen>", problemsOnly:true })
```

**If this is a refactor of an existing screen:** build the new one nearby, `get_screenshot` OLD and NEW,
present the comparison, and **wait for explicit approval before deleting** the old (HARD RULE 6). Use
`M` (move) to carry content over, never `D` (delete) content mid-refactor.
