# Dogfood: Activate PRDs and EVIDs Inline (Sprint D Discipline)

## Цель

Prevent draft artifact pile-up by activating PRDs and EVIDs in the same
session they are created, not in a future "cleanup" session.

## The discipline

**Sprint D rule**: every PRD and every EVID must reach `status=active`
before the session ends. No exceptions. No "I'll activate these later."

Why it matters: forgeplan score only counts `active` artifacts. Draft EVIDs
contribute 0 to R_eff. A pile of drafts = invisible work.

## Команда

```bash
# After creating and filling the PRD body:
forgeplan validate PRD-NNN   # PASS
forgeplan activate PRD-NNN   # → active

# After creating and filling the EVID body:
# (Profile B agent creates EVID but CANNOT activate — denied by whitelist)
# Orchestrator or coder activates:
forgeplan activate EVID-NNN  # → active

# Check nothing is left in draft:
forgeplan list --status draft
# Expected: empty (or only intentional WIP)
```

## The NEEDS_ACTIVATION sentinel

When Profile B agents write EVID but cannot activate, they emit:

```
<<NEEDS_ACTIVATION: EVID-NNN>>
```

The `/forge-cycle` parser (PRD-032) detects this and auto-activates.
If you are NOT using `/forge-cycle`, manually run `forgeplan activate EVID-NNN`.

## Пример (Sprint D PRD-032)

```
Session log:
  EVID-059 created (draft)    ← Profile B writes evidence
  <<NEEDS_ACTIVATION: EVID-059>>  ← sentinel emitted
  /forge-cycle parser detects sentinel
  → forgeplan activate EVID-059   ← AUTO-resolved
  EVID-059 status: active ✅

End-of-session check:
  forgeplan list --status draft
  (empty)
```

## Common errors

| Error | Fix |
|-------|-----|
| EVIDs stuck in draft (Anomaly #7) | Profile B cannot activate; orchestrator must call activate |
| `forgeplan activate` returns FSM error | Check status: may already be active or deprecated |
| Draft list never clears | `/forge-cleanup` skill (PRD-032) — bulk-activate stale drafts |

## Refs

- PRD-032 (active, R_eff=1.0 grade A) — Sprint D: NEEDS_ACTIVATION sentinel + cleanup
- Anomaly #7 — Profile B denied activate → EVID stays draft
- mm-draft-hygiene — mental model: why EVIDs stick in draft + fix pattern
