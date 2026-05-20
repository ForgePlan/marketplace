# Create, Validate, and Activate a PRD

## Цель

Author a PRD that passes `forgeplan validate` at depth=standard and can be
activated in the same session (Sprint D dogfood discipline: no draft accumulation).

## Команда

```bash
# 1. Create
forgeplan new prd "Feature name"           # → PRD-NNN (draft)

# 2. Fill body — minimum sections for depth=standard:
#    ## Vision, ## Problem, ## Goals, ## Non-Goals,
#    ## Functional Requirements, ## Acceptance Criteria

# 3. Validate
forgeplan validate PRD-NNN                 # must return PASS

# 4. Activate (same session — Sprint D discipline)
forgeplan activate PRD-NNN                 # → status: active
```

## Minimum body template (depth=standard)

```markdown
# PRD-NNN: Title

## Vision
One sentence: what this ships and why.

## Problem
What pain does this solve?

## Goals
G1. Specific measurable outcome.

## Non-Goals
NG1. What we are NOT building.

## Functional Requirements
FR-001. Specific behaviour. Implements G1.

## Acceptance Criteria
AC-1. Observable test that verifies FR-001.
```

## Depth requirements

| Depth | Extra required |
|-------|----------------|
| tactical | No forgeplan artifact needed |
| standard | Vision + Goals + FRs + ACs |
| deep | Add: Architecture section + ≥1 ADR link |
| critical | Add: Epic parent + stakeholder sign-off Evidence |

## Common errors

| Error | Fix |
|-------|-----|
| `BLOCKER: missing vision` | Add `## Vision` section (≥1 sentence) |
| `BLOCKER: no functional-requirements` | Add `## Functional Requirements` with FR-001 |
| `BLOCKER: no acceptance-criteria` | Add `## Acceptance Criteria` with AC-1 |
| `activate` returns FSM error | Check current status: `forgeplan get PRD-NNN` → may be deprecated |

## Refs

- PRD-038 (active, R_eff=0.90) — reference PRD shaped at depth=standard Sprint J+K
- PRD-039 (active) — Sprint M conventions PRD (depth=standard)
- mm-pipeline-anomalies — 3-tier resolution for activate failures
