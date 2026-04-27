# `## ⚪ Что не сделано — намеренно` — Required section

Explicitly list what was **not** done — and that this was on purpose.

## Why this matters

Without an explicit "Не сделано" section:
- User worries "did Claude touch X by accident?"
- Boundaries between scope and out-of-scope are unclear
- Future Claude (different session) may assume task wasn't fully attempted

A 1-card "Не сделано: deployment to prod / Почему: waiting for approval" prevents 5 minutes of "did we deploy?".

## Card format

```markdown
## ⚪ Что не сделано — намеренно

  Не сделано: <Item>
  Почему:     <Reason — out of scope / deferred / user's job>
  ───────────────────────────────────────────────────────────────
  Не сделано: <Item>
  Почему:     <Reason>
```

## What to include

- **Out-of-scope** items mentioned but not done
- **Optional steps** explicitly skipped (with reason)
- **Tests not run** (and why — e.g. "no UI in CI")
- **Files not modified** when they could have been
- **Steps deferred** to future task

## What NOT to include

- Things you forgot (those are bugs, not "not done")
- Trivially out-of-scope (don't list "didn't update README of unrelated repo")
- Speculation about what user *might* want

## When OK to write a single "—" card

If literally nothing was intentionally skipped:

```markdown
## ⚪ Что не сделано — намеренно

  Не сделано: —
  Почему:     Полный объём задачи выполнен, ничего не отложено
```

This still proves you thought about it.
