# Architecture decision

## When this applies

The user is facing an irreversible (or expensive-to-reverse) architectural
choice and needs a structured decision record. Triggers include "we need
to decide", "choose between X and Y", "PostgreSQL vs Cassandra", "REST vs
gRPC", "выбрать между", "архитектурное решение". If the user has already
decided and just wants the choice documented, that's still this row —
ADI may reveal a fourth option they hadn't considered.

## Methodology chain

1. **Primary**: FPF ADI (Abduction → Deduction → Induction) — the canonical thinking primitive for irreversible decisions per CLAUDE.md S10. Requires ≥3 hypotheses including a "do nothing" alternative.
2. **Secondary**: ADR / MADR — the artefact format the decision lands in; one page, machine-greppable.
3. **Tertiary**: C4 Model (L1+L2) — auto-recommended for any decision touching ≥3 modules per Sprint Z9; OpenSpec delta-spec — required if this ADR supersedes a prior ADR per Sprint Z8.

## Dispatch sequence

1. **research-analyst** (Profile A) — produces NOTE with options + prior art (other teams' choices, vendor docs, benchmarks). Why first: ADI's Abduction phase needs material to abduct from.
2. **adr-architect** (Profile A) — runs `forgeplan_reason <ARTIFACT-ID>` to produce ≥3 hypotheses, picks one, drafts ADR-NNN. Why second: this is the canonical ADI workflow per CLAUDE.md Z7. Auto-dispatches `c4-diagram` skill for ≥3-module decisions.
3. **c4-diagram skill** (Dispatch mode, **only if ≥3 modules**) — produces `docs/c4/ADR-NNN.md` with L1+L2 Mermaid diagrams. Why conditional: Sprint Z9 rule — full ADRs touching ≥3 modules must have C4 diagrams before the ADR body is finalised.
4. **architect-reviewer** (Profile B) — produces EVID auditing the ADR against the parent PRD/RFC and prior ADRs. Why penultimate: catches "the new decision contradicts ADR-NNN that we forgot about".
5. **guardian** (Profile B-gate) — produces gate EVID with PASS/CONCERNS/BLOCKER. Why last: aggregates the ADI EVID + BMAD EVID + architect-reviewer EVID.

Note: this row is **decision-only** — no `coder` dispatch in the
sequence. If implementing the decision is also in scope, the user is
mixing rows; smith should close this ADR-decision row, then re-route to
section 03 (feature) or 06 (refactor) for the implementation as a
separate PRD that cites this ADR.

## Evidence requirements

- [ ] NOTE with options + prior art research
- [ ] ADR-NNN (full template per Sprint Z1 if ≥3 modules OR supersede OR irreversible; light template otherwise)
- [ ] ADI EVID with **≥3 hypotheses** including "do nothing / in-process alternative / scope reduction" per CLAUDE.md S10
- [ ] If ≥3 modules: `docs/c4/ADR-NNN.md` with L1+L2 Mermaid diagrams
- [ ] If supersedes prior ADR: delta-spec with ADDED/MODIFIED/REMOVED/UNCHANGED sections per Sprint Z8 (use `/supersede` skill)
- [ ] BMAD adversarial EVID with ≥1 finding from `artifact-reviewer` or `architect-reviewer`
- [ ] guardian Profile B EVID with verdict=PASS

## Failure modes

1. **Only 2 hypotheses considered — false dichotomy.** The chosen option wins by default; the third option ("don't do it" or "scope it smaller") was never on the table. **Recovery**: re-run `forgeplan_reason` with explicit prompt to surface a 3rd hypothesis; reconsider.
2. **ADR is written after the decision is already implemented.** The "decision" reads as justification, not reasoning. **Recovery**: this is a smell but not always a blocker — if the implementation matches a defensible ADI walk, accept it; if not, file an ADR-supersede with delta-spec for the *actual* choice.
3. **≥3 modules touched but no C4 diagram.** `adr-architect` Step 5b.1 should have auto-dispatched; if it didn't, `guardian` flags CONCERNS. **Recovery**: dispatch `c4-diagram` retroactively; cite as anomaly if `adr-architect` skipped its auto-dispatch.
4. **Supersedes a prior ADR but no delta-spec.** Sprint Z8 rule violated; `/decay-watch` Step 2e will flag CONCERNS. **Recovery**: use `/supersede` skill to compute the delta retroactively; backfill ADDED/MODIFIED/REMOVED/UNCHANGED into the body.
5. **The "do nothing" hypothesis was checked off as a formality, not seriously argued.** Decision proceeds with hidden cost. **Recovery**: argue "do nothing" out loud in writing; if it loses, the loss should be visible in the ADI EVID body.

## Example invocation

```
User: "We need to pick a message queue for our payment service.
      Kafka, RabbitMQ, or AWS SQS."

Smith: Context=adr-decision (row 7). Methodology=FPF ADI + MADR + C4 (≥3 modules).
       Dispatch:
       1. research-analyst → NOTE (Kafka pros/cons, RabbitMQ pros/cons,
          SQS pros/cons; team's existing AWS footprint; throughput
          requirements; ordering requirements; benchmark refs)
       2. adr-architect → forgeplan_reason ADR-NNN-draft → 4 hypotheses:
          H1: Kafka — high throughput, ordering guarantees, ops overhead
          H2: RabbitMQ — flexible routing, lower throughput, ops familiar
          H3: AWS SQS — managed, AWS-native, no ordering on standard queues
          H4: "Do nothing" — synchronous webhook delivery, no queue
          → chosen: H3 (AWS SQS FIFO) — managed, AWS-native, ordering via FIFO
          ADR-NNN drafted with full template (irreversible, 4 modules)
          + c4-diagram dispatch (L1+L2, 4 modules: payment-api,
            sqs-queue, payment-worker, dlq-handler)
       3. architect-reviewer → EVID (ADR consistent with ADR-N-3
          which pinned us to AWS; throughput math checks out for FIFO
          quota; 1 finding: DLQ retention policy unspecified; CONCERNS)
          → fixer → re-review (PASS)
       4. guardian → gate EVID (PASS)

       Evidence required: NOTE + ADR full + C4 file + ADI EVID + BMAD EVID +
                          guardian EVID
       Methodology refs: FPF ADI (CLAUDE.md S10)
                         MADR  https://adr.github.io/madr/
                         C4    https://c4model.com
                         OpenSpec delta-spec (CLAUDE.md S12) — N/A, not a supersede
```

## References

- `../routing-map.md` — table row #7
- FPF ADI: `plugins/fpf/skills/fpf-knowledge/SKILL.md` (this repo)
- ADR/MADR: https://adr.github.io/madr/
- C4 Model: https://c4model.com
- This repo's CLAUDE.md — Sprint Z7 (FPF ADI mandatory), Sprint Z8 (delta-spec), Sprint Z9 (C4 ≥3 modules)
- `/supersede` skill in `plugins/fpl-skills/skills/supersede/`
