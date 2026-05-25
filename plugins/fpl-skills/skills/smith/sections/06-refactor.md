# Refactoring

## When this applies

The user wants to restructure existing code without changing external
behaviour. Triggers include "refactor", "clean up the code", "extract
this into a service", "split this module", "рефакторинг", "почистить
код". If the goal is to fix a bug, route to section 04 or 05. If the goal
is to enable a new feature, route to section 03 (the feature is the
forcing function — refactor lands inside that PRD). Pure refactors (no
behaviour change) belong here.

## Methodology chain

1. **Primary**: Branch-by-Abstraction — introduces an abstraction layer between callers and implementation, swaps the implementation, then deletes the abstraction. Lets old and new coexist on `main` safely.
2. **Secondary**: Mikado Method — walks dependencies safely by recording each "I tried to change X, but it requires changing Y first" as a Mikado-graph node, then unwinding bottom-up.
3. **Tertiary**: DDD bounded-context check + Clean Architecture layering — if the refactor crosses module lines, the new shape must respect bounded contexts and the dependency-points-inward rule.

## Dispatch sequence

1. **research-analyst** (Profile A) — produces NOTE: current-state map + Mikado graph of unknowns. Why first: a refactor without a target shape is yak-shaving; the Mikado graph surfaces the real cost up front.
2. **code-analyzer** (Profile C) — produces NOTE with current complexity/coupling metrics. Why second: refactors must be measurable — without baseline metrics, "I refactored it" is unfalsifiable.
3. **architect-reviewer** (Profile B, **pre-refactor**) — produces EVID confirming the proposed end-state is architecturally better than the current state. Why third: catches "I made it different, not better" before any code is touched.
4. **adr-architect** (Profile A) — produces ADR-NNN with the target architecture (and ADR-supersede + delta-spec if it changes a prior ADR per Sprint Z8). Auto-dispatches `c4-diagram` for ≥3-module decisions.
5. **goal-planner** (Profile A) — produces task DAG with Branch-by-Abstraction steps (introduce abstraction → swap → delete abstraction). Why fifth: ordering matters; safe refactors are stepwise.
6. **coder** (Profile C-coder) — implements the DAG. Why sixth: only after the target is agreed.
7. **architect-reviewer** (Profile B, **post-refactor**) — produces EVID confirming the actual end-state matches the proposed end-state. Why seventh: the pre/post pair catches drift between intent and execution.
8. **tester** (Profile B) — produces tester EVID confirming behaviour is unchanged (regression suite green) and coverage at least matches pre-refactor. Why second-to-last: a refactor that changes behaviour silently is a bug.
9. **guardian** (Profile B-gate) — produces gate EVID.

## Evidence requirements

- [ ] NOTE with current-state map + Mikado graph
- [ ] NOTE with pre-refactor code-analyzer metrics (complexity, coupling, file count)
- [ ] PRD-NNN with explicit "no behaviour change" non-goal + target shape
- [ ] ADR-NNN with target architecture (delta-spec if supersedes per Sprint Z8); C4 L1+L2 if ≥3 modules per Sprint Z9
- [ ] ADI EVID with ≥3 hypotheses (must include "refactor now", "strangler-fig instead", "leave-it-alone")
- [ ] BMAD adversarial EVID with ≥1 finding from `artifact-reviewer`
- [ ] pre-refactor `architect-reviewer` EVID with verdict=PASS
- [ ] post-refactor `architect-reviewer` EVID with verdict=PASS
- [ ] tester EVID with regression-green + coverage ≥ pre-refactor baseline
- [ ] guardian Profile B EVID with verdict=PASS

## Failure modes

1. **No target shape — refactor is "make it nicer".** Three weeks later the code is different but not better; reviewers can't tell what was achieved. **Recovery**: stop, dispatch `adr-architect` to produce a target ADR with explicit success criteria; recommit to those criteria.
2. **Behaviour changes silently.** The refactor "happens to" alter an edge case; downstream consumers break. **Recovery**: roll back the offending step; add the missing regression test; rerun the refactor on a clean base.
3. **Mikado graph is skipped — refactor stalls midway because of an unforeseen dependency.** **Recovery**: pause, produce the Mikado graph now; unwind bottom-up; document the missed dependency as a Mikado-graph entry for next time.
4. **The "leave-it-alone" hypothesis was never seriously considered.** Months later the team realises the code wasn't actually paying interest. **Recovery**: re-run `forgeplan_reason` with strict instruction to score "leave alone" against the realised cost.
5. **Pre/post architect-reviewer EVIDs are not paired.** Drift between proposed and actual end-state slips through. **Recovery**: dispatch the missing reviewer now; if drift is real, file an ADR-supersede with delta-spec.

## Example invocation

```
User: "Our PaymentService class is 1800 lines and handles charges, refunds,
      webhooks, and reconciliation. Refactor it into separate services."

Smith: Context=refactor (row 6). Methodology=Branch-by-Abstraction + Mikado +
       DDD bounded-context check.
       Dispatch:
       1. research-analyst → NOTE (current-state: 1800 LOC, 4 concerns,
          12 inbound callers; Mikado graph: 3 callers assume a single
          transaction boundary that crosses concerns)
       2. code-analyzer → NOTE (cyclomatic complexity 287; coupling
          afferent 12 / efferent 23; baseline coverage 76%)
       3. architect-reviewer pre → EVID (target: 4 services + 1 façade;
          each ≤500 LOC; transaction boundary stays on façade; PASS)
       4. adr-architect → ADR-NNN (split PaymentService into 4 services
          behind façade) + c4-diagram (L1+L2, 5 modules)
       5. goal-replanner → task DAG:
          a) introduce façade interface (abstraction step)
          b) extract Charges service behind façade
          c) extract Refunds service behind façade
          d) extract Webhooks service behind façade
          e) extract Reconciliation service behind façade
          f) delete façade (no — keep, it's the new boundary)
       6. coder × 4 (parallel where dependencies allow)
       7. architect-reviewer post → EVID (each new service ≤500 LOC;
          transaction boundary preserved on façade; PASS)
       8. tester → EVID (regression suite 100% pass; coverage 79%
          ≥ baseline 76%; PASS)
       9. guardian → gate EVID (PASS)

       Evidence required: 2× NOTE + PRD + ADR + C4 file + ADI EVID +
                          BMAD EVID + pre+post architect-reviewer EVIDs +
                          tester EVID + guardian EVID
       Methodology refs: Branch-by-Abstraction
                         https://martinfowler.com/bliki/BranchByAbstraction.html
                         Mikado Method (Ellnestam & Brolund, 2014)
                         Clean Architecture (Martin 2017)
```

## References

- `../routing-map.md` — table row #6
- Branch-by-Abstraction: https://martinfowler.com/bliki/BranchByAbstraction.html
- Mikado Method: https://pragprog.com/titles/dlmikado/the-mikado-method/
- Clean Architecture: https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
- This repo's CLAUDE.md — Sprint Z8 (delta-spec for ADR-supersede)
