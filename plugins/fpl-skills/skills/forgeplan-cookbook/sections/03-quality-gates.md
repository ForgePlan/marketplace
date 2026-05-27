# Section 03 — Quality gates

**5 tools** that gate or measure artifact quality. Profile B reviewers are heavy users.

## 03.1 forgeplan_validate — schema check (MUST / SHOULD / COULD)

Validates artifact body against per-kind schema rules. Returns structured findings.

```python
forgeplan_validate(id="PRD-001")
# → {"result": "PASS" | "PASS (with warnings)" | "FAIL",
#    "errors": ["prd-fr-exist: Missing '## Functional Requirements' section", ...],
#    "warnings": ["prd-orphan-frs: ..."]}
```

| Severity | Effect on activate gate |
|---|---|
| MUST (`x`) | Blocks `_activate` unless `force=true` |
| SHOULD (`!`) | Warning; does not block |
| COULD (`~`) | Soft suggestion |

**Section schema (PRD example, surfaced by forgeplan 0.32.1)**:

- `## Problem statement` (≥50 words avoids `prd-problem-density` SHOULD warning)
- `## Target audience` or `## Target users` (MUST `prd-target-audience` for Standard+)
- `## Goals` or `## Success Criteria` (MUST `prd-goals-exist`)
- `## Functional Requirements` — literal capitalisation (MUST `prd-fr-exist`)
- `## Out of scope` — non-goals
- `## Related Artifacts` (MUST `prd-related`)

See `smith-bootstrap/SKILL.md` Step 6 for the full section table.

## 03.2 forgeplan_score — compute R_eff

Computes R_eff (effective reliability) for a decision artifact based on linked EVID. Weakest-link principle: `R_eff = min(evidence_scores)`.

```python
forgeplan_score(id="PRD-001")
# → {"r_eff": 0.0, "confidence": "insufficient (2 evidence)",
#    "weakest_link": "NOTE-001", "evidence_breakdown": [...]}
```

**Owner**: Profile B (canonical) or orchestrator. Profile A creates artifacts; Profile B measures them.

**Known limitation**: leaf EVIDs sometimes score 0 even with structured body (forgeplan#325 — pre-existing upstream issue). Not in scope of safety section 14.

**CLI**: `forgeplan score <ID>` for one artifact, `forgeplan score --all` for the whole graph (NOT `forgeplan score-all` — see [`14.2`](14-mcp-safety-warnings.md)).

## 03.3 forgeplan_review — validation + lifecycle checklist

Combined validate + lifecycle gate report. Shows what would need to happen for the artifact to be activated.

```python
forgeplan_review(id="PRD-001")
# → {"validate": {...}, "lifecycle": {"can_activate": false,
#    "blockers": ["MUST: missing Goals section", "No EVID linked yet"]}}
```

**When to use vs `_validate`**: `_review` is the user-facing one — bundles validate + lifecycle + R_eff context into a single answer. `_validate` is the structural check only.

## 03.4 forgeplan_calibrate — depth suggestion

Suggests Tactical / Standard / Deep / Critical depth based on artifact content analysis (security keywords, breaking-change signals, link count, body complexity).

```python
forgeplan_calibrate(id="PRD-001")
# → {"current_depth": "standard", "suggested_depth": "deep",
#    "reasons": ["body length >2000 lines", "≥5 cross-module links", ...]}

forgeplan_calibrate()    # all artifacts (use sparingly — read-heavy)
```

**Owner**: orchestrator. Profile A creators set initial depth via `forgeplan_route` or manual; `_calibrate` checks whether reality matches.

## 03.5 forgeplan_estimate — effort estimate

Multi-grade effort estimate (Junior / Middle / Senior / Principal / AI hours) based on FR + Phase content.

```python
forgeplan_estimate(id="PRD-001")
# → {"grades": {"junior": {"hours": ...}, "senior": {"hours": ...}, ...},
#    "confidence": "medium"}

forgeplan_estimate(id="PRD-001", llm_score=true)   # LLM-based complexity instead of rules
forgeplan_estimate(id="PRD-001", my_grade=true)    # auto-pick grade from config
```

**Owner**: planning / `goal-planner` agent. Useful for sprint sizing.
