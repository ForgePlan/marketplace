# Performance Baseline Template (EVID body — the falsifiability anchor)

> **A baseline without a reproduction command is theatre** — `sections/09-perf-audit.md`'s own
> words. The numbers matter only if the NEXT measurement can be taken the SAME way.
> **Hard limit**: ≤200 lines.
> **Used in**: `perf-audit` context (smith row 9, step 1 — `performance-engineer`'s baseline
> EVID; ADR-024 wave 4 D9). Also the body for the row's step-6 regression bench (same form,
> compared against this one).
> **DORA / error budgets are deliberately NOT here** — they need deploy telemetry this
> workspace does not have and a consumer-specific form (ADR-024 D10, deferred under RT-3).

---

# Perf baseline: <system/service — one line, with the load context>

| Field | Value |
|---|---|
| Status | Draft |
| Date | YYYY-MM-DD |
| Environment | <hardware/instance, OS, runtime version — enough to explain a delta later> |
| Load profile | <e.g. "1000 RPS constant, 10 min, warm cache" — the SAME profile re-runs use> |
| Baseline of | <PRD-NNN perf budget this anchors, or "pre-change baseline for RFC-NNN"> |

## Structured Fields

**Evidence type**: benchmark
**Verdict**: supports
**Congruence level**: 3

## Measurements

<One row per endpoint/operation. Every number from THIS run — never copied from a dashboard
screenshot you cannot re-produce. p50/p95/p99 are MUST (narrative is not enough — row 9's own
evidence requirement); throughput and cost when the budget names them.>

| Endpoint / operation | p50 | p95 | p99 | Throughput | Err % | Cost/unit |
|---|---|---|---|---|---|---|
| <op> | ms | ms | ms | req/s | % | <$ or tokens or —> |

## Reproduction

<THE load-bearing section. The exact command(s) that produced the table above — copy-pasteable,
with the dataset/fixture named. If a harness script exists, its path and revision. A reader who
runs this block must get comparable numbers or a measurable reason why not.>

```bash
# exact command(s), including warm-up if any
```

## Conditions and caveats

<What was NOT controlled: noisy neighbours, cold caches, sample size, time of day. One line
each. An honest caveat here is cheaper than a false regression alarm later.>

## Comparison (regression-bench runs only)

<Only when this EVID re-runs an earlier baseline: name the baseline EVID, put both p95 columns
side by side, and state the verdict against the PRD's budget line — improved / unchanged /
regressed, with the number. The budget, not taste, decides.>

---

## How to use this template

1. `performance-engineer` (B) fills it as the EVID body; link `informs` → the PRD carrying the
   perf budget. The structured fields above are what the R_eff parser reads — keep the
   bold-pattern form.
2. The regression bench (row 9 step 6, `tester`) uses the SAME template and the SAME
   Reproduction block — comparability is the whole point.
3. If the budget PRD does not exist yet, this baseline is still valid as "pre-change anchor" —
   say so in `Baseline of` and link to the RFC instead.
