# migration-summary — When you refactored or migrated

Use after: framework upgrade, dependency migration, restructure, rename, schema migration, big refactor.

## Template

```
TL;DR: <from X to Y>. <N files changed>. <verification>. <rollback path>.

═══ 🔀 Migration scope ═══════════════════════════════════════════
  From:        <old version / framework / structure>
  To:          <new version / framework / structure>
  Reason:      <why now — deprecation, perf, debt>
  Strategy:    <big bang / gradual / dual-write / parallel>

═══ 📝 Affected ══════════════════════════════════════════════════
  Files:       <count + key paths>
  Tests:       <count> updated, <count> new
  Docs:        <updated paths>
  Schema/DB:   <changes if any>

═══ ✅ Verification ═════════════════════════════════════════════
  <Check>                              <Result>     <Confidence>
  All tests pass                       <result>     <label>
  Functional smoke                     <result>     <label>
  Performance vs baseline              <result>     <label>
  Backward compatibility               <result>     <label>

═══ ⚪ Not migrated (intentional) ════════════════════════════════
  <Item — why skipped, when planned>

═══ 🔄 Rollback procedure ════════════════════════════════════════
  Reversible: <how to roll back if needed — git revert, feature flag, schema down>
  Window:     <until rollback becomes risky — e.g. "before next migration runs">
  Irreversible: <list or "none">

═══ ⚠️ Drift risks ═══════════════════════════════════════════════
  <New code may introduce old patterns — add lint rule>
  <Stale references in docs / comments>

═══ 📈 Adoption signal ═══════════════════════════════════════════
  How we'll know this migration succeeded:
  - <metric / signal>
  - <metric / signal>

═══ ➡️ Next steps ══════════════════════════════════════════════
  1. <action>
  2. <action>

💰 Cycle: <N files> · <N commits> · <~hours>
```

## Required minimums

- ✅ Strategy named (big-bang, gradual, dual-write, parallel)
- ✅ Rollback procedure even if "git revert" — never skip
- ✅ Drift risks — migrations leave half-old/half-new state somewhere
- ✅ Adoption signal — how to know it actually worked in production

## Real-world example

```
TL;DR: Auth middleware migrated from express-jwt to jose. 14 files changed,
       all tests green. Rollback: git revert (single commit). Drift risk:
       legacy services still import old middleware path.

═══ 🔀 Migration scope ═══════════════════════════════════════════
  From:        express-jwt 6.x (deprecated, no maintenance)
  To:          jose 5.x (active, ESM-native)
  Reason:      CVE-2024-XXXXX in express-jwt, no patch
  Strategy:    Big bang (single PR, all callers updated)

═══ ✅ Verification ═════════════════════════════════════════════
  Unit tests (auth)                    98/98 pass    🟢 High
  E2E login flow                       pass          🟢 High
  Performance JWT verify               -8% latency   🟡 Medium (small sample)
  Backward compat (token format)       same JWT spec 🟢 High

═══ 🔄 Rollback procedure ════════════════════════════════════════
  Reversible: `git revert <commit>` then `npm install` — 5 min
  Window:     Before rotating signing keys (planned 2026-05-15)
  Irreversible: none until key rotation
```

## Anti-patterns

- ❌ "Migration complete!" without verification — false confidence.
- ❌ No rollback plan — code stuck after first issue.
- ❌ No drift risks — migration leaves zombie code paths.
