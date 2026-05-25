# Brownfield modernisation

## When this applies

There is an existing codebase (legacy or just old) that must be modernised
without burning cashflow. The user wants to keep the running system alive
while a new architecture grows around it. Triggers include "legacy",
"modernize", "refactor the monolith", "переписать монолит", "техдолг
с заменой". If the user wants a from-scratch greenfield, route to section
01; if it's a single feature inside a healthy existing service, route to
section 03.

## Methodology chain

1. **Primary**: Strangler Fig — grow new system around legacy, retire legacy branch-by-branch; the only risk-averse pattern for non-trivial modernisation.
2. **Secondary**: Domain-Driven Design (DDD) — bounded contexts surface the legacy seams; ubiquitous language prevents the new code from inheriting legacy semantic debt.
3. **Tertiary**: Anti-Corruption Layer (ACL) + Branch-by-Abstraction — ACL keeps the new domain semantically clean at the boundary; Branch-by-Abstraction lets new and old coexist on `main` for weeks.

## Dispatch sequence

1. **discover** (Profile A, from `forgeplan-brownfield-pack`) — produces 9 brownfield MCP findings + discover-session NOTE. Why first: smith **must not** assume anything about the legacy; the 7-phase discover agent (Sprint V) runs the canonical reconnaissance.
2. **research-analyst** (Profile A) — produces NOTE consolidating discover findings + external prior-art research. Why second: discover gives raw findings; research-analyst synthesises them into a digest the architects can act on.
3. **ddd-domain-expert** (Profile A) — produces NOTE with bounded contexts + ubiquitous language. Why third: contexts must be drawn before the strangler boundaries can be planned.
4. **adr-architect** (Profile A) — produces ADR(s) for strangler boundary + ACL strategy + first cut-over target. Auto-dispatches `c4-diagram` for ≥3-module decisions. Why fourth: boundary decisions are irreversible; they must be recorded.
5. **goal-planner** (Profile A) — produces task DAG with cut-over sequence. Why fifth: order matters in strangler — the wrong cut-over first amplifies risk.
6. **coder** (Profile C-coder) — produces new code behind the ACL + Branch-by-Abstraction. Why sixth: only after boundaries + sequence are gated.
7. **tester** (Profile B) — produces tester EVID with **both** new code coverage and regression suite against legacy. Why second-to-last: brownfield's biggest risk is silent regression.
8. **architect-reviewer** (Profile B) — produces architectural fitness EVID specifically checking that new code respects strangler boundary and ACL. Why penultimate-gate: needed before guardian.
9. **guardian** (Profile B-gate) — aggregates all prior EVIDs into PASS/CONCERNS/BLOCKER.

## Evidence requirements

- [ ] discover-session NOTE + ≥9 brownfield finding artifacts
- [ ] DDD bounded-contexts NOTE
- [ ] ≥1 ADR (strangler boundary) with C4 L1+L2 if ≥3 modules
- [ ] PRD (modernisation plan with explicit cut-over sequence + rollback strategy)
- [ ] ADI EVID with ≥3 hypotheses (must include "do nothing — keep legacy")
- [ ] BMAD adversarial EVID with ≥1 finding from `artifact-reviewer`
- [ ] tester EVID with regression-suite verdict=PASS
- [ ] architect-reviewer EVID with verdict=PASS (strangler boundary fitness)
- [ ] guardian Profile B EVID with verdict=PASS

## Failure modes

1. **The team skips discover and starts cutting-over from gut feel.** First cut-over hits a hidden integration; legacy breaks silently in a downstream system. **Recovery**: roll back the cut-over, dispatch `discover` retroactively, capture the hidden integration as a finding, replan.
2. **Bounded contexts are drawn from legacy module names instead of domain language.** New code inherits the legacy's semantic debt — "Customer" still means three different things. **Recovery**: dispatch `ddd-domain-expert` again with explicit instruction to interview domain experts, not read legacy code, then refactor names in the new code before more cut-overs.
3. **No ACL — new code talks to legacy data structures directly.** Within weeks the new code is as tangled as the legacy. **Recovery**: introduce ACL retroactively; this is expensive but the alternative is two legacies instead of one.
4. **Cut-over sequence chosen by "easiest first" instead of "least risk first".** Team builds confidence on trivial cut-overs, then hits the hard one with no fallback. **Recovery**: re-sequence the DAG with `goal-planner` using risk-weighted order; document the trade-off in an ADR-supersede.
5. **The "do nothing — keep legacy" hypothesis was never seriously considered.** Three months in, the team realises the legacy could have been wrapped in a stable API and called done. **Recovery**: re-run `forgeplan_reason` with strict instruction to score "do nothing" against the actual outcomes-to-date.

## Example invocation

```
User: "Our monolithic Rails 5 app handles 12 different business domains.
      We want to modernise but can't afford a big-bang rewrite."

Smith: Context=brownfield (row 2). Methodology=Strangler Fig + DDD + ACL.
       Dispatch:
       1. discover → 9 brownfield findings (Rails 5 EoL, 12 domains,
                     PostgreSQL 11, Sidekiq, Stripe integration, ...)
       2. research-analyst → NOTE (modernisation prior-art for Rails 5 → 7)
       3. ddd-domain-expert → NOTE (12 contexts → 4 bounded-context clusters)
       4. adr-architect → ADR-NNN (strangler boundary: Billing first) +
                          c4-diagram (L1+L2 for Billing extraction)
       5. goal-planner → task DAG (Billing extraction, 8 nodes,
                          ACL between new Billing and legacy Customer)
       6. coder × 2 → new Billing service code + ACL layer
       7. tester → tester EVID (new code 91%, regression suite PASS)
       8. architect-reviewer → fitness EVID (strangler boundary clean)
       9. guardian → gate EVID (PASS)

       Evidence required: discover NOTE + 9 findings + DDD NOTE + ADR +
                          C4 file + PRD + ADI EVID + BMAD EVID +
                          tester EVID + architect-reviewer EVID + guardian
       Methodology refs: Strangler Fig
                         https://martinfowler.com/bliki/StranglerFigApplication.html
                         DDD (Evans 2003), ACL Ch. 14
                         Branch-by-Abstraction
                         https://martinfowler.com/bliki/BranchByAbstraction.html
```

## References

- `../routing-map.md` — table row #2
- Strangler Fig: https://martinfowler.com/bliki/StranglerFigApplication.html
- DDD: Eric Evans (2003); https://www.domainlanguage.com/ddd/
- ACL: https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer
- Branch-by-Abstraction: https://martinfowler.com/bliki/BranchByAbstraction.html
- `plugins/forgeplan-brownfield-pack/agents/discover/` — Sprint V canonical discover agent
