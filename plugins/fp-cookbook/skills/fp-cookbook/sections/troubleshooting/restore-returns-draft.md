# forgeplan_restore Returns Artifact to Draft, Not Prior Status (Anomaly #13)

## Симптом

You call `forgeplan_restore(id="NOTE-NNN")` on a deprecated or deleted artifact.
The artifact reappears but with `status=draft` — not `deprecated` or `active` as expected.
A subsequent attempt to transition directly to the prior status fails with FSM error.

## Root cause

`forgeplan_restore` hard-codes the return status to `draft`. The FSM forbids
`draft → deprecated` as a direct transition (no path in state machine). To return
the artifact to `deprecated`, you must activate it first, then deprecate again.

## Fix

```bash
# Step 1 — restore (returns to draft)
forgeplan_restore(id="NOTE-NNN")
# status: draft

# Step 2 — activate (required intermediate step)
forgeplan activate NOTE-NNN
# status: active

# Step 3 — re-deprecate (if that was the prior status)
forgeplan deprecate NOTE-NNN
# status: deprecated

# For deleted → active:
forgeplan_restore(id="NOTE-NNN")
forgeplan activate NOTE-NNN      # done
```

## Пример (Sprint J+K K2 roundtrip)

```
$ forgeplan deprecate NOTE-007
NOTE-007 status: active → deprecated ✅

$ forgeplan_restore(id="NOTE-007")
NOTE-007 restored, status: draft   ← NOT deprecated

$ forgeplan activate NOTE-007
NOTE-007 status: draft → active ✅

$ forgeplan deprecate NOTE-007
NOTE-007 status: active → deprecated ✅
```

## Upstream status

Filed as forgeplan#291 (2026-05-20). Expected fix in v0.32.0: restore should
optionally accept a `target_status` parameter. Until then, use the 2-3 step workaround.

## Common errors

| Error | Fix |
|-------|-----|
| `FSM error: draft → deprecated not allowed` | Activate first, then deprecate |
| `forgeplan_restore` not found | Requires CLI v0.31.0+ or MCP server update |
| Artifact not found by restore | Check id: restored artifacts need their original ID |

## Refs

- Anomaly #13 — Sprint J+K EVID-063 first documentation
- forgeplan#291 — upstream issue filed 2026-05-20
- EVID-063 (active) — K2 roundtrip verification
