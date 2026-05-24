# ADR Full Template (MADR 3.0)

> **Use this template when**: decision touches ≥3 modules, OR ADI surfaces ≥3 unresolved trade-offs, OR decision supersedes another ADR, OR user said "full ADR" / "major decision".
> For routine choices (lib X vs Y, single-config decision) — use `adr-light.md` instead. Keep this one for the big stuff.
> **No hard line limit**, but typical full ADR is 800-2000 lines. ADR-006 is a real-world example (~3000 lines, multi-sprint context).
> **9 sections, Context / Drivers / Options / Outcome / Consequences / Compliance MUST. Invariants / Open Questions / References SHOULD.**

---

# ADR-NNN: <one-sentence decision title>

| Field | Value |
|---|---|
| Status | Draft |
| Date | YYYY-MM-DD |
| Depth | Standard or Deep |
| Decision drivers | <comma-separated keywords — risk, compliance, performance, cost> |
| Decision-makers | <human or agent — autonomous orchestrator + named user> |
| Supersedes | <ADR-XXX or None> |
| Superseded-by | (open) |

## Context

<2-4 paragraphs. Full situation: what changed upstream, what's the constraint, what's currently in production, why is this decision being raised NOW. Reference the trigger event (issue, sprint, incident).>

## Decision drivers

Numbered list of constraints / forces shaping this decision. Cite source.

- **DD-1 (RISK)**: <constraint + source>
- **DD-2 (EMPIRICAL CONSTRAINT)**: <constraint + source>
- **DD-3 (UPSTREAM DEPENDENCY)**: <constraint + source>
- **DD-4 (SEPARATION OF DUTY)**: <constraint + source>
- **DD-5 (DEFENSE IN DEPTH)**: <constraint + source>

## Considered options

Minimum three. Each with its own subsection.

### Option 1 — <name>

Pattern / approach in 2-5 lines or a code block.

**Pro**:
- <concrete pro 1>
- <concrete pro 2>

**Con**:
- <concrete con 1 — cite evidence if quantified>
- <concrete con 2>

**Verdict**: SUPPORTED / REFUTED / NEEDS MORE DATA — with rationale.

### Option 2 — <name>

(same shape)

### Option 3 — <name>

(same shape)

## Decision outcome

**Chosen option**: **Option N — <name>.**

Rationale referencing DD-1..DD-N:

1. **DD-1 + <evidence>** — <one sentence>
2. **DD-2 + <evidence>** — <one sentence>
3. (continue for each DD that drives the choice)

The decision is **reversible / irreversible** by design (one-liner: how to back out).

## Consequences

### Positive

- <one-line concrete benefit>
- <another>

### Negative

- <one-line concrete cost>
- <another>

### Neutral

- <one-line — no impact, just noting>

## Compliance / Revisit Trigger — MUST

**This decision MUST be re-opened** when ALL of the parseable triggers below fire. Use the same syntax as `adr-light.md` for `/decay-watch` skill compatibility:

- [ ] **Type**: date — <e.g., "2027-01-01" or "+6 months from creation">
- [ ] **Type**: metric — <e.g., "p99 latency drops below 50ms", "records > 100k">
- [ ] **Type**: event — <e.g., "upstream forgeplan#XXX closes", "production incident X happens">

For full ADRs the trigger list MAY include additional context per trigger:

- **Verification step** — what observation confirms the trigger has actually fired (avoid false positives).
- **Next-action** — what artifact to create when re-opening (typically ADR-N+1 with `supersedes` link).

**Mark `[x]` to flag a trigger as fired.** Guardian agent will BLOCKER any artifact relying on an ADR with `[x]` triggers until either the ADR is superseded OR the trigger is unchecked with justification.

**Operational support**:

- `scripts/<monitor-name>.sh` — one-shot status check (if applicable)
- `docs/POST-<TRIGGER>-ACTIONS.md` — ready-to-run checklist (if applicable)

Sprint Z2 (PRD-053) wires `/decay-watch` skill + `decay-reminder.sh` SessionStart hook + guardian Step 4b enforcement.

## Invariants — SHOULD

What this decision MUST NEVER allow to be violated:

- **INV-1**: <one-line invariant>
- **INV-2**: <another>

## Open questions — SHOULD

What this decision INTENTIONALLY does not answer:

- <question deferred to ADR-N+1>
- <question deferred to evidence collection>

## References

- PRD-NNN — parent product spec
- EVID-NNN — supporting verification
- ADR-XXX — superseded ancestors
- forgeplan#NNN — upstream issue
- Sprint X retrospective — historical context
- mm-<model-name> — relevant mental model

---

## How to use this template

1. Default to `adr-light.md`. Only switch here when the "When to use" criteria above are met.
2. Create the ADR artifact: `forgeplan_new kind=adr title="..."` then `forgeplan_update body=<this filled template>`.
3. Apply FPF ADI (Abduction → Deduction → Induction) BEFORE filling the Considered options section. Use `forgeplan_reason` or `/fpf-reason`.
4. For each option, score F+G+R per the underlying evidence. If chosen option's sum <14 (full ADR bar higher than light), dispatch `evidence-gatherer` agent (Sprint Z4 PRD-055) for more rigorous evidence.
5. Compliance section is MUST — not optional. Decisions without revisit triggers become memorials.
6. Activate after EVID linked: create EVID with verification, link `informs`, activate EVID first, then ADR.
