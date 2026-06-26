# 04 - Layout Health (clipping / spacing from `snapshot_layout`)

A DS that overlaps or clips is not just ugly — it means the Designer skipped the **verify-after-every-batch**
loop, and the reference screenshots (the downstream visual oracle) are unreliable. This section audits the
geometry of the snapshot: no clipping, height-aware spacing, canonical gaps, frame fit, grid alignment.
It is read almost entirely from the `snapshot_layout` dump, cross-checked against the reference screenshots.

Audit inputs: `snapshot_layout(parentId, maxDepth)` (full geometry), `snapshot_layout(problemsOnly:true)`
(clipping flags), the reference screenshots, and the DS-ORGANIZATION spacing/grid constants.

Canonical constants (DS-ORGANIZATION-GUIDE):

```
VARIANT_GAP   = 80     COMPONENT_GAP = 160    CATEGORY_GAP = 320    SECTION_GAP = 600
SIZE_VARIANT_X_OFFSET = 200            COLUMN_GAP = 400..500
columns X: 200 / 600 / 1100 / 1700 / 2400 / 3100
nextY = prevY + prevHeight + gap        (height-aware; never fixed-step)
```

---

## LH-1 — No clipping

**Rule.** `snapshot_layout(problemsOnly:true)` returns an **empty** problem set — no `fully clipped` and
no `partially clipped` nodes. Clipping means a component is outside its parent/frame bounds (often because
the DS Frame is too small or a height-unaware step pushed it past the edge).

**Detect.** Read the `problemsOnly` dump; every entry with `"problems": "fully clipped"` or
`"partially clipped"` is a finding (node-id from the entry).

**Severity.** Critical.

**Fix.** Enlarge the DS Frame `height`/`width` (LH-4) and/or recompute Y positions height-aware (LH-2),
then re-run `snapshot_layout(problemsOnly:true)` until clean.

---

## LH-2 — Height-aware spacing (no overlap)

**Rule.** Vertical placement uses `nextY = prevY + prevHeight + gap`, where `prevHeight` is read from the
layout dump — never a fixed `+80` that ignores the previous component's height. A `Card` (h=150) followed
by a fixed `+80` step puts the next node **inside** the card.

**Detect.** Sort each column's children by `y`; for adjacent nodes check whether
`curr.y >= prev.y + prev.height` (no overlap) and, where applicable, that the gap equals the canonical
spacing for that transition. Overlapping bounding boxes are the failure.

**Severity.** Critical (it produces overlap, which usually also trips LH-1).

**Fix.** Recompute Y with the formula, then `batch_design` the `U(id, {y})` updates:

```
btn(h=32) y=200  ->  next y = 200 + 32 + 80  = 312
card(h=150) y=400 -> next y = 400 + 150 + 80 = 630
```

---

## LH-3 — Canonical gaps

**Rule.** Gaps match the spacing scale for their context: variant->variant 80, component->component 160,
category->category 320, section->section 600; size-variant X offset 200; column->column 400-500.

**Detect.** Classify each adjacent transition (same component variant / different component / different
category / different section) and compare the actual gap to the canonical value (with a small tolerance).

**Severity.** Warning.

**Fix.** Adjust the offending Y/X positions to the canonical gap (height-aware per LH-2).

---

## LH-4 — Frame fits its content

**Rule.** The DS Frame is large enough that no component spills past its bounds. The DS-ORGANIZATION
reference frame is 5000x3500; the real frame must fit the actual content.

**Detect.** Compute the max `(x+width)` and max `(y+height)` across all nodes; compare to the DS Frame
`width`/`height`. Any node extent beyond the frame is a spill (and will show in LH-1 as clipped).

**Severity.** Warning (Critical when it causes actual clipping -> also LH-1).

**Fix.** Increase the DS Frame `width`/`height` to cover the content extent plus padding.

---

## LH-5 — Grid alignment

**Rule.** Columns align to the canonical X bands (200 / 600 / 1100 / 1700 / 2400 / 3100) so zones are
visually crisp and the port can infer zone membership from X.

**Detect.** Bucket node `x` values; flag columns that sit off the canonical bands by more than a small
tolerance.

**Severity.** Suggestion.

**Fix.** Snap the column's nodes to the nearest canonical X band.

---

## LH-6 — Verify-loop evidence present

**Rule.** The snapshot includes a `snapshot_layout(problemsOnly:true)` dump (clean or with the known
remaining problems), demonstrating the Designer ran the **verify-after-every-batch** loop. A snapshot
exported without it cannot be trusted as clipping-free.

**Detect.** Confirm the snapshot directory contains the `problemsOnly` layout dump alongside the manifest
and screenshots.

**Severity.** Warning ("snapshot incomplete — no problemsOnly dump; clipping unverifiable"). Do not PASS
LH-1 by assumption when this artifact is missing.

**Fix.** The Designer re-exports the snapshot including the `problemsOnly` dump.

---

## Cross-checks

- LH-1 (clipping) is the symptom; LH-2 (overlap) and LH-4 (frame too small) are the usual causes — when
  you see clipping, look for the height-unaware step or the undersized frame and cite the root cause too.
- A clean LH set is the precondition for trusting the reference screenshots that phase V (Port) and the
  Coder's visual-regression tests depend on — note in the EVID that the visual oracle is reliable.
