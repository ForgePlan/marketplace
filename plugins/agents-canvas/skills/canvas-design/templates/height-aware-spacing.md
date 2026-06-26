# Template — Height-aware spacing (lay out / repair DS columns)

**Use when:** placing components down a DS canvas column, or repairing `fully clipped` / `partially clipped`
overlaps. **The formula that satisfies HARD RULE 4: `nextY = prevY + prevHeight + gap` — never a fixed step.**

**Spacing scale (vertical gaps):** variant→variant **80** · component→component **160** ·
category→category **320** · section→section **600** · size-variant X offset **200**.

---

## A. Lay out a column from scratch

**Step 1 — get real heights (never assume):**
```
snapshot_layout({ parentId:"<dsFrameId>", maxDepth:1 })
// → children:[ { id, x, y, width, height }, ... ]
```

**Step 2 — compute Y bottom-up, then place (`batch_design`, ≤25 ops):**
```
// worked numbers (mixed heights — note the Card jump):
// Button/Default   h=32  → y=200
// Button/Secondary h=32  → y = 200 + 32 + 80  = 312
// Input/Default    h=32  → y = 312 + 32 + 320 = 664   (new category → 320)
// Card/Default     h=150 → y = 664 + 32 + 320 = 1016
// next after Card        → y = 1016 + 150 + 80 = 1246  (NOT 1096!)
a=I("<dsFrameId>", { type:"ref", ref:"<BTN_DEFAULT_ID>",   x:200, y:200 })
b=I("<dsFrameId>", { type:"ref", ref:"<BTN_SECONDARY_ID>", x:200, y:312 })
c=I("<dsFrameId>", { type:"ref", ref:"<INPUT_DEFAULT_ID>", x:200, y:664 })
d=I("<dsFrameId>", { type:"ref", ref:"<CARD_DEFAULT_ID>",  x:200, y:1016 })
```

---

## B. Repair existing clipping

**Step 1 — confirm the problem:**
```
snapshot_layout({ parentId:"<dsFrameId>", problemsOnly:true })   // any fully/partially clipped?
```
**Step 2 — get heights, recompute, emit `U` ops bottom-up:**
```
snapshot_layout({ parentId:"<dsFrameId>", maxDepth:1 })
// for each child after the first: correctY = prev.y + prev.height + gap
U("<id2>", { y:312 })
U("<id3>", { y:664 })
U("<id4>", { y:1016 })
```
**Step 3 — if components run past the frame edge** (`fully clipped` at the bottom), grow the frame:
```
U("<dsFrameId>", { height:<larger> })
```
**Step 4 — re-verify:**
```
snapshot_layout({ parentId:"<dsFrameId>", problemsOnly:true })   // expect empty
```

**Checklist (from §03):** get ALL heights before computing · apply the formula · never fixed spacing ·
re-check `problemsOnly:true` after · grow the frame if clipped · record final Y positions in the Design NOTE.
