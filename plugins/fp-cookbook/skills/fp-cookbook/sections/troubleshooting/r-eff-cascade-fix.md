# Fix R_eff Cascade from based_on Links (Anomaly #5)

## Симптом

`forgeplan score PRD-NNN` shows unexpectedly low R_eff. `forgeplan get PRD-NNN`
shows `weakest_link: EVID-NNN` pointing to an evidence artifact with no obvious problem.

## Root cause

An EVID → PRD link was set with `--relation based_on` instead of `informs`.
`based_on` creates a hard dependency chain: forgeplan cascades congruence level
penalties from the dependency upward. Even a CL=3 EVID can drag a PRD's score down
if the EVID itself has a weak upstream dependency.

## Fix

> **v0.32.1 update**: `mcp__forgeplan__forgeplan_unlink` MCP tool is now available (issue #286 closed).
> Prefer MCP; CLI remains valid as fallback when MCP server is unavailable.

**MCP (preferred — v0.32.1+):**
```
# Step 1 — identify the bad link
mcp__forgeplan__forgeplan_get(id="PRD-NNN")
# Look for: links[] with relation=based_on pointing to EVID

# Step 2 — unlink via MCP
mcp__forgeplan__forgeplan_unlink(source="EVID-NNN", target="PRD-NNN", relation="based_on")

# Step 3 — re-link correctly
mcp__forgeplan__forgeplan_link(source="EVID-NNN", target="PRD-NNN", relation="informs")

# Step 4 — re-score
mcp__forgeplan__forgeplan_score(id="PRD-NNN")
# Expected: R_eff improves
```

**CLI fallback (when MCP unavailable — requires CLI v0.31.0+):**
```bash
# Step 1 — identify the bad link
forgeplan get PRD-NNN
# Look for: links[] with relation=based_on pointing to EVID

# Step 2 — unlink
forgeplan unlink EVID-NNN PRD-NNN --relation based_on

# Step 3 — re-link correctly
forgeplan link EVID-NNN PRD-NNN --relation informs

# Step 4 — re-score
forgeplan score PRD-NNN
# Expected: R_eff improves
```

## Пример (Sprint G Anomaly #5 fix)

```
Before:
  forgeplan get PRD-021
  → weakest_link: EVID-033  (relation: based_on)
  → R_eff: 0.62

  # Sprint G used CLI (v0.31.0 workaround — MCP not yet available):
  forgeplan unlink PRD-021 EVID-033 --relation based_on
  forgeplan link   EVID-033 PRD-021 --relation informs

  # v0.32.1+: use MCP instead:
  # mcp__forgeplan__forgeplan_unlink(source="PRD-021", target="EVID-033", relation="based_on")
  # mcp__forgeplan__forgeplan_link(source="EVID-033", target="PRD-021", relation="informs")

After:
  forgeplan score PRD-021
  → weakest_link: PRD-018  (cascade moved deeper)
  → R_eff: 0.78  (improved but deeper chain still exists)
```

Note: if R_eff is still low after fixing the immediate link, a deeper chain
may still have based_on links. Run `forgeplan get` on the new weakest_link
and repeat.

## Prevention

Never use `based_on` for EVID → PRD links. Only correct relations:
- EVID → PRD: `informs`
- PRD → PRD: `refines` or `based_on` (parent-child relationship, expected)

## Common errors

| Error | Fix |
|-------|-----|
| `mcp__forgeplan__forgeplan_unlink` not found | MCP server not connected or pre-v0.32.1 — fall back to CLI: `forgeplan unlink` (v0.31.0+) |
| `forgeplan unlink` CLI not found | Upgrade to CLI v0.31.0+: `cargo install forgeplan --force` |
| R_eff still low after unlink | Deeper chain — repeat on new weakest_link |
| `unlink` accepts but score unchanged | Re-score explicitly: `forgeplan score PRD-NNN` or `mcp__forgeplan__forgeplan_score(id="PRD-NNN")` |

## Refs

- EVID-062 (active) — Sprint G Anomaly #5 partial fix documentation
- PRD-035 (active) — Sprint G scope doc
- `informs-not-based-on.md` — prevention recipe
