# ADR Light Template

> **HARD LIMIT**: keep the final ADR ≤400 lines. If it grows past that, switch to `adr-full.md`.
> **Purpose**: a single-screen decision record for routine choices (lib X vs Y, config Z, small refactor). One person reads it, gets the why in 30 seconds, knows when to re-open.
> **6 sections, all MUST. Revisit Trigger is NOT optional.**

---

# ADR-NNN: <one-sentence decision title>

| Field | Value |
|---|---|
| Status | Draft |
| Date | YYYY-MM-DD |
| Depth | Tactical |

## Context

<1-2 sentences. What situation, what constraint, what needs deciding.>

## Hypotheses considered

Minimum three. One-line each.

- **H1**: <option A — what it is>
- **H2**: <option B — what it is>
- **H3**: <option C — the wild card, often "do nothing" or "in-process alternative">

## Evidence

For each hypothesis: predicted observation if true + one piece of evidence (link / measurement / quote).

| H | Predicted observation | Evidence | F+G+R |
|---|---|---|---|
| H1 | <if true, expect X> | <link / number / quote> | F? G? R? |
| H2 | <if true, expect Y> | <link / number / quote> | F? G? R? |
| H3 | <if true, expect Z> | <link / number / quote> | F? G? R? |

F+G+R scoring (0-9 each, sum ≥12 = OK to commit):
- **F** (Formality) — 0: gut feel; 5: explicit conditional claim; 9: spec/proof
- **G** (Granularity) — 0: "slow"; 5: "15% faster"; 9: "p99=47ms @ 10k RPS, 1KB payload"
- **R** (Reliability) — 0: Slack anecdote; 5: ≥2 independent sources; 9: peer-reviewed or our prod benchmark

## Decision

<One sentence. Which hypothesis is accepted.>

## Rejected alternatives

- **H?** rejected because <one concrete reason — not "didn't fit">
- **H?** rejected because <one concrete reason>

## Revisit Trigger (Evidence Decay) — MUST

Re-open this ADR when ANY of the triggers below fires. **Use parseable syntax** so `/decay-watch` skill and `decay-reminder.sh` hook can detect fired triggers:

- [ ] **Type**: date — <e.g., "2027-01-01" or "+6 months from creation">
- [ ] **Type**: metric — <e.g., "p99 latency drops below 50ms", "records > 100k">
- [ ] **Type**: event — <e.g., "upstream forgeplan#XXX closes", "production incident X happens">

**Mark `[x]` to flag a trigger as fired.** Guardian agent will BLOCKER any artifact relying on an ADR with `[x]` triggers until either the ADR is superseded OR the trigger is unchecked with justification.

Sprint Z2 enforcement (PRD-053): `/decay-watch` enumerates, `decay-reminder.sh` reminds at SessionStart, guardian agent blocks.

---

## How to use this template

1. Copy → fill in placeholders → keep ≤400 lines.
2. Create the ADR artifact: `forgeplan_new kind=adr title="..."` then `forgeplan_update body=<this filled template>`.
3. Score: F+G+R per hypothesis. If sum <12 on the chosen hypothesis, gather more evidence (dispatch `evidence-gatherer` agent — Sprint Z4 PRD-055).
4. Activate after EVID linked (canonical 2-step): create EVID with the test/benchmark/justification, link `informs`, then activate.

## When to switch to adr-full.md

- Decision touches ≥3 modules
- ADI surfaces ≥3 unresolved trade-offs that need own subsections
- Decision is supersedes/refines an existing active ADR
- User explicitly says "full ADR" / "major decision"
