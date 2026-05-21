# Detect and Fix Inverted Link Direction (Anomalies #15/#16)

## Симптом

`forgeplan get PRD-NNN` shows a `supersedes` or `informs` link that is logically
backwards — e.g., an older artifact "supersedes" a newer one, or a PRD "informs"
its own evidence. No error is raised when setting the link.

## Root cause

`forgeplan_link` accepts any direction for `supersedes` and `informs` without
validation. This silently corrupts the dependency graph and affects R_eff scoring
and drift detection.

- Anomaly #15: `supersedes` set backwards (older → newer instead of newer → older)
- Anomaly #16: `informs` set backwards (PRD → EVID instead of EVID → PRD)

## Detection script (Sprint O, PRD-041)

```bash
# Run the Sprint O detection script
./scripts/detect_link_footguns.sh

# Expected output on clean repo:
#   ✅ No link direction footguns detected

# Output with footguns:
#   ⚠ INVERTED supersedes: PRD-036 supersedes PRD-038 (should be PRD-038 → PRD-036)
#   ⚠ INVERTED informs:    PRD-041 informs EVID-068 (should be EVID-068 → PRD-041)
```

## Fix

> **v0.32.1 update**: `mcp__forgeplan__forgeplan_unlink` MCP tool is now available (issue #286 closed).
> Prefer MCP; CLI remains valid as fallback when MCP server is unavailable.

**MCP (preferred — v0.32.1+):**
```
# For each inverted supersedes link reported:

# Step 1 — remove wrong-direction link
mcp__forgeplan__forgeplan_unlink(source="OLD", target="NEW", relation="supersedes")

# Step 2 — add correct-direction link (newer → older)
mcp__forgeplan__forgeplan_link(source="NEW", target="OLD", relation="supersedes")

# For informs footgun:
mcp__forgeplan__forgeplan_unlink(source="PRD-NNN", target="EVID-NNN", relation="informs")
mcp__forgeplan__forgeplan_link(source="EVID-NNN", target="PRD-NNN", relation="informs")
```

**CLI fallback (when MCP unavailable — requires CLI v0.31.0+):**
```bash
# For each inverted link reported:

# Step 1 — remove wrong-direction link
forgeplan unlink OLD NEW --relation supersedes

# Step 2 — add correct-direction link
forgeplan link NEW OLD --relation supersedes   # newer → older

# For informs footgun:
forgeplan unlink PRD-NNN EVID-NNN --relation informs
forgeplan link EVID-NNN PRD-NNN --relation informs   # evidence → PRD
```

## Direction cheat-sheet

```
supersedes : newer → older     (PRD-038 supersedes PRD-036)
informs    : evidence → PRD    (EVID-068 informs PRD-041)
refines    : child → parent    (PRD-041 refines PRD-024)
based_on   : dependent → dep   (PRD-025 based_on PRD-024)
```

## Prevention

Run `./scripts/detect_link_footguns.sh` as part of pre-PR checklist.
CI integration: add to `.github/workflows/validate-plugins.yml` (Sprint O scope).

## Common errors

| Error | Fix |
|-------|-----|
| Script not found | It lives in `scripts/detect_link_footguns.sh` — check repo root |
| `mcp__forgeplan__forgeplan_unlink` not found | MCP server not connected or pre-v0.32.1 — fall back to CLI: `forgeplan unlink` (v0.31.0+) |
| `forgeplan unlink` CLI not available | Upgrade CLI to v0.31.0+: `cargo install forgeplan --force` |
| Footgun re-introduced after fix | Add detection script to CI so it catches future inversions |

## Refs

- PRD-041 (active) — Sprint O link-detection tool ship
- EVID-068 (active) — Sprint O delivery verification
- Anomaly #15 — supersedes direction (Sprint L EVID-064)
- Anomaly #16 — informs direction (Sprint L EVID-064)
- `link-direction-rules.md` in recipes-prd — canonical direction reference
