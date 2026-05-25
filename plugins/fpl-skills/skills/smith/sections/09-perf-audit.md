# Performance audit

## When this applies

The user reports a performance problem (latency, throughput, cost) or
wants a proactive perf review before a launch. Triggers include "slow",
"latency spike", "throughput", "perf review", "p95 regressed", "тормозит",
"оптимизация". If the perf issue is causing an active outage, route to
section 12 (incident) first.

## Methodology chain

1. **Primary**: DORA metrics + per-endpoint Performance Budget — DORA gives organisational baseline; perf budget gives a falsifiable per-endpoint target.
2. **Secondary**: SRE error-budget framing — reframes "should we optimise?" as "are we burning the error budget faster than we can repay it?". Prevents "optimise everything" sprawl.
3. **Tertiary**: 5 Whys (for regressions) — when perf got worse, walk the symptom to the offending commit/change.

## Dispatch sequence

1. **performance-engineer** (Profile B) — produces EVID with baseline measurement (p50, p95, p99 per endpoint; throughput; cost). Why first: a perf audit without baseline is theatre. The baseline EVID is the falsifiability anchor.
2. **research-analyst** (Profile A) — produces NOTE with hot-path analysis: profiler output, slow query log, cache hit rates. Why second: candidate hypotheses for where time goes.
3. **code-analyzer** (Profile C) — produces NOTE with complexity metrics for the hot-path modules. Why third: complexity often correlates with perf surprises; cheap signal.
4. **adr-architect** (Profile A, **only if perf fix is architectural**) — produces ADR-NNN for the chosen change (e.g. cache layer, read-replica, denormalisation). Why conditional: not every perf fix is architectural — sometimes it's a single missing index.
5. **coder** (Profile C-coder) — implements the change. Why fifth: only after ADR (if architectural) or after hot-path is identified (if local).
6. **tester** (Profile B) — produces tester EVID with regression bench: re-runs the baseline scenario and confirms the change improved p95 without breaking correctness. Why second-to-last: a perf "fix" that breaks behaviour is a bug.
7. **guardian** (Profile B-gate) — produces gate EVID.

## Evidence requirements

- [ ] performance-engineer Profile B EVID with **baseline** measurement (must include numeric p50/p95/p99 — narrative is not enough)
- [ ] NOTE with hot-path analysis (profiler output or equivalent)
- [ ] PRD-NNN with explicit perf-budget target (e.g. "p95 < 200ms at 1000 RPS")
- [ ] If architectural: ADR-NNN + C4 L1+L2 if ≥3 modules + delta-spec if supersedes
- [ ] ADI EVID with ≥3 hypotheses for the perf fix (e.g. "add cache", "denormalise", "do nothing — accept current perf")
- [ ] BMAD adversarial EVID with ≥1 finding from `artifact-reviewer`
- [ ] tester EVID with **post-change benchmark** numbers + verdict=PASS
- [ ] guardian Profile B EVID with verdict=PASS

## Failure modes

1. **No baseline — "I optimised the query" with no numbers.** Cannot verify whether the change helped, hurt, or did nothing. **Recovery**: dispatch `performance-engineer` to measure post-change; if numbers show no improvement, roll back; if improvement, backfill the missing baseline by measuring an equivalent earlier commit.
2. **Optimisation chosen before profiling.** Team rewrites the "obvious" slow function; turns out 90% of the time was in a DB call elsewhere. **Recovery**: profile *first*; the rewrite goes into the rejected-hypotheses list of the ADI EVID.
3. **Perf budget set without buy-in from product/SRE.** Engineering hits p95<200ms; product wanted p95<50ms; SRE knows error budget can't sustain the cost. **Recovery**: re-do the perf budget with all three stakeholders; record in the PRD.
4. **The "do nothing" hypothesis was skipped.** Team spends a week shaving 5ms off p95; users would not have noticed. **Recovery**: re-run `forgeplan_reason` to score "do nothing" against the realised effort vs user impact.
5. **Bench environment differs from production.** Fix works in staging, regresses in prod under real load. **Recovery**: rerun bench in a production-shaped environment; document the staging-vs-prod gap as a separate NOTE.

## Example invocation

```
User: "Our /search endpoint p95 jumped from 80ms to 340ms over the last
      month. Something is wrong but we can't pin it down."

Smith: Context=perf-audit (row 9). Methodology=DORA + perf-budget + 5 Whys
       (regression).
       Dispatch:
       1. performance-engineer → baseline EVID
          (current: p50 110ms / p95 340ms / p99 720ms / 250 RPS;
          one-month-ago: p50 35ms / p95 80ms / p99 150ms / 240 RPS
          → confirmed regression, not load growth)
       2. research-analyst → NOTE (5 Whys + profiler:
          1. Why slow? p95 dominated by DB query "search_documents"
          2. Why slow query? sequential scan on `documents` table
          3. Why seq scan? Index `idx_documents_tsvector` not used
          4. Why not used? Query plan changed when row count crossed 10M
          5. Why no alarm? No regression test on query plan
          → Root cause: missing query-plan stability test)
       3. code-analyzer → NOTE (search module complexity unchanged;
          DB stats stale)
       4. adr-architect → ADR-NNN-skipped (not architectural — index hint
          + ANALYZE schedule fix the immediate issue; query-plan
          regression test in CI is a follow-up PRD, not an ADR)
       5. coder → migration: index hint on search_documents +
          weekly ANALYZE cron + query-plan snapshot test in CI
       6. tester → EVID (re-run bench: p50 32ms / p95 75ms / p99 140ms;
          target p95<200ms ACHIEVED; query-plan snapshot test added; PASS)
       7. guardian → gate EVID (PASS)

       Evidence required: baseline EVID + hot-path NOTE + PRD + ADI EVID +
                          BMAD EVID + post-change bench EVID + guardian EVID
       Methodology refs: DORA  https://dora.dev
                         SRE   https://sre.google/books/
                         5 Whys (Toyota)
```

## References

- `../routing-map.md` — table row #9
- DORA: https://dora.dev
- SRE: https://sre.google/books/
- Performance budgets: https://web.dev/articles/performance-budgets-101
- This repo's CLAUDE.md — Sprint Z6 (BMAD adversarial), Sprint Z7 (ADI)
