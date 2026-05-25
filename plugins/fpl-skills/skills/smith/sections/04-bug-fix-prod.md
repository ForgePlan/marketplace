# Bug fix — production, non-trivial

## When this applies

There is a confirmed production bug that is **not** trivial — race
conditions, intermittent failures, data corruption, regressions whose root
cause is not obvious from a single stack trace. Triggers include
"production bug", "race condition", "data corruption", "intermittent
failure", "продовый баг", "плавающий баг". For typos or one-line fixes,
route to section 05 (trivial). For an active outage, route to section 12
(incident) first; come back here for the post-incident fix.

## Methodology chain

1. **Primary**: RIPER-5 — Research → Innovate → Plan → Execute → Review. The mode-gating prevents the dominant failure mode of "patch the symptom and move on".
2. **Secondary**: 5 Whys — disciplined root-cause walk from symptom to systemic cause; gates the Research mode.
3. **Tertiary**: Blameless post-mortem + ADR (only if architectural) — if the root cause is systemic, the fix lands in an ADR-supersede so the same bug doesn't recur in a different shape.

## Dispatch sequence

1. **debugger** (Profile C) — produces NOTE with stack-trace analysis + repro steps. Why first: confirm the bug is real and reproducible; without a repro, all downstream work is speculation.
2. **error-detective** (Profile C) — produces NOTE correlating logs + metrics + recent deploys. Why second: many production bugs are deploy-correlated; finding the offending commit shortcuts the rest.
3. **research-analyst** (Profile A) — produces NOTE applying 5 Whys to walk from symptom to root cause. Why third: this is the RIPER-5 Research mode formalised; without it, the fix patches the symptom.
4. **adr-architect** (Profile A, **only if architectural**) — produces ADR-NNN if the root cause is a wrong architectural assumption. Why conditional: not every bug is architectural; ADR'ing every bug is overhead.
5. **coder** (Profile C-coder) — implements the fix + regression test. Why fifth: only after the root cause is documented can the fix be both surgical and complete.
6. **code-reviewer** (Profile B) — produces line-level review EVID. Why sixth: standard adversarial line-level check.
7. **tester** (Profile B) — produces tester EVID with explicit regression test for this specific bug. Why second-to-last: the regression test is the only thing standing between this bug and its recurrence.
8. **guardian** (Profile B-gate) — produces gate EVID.

## Evidence requirements

- [ ] NOTE with confirmed repro steps (`debugger` output)
- [ ] NOTE with 5 Whys root-cause analysis
- [ ] PRD-NNN with the fix plan + acceptance criteria
- [ ] If architectural: ADR-NNN with delta-spec (Sprint Z8) if supersedes a prior ADR
- [ ] ADI EVID with ≥3 hypotheses for fix approach (per S10)
- [ ] BMAD adversarial EVID with ≥1 finding from `code-reviewer`
- [ ] tester EVID with **named regression test** for this bug + verdict=PASS
- [ ] guardian Profile B EVID with verdict=PASS

## Failure modes

1. **Skipping the 5 Whys and patching the symptom.** The bug recurs in three weeks in a different shape; team loses confidence in the codebase. **Recovery**: open a new PRD for the recurrence; this time mandate the 5 Whys walk; reference both PRDs in the new ADR.
2. **The repro is flaky and the team gives up trying to reproduce.** Fix is shipped without verification; bug returns or worse, the fix breaks something else. **Recovery**: stop, invest in a reliable repro (often a unit/integration test that exposes the race); only then move forward.
3. **The fix is correct but no regression test is added.** A future refactor reintroduces the bug. **Recovery**: dispatch `tester` to write the regression test post-fix; backfill is acceptable but the test must exist before the PRD activates.
4. **Root cause is architectural but no ADR is filed.** Team treats it as a one-off; same root cause produces a different bug six months later. **Recovery**: file the retroactive ADR; if the bug recurs, the ADR makes it visible.
5. **The team blames an individual instead of the system.** Postmortem becomes a witch-hunt; future incidents are hidden. **Recovery**: invoke blameless post-mortem norms explicitly; reframe findings in system terms.

## Example invocation

```
User: "We have a race condition in our billing reconciliation job.
      About 1 in 5000 invoices ends up double-counted in our reporting
      database. Started after the deploy last Tuesday."

Smith: Context=bug-fix-prod (row 4). Methodology=RIPER-5 + 5 Whys.
       Dispatch:
       1. debugger → NOTE (confirmed repro: load test
          1000 concurrent reconciliations against staging,
          reproduces 0.02% double-count)
       2. error-detective → NOTE (Tuesday deploy added
          parallel batch processing; race in unique-constraint check)
       3. research-analyst → NOTE (5 Whys:
          1. Why double-counted? No unique constraint on (invoice_id, batch_run)
          2. Why no constraint? Schema migration deferred for "speed"
          3. Why deferred? Sprint deadline pressure
          4. Why deadline pressure? Q-end commit to leadership
          5. Why commit before schema review? No ADR for batch-processing schema
          → Root cause is systemic: batch jobs lack schema review gate)
       4. adr-architect → ADR-NNN (Batch job schema review gate)
                          + c4-diagram (L1+L2 for batch subsystem, 4 modules)
       5. coder → DB migration + idempotency key + dedup query + tests
       6. code-reviewer → EVID (1 finding: dedup query needs index — CONCERNS)
                          → fixer → re-review (PASS)
       7. tester → EVID (regression test "test_concurrent_reconciliation_idempotent"
                  added; coverage 88%; PASS)
       8. guardian → gate EVID (PASS)

       Evidence required: repro NOTE + 5 Whys NOTE + PRD + ADR + C4 file +
                          ADI EVID + code-reviewer EVID + tester EVID + guardian
       Methodology refs: RIPER-5  https://github.com/johnpeterman72/CursorRIPER
                         5 Whys (Toyota)
                         Blameless post-mortem (Allspaw 2012)
```

## References

- `../routing-map.md` — table row #4
- RIPER-5: https://github.com/johnpeterman72/CursorRIPER
- 5 Whys: https://en.wikipedia.org/wiki/Five_whys
- Blameless post-mortem: https://www.etsy.com/codeascraft/blameless-postmortems/
- This repo's CLAUDE.md — Sprint Z6 (BMAD adversarial findings)
