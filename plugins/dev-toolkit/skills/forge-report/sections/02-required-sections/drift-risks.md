# Drift risks — Required section

Describe what may **decay over time** — even though it works now.

## Why this matters

Most production bugs are not "code is wrong" — they are "code was right when written, but conditions changed":
- Dependency updated, breaking assumption
- Config drifted between environments
- Cross-references stale (file renamed, link dead)
- API quietly changed
- Secret expired

A "drift risk" entry tells future-you: **"watch this".**

## Format

```
═══ ⚠️ Drift risks ═════════════════════════════════════════════
  <Risk>                              <When it bites>           <Mitigation>
  <Risk>                              <When it bites>           <Mitigation>
```

## Concrete examples

```
NOTE-003 references PRD-013/014/015     If PRD renamed              Update NOTE
PAT STANDALONE_SYNC_TOKEN expires       2027-04 (fine-grained 1y)   Calendar reminder
actions/checkout v4 uses Node 20        2026-09-16 (deprecation)    Bump to v5
hardcoded URL https://api.x.com         If endpoint moves           Move to .env
```

## What counts as drift

| Source | Example |
|--------|---------|
| External API change | Stripe v2024-06 → v2024-09 |
| Dependency breaking change | React 18 → 19 |
| Time-based expiry | Cert / token / key rotation |
| Linked artefacts | NOTE references PRD by ID |
| Implicit assumptions | "user count < 1M" |
| Config sprawl | Same value in 3 files |

## When you can write "—"

Truly stable change: pure isolated function, no external deps, no cross-refs. Then:

```
═══ ⚠️ Drift risks ═════════════════════════════════════════════
  — (isolated change, no external dependencies)
```

But this should be **rare**. Most non-trivial work has some drift.

## Anti-pattern

Don't list every theoretical risk ("internet might go down"). Drift = **specific to this change**.
