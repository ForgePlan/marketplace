# Tech debt cleanup

## When this applies

The user wants to pay down accumulated tech debt — not a single refactor
(section 06), not a feature blocked by debt (section 03), but a deliberate
debt-paydown sprint with a portfolio of items. Triggers include "tech
debt", "cleanup sprint", "technical debt backlog", "техдолг", "уборка
кода". If the user is paying down debt that blocks a specific feature,
that's a refactor inside the feature PRD (section 03 + 06), not this row.

## Methodology chain

1. **Primary**: A3 Problem Solving (Toyota) — forces a single-page articulation of WHY this debt is now worth paying; most tech-debt sprints fail because the team can't justify the trade-off out loud.
2. **Secondary**: Fishbone (Ishikawa) diagram — surfaces systemic vs local causes; tech debt often clusters around a few systemic root causes that fixing many local symptoms won't address.
3. **Tertiary**: Branch-by-Abstraction + ADR-supersede with delta-spec — for each debt item that touches architecture; old decisions get superseded with explicit delta.

## Dispatch sequence

1. **code-analyzer** (Profile C) — produces NOTE with debt inventory: complexity hotspots, deprecated dependencies, TODO/FIXME density, test coverage gaps. Why first: portfolio decisions need a portfolio view.
2. **research-analyst** (Profile A) — produces NOTE with A3 sheet (Background / Current state / Target state / Analysis / Countermeasures / Plan / Follow-up) + Fishbone diagram. Why second: turns the debt list into a coherent narrative with systemic-vs-local distinction.
3. **architect-reviewer** (Profile B) — produces EVID prioritising debt items: which cluster pays the most interest? Which is safest to touch first? Why third: priority must be defensible, not "items the team finds most annoying".
4. **adr-architect** (Profile A) — produces ADR-NNN with the target architecture *and* any ADR-supersedes (with delta-spec per Sprint Z8) for the old decisions being walked back. Auto-dispatches `c4-diagram` for ≥3-module decisions.
5. **goal-planner** (Profile A) — produces task DAG with debt items ordered by risk-weighted priority. Why fifth: parallelisation across coders.
6. **coder** (Profile C-coder) — implements the DAG. Why sixth: only after the portfolio is gated.
7. **tester** (Profile B) — produces tester EVID confirming behaviour preserved (debt cleanup must not change behaviour) and coverage at least matches baseline. Why second-to-last: regression risk is the dominant failure mode.
8. **guardian** (Profile B-gate) — produces gate EVID.

## Evidence requirements

- [ ] code-analyzer NOTE with debt inventory + baseline metrics
- [ ] A3 sheet NOTE (single page: Background / Current / Target / Analysis / Countermeasures / Plan / Follow-up) + Fishbone diagram
- [ ] PRD-NNN with explicit "no behaviour change" non-goal + measurable end-state (e.g. "complexity 287→<150 in PaymentService"; "coverage 76%→≥80%")
- [ ] For each architectural change: ADR-NNN with delta-spec (Sprint Z8) for superseded ADRs; C4 L1+L2 if ≥3 modules
- [ ] ADI EVID with ≥3 hypotheses (must include "do nothing — accept the debt")
- [ ] BMAD adversarial EVID with ≥1 finding from `artifact-reviewer`
- [ ] tester EVID with regression-green + coverage ≥ baseline
- [ ] guardian Profile B EVID with verdict=PASS

## Failure modes

1. **Debt list is "items the team finds annoying" not "items paying interest".** Sprint ships; team feels better; product velocity unchanged. **Recovery**: re-do prioritisation with `architect-reviewer` using interest-cost framing (how much velocity does this debt steal per sprint?); abandoned items that fail the test go back to the backlog.
2. **No A3 — the team can't articulate why now.** Tech debt sprint feels arbitrary; product pushes back; sprint gets cut short. **Recovery**: produce the A3 *first* (single page; if it's longer than one A3 page, the scope is wrong); use it to defend the sprint to product.
3. **Systemic root cause not addressed.** Team fixes 12 local symptoms; the same systemic cause produces 12 new symptoms in three months. **Recovery**: Fishbone diagram surfaces the systemic cause; allocate at least one Countermeasure to it explicitly.
4. **ADR-supersede done without delta-spec.** Sprint Z8 rule violated; `/decay-watch` flags CONCERNS. **Recovery**: use `/supersede` skill to compute the delta retroactively.
5. **Behaviour changes silently during "cleanup".** A "cleanup" PR alters an edge case; downstream consumers break. **Recovery**: roll back the offending change; add the missing regression test; redo as a separate row-06 refactor with proper before/after architect-reviewer pair.

## Example invocation

```
User: "We want to do a 2-week tech-debt sprint. The team has been
      complaining about the data-access layer for months."

Smith: Context=tech-debt (row 11). Methodology=A3 + Fishbone +
       Branch-by-Abstraction + ADR-supersede.
       Dispatch:
       1. code-analyzer → NOTE (debt inventory:
          - 4 modules with cyclomatic > 50
          - 12 deprecated ORM calls (lib EoL in 6 months)
          - 8 places hand-rolling SQL that should use repository
          - 23 TODOs in data-access layer
          - test coverage 61% in data-access layer vs 79% overall)
       2. research-analyst → A3 NOTE:
          - Background: data-access layer was bolted on in 2023 mid-pivot
          - Current state: 4 hotspot modules, lib EoL, coverage gap
          - Target state: repository-pattern uniform; coverage 75%+;
            zero deprecated ORM calls
          - Analysis (Fishbone):
            * Method: no repository pattern → hand-rolled SQL
            * Material: ORM v1 deprecated → can't upgrade without refactor
            * Manpower: no review on data-access PRs → debt accreted
            * Measurement: no coverage gate on this layer
          → Systemic root: missing review gate + missing pattern
          - Countermeasures: introduce repository pattern + CI coverage
            gate + review rule
          - Plan: 5 items, 2 weeks, risk-ordered (lowest first)
          - Follow-up: 30-day check whether debt re-accreted
       3. architect-reviewer → EVID (priority validated: lib EoL is hard
          deadline; repository pattern resolves both methods debt and
          ORM upgrade; PASS)
       4. adr-architect → ADR-NNN (repository pattern adopted) +
          ADR-NNN+1 (ORM v1 → v2 migration) +
          ADR-supersede ADR-Old-2023 (data-access ad-hoc, with
          delta-spec ADDED/MODIFIED/REMOVED/UNCHANGED) +
          c4-diagram (L1+L2, 5 modules)
       5. goal-planner → task DAG (5 nodes, 2 parallel pairs)
       6. coder × 2 (worktree-isolated) → repository pattern + ORM upgrade
       7. tester → EVID (regression suite 100% pass; coverage 78% >
          target 75%; PASS)
       8. guardian → gate EVID (PASS)

       Evidence required: debt-inventory NOTE + A3 NOTE + PRD + ADR + ADR +
                          ADR-supersede with delta-spec + C4 file +
                          ADI EVID + BMAD EVID + tester EVID + guardian
       Methodology refs: A3            https://www.lean.org/lexicon-terms/a3-thinking/
                         Fishbone      https://asq.org/quality-resources/fishbone
                         Branch-by-Abstraction
                         OpenSpec delta-spec (CLAUDE.md S12 / Sprint Z8)
```

## References

- `../routing-map.md` — table row #11
- A3: https://www.lean.org/lexicon-terms/a3-thinking/
- Fishbone: https://asq.org/quality-resources/fishbone
- Branch-by-Abstraction: https://martinfowler.com/bliki/BranchByAbstraction.html
- This repo's CLAUDE.md — Sprint Z8 (delta-spec for ADR-supersede)
- `/supersede` skill in `plugins/fpl-skills/skills/supersede/`
