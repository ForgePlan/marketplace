# incident-summary — When you debugged or resolved an incident

Use after: production incident, failing test investigation, mysterious bug fix, broken pipeline.

## Template

```
TL;DR: <symptom>. Root cause + fix: <one line>. <prevention or risk>.
       (Incidents may use up to 4 lines if all 4 facts cannot compress.)

═══ 🔥 Symptom ═══════════════════════════════════════════════════
  Observed:    <what user/system saw>
  When:        <timestamp / commit / version>
  Severity:    <P0 outage / P1 degraded / P2 cosmetic>
  Discovered:  <how it surfaced — alert / user report / spotted>

═══ 🔍 Root cause ════════════════════════════════════════════════
  <One paragraph: what actually broke and why>

  Confidence: <🟢High / 🟡Medium / 🔴Assumed>
  Evidence: <log line / commit / test that confirms>

═══ ✅ Fix applied ═══════════════════════════════════════════════
  <Where>                              <What changed>
  <Where>                              <What changed>

═══ ✅ Verification ═════════════════════════════════════════════
  <Check>                              <Result>
  Failing test now passes              ✅
  Symptom not reproducible             ✅
  Related tests still green            ✅

═══ ⚪ Not done (intentional) ════════════════════════════════════
  <related issue not addressed in this incident — why deferred>
  <broader refactor postponed for separate task>

═══ 🔄 Reversibility ════════════════════════════════════════════
  Fix reversible: <git revert path>
  Workaround reversible until: <date — when proper fix lands>
  Irreversible: <if data was modified / migrated mid-incident>

═══ ⚠️ Drift risks ═══════════════════════════════════════════════
  <If similar code path is added — same bug returns>
  <Workaround that should be replaced with proper fix>

═══ 🛡️ Prevention ═══════════════════════════════════════════════
  <Test added / lint rule / CI check / runbook update>
  <If "none" — explain why prevention is impractical>

═══ ➡️ Next steps / Post-mortem follow-ups ═════════════════════
  - <action>     <owner>     <due>
  - <action>     <owner>     <due>

💰 Cycle: <time-to-detect> · <time-to-fix> · <N tool calls>
```

## Required minimums

- ✅ Confidence label on root cause (often we *think* we know, but didn't fully verify)
- ✅ Verification step ≠ "code compiles" — must reproduce + fail-then-pass
- ✅ Prevention is **mandatory** — even if it's "no test possible, added runbook entry"
- ⚪ If incident is partially understood → say so explicitly, don't pretend full RCA

## Real-world example

```
TL;DR: sync-standalone-skills.yml упал с "Input required and not supplied: token".
       Root cause: secret STANDALONE_SYNC_TOKEN не был добавлен в маркетплейс.
       Fix: maintainer добавил PAT через `gh secret set`. Prevention: README
       в PR описывает шаг.

═══ 🔥 Symptom ═══════════════════════════════════════════════════
  Observed:    Workflow run 24954866577 failed at "Checkout target repo"
  When:        2026-04-26T10:53Z (auto-trigger after PR #24 merge)
  Severity:    P2 (cosmetic — sync mechanism not yet in production use)

═══ 🔍 Root cause ════════════════════════════════════════════════
  actions/checkout step requires token input. Token is supplied via
  ${{ secrets.STANDALONE_SYNC_TOKEN }}. Secret was not present in
  ForgePlan/marketplace, so the expression evaluated to empty.

  Confidence: 🟢 High
  Evidence: gh run view 25020112103 shows "token: ***" but error
            "Input required and not supplied: token"

═══ ✅ Fix applied ═══════════════════════════════════════════════
  ForgePlan/marketplace settings   Added secret STANDALONE_SYNC_TOKEN

═══ ✅ Verification ═════════════════════════════════════════════
  Re-trigger workflow              ✅ pass (run 25020766130)
  Idempotency (no diff = no commit) ✅ confirmed
```

## Anti-patterns

- ❌ "Fixed it" without root cause — bug returns next sprint.
- ❌ Verification = "deployed" — that's not verification, that's deployment.
- ❌ No prevention → repeats.
