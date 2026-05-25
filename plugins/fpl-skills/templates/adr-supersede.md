# ADR Supersede Template (OpenSpec S12)

> **Use this template** when creating a new ADR that supersedes (replaces) an existing active ADR.
> For routine new decisions — use `adr-light.md` or `adr-full.md` instead.
> **This template enforces the S12 OpenSpec delta-spec discipline** — every supersede MUST document
> exactly what changed from the predecessor: ADDED / MODIFIED / REMOVED / UNCHANGED.
> Sprint Z8 PRD-058 — EPIC-001 S12 layer.

---

# ADR-NNN: <one-sentence decision title>

| Field | Value |
|---|---|
| Status | Draft |
| Date | YYYY-MM-DD |
| Supersedes | ADR-XXX — <predecessor title> |
| Reason | <one-line trigger: what changed externally that makes the old decision obsolete> |

## Why supersede

<1-2 sentences: what changed upstream (event, sprint, empirical finding, upstream issue) that
makes ADR-XXX's decision no longer accurate or safe. This is NOT a critique of ADR-XXX — it
was the right call at the time. Name the trigger explicitly.>

Example: «The upstream `forgeplan#325` issue closed, shipping native `auto_activate_source`
support (ADR-XXX chose KEEP CURRENT pending that fix). ADR-XXX's revisit trigger has fired.»

## Delta-spec (OpenSpec format) — MUST

> This section is the reason supersede exists as a distinct operation.
> Every bullet MUST be concrete (path, field name, version, behaviour before/after).
> Leaving a sub-section blank is NOT acceptable — write «no items» explicitly.
> If REMOVED > 50% of predecessor content, consider writing a NEW standalone ADR instead
> (supersede is for evolutionary refinement, not wholesale replacement).

### ADDED — what's new in this version

Items that did NOT exist in ADR-XXX and are being introduced:

- `<Feature / rule / constraint>` — <one line explaining why it's being added>
- <...>

If nothing new: «no items»

### MODIFIED — what changed from predecessor

Items that existed in ADR-XXX but are being changed. Use **before** / **after** format:

- `<Field / rule / behaviour>`
  - **Before (ADR-XXX)**: <exact wording or value>
  - **After (this ADR)**: <new wording or value>
  - **Why**: <trigger — upstream change, empirical finding, sprint X decision>
- <...>

If nothing changed (only additions/removals): «no items»

### REMOVED — what no longer applies

Items from ADR-XXX that are being explicitly retired:

- `<Rule / constraint / workaround>` — <why it's being retired; what makes it unnecessary>
- <...>

If nothing removed: «no items»

### UNCHANGED — what carries over verbatim

<One concise sentence summarising what from ADR-XXX remains fully valid in this version.
If everything changed, write «no items». If most carries over, a phrase like
«All other constraints from ADR-XXX carry over (sections Context / Evidence / Rejected alternatives)»
is sufficient.>

---

## Predecessor reference

> Cite the exact decision text being superseded so it's clear what we are evolving.

**ADR-XXX decision**: «<copy the ## Decision section verbatim from ADR-XXX>»

Link: `forgeplan_get(id="ADR-XXX")` — review before filling delta-spec above.

---

## Context (for this version)

<2-4 sentences: what situation NOW that led to superseding. Focus on what's different from
ADR-XXX's context, not the full background (that's in the predecessor). The delta drives this.>

## Decision

<One sentence. What we are deciding in THIS version.>

## Consequences

- **Positive**: <what improves>
- **Negative / trade-offs**: <what we accept>
- **Neutral**: <what stays the same>

## Revisit Trigger (Evidence Decay) — MUST

Re-open this ADR when ANY of the triggers below fires:

- [ ] **Type**: date — <e.g., "2027-06-01">
- [ ] **Type**: metric — <e.g., "error rate on supersede flows > 2%">
- [ ] **Type**: event — <e.g., "upstream forgeplan#XXX closes">

**Mark `[x]` to flag a trigger as fired.** `/decay-watch` Step 2e will verify delta-spec
presence on this artifact. Sprint Z8 enforcement: missing delta-spec on a Z8+ supersede → CONCERNS.

---

## References

- OpenSpec methodology — EPIC-001 S12 (structure layer)
- Sprint Z8 PRD-058 — delta-spec mandatory at supersede
- ADR-XXX — predecessor (superseded by this ADR)
- `/supersede` skill — workflow for creating this artifact correctly
- `templates/adr-light.md` / `templates/adr-full.md` — use for non-supersede decisions

---

## How to use this template

1. Run `/supersede OLD-ADR-NNN` — the skill walks you through Steps 1-8 and fills the delta-spec.
2. Or manually: `forgeplan_get(id="ADR-XXX")` → compute delta → create new ADR via
   `forgeplan_new(kind="adr", title="...")` → fill body using this template.
3. Link: `forgeplan_link(source=NEW-ADR, target=OLD-ADR, relation="supersedes")`.
4. Update old ADR status: `forgeplan_update(id="ADR-XXX", status="superseded")`.
5. Create EVID with `parent_id=NEW-ADR` → link → activate.

### Hard rules

- **Never leave a delta sub-section blank.** Write «no items» explicitly if applicable.
- **REMOVED > 50% of predecessor?** Reconsider: that's a replacement, not an evolution.
  Write a new standalone ADR (or adr-full.md) instead.
- **Cannot supersede a non-active ADR.** Verify `status=active` before proceeding.
- **If you don't have a concrete delta** — don't supersede. Write a new standalone ADR.
  Supersede is for evolutionary refinement, not replacement of an unrelated decision.
