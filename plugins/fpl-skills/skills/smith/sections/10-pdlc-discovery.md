# Product discovery (PDLC)

## When this applies

The user is upstream of any code — they need to decide *what* to build, not
*how* to build it. Triggers include "what should we build", "discovery
sprint", "user research", "should we add feature X", "что строить",
"исследование пользователей". If the user already knows what to build and
just wants the implementation route, go to section 03 (feature). If
multiple discovery candidates are competing, run discovery first; choose
the winner; then route the winner to section 03.

## Methodology chain

1. **Primary**: Jobs-To-Be-Done (JTBD) — reframes features as outcomes ("the user hires this for X"); forces user-centric framing in the PRD.
2. **Secondary**: Lean Startup (Build-Measure-Learn) — hypothesis-driven; matches our smallest-shippable-EVID rhythm; MVP defines the smallest viable test.
3. **Tertiary**: Double Diamond (Discover-Define-Develop-Deliver) — gives shared vocabulary with design teams; useful for cross-functional kickoffs. + Event Storming (if domain complexity is high).

## Dispatch sequence

1. **brief-intake** (Profile A) — produces structured Brief NOTE capturing the user's hypothesis, target segment, and constraints. Why first: discovery without a starting hypothesis is open-ended and unmeasurable.
2. **research-analyst** (Profile A) — produces NOTE consolidating user research, competitive analysis, internal data signals. Why second: discovery is evidence-driven; the analyst surfaces what the team already knows but hasn't synthesised.
3. **goal-planner** (Profile A) — produces task DAG for the discovery experiments themselves (e.g. user interviews, prototype tests, landing-page test). Why third: discovery has work too; treat experiments as artifacts.
4. **specification** (Profile A) — produces PRD-NNN framed in JTBD outcomes with explicit Non-Goals + measurable success criteria. Why fourth: even discovery outputs a PRD — the PRD becomes the test of whether discovery succeeded.
5. **architect-reviewer** (Profile B) — produces EVID auditing the PRD against fitness: is the JTBD framing real or aspirational? Are the success criteria measurable? Is the MVP actually minimal? Why fifth: discovery PRDs are easy to write but hard to write *well*; this catches softness.
6. **guardian** (Profile B-gate) — produces gate EVID with PASS/CONCERNS/BLOCKER.

Note: this row is **discovery-only** — no `coder` dispatch. If discovery
produces a clear winner, the user closes the discovery PRD and starts a
fresh row 03 (feature) PRD citing this one.

## Evidence requirements

- [ ] Brief NOTE with starting hypothesis
- [ ] Research NOTE (user interviews, competitive analysis, data signals)
- [ ] PRD-NNN with explicit JTBD framing + explicit Non-Goals + measurable success criteria for the MVP
- [ ] ADI EVID with ≥3 hypotheses (must include "do nothing", "scope smaller MVP", "scope larger MVP")
- [ ] BMAD adversarial EVID with ≥1 finding from `architect-reviewer`
- [ ] guardian Profile B EVID with verdict=PASS

## Failure modes

1. **PRD written in implementation language instead of JTBD outcomes.** "Add a notification settings page" instead of "Help power users mute the channels they don't read". The team ships the page; the underlying need is met clumsily. **Recovery**: rewrite PRD Goals with JTBD; re-run `artifact-reviewer`.
2. **No success criteria — MVP is "ship and see".** Three months later, no one can tell if the experiment succeeded or failed. **Recovery**: backfill criteria *now*, before shipping; if they can't be backfilled meaningfully, the experiment was poorly designed.
3. **The "do nothing" hypothesis was checked off as formality.** The actual outcome is that the team built something users tolerated but didn't hire. **Recovery**: re-run `forgeplan_reason` to argue "do nothing" out loud; if "do nothing" was actually best, capture that as a closed-without-build PRD (this is a successful outcome of discovery, not a failure).
4. **MVP scope grows during discovery** — every interview adds requirements. The "minimum" viable product is no longer minimum. **Recovery**: explicitly close requirement-gathering after a fixed budget (time or interview count); freeze the MVP; new requirements go into a separate "Phase 2" NOTE.
5. **No user interviews — discovery is internal-only.** Team builds what they think users want; users tell them otherwise post-launch. **Recovery**: pause discovery; conduct ≥5 user interviews; re-synthesise; re-run `architect-reviewer` on the updated PRD.

## Example invocation

```
User: "We're considering whether to build a self-serve admin panel for
      our enterprise customers. Right now they email support to make
      changes. Should we build it?"

Smith: Context=pdlc-discovery (row 10). Methodology=JTBD + Lean MVP +
       Double Diamond.
       Dispatch:
       1. brief-intake → Brief NOTE (starting hypothesis: "enterprise
          admins want to make config changes without support friction";
          target segment: top-50 enterprise accounts; constraints:
          SOC2-bound, audit-log required)
       2. research-analyst → NOTE (synthesised:
          - 8 user interviews completed
          - 30% of support tickets are "config change please"
          - Competitor X has self-serve; competitor Y doesn't
          - Top-3 requested changes: user-add, role-change, SSO-config
          - Audit-log already exists, just needs UI surfacing)
       3. goal-planner → discovery DAG:
          a) interview 5 more admins (3-segment coverage)
          b) prototype-test the top-3 changes
          c) measure "if MVP shipped, would you stop emailing?" intent
       4. specification → PRD-NNN
          - JTBD: "Enterprise admins hire the panel to make low-risk
            config changes without filing a support ticket"
          - Non-goals: complex permission editing, billing changes
          - Success criteria: 50% of "config change" support tickets
            self-served within 90 days of MVP launch
          - MVP scope: user-add, role-change only; SSO-config is Phase 2
       5. architect-reviewer → EVID (1 finding: audit-log surfacing
          requires DB schema change to expose user-facing fields;
          CONCERNS) → fix + re-review (PASS)
       6. guardian → gate EVID (PASS)
       → User closes discovery PRD; opens fresh row-03 feature PRD
         citing this one for the actual MVP build.

       Evidence required: Brief NOTE + research NOTE + PRD + ADI EVID +
                          BMAD EVID + guardian EVID
       Methodology refs: JTBD   https://hbr.org/2016/09/know-your-customers-jobs-to-be-done
                         Lean Startup (Ries 2011)
                         Double Diamond
                         https://www.designcouncil.org.uk/our-resources/the-double-diamond/
```

## References

- `../routing-map.md` — table row #10
- JTBD: https://hbr.org/2016/09/know-your-customers-jobs-to-be-done
- Lean Startup: http://theleanstartup.com
- Double Diamond: https://www.designcouncil.org.uk/our-resources/the-double-diamond/
- Event Storming: https://www.eventstorming.com
