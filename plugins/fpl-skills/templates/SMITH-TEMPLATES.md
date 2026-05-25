# Smith Templates Guide

> Five output templates used by the smith skill family (`/smith`, `/smith-bootstrap`, `/smith-plan`, `/smith-routing`). Each template has a hard line limit, mandatory sections, and a specific situation it fires in. Together they shape every artifact smith produces.

---

## The 5 templates

| Template | Used by | Purpose | Hard limit |
|---|---|---|---|
| [`smith-plan.md`](./smith-plan.md) | `/smith` (default), `/smith-plan` | Per-task Plan output — 8 sections naming context, methodology, dispatch sequence, evidence requirements, risks, reversibility, hand-off | ≤500 lines |
| [`smith-bootstrap.md`](./smith-bootstrap.md) | `/smith-bootstrap` | Greenfield onboarding checklist — pre-flight matrix, 6 steps, acceptance criteria, hand-off | ≤300 lines |
| [`smith-handoff.md`](./smith-handoff.md) | `/smith handoff` | End-of-session summary — what shipped, what's next, what's blocked, where to resume | ≤200 lines |
| [`post-mortem.md`](./post-mortem.md) | smith bug-fix / incident contexts (rows 4 + 12) | Blameless post-mortem (Google SRE style) — 10 sections including parseable Action items table | ≤500 lines |
| [`routing-decision.md`](./routing-decision.md) | smith ambiguity (`/smith-plan` Failure modes) | Mini-ADR for methodology choice when 2+ contexts genuinely tie — 7 sections incl. parseable revisit trigger | ≤250 lines |

---

## When each fires

| Situation | Template |
|---|---|
| User has a concrete task → `/smith-plan <task>` produces a Plan | `smith-plan.md` |
| Fresh repo → `/smith-bootstrap` walks the checklist top-to-bottom | `smith-bootstrap.md` |
| Session is closing → `/smith handoff` summarises state for the next session | `smith-handoff.md` |
| Production bug requires RCA (row 4) → debugger + error-detective produce the artifact body | `post-mortem.md` |
| Live incident closed (row 12) → post-incident PRD body uses this template | `post-mortem.md` |
| Two methodology contexts genuinely tie → smith returns a routing-decision artifact instead of a Plan | `routing-decision.md` |

The smith skills procedurally drive these templates — they fill the placeholders, mark `[x]` on the checklists, and verify the mandatory sections are present before returning to the orchestrator.

---

## Parseable triggers (Sprint Z2 + Z5 convention)

Two of the templates contain **machine-parseable triggers** scanned by `/decay-watch` and the `decay-reminder.sh` SessionStart hook.

### `post-mortem.md` — Action items table

The Action items section is a parseable checklist:

```markdown
## Action items

- [ ] **Date**: 2026-06-15 — Add connection-pool exhaustion alert to Prometheus — owner @sre-team — INC-2026-001
- [ ] **Metric**: error_rate < 0.1% for 7d — Verify the rolling restart playbook — owner @ops — INC-2026-001
- [ ] **Event**: next deployment of auth-service — Roll out new pool sizing config — owner @platform — INC-2026-001
```

Each row is `- [ ] **Kind**: date|metric|event — description — owner — incident-id`. `/decay-watch` reads NOTE-013 and scans these rows; when the date passes, the metric hits, or the event fires, the SessionStart hook surfaces the trigger silently.

### `routing-decision.md` — Revisit trigger

The decision body contains an explicit revisit trigger:

```markdown
## Revisit trigger

- [ ] **Date**: 2026-09-01 — Re-evaluate BMAD-vs-SPARC choice once we have 3 months of velocity data
- [ ] **Event**: if Profile B reviewer reports BMAD overhead exceeds 20% of sprint capacity
```

Same `- [ ] **Kind**: ...` syntax. `/decay-watch` parses these to know when a methodology choice deserves a fresh ADI cycle.

**Rule of thumb**: any parseable trigger goes in NOTE-013 as well (per CLAUDE.md «Defer discipline (Sprint Z5)»). The template trigger is the active source; NOTE-013 is the index that `/decay-watch` scans first.

---

## How to use a template

1. **Copy** — never edit the template file itself. Copy the body into your artifact (PRD body, EVID body, NOTE body) or render it inline as the skill output.

2. **Fill** — replace every `<placeholder>` with concrete content. Empty placeholders are CONCERNS at the next Profile B review — fields exist because the methodology needs them.

3. **Verify mandatory sections** — each template lists its sections at the top with «N sections, all MUST». Skipping a section silently is the dominant failure mode (e.g., a Plan without «Reversibility» reads done but isn't).

4. **Record** — save the filled output where the procedure says (e.g., `.forgeplan/notes/bootstrap-<DATE>.md` for bootstrap, EVID body for post-mortem, NOTE body for routing-decision). Smith never persists artifacts directly — the orchestrator calls `forgeplan_new` after smith returns the filled markdown.

---

## Related

- **ADR templates**: [`adr-light.md`](./adr-light.md) (lightweight, ≤150 lines), [`adr-full.md`](./adr-full.md) (full, ≥3-modules → C4 mandatory), [`adr-supersede.md`](./adr-supersede.md) (delta-spec ADDED/MODIFIED/REMOVED/UNCHANGED per Sprint Z8). Used by `/decision`, `/supersede`, and the `adr-architect` agent.
- **MADR**: [Markdown Any Decision Records](https://adr.github.io/madr/) — the upstream pattern that inspired the ADR templates.
- **`/decay-watch`**: scans NOTE-013 + the parseable triggers in `post-mortem.md` action items and `routing-decision.md` revisit triggers. Surfaces overdue items at SessionStart.
- **`agent-template.md`**: scaffold for new canonical Profile A/B/C/D agents (not a smith template — lives in the same directory).
- **Smith README**: [`skills/smith/README.md`](../skills/smith/README.md) — overview of the skill cluster these templates serve.
- **Routing map**: [`skills/smith/routing-map.md`](../skills/smith/routing-map.md) — 12-row matrix that tells smith which template to render for which context.

## References

- CLAUDE.md `BMAD adversarial review discipline (Sprint Z6 — PRD-057)` — why Profile B EVIDs need `## Findings` ≥1 item.
- CLAUDE.md `OpenSpec delta-spec discipline (Sprint Z8 — PRD-058)` — why supersede needs ADDED/MODIFIED/REMOVED/UNCHANGED.
- CLAUDE.md `FPF ADI discipline (Sprint Z7 — PRD-059)` — why decision templates require ≥3 hypotheses.
- CLAUDE.md `Defer discipline (Sprint Z5 — PRD-056)` — NOTE-013 tracker + parseable trigger convention.
- Google SRE Book, [Chapter 15 — Postmortem Culture](https://sre.google/sre-book/postmortems/) — post-mortem template's blameless framing.
- EPIC-002 Wave 1C — initial creation of `smith-plan.md`, `smith-bootstrap.md`, `smith-handoff.md`, `post-mortem.md`, `routing-decision.md`.
