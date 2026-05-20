# EVID Stuck in Draft (Anomaly #7)

## Симптом

A Profile B agent (evidence-recorder, code-reviewer) created an EVID artifact
but it stays in `status=draft` even though the body is complete. R_eff for the
parent PRD shows 0 despite evidence existing.

## Root cause

Profile B agents have `forgeplan_activate` in their `disallowedTools` list (B2 paradigm,
PRD-026). This is intentional — Profile B should not self-approve its own evidence.
The activate step must be done by the orchestrator or a separate agent.

## Fix

```bash
# Option A — manual (orchestrator)
forgeplan activate EVID-NNN

# Option B — automatic via /forge-cycle
# Profile B emits sentinel in response:
#   <<NEEDS_ACTIVATION: EVID-NNN>>
# /forge-cycle parser detects and runs forgeplan activate automatically

# Option C — bulk-activate stale drafts
# Use /forge-cleanup skill (PRD-032)
forgeplan list --status draft
# Review the list, then activate each EVID manually
```

## Пример (Sprint E before Anomaly #7 fix)

```
Session log (pre-Sprint E):
  evidence-recorder creates EVID-060
  EVID-060 status: draft  ← stuck
  forgeplan score PRD-033 → R_eff: 0 (no active evidence)

Session log (post-Sprint E, PRD-033 fix):
  evidence-recorder creates EVID-060
  <<NEEDS_ACTIVATION: EVID-060>>   ← organic sentinel emitted
  orchestrator: forgeplan activate EVID-060
  forgeplan score PRD-033 → R_eff: 1.0 ✅
```

## Prevention

1. Configure `/forge-cycle` (handles NEEDS_ACTIVATION automatically).
2. Profile B agents should be up-to-date (Sprint E patch, PRD-033).
3. End-of-session: always run `forgeplan list --status draft` and clear it.

## Common errors

| Error | Fix |
|-------|-----|
| `forgeplan activate EVID-NNN` returns FSM error | Check current status — may already be active |
| EVID created but no NEEDS_ACTIVATION sentinel | Agent not on Sprint E patch — manually activate |
| R_eff still 0 after activate | Check link: EVID→PRD must use `informs` relation (Anomaly #5) |

## Refs

- PRD-032 (active) — NEEDS_ACTIVATION sentinel + /forge-cycle parser (Sprint D)
- PRD-033 (active) — 7 Profile B agents patched for organic sentinel (Sprint E)
- Anomaly #7 — full anomaly record in Sprint A-E session log
- mm-draft-hygiene — mental model: why EVIDs stick + fix
