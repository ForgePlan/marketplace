# New feature in existing service

## When this applies

There is a healthy existing service (not legacy) and the user wants to add
a feature inside it. Triggers include "add a feature", "build a new
endpoint", "новая фича", "добавить функционал". If the feature crosses ≥3
modules or implies a new bounded context, route to ADR decision (section
07) first to ratify the architectural impact, then come back here.

## Methodology chain

1. **Primary**: SPARC — Specification → Pseudocode → Architecture → Refinement → Completion. Right-sized for a feature scope; no full ADR-bath needed unless ≥3 modules.
2. **Secondary**: Hexagonal Architecture (Ports & Adapters) — keeps the feature port-shaped so it composes into the existing service without leaking.
3. **Tertiary**: Jobs-To-Be-Done (JTBD) framing in the PRD — forces the feature description into outcome language ("the user hires this feature for X"), not implementation language.

## Dispatch sequence

1. **brief-intake** (Profile A) — produces Brief NOTE. Why first: the user's framing of the feature in chat is rarely the framing the PRD needs.
2. **specification** (Profile A) — produces PRD-NNN with JTBD framing + FRs + acceptance criteria. Why second: PRD is the source of truth for what "done" means.
3. **architecture** (Profile A) — produces RFC-NNN scoping the feature into existing modules with a port-and-adapter shape. Why third: SPARC's Architecture phase, but lightweight — no new ADRs unless ≥3 modules affected.
4. **goal-planner** (Profile A) — produces task DAG. Why fourth: partition feature into parallelisable units for coder dispatch.
5. **coder** (Profile C-coder) — implements the DAG. Why fifth: only after PRD + RFC + plan are gated.
6. **code-reviewer** (Profile B) — produces line-level review EVID. Why sixth: adversarial code-level audit; mandatory under S11 BMAD layer.
7. **tester** (Profile B) — produces tester EVID with coverage vs gate. Why second-to-last: feature without regression-safe tests is not done.
8. **guardian** (Profile B-gate) — produces gate EVID with PASS/CONCERNS/BLOCKER.

## Evidence requirements

- [ ] PRD-NNN with JTBD framing + explicit Non-Goals
- [ ] RFC-NNN (lightweight — just the port + adapters affected)
- [ ] ADI EVID with ≥3 hypotheses per S10 (Standard+ depth only)
- [ ] BMAD adversarial EVID with ≥1 finding from `code-reviewer` or `artifact-reviewer`
- [ ] tester EVID with verdict=PASS and coverage ≥ `min_test_coverage` gate
- [ ] guardian Profile B EVID with verdict=PASS

If the feature touches ≥3 modules, additionally:

- [ ] ADR-NNN for the architectural impact + C4 L1+L2 diagrams (per Sprint Z9)

## Failure modes

1. **The PRD is written in implementation language** ("add a `/users/notify` endpoint with POST + JWT auth") **instead of JTBD outcome language** ("notify users when X happens so they can Y"). The team builds the endpoint; the user need is met in a clumsier way than necessary. **Recovery**: rewrite PRD Goals section with JTBD; re-run `artifact-reviewer`.
2. **The architecture phase is skipped because "it's a small feature".** Coder lands code that breaks the hexagonal boundary; existing tests pass but the codebase now has a worse layering. **Recovery**: dispatch `architecture` retroactively, identify the boundary violations, refactor in a follow-up PRD.
3. **No tester EVID because "the existing tests pass".** Means the feature is untested; coverage drops silently. **Recovery**: dispatch `tester` with explicit instruction to write tests for the new feature, not just verify existing tests pass.
4. **Feature crosses ≥3 modules but no ADR is filed.** Sprint Z9 rule violated; `guardian` flags CONCERNS. **Recovery**: dispatch `adr-architect` retroactively; auto-dispatches `c4-diagram`.

## Example invocation

```
User: "Add a webhook-replay feature to our existing billing service.
      Admins should be able to re-fire a failed Stripe webhook from
      the dashboard."

Smith: Context=feature (row 3). Methodology=SPARC + Hexagonal.
       Dispatch:
       1. brief-intake → Brief NOTE (target user: support team,
          not end customer; non-goal: bulk replay)
       2. specification → PRD-NNN (JTBD: "support hires this feature
          to recover from Stripe outages without engineering escalation")
       3. architecture → RFC-NNN (new port: WebhookReplayPort;
          new adapter: AdminDashboardAdapter; reuses existing
          StripeAdapter)
       4. goal-planner → task DAG (5 nodes, 1 parallel pair)
       5. coder → source files (port interface + 2 adapters + tests)
       6. code-reviewer → EVID (1 finding: missing idempotency key
          on replay — CONCERNS) → fixer dispatch → re-review (PASS)
       7. tester → EVID (coverage 84%, gate 80%, PASS)
       8. guardian → gate EVID (PASS)

       Evidence required: PRD + RFC + ADI EVID + code-reviewer EVID +
                          tester EVID + guardian EVID
       Methodology refs: SPARC  https://github.com/ruvnet/sparc
                         Hexagonal Architecture (Cockburn 2005)
                         JTBD   https://hbr.org/2016/09/know-your-customers-jobs-to-be-done
```

## References

- `../routing-map.md` — table row #3
- SPARC: https://github.com/ruvnet/sparc
- Hexagonal Architecture: https://alistair.cockburn.us/hexagonal-architecture/
- JTBD: https://hbr.org/2016/09/know-your-customers-jobs-to-be-done
- This repo's CLAUDE.md — Sprint Z9 (C4 trigger ≥3 modules)
