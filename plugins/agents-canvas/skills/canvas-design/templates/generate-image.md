# Template — Generate image (stock / AI)

**Use when:** filling a frame with imagery — a stock photo or an AI-generated asset — via the `G` operation
in `batch_design`.

**Form:** `G(<frameId>, <source>, <prompt>)` where `<source>` is `"stock"` or `"ai"`.

**Copy-paste (`batch_design`):**
```
// 1) make (or pick) the container frame
hero=I(parent, { type:"frame", name:"Hero/Media", width:"fill_container", height:280, cornerRadius:0 })

// 2) fill it — stock photo
G("<hero>", "stock", "warm minimal desk, soft daylight, paper textures")

// or — AI-generated
G("<hero>", "ai", "abstract warm-paper texture, terracotta accent, flat editorial")
```

**Brand fit (§05):** keep prompts in the **warm-paper** register — warm light, paper/editorial textures,
restrained terracotta accent; avoid neon, heavy gradients, cold blue-on-black. Imagery should read as a
calm printed page, not a dev-tool dashboard.

**Notes:**
- The frame's `cornerRadius` / `fill` still apply around the image — set them before/with `G`.
- For decorative section backgrounds, a subtle generated texture is fine; for content, prefer real product
  imagery or leave a clean `$--surface` fill.
- Generated imagery is **decorative provenance-free** — if an image carries meaning that must trace to a
  requirement, note it in the Design NOTE (`canvas-truth-map`).

**Verify (HARD RULE 4):** `get_screenshot({ nodeId:"<hero>" })` — image fills the frame, on-brand, no clipping.
