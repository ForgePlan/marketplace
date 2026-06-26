# §06 — Gotchas (the failure modes that bite)

The recurring ways a Pencil DS-build goes wrong, and the fix for each. Most map to a HARD RULE; the
Guardian (`canvas-conventions`) FAILs on these, so catch them at design time.

---

## 1. Clipping — fixed Y steps that bury components

**Symptom:** `snapshot_layout({problemsOnly:true})` returns `"fully clipped"` or `"partially clipped"`.

**Cause:** a fixed vertical step (`+80` everywhere) ignored a tall component's height; the next node landed
*inside* it. Or components ran past the DS frame's bottom edge.

**Fix:** height-aware Y — `nextY = prevY + prevHeight + gap`, with `prevHeight` from
`snapshot_layout({maxDepth:1})`, recomputed bottom-up. If nodes pass the frame edge, **grow the DS frame
height**. Full loop: [§03](../03-ds-organization/_index.md) + [`height-aware-spacing`](../../templates/height-aware-spacing.md).
(HARD RULE 4.)

---

## 2. Cross-file refs don't exist — one file is the rule

**Symptom:** a `ref` renders blank / errors; a component "disappears" when moved.

**Cause:** `type:"ref"` only resolves **within the same `.pen` file**. There is no cross-file ref. Splitting
the DS across files breaks every ref between them.

**Fix:** keep the **whole DS + all screens in one `.pen` file**. One file = refs resolve, one MCP context,
one git history, DS changes propagate everywhere. If you think you need multiple files, you don't — you need
better canvas organization (§03).

---

## 3. File-specific IDs — every ID in this KB is an example

**Symptom:** `I(parent, {type:"ref", ref:"X1O6F"})` inserts nothing or the wrong thing.

**Cause:** node IDs are **per-file**. `X1O6F`, `Jw3rV`, `YRmDV`, `xGz08` … are from the reference file
(`v1-draft-throtle.pen`) and **do not exist in yours**. (HARD RULE 2.)

**Fix:** rediscover by **name**, then use the ID you get back:

```
batch_get({ patterns:[{ reusable:true }] })          // the whole DS catalog
batch_get({ patterns:[{ name:"Button/Default" }] })  // a specific component → its real ID
batch_get({ nodeIds:["<COMPONENT_ID>"], readDepth:3 })  // its child IDs for descendants
```

Treat every ID in templates/examples as a `<PLACEHOLDER>` to swap.

---

## 4. Legacy single-frame DS (the old shape to migrate from)

**Symptom:** one giant DS frame (reference file's `YRmDV`) with 6 mixed sections — atoms, molecules, and
organisms jumbled, plus duplicate organizational refs.

**Cause:** the pre-atomic DS layout. The modern shape is **four frames** — ATOMS / MOLECULES / ORGANISMS /
TEMPLATES (§03) — with clean atomic placement and no duplicate refs.

**Fix:** if you inherit a single-frame DS, treat migration as its own approved task (HARD RULE 6 — never
refactor without approval): categorize each component by tier, move into the four frames, delete duplicate
refs, verify screens still render (no broken refs — ID preservation matters), then remove the old frame.
Don't silently restructure mid-screen-build.

---

## 5. Detach rot — broken DS links from "just a quick edit"

**Symptom:** a DS update doesn't reach some instances; the tree shows a frame where a ◇ instance should be.

**Cause:** someone detached an instance to change text/color instead of using `descendants`. The link is
gone; the copy is frozen. (HARD RULE 5.)

**Fix:** re-create as an instance (`type:"ref"`) and apply `descendants`. If the change was genuinely
structural, promote it to a **new component** and ref that. Never detach for a minor edit. (§01.)

---

## 6. Screen marked `reusable:true`

**Symptom:** a unique screen shows the component 💎 marker; it pollutes the `reusable:true` catalog and the
Guardian's atomic audit flags it.

**Cause:** `reusable:true` on a screen. Screens are unique application surfaces, not templates. (HARD RULE 5.)

**Fix:** screens are plain `{type:"frame"}`. Only the **screen-template** masters in the TEMPLATES tier are
`reusable:true`; instances of them (the actual screens) are not.

---

## 7. Deep nesting (>~10 levels)

**Symptom:** sluggish edits, hard-to-address descendants, fragile layout.

**Cause:** over-nested frames (a frame in a frame in a frame …).

**Fix:** keep nesting **≤ ~10 levels**. Flatten with refs (a deep sub-tree that repeats → a component) and
sane Layout B structure. Use refs instead of duplicating sub-trees.

---

## 8. Reading a `.pen` directly (encrypted — never)

**Symptom:** garbage output / refusal when you `Read` or `Grep` a `.pen` file.

**Cause:** `.pen` files are **encrypted**. The only access is the Pencil MCP tools. (HARD RULE 6.)

**Fix:** never `Read`/`Grep`/`cat` a `.pen`. Use `get_editor_state`, `batch_get`, `export_nodes`,
`snapshot_layout`, `get_screenshot` — and always `get_editor_state({include_schema:true})` first if you
lack the schema.

---

## 9. Deleting/refactoring before approval

**Symptom:** content lost during a "refactor"; the user never agreed.

**Cause:** deleting an old screen or restructuring before showing an OLD-vs-NEW comparison and getting an
explicit "ok, delete". (HARD RULE 6.)

**Fix:** build the new nearby → `get_screenshot` both → present the comparison → **wait** for explicit
approval → only then `D(...)`. During a refactor, **`M` (move) content into the new shell, never `D` it**.
Record the new IDs after.

---

## 10. Skipping verification

**Symptom:** broken layout discovered three batches later, expensive to untangle.

**Cause:** running `batch_design` without `get_screenshot` + `snapshot_layout` after each. (HARD RULE 4.)

**Fix:** verify after **every** batch. Also: stay **≤25 ops per `batch_design`** (HARD RULE 3) — a 60-op
mega-batch that fails is far harder to diagnose than three 20-op batches each verified.

## Cross-references

- The spacing math behind #1 → [§03 ds-organization](../03-ds-organization/_index.md).
- Entity rules behind #5/#6 → [§01 entities-refs](../01-entities-refs/_index.md).
- The Guardian's matching FAIL criteria → `canvas-conventions` §01, §03, §04.
- The CAN/CANNOT one-pager → [cheatsheet](../../cheatsheet.md).
