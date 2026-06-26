# Template — Expo monochrome card (flat / bordered / shadowless)

**Use when:** a flat structural card in the **Expo monochrome** discipline — rectangular, no shadow, thin
border, separation by border not elevation. **Recolor to warm-paper `$--vars`; do not paste Expo's hexes**
(§05).

**Expo discipline → warm-paper mapping:**
| Trait | Expo | Use instead |
|---|---|---|
| Radius | 0px | 0 (structural) — `cornerRadius:0` |
| Shadow | none | none |
| Border | 2px `#363A3F` | 1–2px `$--border` |
| Fill | transparent / black | `transparent` or `$--surface` |
| Accent | none | none in the card; the one CTA carries `$--accent` (§07) |

**Copy-paste (`batch_design`):**
```
card=I(parent, {
  type:"frame", name:"Card/Flat",
  fill:"$--surface",          // or "transparent"
  stroke:"$--border", strokeWeight:2,
  cornerRadius:0,             // rectangular — Expo discipline
  layout:"vertical", gap:16, padding:32
  // NO box-shadow / elevation
})
title=I(card, { type:"text", content:"<Title>", fill:"$--foreground", fontFamily:"$--font-primary", fontSize:16, fontWeight:"600" })
body =I(card, { type:"text", content:"<Body>",  fill:"$--muted-foreground", fontFamily:"$--font-primary", fontSize:14 })
```

**If this card is reused 2+ times** make it a component (`reusable:true`) and ref it everywhere (§01);
otherwise a plain frame is fine.

**Gestalt (§07):** the border = Common Region (binds the group); keep internal proximity tight, inter-card
gaps clear. **Use tokens, never raw hex** (§04).

**Verify (HARD RULE 4):** `get_screenshot({ nodeId:"<card>" })` — flat, bordered, shadowless, square corners.
