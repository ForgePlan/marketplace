# `## ⚠️ Что может поломаться со временем` — Required section

Describe what may **decay over time** — even though it works now.

## Why this matters

Most production bugs are not "code is wrong" — they are "code was right when written, but conditions changed":
- Dependency updated, breaking assumption
- Config drifted between environments
- Cross-references stale (file renamed, link dead)
- API quietly changed
- Secret expired

A "drift risk" entry tells future-you: **"watch this".**

## Card format

```markdown
## ⚠️ Что может поломаться со временем

  Риск:   <Specific risk, not theoretical>
  Когда:  <Trigger — date, event, or condition>
  Что:    <What breaks if trigger fires>
  Защита: <How to prevent or recover>
  ───────────────────────────────────────────────────────────────
  ...
```

## Concrete examples

```markdown
## ⚠️ Что может поломаться со временем

  Риск:   NOTE-003 ссылается на PRD-013/014/015
  Когда:  Если переименуешь PRD
  Что:    Ссылки в NOTE будут битые
  Защита: При rename PRD — обновить NOTE-003
  ───────────────────────────────────────────────────────────────
  Риск:   PAT STANDALONE_SYNC_TOKEN истекает
  Когда:  2027-04 (fine-grained PAT, 1 год)
  Что:    Auto-sync workflow перестанет работать
  Защита: Календарный reminder за 2 недели
  ───────────────────────────────────────────────────────────────
  Риск:   actions/checkout@v4 использует Node.js 20
  Когда:  2026-09-16 (deprecation date)
  Что:    Workflow упадёт с warning, потом с ошибкой
  Защита: Bump до v5 (см. NOTE-002)
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

Truly stable change: pure isolated function, no external deps, no cross-refs:

```markdown
## ⚠️ Что может поломаться со временем

  Риск:   —
  Что:    Изменение изолированное, без внешних зависимостей
```

But this should be **rare**. Most non-trivial work has some drift.

## Anti-pattern

Don't list every theoretical risk ("internet might go down"). Drift = **specific to this change**.
