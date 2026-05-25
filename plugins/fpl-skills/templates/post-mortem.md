# Post-Mortem Template (Blameless, Google SRE Style)

> **Blameless tone**: focus on system and process, never on individuals.
> Source pattern: Google SRE Book Chapter 15 — https://sre.google/sre-book/postmortems/
> **Hard limit**: ≤500 lines. Incidents can warrant length; do not pad, but do not truncate root causes either.
> **Used in**: `bug-fix-prod` and `incident` context-types (smith routes here from routing-map.md).
> **10 sections, all MUST.** Action items table is parseable — do not free-form it.

---

# Post-Mortem: <incident title — one sentence, factual>

| Field | Value |
|---|---|
| Status | Draft |
| Date | YYYY-MM-DD (post-mortem write-up date; incident date is in Timeline) |
| Incident ID/title | <e.g., INC-2026-001 — "Auth service 502 spike"> |
| Severity | SEV-<1/2/3/4> (SEV-1 = total outage; SEV-2 = major degradation; SEV-3 = partial degradation; SEV-4 = minor or no user impact) |
| Duration | <e.g., "47 minutes from detection to mitigation"> |
| Detection method | <e.g., "alerting (Prometheus p99 > 500ms)" / "user report" / "internal dashboard" / "synthetic check"> |

## Summary

<2-3 sentence executive summary. Factual, no blame. State: what failed, who was impacted, how long, how it was resolved. Read like a press release: the boss should understand in 30 seconds.>

Example: «At 14:23 UTC, the auth service began returning 502 to ~30% of login requests due to a connection-pool exhaustion in the downstream session-store. Detection took 4 minutes via Prometheus alert; mitigation (pool size doubled + restart) was completed at 15:10 UTC. Total impact: ~12k failed logins, no data loss.»

## Timeline

Chronological table. UTC timestamps. Every entry has a source (log line, alert ID, person, chat message link). Sources make the timeline auditable.

| Time (UTC) | Event | Source | Actor |
|---|---|---|---|
| HH:MM | <event — what observably happened> | <log path / alert ID / chat link> | <on-call name or "system"> |
| HH:MM | <event> | <source> | <actor> |
| HH:MM | <event> | <source> | <actor> |
| HH:MM | <event> | <source> | <actor> |
| HH:MM | <event — mitigation applied> | <source> | <actor> |
| HH:MM | <event — service confirmed healthy> | <source> | <actor> |

## Impact

Quantified. No hedging. If a number is estimated, mark it «(est)».

- **Users affected**: <e.g., "~4.2k unique users, ~12k failed login attempts (est based on auth-log grep)">
- **Requests failed**: <e.g., "12,347 5xx responses across 47 min">
- **SLO impact**: <e.g., "auth-availability SLO consumed 3.2% of monthly error budget"> or «no SLO defined for this surface»
- **Revenue/$$**: <if measurable, e.g., "~$1,800 estimated lost transactions"> or «not measured»
- **Internal impact**: <e.g., "5 engineers pulled into incident channel for 47 min"> or «n/a»

## Root cause analysis (5 Whys)

Apply the 5 Whys technique explicitly. Each Why drills one layer deeper than the previous. Stop at 5 unless the root is genuinely deeper — but never stop earlier with a surface symptom labelled as root.

- **Why 1**: <surface symptom — what users saw>
  → Because <one-line explanation>
- **Why 2**: <why did that happen?>
  → Because <one-line explanation>
- **Why 3**: <why did that happen?>
  → Because <one-line explanation>
- **Why 4**: <why did that happen?>
  → Because <one-line explanation>
- **Why 5 (root)**: <why did THAT happen — the systemic root>
  → Root cause: <one sentence — process gap, missing guardrail, design assumption that broke under load>

The root cause should point at a **system or process**, not a person. «Engineer X forgot to update config» is not a root cause — «config update process has no peer-review gate for pool-size changes» is.

## What went well

Bullet list of things the team / system did right. Blameless tone — credit the systems that worked.

- <thing that worked — e.g., "Prometheus alert fired within 4 min of degradation start">
- <thing that worked>
- <thing that worked>

## What went poorly

Bullet list of things that did not work or made the incident worse. Blameless tone — describe the gap, not the person.

- <thing that went poorly — e.g., "No runbook existed for connection-pool exhaustion class">
- <thing that went poorly>
- <thing that went poorly>

## Where we got lucky

Bullet list of things that could have made it worse but didn't. This is the SRE-canonical section that teams often skip — do not skip it. It surfaces latent risks.

- <luck factor — e.g., "Incident hit during US business hours when on-call had full team backup; an off-hours occurrence would have extended duration by ~2x">
- <luck factor>
- <luck factor>

## Action items

Parseable table. Each action item has an owner, due date, and priority. P0 = blocker for next sprint; P1 = next 2 sprints; P2 = next quarter; P3 = backlog.

| Action | Owner | Due | Priority |
|---|---|---|---|
| <concrete action — e.g., "Add Prometheus alert for connection-pool > 80% utilization"> | <name or team> | YYYY-MM-DD | P<0/1/2/3> |
| <concrete action> | <name or team> | YYYY-MM-DD | P<0/1/2/3> |
| <concrete action> | <name or team> | YYYY-MM-DD | P<0/1/2/3> |
| <concrete action> | <name or team> | YYYY-MM-DD | P<0/1/2/3> |

Every P0/P1 action item MUST be tracked in the team's issue tracker (link in the Action column or a follow-up Note artifact). Action items without an owner are aspirations, not actions.

## Lessons learned

3-5 bullets. Blameless tone. These are the durable takeaways — what changes in our defaults because of this incident.

- <lesson — e.g., "Connection-pool sizing should be derived from observed peak × 2, not from initial estimates that pre-date production load">
- <lesson>
- <lesson>

Lessons are the input to mental models (`mental_model_create` if a recurring pattern is detected) and to CLAUDE.md updates (if a project-wide convention shifts because of this incident).

---

## How to use this template

1. Run within 1-3 days of incident resolution (memory fades fast; details get reconstructed inaccurately after a week).
2. The on-call who led mitigation should NOT write the post-mortem alone — pair with a peer to keep tone blameless and catch self-justification blind spots.
3. Save as a forgeplan Note artifact: `forgeplan_new(kind="note", title="Post-mortem: <incident>")` then fill body using this template.
4. Link Action items to the team's issue tracker (GitHub Issues, Linear, Jira) — track to completion separately from this artifact.
5. Read the post-mortem out in the next team review. The goal is shared understanding, not paperwork.

### Hard rules

- **Blameless throughout.** If a section names an individual as the cause, rewrite. Systems and processes are the unit of analysis.
- **5 Whys is the floor, not the ceiling.** If the real root is 7 layers deep, write 7. If it's genuinely 3, write 3 and explain why deeper Whys are not productive.
- **Action items without owners and due dates do not count.** They are not action items — they are wishes.
- **"Where we got lucky" is not optional.** Skipping it hides latent risk.
