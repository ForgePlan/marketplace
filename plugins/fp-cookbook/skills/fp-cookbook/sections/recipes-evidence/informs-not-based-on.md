# Use informs, Not based_on, for Evidence → PRD Links

## Цель

Link an Evidence artifact to its parent PRD without triggering an R_eff
cascade penalty (Anomaly #5).

## The rule

```
EVID → PRD link: use --relation informs
                 NEVER --relation based_on
```

`based_on` semantics = "EVID depends on PRD for its existence".
Forgeplan scores this as a hard dependency chain: if PRD has low CL,
the penalty cascades to EVID and all downstream artifacts.

`informs` semantics = "EVID provides information to PRD".
No cascade. This is the correct relation for verification evidence.

## Команда

**MCP (preferred — v0.32.1+):**
```
# Correct
mcp__forgeplan__forgeplan_link(source="EVID-069", target="PRD-013", relation="informs")

# Fix if you already set based_on
mcp__forgeplan__forgeplan_unlink(source="EVID-069", target="PRD-013", relation="based_on")
mcp__forgeplan__forgeplan_link(source="EVID-069", target="PRD-013", relation="informs")
```

**CLI fallback (when MCP unavailable — requires CLI v0.31.0+):**
```bash
# Correct
forgeplan link EVID-069 PRD-013 --relation informs

# Wrong — triggers cascade (Anomaly #5)
forgeplan link EVID-069 PRD-013 --relation based_on

# Fix if you already set based_on
forgeplan unlink EVID-069 PRD-013 --relation based_on
forgeplan link   EVID-069 PRD-013 --relation informs
```

## Пример (Anomaly #5 root cause — Sprint G)

```
Before fix:
  EVID-033 based_on PRD-021
  → PRD-021.weakest_link = EVID-033
  → R_eff cascade: PRD-021 score reduced

After fix (v0.32.1+ MCP):
  mcp__forgeplan__forgeplan_unlink(source="PRD-021", target="EVID-033", relation="based_on")
  mcp__forgeplan__forgeplan_link(source="EVID-033", target="PRD-021", relation="informs")
  → PRD-021.weakest_link moved to next chain

Sprint G workaround (CLI, pre-v0.32.1):
  forgeplan unlink PRD-021 EVID-033 --relation based_on
  forgeplan link   EVID-033 PRD-021 --relation informs
```

## When each relation applies

| Relation | Use when |
|----------|----------|
| `informs` | EVID verifies / provides data for PRD |
| `based_on` | PRD depends on another PRD/ADR for its feasibility |
| `refines` | Child artifact narrows scope of parent |
| `supersedes` | New artifact replaces an older one |

## Common errors

| Error | Fix |
|-------|-----|
| R_eff drops after linking EVID to PRD | Check relation: `mcp__forgeplan__forgeplan_get(id="EVID-NNN")` or `forgeplan get EVID-NNN` → change based_on to informs |
| `mcp__forgeplan__forgeplan_unlink` not found | MCP server not connected or pre-v0.32.1 — fall back to CLI: `forgeplan unlink` (v0.31.0+) |
| `forgeplan unlink` CLI not available | Upgrade CLI to v0.31.0+: `cargo install forgeplan --force` |
| Cascade persists after unlink | Re-score: `mcp__forgeplan__forgeplan_score(id="PRD-NNN")` or `forgeplan score PRD-NNN` after unlinking |

## Refs

- Anomaly #5 — R_eff cascade from based_on (Sprint G EVID-062, partial fix)
- `troubleshooting/r-eff-cascade-fix.md` — full diagnosis + CLI unlink recipe
- PRD-035 (active) — Sprint G documentation of this fix
