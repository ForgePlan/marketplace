# Template — DS section header

**Use when:** labelling a tier or category on the DS canvas (ATOMS / MOLECULES / ORGANISMS / TEMPLATES, or
a category like BUTTONS / INPUTS) so the canvas reads as a catalog (§03).

**Style:** all-caps, 14px, weight 600, `letterSpacing:2`, muted color.

**Copy-paste (`batch_design`):**
```
header=I("<dsFrameId>", {
  type:"text",
  content:"ATOMS",                 // tier or category, UPPERCASE
  x:200, y:100,
  fill:"$--muted-foreground",
  fontFamily:"$--font-primary",
  fontSize:14,
  fontWeight:"600",
  letterSpacing:2
})
```

**Placement:** a section header sits ~100px above its first row; the section's components start at the band
Y you computed with the height-aware formula ([`height-aware-spacing`](height-aware-spacing.md)). Section→
section gap is **600**, category→category **320**.

**Notes:**
- A header is a plain text node — not `reusable:true`.
- Use the `$--muted-foreground` token, not a literal gray (§04).
- Keep header text consistent (`Category/Variant` naming convention is for components; headers are the
  tier/category names in caps).

**Verify (HARD RULE 4):** `get_screenshot({ nodeId:"<dsFrameId>" })` — headers align above their bands.
