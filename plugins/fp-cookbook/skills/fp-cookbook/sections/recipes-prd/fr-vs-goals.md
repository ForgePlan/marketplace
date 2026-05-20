# Goals vs Functional Requirements vs Acceptance Criteria

## Цель

Understand when to use each PRD section so validators pass and
reviewers can score the artifact correctly.

## The three layers

| Layer | Answers | Example |
|-------|---------|---------|
| **Goals** (G1, G2…) | *What* outcome do we achieve? | G1. Users can install the plugin in < 30 s |
| **Functional Requirements** (FR-NNN) | *How* does the system behave? | FR-001. `plugin.json` must have name + version fields |
| **Acceptance Criteria** (AC-N) | *How do we know it's done?* | AC-1. `validate-all-plugins.sh` returns ALL PASSED |

## Decision rules

```
Describing a desired outcome for users/business  → Goal
Describing system behaviour / API contract       → Functional Requirement
Describing an observable test that proves done   → Acceptance Criterion
```

Each FR must `Implements GN` — explicitly reference the goal it serves.
Each AC must `verifies FR-NNN` — explicitly reference the FR it tests.

## Пример (from PRD-041)

```markdown
## Goals
G1. Detect inverted forgeplan links before merge.

## Functional Requirements
FR-001. `scripts/detect_link_footguns.sh` must exit non-zero if inverted links found.
        Implements G1.

## Acceptance Criteria
AC-1. Running the script on a repo with known inverted links returns exit 1
      and prints the offending link IDs. Verifies FR-001.
```

## Common errors

| Error | Fix |
|-------|-----|
| FR has no `Implements GN` tag | Add "Implements G1" at end of FR line |
| AC has no `verifies FR-NNN` tag | Add "Verifies FR-001" at end of AC line |
| Goals are too vague ("improve UX") | Rewrite as measurable outcome |
| AC duplicates FR wording verbatim | AC must describe observable *test*, not restate the FR |

## Refs

- PRD-041 (active) — Sprint O link-detection PRD; good FR/AC/Goal examples
- PRD-026 (active) — depth=deep example with 17 FRs across multiple goals
