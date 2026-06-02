---
name: supersede
description: |
  Walk the complete supersede-ADR workflow with mandatory OpenSpec delta-spec discipline.
  Reads the old ADR, verifies it is active, computes the user's intended delta, creates the
  new ADR using the adr-supersede.md template (all four delta sections: ADDED / MODIFIED /
  REMOVED / UNCHANGED), links supersedes, and marks the predecessor superseded.

  Triggers: "supersede", "supersede ADR", "замени ADR", "обнови решение", "supersede decision",
  "evolve ADR", "replace ADR", "/supersede"

  Sprint Z8 PRD-058 — EPIC-001 S12 OpenSpec layer.
origin: forgeplan
---

# /supersede — Supersede ADR with OpenSpec delta-spec

This skill walks the mandatory 8-step procedure for superseding an active ADR. It enforces the
**S12 OpenSpec delta-spec discipline** (Sprint Z8 PRD-058): every supersede MUST document what
is ADDED, MODIFIED, REMOVED, and UNCHANGED relative to the predecessor.

## When to invoke

- User wants to replace an existing ADR with an updated decision.
- A Revisit Trigger fired (`[x]` in the ADR body, or `/decay-watch` reported FIRED / DATE-FIRED).
- Upstream event (issue closed, sprint decision, empirical finding) makes the predecessor obsolete.
- User says: «supersede ADR-XXX», «replace ADR-XXX with new decision», «update ADR-XXX».

## Core principle

> «Supersede is for evolutionary refinement, not replacement.»
>
> If the new decision has NO relationship to the old one, write a standalone ADR (use
> `adr-light.md` or `adr-full.md`). Supersede is only correct when the old decision is
> still the right *context* but the *conclusion* has evolved due to new information.

---

## Procedure

### Step 1 — Read the predecessor ADR

```python
old_adr = forgeplan_get(id="ADR-NNN")
```

Print title, status, and decision section to the user so you both share the same baseline.

### Step 2 — Verify predecessor is active

```python
if old_adr.status != "active":
    raise Error(f"Cannot supersede ADR-{N}: status is '{old_adr.status}'. "
                "Only active ADRs can be superseded. "
                "If status is 'draft', activate it first or write a new ADR instead.")
```

Halt if not active. Report status and stop — do NOT proceed with a non-active predecessor.

### Step 3 — Compute delta in working memory

Before writing anything, enumerate the delta between what the user wants to decide and what
ADR-NNN currently says. Answer all four questions explicitly:

| Question | Answer |
|---|---|
| What's ADDED that didn't exist in the predecessor? | <list or «none»> |
| What's MODIFIED (same topic, different conclusion)? | <list with before/after or «none»> |
| What's REMOVED (no longer applies at all)? | <list or «none»> |
| What's UNCHANGED (carries over exactly)? | <summary or «everything else»> |

**Hard rule**: If you cannot answer these four questions with at least one non-«none» answer
across ADDED + MODIFIED + REMOVED, this is not a supersede — it's either a new decision or a
correction. Stop and clarify with the user.

**Hard rule**: If REMOVED covers more than ~50% of the predecessor's substance, reconsider:
this may be a wholesale replacement, not an evolution. Recommend a new standalone ADR instead.
Present the concern to the user before proceeding.

### Step 4 — Read the adr-supersede template

```python
template = read_file("templates/adr-supersede.md")
```

Use this as the structural reference for the new ADR body. Fill all sections including the
four delta sub-sections. Never leave any delta sub-section blank — write «no items» explicitly
if a category genuinely has nothing.

### Step 5 — Create the new ADR artifact

```python
new_adr = forgeplan_new(
    kind="adr",
    title="<descriptive title reflecting the evolved decision>",
    depth="standard",   # or "deep" if decision touches ≥3 modules
)
```

Then fill the body using `forgeplan_update(id=NEW-ADR, body=<filled template>)`.

The body MUST contain:
- `## Why supersede` section
- `## Delta-spec (OpenSpec format) — MUST` with all four sub-sections
- `## Predecessor reference` citing the old ADR's exact decision text
- `## Revisit Trigger (Evidence Decay) — MUST` with parseable syntax

### Step 6 — Fill body with delta-spec — never empty

For each delta sub-section:
- **ADDED**: list every new rule, constraint, or feature introduced in this version.
- **MODIFIED**: for each changed item, show **before (ADR-XXX):** and **after (this ADR):** lines.
- **REMOVED**: list every rule, constraint, or workaround being retired, with reason.
- **UNCHANGED**: one sentence summarising what carries over verbatim.

If any sub-section genuinely has nothing: write «no items» — NOT a blank line, NOT omitted.

```python
# Validate before saving
for section in ["### ADDED", "### MODIFIED", "### REMOVED", "### UNCHANGED"]:
    assert section in body, f"Missing required delta sub-section: {section}"
    idx = body.index(section)
    next_section = body.find("###", idx + len(section))
    content = body[idx:next_section if next_section != -1 else len(body)]
    assert len(content.strip()) > len(section) + 10, \
        f"Delta sub-section {section} appears empty — write 'no items' if none"
```

### Step 7 — Link: new supersedes old

```python
forgeplan_link(
    source=new_adr.id,    # new ADR
    target=old_adr.id,    # old ADR
    relation="supersedes"
)
```

Direction: **source (newer) → target (older)**. This is the canonical direction per
Anomaly #15 (Sprint L) — inversion is silently accepted by forgeplan but semantically wrong.

Verify with `forgeplan_get(id=new_adr.id)` that `supersedes` link appears in dependency_links.

### Step 8 — Mark old ADR as superseded

```python
forgeplan_update(
    id=old_adr.id,
    status="superseded"
)
```

Confirm the FSM transition succeeded (active → superseded is a valid path). If forgeplan
rejects the transition, surface the error — do NOT silently proceed.

---

## Post-supersede checklist

After the 8 steps complete:

1. Create EVID: `forgeplan_new(kind="evidence", parent_id=new_adr.id)` — documents the
   trigger + justification for the supersede decision.
2. Link EVID: `forgeplan_link(source=EVID-NNN, target=new_adr.id, relation="informs")`.
3. Activate new ADR: `forgeplan_activate(id=new_adr.id)`.
4. Run `/decay-watch` — confirms Step 2e sees the new ADR's delta-spec as HAS-DELTA.

---

## Hard rules

1. **Verify status=active before proceeding.** Cannot supersede draft / superseded / deprecated.
2. **Delta-spec is non-negotiable.** Supersede without delta-spec = implicit empty delta =
   history loss. `/decay-watch` Step 2e will flag it as MISSING-DELTA or NO-DELTA-WHEN-REQUIRED.
3. **Write «no items» — never blank.** Implicit empty is the violation; explicit «no items» is fine.
4. **Check REMOVED > 50% rule.** If you're removing more than half the predecessor, recommend
   a new standalone ADR. Surface this to the user; don't proceed without acknowledgment.
5. **Link direction: new → old.** `forgeplan_link(source=NEW, target=OLD, relation="supersedes")`.
   Inversion is silently accepted upstream but semantically wrong (Anomaly #15).
6. **Cite Sprint Z8 PRD-058 + EPIC-001 S12** in the new ADR's References section so reviewers
   can trace the enforcement lineage.

---

## What this skill does NOT do

- Does NOT make the supersede decision for you. It scaffolds the artifact; the decision is yours.
- Does NOT write the predecessor's EVID or archive it. That's the user's responsibility.
- Does NOT run decay-watch automatically post-supersede. Call it explicitly if you want confirmation.

---

## Integration points

- **`templates/adr-supersede.md`** — structural template used in Step 4 / Step 6.
- **`/decay-watch` Step 2e** — scans every active artifact with `supersedes` link to verify
  delta-spec presence (HAS-DELTA / MISSING-DELTA / NO-DELTA-WHEN-REQUIRED).
- **`guardian` agent** — may surface CONCERNS on supersede chains missing delta-spec during
  pre-activation review.
- **EPIC-001 S12 OpenSpec layer** — authority for this discipline.

---

## References

- PRD-058 (Sprint Z8) — mandate for OpenSpec delta-spec at supersede
- EPIC-001 S12 — OpenSpec structure layer
- `templates/adr-supersede.md` — the structural template
- `skills/decay-watch/SKILL.md` Step 2e — decay verification of supersede chains
- Anomaly #15 (Sprint L) — supersedes link direction (new→old canonical)
- `templates/adr-light.md`, `templates/adr-full.md` — for non-supersede decisions
