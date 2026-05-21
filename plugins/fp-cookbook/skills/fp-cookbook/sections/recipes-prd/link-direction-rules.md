# Link Direction Rules

## Цель

Set forgeplan links in the correct direction so R_eff is not penalised
and `forgeplan_dispatch` buckets files correctly.

## The rule: source → target

```
forgeplan link <source-id> <target-id> --relation <relation>
```

| Relation | Direction | Mnemonic |
|----------|-----------|----------|
| `supersedes` | newer → older | "PRD-038 supersedes PRD-036" (new replaces old) |
| `informs` | evidence → PRD | "EVID-064 informs PRD-038" (evidence gives info to PRD) |
| `based_on` | dependent → dependency | "PRD-025 based_on PRD-024" (25 depends on 24) |
| `refines` | child → parent | "PRD-041 refines PRD-024" (child refines parent scope) |

## Команда

**MCP (preferred — v0.32.1+):**
```
# Correct: evidence informs the PRD it verifies
mcp__forgeplan__forgeplan_link(source="EVID-068", target="PRD-041", relation="informs")

# Correct: new PRD supersedes the old one
mcp__forgeplan__forgeplan_link(source="PRD-038", target="PRD-036", relation="supersedes")

# Correct: child PRD refines parent
mcp__forgeplan__forgeplan_link(source="PRD-041", target="PRD-024", relation="refines")

# Fix an inverted link (v0.32.1+)
mcp__forgeplan__forgeplan_unlink(source="PRD-041", target="EVID-068", relation="informs")
mcp__forgeplan__forgeplan_link(source="EVID-068", target="PRD-041", relation="informs")
```

**CLI fallback (when MCP unavailable — requires CLI v0.31.0+):**
```bash
# Correct: evidence informs the PRD it verifies
forgeplan link EVID-068 PRD-041 --relation informs

# Correct: new PRD supersedes the old one
forgeplan link PRD-038 PRD-036 --relation supersedes

# Correct: child PRD refines parent
forgeplan link PRD-041 PRD-024 --relation refines

# Fix an inverted link
forgeplan unlink PRD-041 EVID-068 --relation informs   # remove wrong direction
forgeplan link EVID-068 PRD-041 --relation informs     # add correct direction
```

## Пример (from Sprint O ADR-005)

```
# WRONG — silently accepted but inverts semantics (Anomaly #16)
forgeplan link PRD-041 EVID-068 --relation informs

# CORRECT
forgeplan link EVID-068 PRD-041 --relation informs
```

## Common errors

| Error | Fix |
|-------|-----|
| Anomaly #15: `supersedes` set backwards | Newer artifact must be source: `mcp__forgeplan__forgeplan_link(source="NEW", target="OLD", relation="supersedes")` or CLI `forgeplan link NEW OLD --relation supersedes` |
| Anomaly #16: `informs` set backwards | Evidence is source: `mcp__forgeplan__forgeplan_link(source="EVID", target="PRD", relation="informs")` or CLI `forgeplan link EVID PRD --relation informs` |
| `mcp__forgeplan__forgeplan_unlink` not found | MCP server not connected or pre-v0.32.1 — fall back to CLI: `forgeplan unlink` (v0.31.0+) |
| `forgeplan unlink` CLI not found | Requires CLI v0.31.0+ — upgrade: `cargo install forgeplan --force` |
| R_eff drops after adding link | Check direction: wrong direction cascades CL penalty (see R_eff cascade recipe) |

## Refs

- Anomaly #15 — `forgeplan_link supersedes` direction footgun (Sprint L EVID-064)
- Anomaly #16 — `forgeplan_link informs` direction footgun (Sprint L EVID-064)
- ADR-005 (active) — canonical example of correct supersedes chain
- `troubleshooting/link-direction-footgun.md` — detection + bulk-fix script
