# Performance Baseline — Sprint Q (2026-05-20)

> First production-grade performance snapshot of `forgeplan` MCP tool usage in the marketplace workspace. Captures Sprint A-Q cumulative activity (24h window: 229 calls, 99.6s total, 12 errors = 5.2% error rate).
>
> Purpose: identify slowest tools + recommend caching strategies for orchestrators. Foundation for future "Sprint W speed-up" work.

---

## Snapshot

**Date**: 2026-05-20 (post-Sprint Q Wave A/B/C close)
**Window**: 24 hours
**Bank**: forge-marketplace
**Source**: `mcp__forgeplan__forgeplan_activity_stats(since_hours=24)`

| Metric | Value |
|---|---:|
| Total calls | 229 |
| Total errors | 12 |
| Error rate | **5.2%** |
| Total ms | 99587 (99.6s) |
| Unique tools | 30 |

---

## Top-10 by total_ms (where time is spent)

| Rank | Tool | Calls | Errors | p50 | **p95** | Total | % of total |
|---:|---|---:|---:|---:|---:|---:|---:|
| 1 | `forgeplan_activate` | 42 | 2 | 327ms | 1216ms | 22.3s | 22.4% |
| 2 | `forgeplan_decay` | 1 | 0 | 20968ms | 20968ms | 21.0s | 21.1% |
| 3 | **`forgeplan_score`** | 16 | 0 | 857ms | **3571ms** | 20.1s | **20.2%** |
| 4 | `forgeplan_link` | 41 | 1 | 367ms | 1445ms | 18.8s | 18.8% |
| 5 | `forgeplan_update` | 27 | 0 | 94ms | 1028ms | 5.6s | 5.6% |
| 6 | `forgeplan_new` | 25 | 1 | 138ms | 486ms | 5.4s | 5.4% |
| 7 | `forgeplan_deprecate` | 9 | 4 | 154ms | 1824ms | 2.7s | 2.7% |
| 8 | `forgeplan_health` | 6 | 0 | 141ms | 151ms | 846ms | 0.8% |
| 9 | `forgeplan_validate` | 15 | 0 | 43ms | 131ms | 748ms | 0.8% |
| 10 | `forgeplan_get` | 22 | 1 | 15ms | 44ms | 492ms | 0.5% |

**Top 4 tools consume 82.5% of total time.**

---

## Slowest by p95 (latency outliers)

| Tool | p95 | Why |
|---|---:|---|
| `forgeplan_decay` | **21s** | Single call (cold start scan of all artifacts with valid_until check). Acceptable for once-per-session sweep. |
| `forgeplan_score` | **3.5s** | Recursive R_eff computation traverses evidence graph. **Hot tool for orchestrators** — 16 calls × ~1s avg. |
| `forgeplan_deprecate` | 1.8s | Tail latency dominated by error retries (4/9 errors). |
| `forgeplan_link` | 1.4s | LanceDB write + graph re-projection. Expensive at scale. |
| `forgeplan_activate` | 1.2s | Validation gate + transition + projection write. |

---

## Error analysis

12 errors out of 229 calls = 5.2% error rate.

| Tool | Errors | Root cause |
|---|---:|---|
| `forgeplan_deprecate` | 4 | FSM rejection (`Invalid transition: draft → deprecated`) — pattern from Anomaly #13 + #14 (artifact in draft, restore returns to draft) |
| `forgeplan_activate` | 2 | FSM gate (Anomaly #20 — "no evidence linked") |
| `forgeplan_release_notes` | 2 | Anomaly #12 split-repo (forgeplan#290) |
| `forgeplan_link` | 1 | Direction mismatch (Anomaly #15/#16 — relinked manually) |
| `forgeplan_supersede` | 1 | FSM (source not in valid state) |
| `forgeplan_new` | 1 | Title length > 128 chars (caught by validation) |
| `forgeplan_get` | 1 | (transient) |

**Pattern**: 8 of 12 errors (67%) are **methodology gates correctly rejecting bad input**, NOT bugs. This is a feature, not a problem.

---

## Caching recommendations for orchestrators

### Recommendation 1: Cache `forgeplan_score` results

**Signal**: `forgeplan_score` is **3rd slowest** total time consumer (20.1s / 20.2%) with **highest p95** (3.5s) of frequently-called tools.

**Strategy**:
- TTL-based cache per artifact_id (5-10 second TTL)
- Invalidate on: `forgeplan_link`, `forgeplan_update`, `forgeplan_activate`, `forgeplan_deprecate` for the artifact OR any of its evidence
- `/forge-cycle` Phase 6 makes multiple `_score` calls — cache between Phase 6.1 and Phase 6.3

**Expected gain**: 50-70% reduction in score-related latency (8-14s saved per /forge-cycle run).

### Recommendation 2: Batch `forgeplan_link` calls

**Signal**: 41 link calls × p50=367ms = 15s spent in serial link writes.

**Strategy**:
- Orchestrator buffers link intents during a phase
- Single batch call at phase boundary
- Requires upstream feature (forgeplan#296 candidate): `forgeplan_link_batch([{source, target, relation}, ...])`

**Expected gain**: 60-80% reduction if N links batched (one network roundtrip + one LanceDB transaction).

**Status**: feature request — file upstream after v0.32.0 ship.

### Recommendation 3: Skip `forgeplan_score` for artifacts known-fresh

**Signal**: Many `_score` calls happen "just to verify" R_eff after activate. If we just linked + activated within the same orchestrator turn, score is predictable.

**Strategy**:
- `/forge-cycle` Phase 6.5 skips `_score` if last `_link informs` succeeded within last 5 seconds
- Use response of `_link` (`_next_action: R_eff recomputed`) as implicit score signal
- Explicit `_score` call only at phase boundary OR before user-visible report

**Expected gain**: 30-40% reduction in score calls.

### Recommendation 4 (defensive): Surface error budget in `/forge-progress`

**Signal**: 5.2% error rate is **acceptable** but should be visible. 67% of errors are methodology gates (correct behavior); 33% are bugs/anomalies that need tracking.

**Strategy**:
- `/forge-progress` dashboard shows last-hour error breakdown
- Distinguish "methodology gate rejection" vs "tool error" via error message regex
- Alert if non-gate error rate exceeds 5%

---

## What this tells us about Sprint A-Q

| Insight | Evidence |
|---|---|
| **Most time goes into mutations** (activate + link + update) | Top 5 tools are write-side; reads are fast |
| **R_eff scoring is the speed bottleneck** | Single tool consumes 20.2% of total time; p95 = 3.5s |
| **Methodology gates work as designed** | 67% of errors are correct FSM rejections |
| **Tail latency tools are rare** | `forgeplan_decay` (21s) is once-per-session OK; no other tool > 4s |
| **Read tools (get/list/validate) are fast** | All < 1s p95; no caching needed for read path |

---

## Future Sprint candidates (post-v0.32)

| Sprint candidate | Target | Effort |
|---|---|---|
| **Sprint W: Score caching** | Implement Recommendation 1 in `/forge-cycle` + `/autorun` | 1-2h |
| **Sprint X: Link batching** | File upstream feature request + integrate when MCP surface lands | 1h + wait v0.33 |
| **Sprint Y: Error visibility** | `/forge-progress` error budget panel | 30-60 min |

---

## References

- Source: `mcp__forgeplan__forgeplan_activity_stats(since_hours=24)` 2026-05-20
- Related: Sprint J+K EVID-063 (first activity_stats live exercise)
- mental model `mm-production-grade-checklist` — links to this baseline as evidence
- forgeplan#290 (related: release_notes errors)
- Anomaly #13, #14, #20 (FSM gate patterns explain 67% of error budget)
