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

1. **performance-engineer** (Profile B, allowlist-backed since 2026-09-05) — produces the
   **baseline EVID** per `templates/perf-baseline.md`: numeric p50/p95/p99 per endpoint,
   throughput, cost, AND the exact reproduction command. Why first: a perf audit without a
   baseline is theatre; the baseline EVID is the row's falsifiability anchor, and it must exist
   **before any change lands**.
2. **research-analyst** (Profile C, read-only) — returns the hot-path synthesis TO THE
   ORCHESTRATOR: profiler output, slow query log, cache hit rates. Its denylist forbids
   `forgeplan_new`/`update`/`link`, so **the orchestrator persists the NOTE**. Why second:
   candidate hypotheses for where time goes.
3. **code-analyzer** (Profile C†, letter advisory — its allowlist keeps Write/Edit) — returns
   complexity metrics for the hot-path modules to the orchestrator. Cheap signal; complexity often
   correlates with perf surprises.
4. **adr-architect** (Profile A, **only if the perf fix is architectural**) — produces ADR-NNN for
   the chosen change (cache layer, read-replica, denormalisation). The fix-hypothesis ADI (≥3
   hypotheses including "do nothing") is Profile A / orchestrator territory (`forgeplan_reason`) —
   reviewers never run it.
5. **coder** (Profile C-coder) — implements the change. Only after the ADR (if architectural) or
   after the hot path is identified (if local).
6a. **performance-engineer** (re-dispatch, fresh context) — produces the **post-change PERF EVID**:
   same shape as the baseline, same reproduction command, delta stated as measured. Because it
   claims a code change, the body MUST carry `## Ground-truth verification` (Step 4.5) — guardian
   BLOCKs a code-claiming EVID without it. A regression is recorded as a regression — the number
   is never softened to keep a green run.
6b. **tester** (Profile B) — produces the **correctness-regression EVID**: re-runs the functional
   suite and confirms the change broke no behaviour. Ownership split is deliberate: 6a owns the
   perf numbers, 6b owns correctness — one EVID each, no shared claim window.
7. **guardian** (Profile B-gate) — gate EVID over the whole chain.

After each Profile B EVID the reviewer emits `<<NEEDS_ACTIVATION>>`; **the orchestrator
activates** before guardian reads the chain.

## Interaction contract

| Role | Context | forgeplan tools | Human needed? | FPF allowed? | Skills |
|---|---|---|---|---|---|
| orchestrator (main session) | main | full surface; persists C-synthesis; ACTIVATES EVIDs; runs the fix-hypothesis ADI | perf-budget sign-off is a three-party decision (engineering + product + SRE) — a human represents the other two; accepting "do nothing" is a human call | `forgeplan_reason` — yes (its territory) | `/estimate`, `/gate-check`, `/methodology-check` |
| performance-engineer | fresh isolated dispatch; re-dispatched for 6a in a NEW context (never reuses the baseline context) | B surface; NO activate/reason/claims/memory_retain | no | `fpf-evaluate` on contested numbers — yes; ADI — no | — |
| research-analyst / code-analyzer | fresh isolated dispatch each | read-only | no | no | — |
| adr-architect | fresh isolated dispatch | Profile A surface | irreversible changes (schema denormalisation, data migration) → human confirms before activation | yes — ADI is its contract | `/decision`, `c4-diagram` if ≥3 modules |
| coder | fresh isolated dispatch, own worktree | none (forgeplan mutators denied) | no | no | — |
| tester | fresh isolated dispatch | B surface | no | no | — |
| guardian | fresh isolated dispatch | B-gate surface | human may overrule CONCERNS | no | — |

Context rule: 6a runs in a fresh context — the post-change measurement must not inherit the
baseline run's assumptions (generator ≠ verifier applies to measurements too: the same agent
re-measuring in the same context grades its own homework).

## Evidence requirements

1. performance-engineer Profile B EVID with **baseline** measurement per
   **`templates/perf-baseline.md`** — numeric p50/p95/p99 AND the reproduction command (narrative
   is not enough; a baseline that cannot be re-run is theatre); carries `## Findings` (an honest
   zero of anomalies lands as CONCERNS with ≥2 sentences)
2. NOTE with hot-path analysis (persisted by the orchestrator from the Profile C synthesis)
3. PRD-NNN with explicit perf-budget target (e.g. "p95 < 200ms at 1000 RPS")
4. If architectural: ADR-NNN + C4 L1+L2 if ≥3 modules + delta-spec if supersedes
5. ADI EVID with ≥3 hypotheses for the perf fix (e.g. "add cache", "denormalise", "do nothing —
   accept current perf") — created on the orchestrator/Profile A path, not by reviewers
6. BMAD adversarial EVID with ≥1 finding from `artifact-reviewer`; the perf EVIDs also carry
   `## Findings` (honest zero → CONCERNS)
7. performance-engineer **post-change PERF EVID** (same reproduction command, delta stated,
   `## Ground-truth verification` present) + tester **correctness EVID**, both with
   `review_verdict=PASS` (the review axis; `verdict:` keeps the evidence vocabulary —
   a measured regression against a claimed improvement is `weakens`)
8. guardian Profile B EVID with review_verdict=PASS
(Reference list, not a runtime checklist — numbered per the CLAUDE.md ban on empty `- [ ]` in committed files.)


## Failure modes

1. **No baseline — "I optimised the query" with no numbers.** Cannot verify whether the change helped, hurt, or did nothing. **Recovery**: dispatch `performance-engineer` to measure post-change; if numbers show no improvement, roll back. Backfilling a "baseline" by measuring an equivalent earlier commit is a **degraded path only** — the agent body forbids it as a normal move ("baseline first, before any change"); if forced to it, the backfilled EVID carries a lowered congruence_level and `review_verdict: CONCERNS`, never a clean PASS.
2. **Optimisation chosen before profiling.** Team rewrites the "obvious" slow function; turns out 90% of the time was in a DB call elsewhere. **Recovery**: profile *first*; the rewrite goes into the rejected-hypotheses list of the ADI EVID.
3. **Perf budget set without buy-in from product/SRE.** Engineering hits p95<200ms; product wanted p95<50ms; SRE knows error budget can't sustain the cost. **Recovery**: re-do the perf budget with all three stakeholders; record in the PRD.
4. **The "do nothing" hypothesis was skipped.** Team spends a week shaving 5ms off p95; users would not have noticed. **Recovery**: re-run `forgeplan_reason` to score "do nothing" against the realised effort vs user impact.
5. **Bench environment differs from production.** Fix works in staging, regresses in prod under real load. **Recovery**: rerun bench in a production-shaped environment; document the staging-vs-prod gap as a separate NOTE. A profiler or bench harness the reviewer could not run is CONCERNS `tool unavailable` — never a silent PASS.

## Example invocation

```
User: "Our /search endpoint p95 jumped from 80ms to 340ms over the last
      month. Something is wrong but we can't pin it down."

Smith: Context=perf-audit (row 9). Methodology=DORA + perf-budget + 5 Whys
       (regression).
       Dispatch:
       1. performance-engineer → baseline EVID per perf-baseline.md
          (current: p50 110ms / p95 340ms / p99 720ms / 250 RPS;
          one-month-ago: p50 35ms / p95 80ms / p99 150ms / 240 RPS
          → confirmed regression, not load growth; reproduction command
          recorded)
       2. research-analyst → synthesis to orchestrator (5 Whys + profiler:
          seq scan on `documents`; index not used past 10M rows; no
          query-plan regression test) → ORCHESTRATOR writes the NOTE
       3. code-analyzer → synthesis (search module complexity unchanged;
          DB stats stale) → orchestrator folds it into the NOTE
       4. adr-architect → ADR skipped (not architectural — index hint +
          ANALYZE schedule; query-plan test in CI is a follow-up PRD)
       5. coder → migration: index hint + weekly ANALYZE cron +
          query-plan snapshot test in CI
       6a. performance-engineer (fresh context) → post-change PERF EVID
          (p50 32ms / p95 75ms / p99 140ms; target p95<200ms ACHIEVED;
          same reproduction command; ## Ground-truth verification present;
          review_verdict PASS)
       6b. tester → correctness EVID (suite green, no behaviour change;
          review_verdict PASS)
       → orchestrator reads <<NEEDS_ACTIVATION>>, activates both
       7. guardian → gate EVID (PASS)

       Evidence required: baseline EVID + hot-path NOTE + PRD + ADI EVID +
                          BMAD EVID + post-change PERF EVID + correctness
                          EVID + guardian EVID
       Methodology refs: DORA  https://dora.dev
                         SRE   https://sre.google/books/
                         5 Whys (Toyota)
```

## References

- `../routing-map.md` — table row #9 + agent index (allowlist-backed B since 2026-09-05)
- `templates/perf-baseline.md` — the baseline/post-change EVID shape (both verdict axes)
- DORA: https://dora.dev
- SRE: https://sre.google/books/
- Performance budgets: https://web.dev/articles/performance-budgets-101
- This repo's CLAUDE.md — Sprint Z6 (BMAD adversarial), Sprint Z7 (ADI)
