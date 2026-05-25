# Live incident response

## When this applies

Production is on fire **right now**. Triggers include "production down",
"outage", "incident now", "users can't log in", "p99 spiked to timeouts",
"лежит прод", "инцидент". The defining feature of this row is **time
pressure** — every minute of process overhead costs the business. If the
fire is out and you're now writing a post-mortem, you're still in this
row but in its second phase (post-incident PRD).

## Methodology chain

1. **Primary**: Incident Command System (ICS) — adapted from FEMA via PagerDuty; roles are Incident Commander, Operations Lead, Communications Lead, Scribe. Prevents uncoordinated swarming.
2. **Secondary**: 5 Whys (post-incident) — disciplined root-cause walk during the post-mortem; ensures the same fire doesn't reignite.
3. **Tertiary**: Blameless post-mortem norms — separates "what happened" (system fact) from "who did it" (person); ADR-supersede + SRE error-budget recharge decision for the systemic findings.

## Dispatch sequence — Phase 1 (during the fire)

1. **error-detective** (Profile C) — produces NOTE with live triage: which service is degraded? since when? what changed in the last 24h? Why first: ICS Operations Lead needs a situation report immediately.
2. **debugger** (Profile C) — produces NOTE with hypothesis on the immediate cause. Why second: pairs with error-detective; together they brief the Incident Commander.
3. **platform-engineer** (Profile C, read-only) — produces NOTE with infra signals: deploy log, scaling events, dependency health. Why third: many outages are infra-correlated. (Note: no `devops-troubleshooter` agent exists in the marketplace; `platform-engineer` is the closest real Profile C agent that covers infra triage without mutations.)
4. **coder** (Profile C-coder, **hotfix only**) — implements the minimal rollback or hotfix. Why fourth: ICS authorises the hotfix once cause is reasonably confident; methodology overhead is suspended for the fire itself.
5. **tester** (Profile B, **smoke only**) — produces smoke EVID confirming the immediate symptom is gone. Why fifth: ship the hotfix only after smoke; the regression test comes later.

During Phase 1, there is **no PRD**, **no ADR**, **no guardian gate**. The
single source of authority is the Incident Commander (a human) — their
verbal go/no-go ships the hotfix. The artefacts above are NOTEs, not PRDs.

## Dispatch sequence — Phase 2 (after the fire is out)

6. **research-analyst** (Profile A) — produces NOTE with full incident timeline + 5 Whys root-cause analysis. Why now: with the fire out, RCA can be done properly.
7. **adr-architect** (Profile A, **only if systemic cause**) — produces ADR-NNN if the root cause is architectural. Auto-dispatches `c4-diagram` for ≥3-module decisions. Why conditional: not every incident is architectural; sometimes it's a stale config.
8. **specification** (Profile A) — produces post-incident PRD-NNN with the lessons + action items (e.g. monitoring gap, missing test, rollback playbook gap). Why eighth: the PRD is what activates and becomes the source of truth for follow-up work.
9. **guardian** (Profile B-gate) — produces gate EVID for the **post-incident PRD only** (not the hotfix). Why last: the hotfix already shipped under ICS authority; the gate is on the PRD that captures the lessons.

## Evidence requirements

Phase 1 (during fire):

- [ ] NOTE with incident timeline + triage from error-detective + debugger + platform-engineer
- [ ] Smoke EVID from tester (verdict=PASS for the specific symptom)
- [ ] ICS Incident Commander verbal authorisation (recorded in the timeline NOTE)

Phase 2 (post-incident):

- [ ] NOTE with full timeline + 5 Whys RCA (blameless framing)
- [ ] PRD-NNN with lessons + action items + monitoring/test/playbook gaps
- [ ] If systemic root cause: ADR-NNN + C4 L1+L2 if ≥3 modules + delta-spec if supersedes
- [ ] ADI EVID with ≥3 hypotheses for the structural fix (per S10)
- [ ] BMAD adversarial EVID with ≥1 finding from `artifact-reviewer` on the post-incident PRD
- [ ] guardian Profile B EVID with verdict=PASS on the post-incident PRD

## Failure modes

1. **No Incident Commander — uncoordinated swarming.** Five engineers run different debugging paths; no one is communicating with customers. **Recovery**: designate IC immediately (even if it's the senior engineer in the channel); IC owns "who is doing what" and "what does the status page say".
2. **Hotfix shipped without smoke test.** Hotfix didn't actually fix the issue or broke something else. **Recovery**: smoke test even under fire pressure — 5 minutes of smoke prevents 30 minutes of secondary incident.
3. **No post-mortem because "the fire is out".** Same incident recurs in three weeks. **Recovery**: ICS rule — every incident gets a post-mortem within 5 business days; if it's not on the calendar, it's not real.
4. **Post-mortem becomes a witch-hunt.** Findings blame individuals; future incidents are hidden by the team. **Recovery**: invoke blameless norms explicitly at the start; reframe findings in system terms ("the system allowed this", not "Alice did this").
5. **Systemic root cause papered over with monitoring instead of fixed.** "We added an alert" becomes the action item; same fire just gets detected faster next time. **Recovery**: alert is acceptable as a *temporary* mitigation, but the post-incident PRD must also include the structural fix; if structural fix is deferred, file in NOTE-013 deferred-items tracker (CLAUDE.md Sprint Z5) with explicit trigger.

## Example invocation

```
User: "URGENT — login service returning 500s for 40% of users.
      Started 4 minutes ago."

Smith: Context=incident (row 12). Phase 1 NOW; Phase 2 after the fire.
       ICS designated (User = Incident Commander by default until they
       hand off).

       Phase 1 (fire — first 30 min):
       1. error-detective → NOTE (login-service p99 spike at 14:32 UTC;
          coincides with deploy of auth-service v2.4.0 at 14:31 UTC)
       2. debugger → NOTE (hypothesis: auth-service v2.4.0 schema migration
          ran against read-replica only; primary still on v2.3 schema;
          login service queries primary and 500s on missing column)
       3. platform-engineer → NOTE (deploy log confirms migration
          ran 14:31:23; primary lag confirmed 14:31:45;
          rollback to v2.3.0 viable)
       4. IC authorises rollback. coder → rollback PR + deploy v2.3.0
       5. tester → smoke EVID (login p99 back to baseline; 5/5 smoke
          tests green; PASS)
       → Phase 1 closed 14:54 UTC, MTTR 22 min

       Phase 2 (post-incident — within 5 business days):
       6. research-analyst → NOTE (full timeline; 5 Whys:
          1. Why outage? Login queried column missing in primary
          2. Why missing? Migration ran read-replica-only
          3. Why? Deploy script set ENV=replica without resetting
          4. Why no test caught it? Migration smoke runs only on replica
          5. Why design? Inherited from when only read traffic was sharded
          → Root: migration smoke incomplete + deploy script footgun)
       7. adr-architect → ADR-NNN (migration smoke must run primary
          first; rollback-on-fail) + c4-diagram (L1+L2, 4 modules)
       8. specification → PRD-NNN (action items:
          a) migration smoke covers primary
          b) deploy script asserts ENV reset
          c) post-deploy schema-drift alert
          d) runbook updated for "primary lag during migration")
       9. artifact-reviewer → BMAD EVID (1 finding: action item (c)
          alert needs explicit threshold; CONCERNS) → fix → re-review (PASS)
       10. guardian → gate EVID (PASS) on the post-incident PRD only;
           the hotfix already shipped under ICS authority during Phase 1

       Evidence required (P1): triage NOTEs + smoke EVID + IC log
       Evidence required (P2): full-RCA NOTE + ADR + C4 file +
                               post-incident PRD + ADI EVID + BMAD EVID +
                               guardian EVID
       Methodology refs: ICS (PagerDuty)  https://response.pagerduty.com
                         5 Whys (Toyota)
                         Blameless post-mortem (Allspaw 2012)
                         https://www.etsy.com/codeascraft/blameless-postmortems/
                         SRE error-budget (Beyer et al. 2016)
```

## References

- `../routing-map.md` — table row #12
- ICS via PagerDuty: https://response.pagerduty.com
- Blameless post-mortem: https://www.etsy.com/codeascraft/blameless-postmortems/
- SRE: https://sre.google/books/
- 5 Whys: https://en.wikipedia.org/wiki/Five_whys
- This repo's CLAUDE.md — Sprint Z5 NOTE-013 deferred-items tracker (for any deferred structural fix)
