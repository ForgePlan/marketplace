# §01 — Entities, refs, descendants, slots

The single most load-bearing distinction in Pencil. Get this wrong and the DS link breaks, the Guardian
FAILs, and downstream Storybook ports fork. **HARD RULE 1 (ref-first) and HARD RULE 5 (never-detach /
never-screen-reusable) live here.**

> **All node IDs in this KB are file-specific examples.** They came from a reference `.pen` file
> (`v1-draft-throtle.pen`) and **do not exist in your file**. Before using any ID, rediscover it with
> `batch_get` against the active `.pen`. See §06 "file-specific IDs".

---

## The three entity types

| Entity | Pencil schema | Figma analogue | Exists | Reusable | When |
|---|---|---|---|---|---|
| **Frame** | `{ type: "frame" }` | Blue container | once | No | A one-off container: a screen, a layout region, a row |
| **Component** | `{ type: "frame", reusable: true }` | Purple master (💎) | once, the master | Yes (via refs) | A primitive/molecule/organism reused **2+ times** |
| **Instance** | `{ type: "ref", ref: "<ID>" }` | Purple instance (◇) | per placement | linked to master | Every place a Component is used |

**The rule of two.** Make something `reusable:true` **only if it will be used 2 or more times.** A
single-use container stays a plain Frame. A unique application **screen is NEVER `reusable:true`** — it is
not a template, and the 💎 flag pollutes the tree and confuses the Guardian's atomic-placement audit.

---

## Creating and using components (`batch_design` operations)

`batch_design` runs a small DSL. The seven operations:

| Op | Form | Meaning |
|---|---|---|
| **I** insert | `x = I(parent, { ...props })` | Create a new node under `parent`, capture its handle in `x` |
| **U** update | `U('nodeId', { ...props })` | Modify properties of an existing node |
| **C** copy | `x = C('templateId', parent, { descendants:{...} })` | Duplicate a node into `parent` with overrides |
| **R** replace | `x = R('oldId', { ...newNode })` | Replace a node entirely |
| **M** move | `M('nodeId', 'newParent', 0)` | Re-parent a node to position N |
| **D** delete | `D('nodeId')` | Remove a node (see HARD RULE 6 — approval first) |
| **G** generate | `G('frameId', 'stock'|'ai', 'prompt')` | Fill a frame with a stock/AI image |

Insert by **ref** is the canonical create path:

```
// CORRECT — instance of a DS component, customized in place
btn = I(parent, { type: "ref", ref: "<BUTTON_DEFAULT_ID>" })
U(btn + "/<LABEL_CHILD_ID>", { content: "Submit" })

// WRONG — a button built from raw frame props (no DS link, Guardian FAIL)
btn = I(parent, { type: "frame", padding: [8,14], cornerRadius: 6, fill: "#ededed" })
```

The `+ "/childId"` syntax addresses a descendant **inside** an instance — see below.

---

## `descendants` — customize WITHOUT detaching

`descendants` overrides named children of an instance while **keeping the master link** intact. This is
how you change text, color, icon, visibility, weight — anything that is not a structural change.

```
card = I(parent, {
  type: "ref",
  ref: "<CARD_ID>",
  descendants: {
    "<TITLE_ID>": { content: "Story queue" },
    "<DESC_ID>":  { content: "12 awaiting review" },
    "<ICON_ID>":  { iconFontName: "inbox", fill: "$--muted-foreground" }
  }
})
```

Two equivalent surfaces:
- **At insert time** — the `descendants:{}` block above.
- **After insert** — `U(card + "/<TITLE_ID>", { content: "..." })` per child.
- **`C` (copy)** also takes `descendants` to duplicate-with-override (see the `ref-plus-descendants`
  template).

Use `descendants` for: text/color/size, hide (`visible:false` or `enabled:false`), style overrides — **any
customization that does not change structure.** When the DS master updates, every instance — including the
customized ones — updates with it. That is the whole point.

> **Discovering the child IDs to override:** `batch_get({ nodeIds:["<COMPONENT_ID>"], readDepth:3 })`
> dumps the named children. The override keys are those child node IDs. They are file-specific.

---

## `slot` — designed insertion points

A `slot` is an explicit hole a component exposes for caller content (vs `descendants`, which overrides
existing children). Two shapes:

```
// empty slot — caller fills it
{ type:"frame", name:"Card Content", slot:[], layout:"vertical", gap:8, padding:24 }

// slot with default content the caller may replace
{ type:"frame", name:"Dropdown", slot:["item1","item2","item3"], children:[ ... ] }
```

Prefer slots for **composition** (a card body, a dropdown's items, a panel's content) and `descendants`
for **parameterization** (this instance's title text). The Guardian checks that reusable components expose
slots/descendants rather than forcing detach.

---

## Detach — the thing you almost never do

Detach converts an instance back into a plain frame with a **copied** structure and **no link** to the DS
master:

```
// before: instance — DS updates apply
{ type:"ref", ref:"<BUTTON_ID>" }
// after detach: independent frame — DS updates do NOT apply
{ type:"frame", children:[ ...copied... ] }
```

**Never detach for a minor edit** (text, color, icon → use `descendants`). The only legitimate detach is an
**experiment**: detach → explore a new design → if it is good, promote it to a *new* Component
(`reusable:true`) → ref the new component everywhere. Then the single-source rule is restored. Detaching to
"just change the label" is the #1 way a DS silently rots.

---

## Decision flow

```
Need an element on the canvas?
  │
  ├─ Is there a DS component for it? ── (batch_get reusable:true) ──┐
  │        no → will it be reused 2+ times?                          │
  │              yes → build it once as { reusable:true }, then ref it
  │              no  → plain { type:"frame" } is fine (one-off region)
  │                                                                  │
  └─ yes → I(parent, { type:"ref", ref:"<ID>" }) ◄──────────────────┘
            need to change content/style? → descendants (NOT detach)
            need to insert caller content? → slot
            need a structural change? → make a NEW component, ref it
```

## Cross-references

- Build a whole screen from these primitives → [§02 layout-b](../02-layout-b/_index.md).
- Where each new component physically lives on the DS canvas → [§03 ds-organization](../03-ds-organization/_index.md).
- The Guardian's exact pass/fail criteria for refs/slots/detach → `canvas-conventions` §01-single-source.
- Copy-paste: [`ref-plus-descendants`](../../templates/ref-plus-descendants.md).
