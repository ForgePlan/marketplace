# Not done (intentional) — Required section

Explicitly list what was **not** done — and that this was on purpose.

## Why this matters

Without an explicit "Not done" section:
- User worries "did Claude touch X by accident?"
- Boundaries between scope and out-of-scope are unclear
- Future Claude (different session) may assume task wasn't fully attempted

A 1-line "⚪ Not done: deployment to prod (waiting for approval)" prevents 5 minutes of "did we deploy?".

## Format

```
═══ ⚪ Not done (intentional) ════════════════════════════════════
  <Item — why skipped>
  <Item — why skipped>
```

Use ⚪ icon (not ❌ — that's failure, ⚪ is intentional skip).

## What to include

- **Out-of-scope** items mentioned but not done
- **Optional steps** explicitly skipped (with reason)
- **Tests not run** (and why — e.g. "no UI in CI")
- **Files not modified** when they could have been
- **Steps deferred** to future task

## What NOT to include

- Things you forgot (those are bugs, not "not done")
- Trivially out-of-scope (don't list "didn't update README of unrelated repo")
- Speculation about what user *might* want (don't list everything you imagined)

## When OK to write "—"

If literally nothing was intentionally skipped, write:
```
═══ ⚪ Not done (intentional) ════════════════════════════════════
  — (full task scope completed)
```

This still proves you thought about it.
