# Template — Layout B from scratch

**Use when:** a new screen and **no** existing screen-template fits (otherwise prefer
[`screen-from-template-ref`](screen-from-template-ref.md) — far fewer ops). Builds the AppShell skeleton
from DS refs.

**Rediscover first (HARD RULE 2):** the `<…_REF>` IDs are file-specific examples. Match by name and use
your IDs:
```
batch_get({ patterns:[{ reusable:true }] })
// find: Header/Compact, Sidebar/Main, Sidebar/Sub, Console/Collapsed → note their real IDs
```

**Copy-paste (`batch_design`, ≤25 ops):**
```
screen=I(document, { type:"frame", name:"Screen/<Name>", width:1440, height:900, layout:"vertical", fill:"$--background" })
header=I(screen, { type:"ref", ref:"<HEADER_REF>" })
body=I(screen, { type:"frame", name:"Body", layout:"horizontal", width:"fill_container", height:"fill_container" })
sidebar=I(body, { type:"ref", ref:"<SIDEBAR_REF>" })
right=I(body, { type:"frame", name:"RightSection", layout:"vertical", width:"fill_container", height:"fill_container" })
content=I(right, { type:"frame", name:"ContentRow", layout:"horizontal", width:"fill_container", height:"fill_container" })
subSidebar=I(content, { type:"ref", ref:"<SUBSIDEBAR_REF>" })
main=I(content, { type:"frame", name:"MainArea", layout:"vertical", width:"fill_container", height:"fill_container", padding:24, gap:20 })
console=I(right, { type:"ref", ref:"<CONSOLE_REF>" })
```

**Placement rules baked in:** `sidebar` full height; `console` is the LAST child of `right` and spans
RightSection's full width; `subSidebar` reaches RightSection-top → console. (See [§02](../sections/02-layout-b/_index.md).)

**Then:**
- Customize the SubSidebar → [`subsidebar-customization`](subsidebar-customization.md).
- Fill MainArea with **refs** (HARD RULE 1), never raw frames.
- Screen is a plain frame — **never** `reusable:true` (HARD RULE 5).

**Verify (HARD RULE 4):**
```
get_screenshot({ nodeId:"<screen>" })
snapshot_layout({ parentId:"<screen>", problemsOnly:true })   // expect empty; clipping → §06
```
