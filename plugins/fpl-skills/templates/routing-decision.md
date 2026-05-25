# Routing Decision Template (Mini-ADR for methodology choice)

> **Use this template** when smith hits genuine ambiguity between two or more methodologies for a given task
> (e.g., "should we apply BMAD or SPARC for this greenfield service?").
> Lightweight — like `adr-light.md` but focused on **methodology choice**, not technical-design choice.
> **Hard limit**: ≤250 lines. **7 sections, all MUST.** Revisit trigger is parseable for `/decay-watch`.
> Pattern inspiration: MADR (Markdown Architectural Decision Records) + ADR-light.

---

# Routing Decision: <one-sentence question>

| Field | Value |
|---|---|
| Status | Draft |
| Date | YYYY-MM-DD |
| Context-type | <one of 12 (per routing-map.md rows 1-12): greenfield / brownfield / feature / bug-fix-prod / bug-fix-trivial / refactor / adr-decision / security-audit / perf-audit / pdlc-discovery / tech-debt / incident> |
| Decision-maker | smith + <user name or "autonomous orchestrator"> |

## Question

<One sentence stating the routing question. Frame as a methodology choice, not a technical choice.>

Examples:
- «For this greenfield Node.js service, should the spec layer be BMAD or SPARC?»
- «For this production bug-fix, is full SRE post-mortem warranted or is a lightweight `/forge-cycle` enough?»
- «For this multi-module refactor, do we need C4 diagrams or is OpenSpec delta-spec alone sufficient?»

## Considered methodologies

Minimum two. Each gets a one-line pro and one-line con. If you can only think of one methodology, that's not a routing decision — that's just executing the obvious path; do not create this artifact.

- **M1**: <methodology name, e.g., "BMAD adversarial review with Profile B reviewer">
  - **Pro**: <one-line concrete strength for THIS task>
  - **Con**: <one-line concrete weakness for THIS task>
- **M2**: <methodology name, e.g., "SPARC Specification → Pseudocode → Architecture → Refinement → Completion">
  - **Pro**: <one-line concrete strength>
  - **Con**: <one-line concrete weakness>
- **M3** (optional, often «do nothing / lightweight default»): <methodology name>
  - **Pro**: <one-line concrete strength>
  - **Con**: <one-line concrete weakness>

The third option is encouraged. Two-option routing is often a false dichotomy — usually a leaner third path exists («skip the methodology, dispatch the obvious agent and ship»).

## Decision

<One sentence. State which methodology was picked. Use **bold** to highlight the chosen one.>

Example: «**Picked M2 (SPARC)** — the upstream service has no existing artifacts, so SPARC's Specification phase gives smith something to BMAD-review later, whereas BMAD-first has nothing to review yet.»

## Rationale

2-3 sentences. Cite F+G+R scoring if applied. Reference routing-map.md row if the decision matches a documented routing rule.

- **Why this methodology over the others**: <one sentence linking task signals to the picked methodology's strength>
- **F+G+R** (if scored on the comparison): F=<0-9> G=<0-9> R=<0-9>, sum=<N>. <One sentence on what tipped the score>
- **Routing-map alignment**: <one line — "matches row #X in routing-map.md" or "extends routing-map.md — propose new row">

If no F+G+R was scored (decision was obvious enough not to warrant the calculus), state that explicitly: «No F+G+R applied — the routing was empirically obvious given the task signals».

## Revisit trigger

Re-open this routing decision when ANY of the triggers below fires. **Use parseable syntax** so `/decay-watch` skill and `decay-reminder.sh` hook can detect fired triggers:

- [ ] **Type**: date — <e.g., "2027-01-01" or "+6 months from creation">
- [ ] **Type**: metric — <e.g., "team grows past 5 engineers", "service throughput exceeds 1k RPS">
- [ ] **Type**: event — <e.g., "external API contract changes", "upstream forgeplan#NNN closes", "we add a new context-type to routing-map.md">

**Mark `[x]` to flag a trigger as fired.** Guardian agent will surface routing decisions with fired triggers in the next health check so the routing-map.md can be updated or this artifact superseded.

## Next step

What dispatch this routing decision enables. Be concrete — a command or an agent dispatch, not a goal.

> **Next, run `/smith-plan <task>`** — smith generates the plan using the chosen methodology (M2 / SPARC).

OR

> **Next, dispatch `agents-sparc:specification`** to begin SPARC's first phase on PRD-NNN.

OR

> **Next, update `routing-map.md`** with this new row before continuing — the chosen methodology was not previously documented for this context-type.

---

## References

- Routing source: `plugins/fpl-skills/skills/smith/routing-map.md` — canonical methodology routing
- Pattern: MADR (Markdown ADR) — https://adr.github.io/madr/
- Pattern: `adr-light.md` (sibling template, technical decisions)
- F+G+R scoring: ADR-light template, section "Evidence"

---

## How to use this template

1. Run `/smith` — if smith detects ambiguity between ≥2 methodologies, it offers to render this template.
2. Or invoke directly when you want to record a routing call you made manually: copy template → fill → save as Note artifact (`forgeplan_new kind=note title="Routing: <question>"`).
3. Keep it ≤250 lines. If the decision needs more depth (≥3 trade-offs, supersedes another routing decision, irreversible), promote to a full ADR via `adr-full.md` instead.
4. Link to the plan it informs: `forgeplan_link source=<this NOTE> target=<the PRD/EVID> relation=informs`.
5. The "Revisit trigger" section is MUST. Routing decisions without triggers become permanent biases. `/decay-watch` checks this.

### Hard rules

- **Minimum two methodologies considered.** One-option routing isn't a decision; do not create the artifact.
- **Rationale cites either F+G+R or routing-map.md row.** Free-form rationale without one of these anchors is a vibe, not a decision.
- **Revisit trigger is parseable.** Use the exact `- [ ] **Type**: date|metric|event — description` syntax — `/decay-watch` cannot parse free-form prose.
- **If REMOVED >50% would apply to a supersede of this artifact** — it's not a routing decision, it's a methodology overhaul. Write a full ADR instead.
