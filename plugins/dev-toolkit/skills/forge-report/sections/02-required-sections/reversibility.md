# Reversibility — Required section

Tell the reader: **what can be undone, what cannot, and how**.

## Why this matters

Trust = predictability. If user knows "I can revert this in 30 seconds", they take more risks. If they don't know — they freeze.

Especially important after:
- File creates / modifications
- Git operations (commits, merges, branches)
- External system effects (PR, deploy, secret added, ticket created)
- Long-running migrations / data transformations

## Format

```
═══ 🔄 Reversibility ════════════════════════════════════════════
  Reversible: <action — how to undo>
  Reversible: <action — how to undo>
  Irreversible: <action OR "none">
```

## Concrete examples

```
Reversible: rm -rf plugins/dev-toolkit/skills/forge-report (single dir)
Reversible: gh pr close 25 (PR not yet merged)
Reversible: git revert <commit-sha> (no downstream consumers yet)
Irreversible: secret STANDALONE_SYNC_TOKEN created (can be rotated, not undone)
Irreversible: PR #24 merged to main (history preserved, but production state changed)
```

## Greybeards: include time window

For some "reversible" things, the window closes:

```
Reversible until: 2026-05-15 (key rotation makes old auth uncallable)
Reversible until: next migration runs
Reversible until: customer first uses feature
```

## When reversibility is obvious

Skip this section only if **all** of:
- Pure read-only operations
- No file changes
- No external system effects

In all other cases — include it, even if 1 line.
