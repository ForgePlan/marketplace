# Template — Table actions right-aligned

**Use when:** any table or grid row. **Convention: the actions column is the LAST column, right-aligned, with
an ellipsis (`⋯`) trigger; its menu opens right-aligned to the trigger.** (Fitts + consistency, §07.)

**Step 1 — find the row + actions-cell IDs (file-specific):**
```
batch_get({ patterns:[{ name:"DataTable" }] })       // or the specific row component
batch_get({ nodeIds:["<ROW_ID>"], readDepth:3 })     // → <ACTIONS_COL_ID>, <MENU_TRIGGER_ID>
```

**Step 2 — right-align the actions column (`batch_design`):**
```
U("<ACTIONS_COL_ID>", { justifyContent:"flex_end", width:"fill_container" })   // ← REQUIRED
```

**Step 3 — the trigger + menu (ref the DS DropdownMenu, don't build from scratch):**
```
trigger=I("<ACTIONS_COL_ID>", { type:"ref", ref:"<ICON_BUTTON_ID>",
  descendants:{ "<ICON_ID>": { iconFontName:"more-horizontal" } } })
U(trigger, { width:44, height:44, padding:12 })       // Fitts: >=44px target
menu=I("<ROW_ID>", { type:"ref", ref:"<DROPDOWN_MENU_ID>" })   // opens right-aligned to trigger
```

**Layout it produces:**
```
┌────────────────────────────────────────────────────────────┐
│ Email        │ Role   │ Status  │ Sent │ Expires │ Actions  │
├──────────────┼────────┼─────────┼──────┼─────────┼──────────┤
│ jane@co.com  │ Member │ Pending │ 2d   │ In 5d   │  [⋯] ←── │
│ alice@co.com │ Admin  │ Expired │ 7d   │ Expired │  [⋯] ←── │
└────────────────────────────────────────────────────────────┘
                                               right-aligned ↑
```

**Rules:** actions always last + `justifyContent:"flex_end"`; `⋯` trigger ≥44px; menu right-aligned;
ref the DS Dropdown, never a raw frame (HARD RULE 1).

**Verify (HARD RULE 4):** `get_screenshot({ nodeId:"<ROW_ID>" })` — `⋯` flush right on every row.
