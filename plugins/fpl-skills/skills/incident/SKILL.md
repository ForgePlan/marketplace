---
name: incident
description: |
  Runs a live incident end to end in two phases (ADR-024 wave 2, smith row 12): Phase 1 — the fire,
  Incident Command System chain with methodology overhead suspended, hotfix under ICS authority,
  smoke before ship; Phase 2 — the blameless post-mortem, PROBLEM artifact from the post-mortem
  template, post-incident PRD, and the incident_close loop gate. The binary boundary with /riper:
  service degraded for users RIGHT NOW — this skill; defect found with no active degradation — /riper.

  Triggers: "/incident", "incident", "outage", "prod is down", "sev-1", "sev-2", "p0",
  "post-mortem", "postmortem", "инцидент", "лежит прод", "падение в проде", "разбор инцидента"
---

# incident — the incident loop (row 12)

A LOOP beside the pipeline, not a stage of it (ADR-024): incidents recur and outlive the run that
handles them. The split rule that decides everything here: **does the work outlive the run that
produced it** — the hotfix does not (fire, Phase 1); the lessons do (loop, Phase 2).

## The boundary with `/riper` — binary, not intent

| Signal | Route |
|---|---|
| Service degraded for users **right now** — `outage`, `sev-1/2`, `p0`, «лежит прод» | **this skill** |
| Defect found, no active degradation — `regression`, `race condition`, `prod bug` without the words above | `/riper` |

The overlap case IS the rule's point: an outage is also a prod bug that needs fixing — active
degradation **wins** (EVID-243 N6; the prompt-router hook encodes the same order). Smith forbids
ties; if you genuinely cannot tell whether users are affected, that is the first thing to find out,
not a reason to pick by taste.

---

## Phase 1 — the fire (no artifacts, ICS)

Methodology overhead is **suspended**: no PRD, no ADI, no gate. ICS roles keep the swarm coordinated
— Incident Commander (the orchestrator), Operations Lead, Communications, Scribe. The chain, from
`smith/sections/12-incident.md`:

1. `error-detective` (C) — situation report: which service, since when, what changed in 24h.
2. `debugger` (C) — hypothesis on the immediate cause. Pairs with #1 to brief the IC.
3. `platform-engineer` (C, read-only) — infra signals: deploys, scaling, dependency health.
4. `coder` (C-coder, **hotfix only**) — minimal rollback or fix, authorized by the IC once cause
   confidence is reasonable. Not the root-cause fix — the smallest thing that stops the bleeding.
5. `tester` (B, **smoke only**) — smoke EVID that the symptom is gone. Ship only after smoke.

**The Scribe duty is not optional**: keep a running timeline (UTC timestamps, source per row —
log line, monitor, human report). Phase 2's post-mortem stands on this timeline, and a timeline
reconstructed a day later from memory is the thing blameless post-mortems exist to avoid.

Phase 1 output: the hotfix shipped + smoke EVID + the raw timeline. **Stop here until the fire is
actually out** — a post-mortem started mid-fire steals the Operations Lead.

---

## Phase 2 — the blameless post-mortem (artifacts, loop gate)

1. **RCA synthesis** — dispatch `research-analyst` (**Profile C — read-only**; the synthesis comes
   back TO the orchestrator, the agent cannot persist anything). It walks the timeline and runs
   5 Whys to the root, not the symptom.
2. **PROBLEM artifact** — the orchestrator creates it (`forgeplan new problem`) and fills the body
   from **`templates/post-mortem.md`** (ADR-024 D6 — the template exists, 10 sections; do not
   write your own). Non-negotiable sections, because the loop gate reads them:
   - `## Timeline` — ≥1 row **with a source**;
   - `## Action items` — ≥1 row with an **owner and a due date**;
   - `## Revisit Triggers` — ≥1 row in the canonical parseable form, **date first, kind `date`**:
     `- [ ] **Kind**: date — YYYY-MM-DD — <что проверяем> — <source> — last_checked YYYY-MM-DD`
     (event/metric rows surface as PENDING and are never forced — DD-8; and a near-miss row falls
     into NO class at all, which is a dead watch — EVID-249 G1);
   - `## Root cause analysis (5 Whys)` — the actual walk, blameless: system facts, not names.
3. **Post-incident PRD** — dispatch `specification` (A) to shape the lessons into a PRD (monitoring
   gap, missing test, rollback playbook). This is the artifact that activates and drives follow-up.
4. **ADR — only if the root cause is architectural** — dispatch `adr-architect` (A); it
   auto-considers C4 for ≥3-module decisions. A stale config is not an ADR.
5. **The loop gate**:

   ```
   /gate-check <PROBLEM-ID> --loop incident_close
   ```

   Four structural musts (`quality-gates.yaml` → `loops.incident_close`): timeline present,
   action items owned and dated, revisit triggers parseable, PROBLEM linked. All four are
   "the author did it or did not" — no contestable numbers. FAIL = the post-mortem is not done,
   whatever the prose says.
6. **guardian gate on the post-incident PRD only** — the hotfix already shipped under ICS
   authority; the gate is on the record of lessons, not on the fire response.

---

## What this does not do

- **It does not replace `/riper`** — riper is the discipline for understanding before touching;
  Phase 1 here deliberately suspends that discipline because users are bleeding. The price of the
  suspension is Phase 2: the понимание happens after, and it is gated.
- **It does not gate the hotfix.** ICS authority covers the fire. Gating mid-fire is how gates get
  deleted.
- **It does not auto-file the follow-up work** — the post-incident PRD does, through the normal
  pipeline.

Reference: ADR-024 (waves, D4-D6), `smith/sections/12-incident.md` (the chain),
`templates/post-mortem.md` (the body), EVID-243 N6 (the boundary), EVID-249 G1 (the trigger form),
smith routing row 12.
