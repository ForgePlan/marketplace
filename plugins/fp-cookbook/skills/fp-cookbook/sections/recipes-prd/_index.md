# recipes-prd

Recipes for authoring, linking, and activating PRD artifacts correctly.

## Contents

| File | Description | Lines |
|------|-------------|-------|
| [create-validate-activate.md](create-validate-activate.md) | Full 3-step pattern with validation requirements per depth level | 62 |
| [fr-vs-goals.md](fr-vs-goals.md) | When to use Goals vs FRs vs ACs; depth=standard requirements | 55 |
| [affected-files-frontmatter.md](affected-files-frontmatter.md) | Declaring affected_files unlocks parallel dispatch (Anomaly #15/#16) | 48 |
| [link-direction-rules.md](link-direction-rules.md) | source→target semantics; supersedes (newer→older); informs (evidence→PRD) | 52 |

## Decision tree

```
Need to describe WHAT to build?      → Goals section (G1, G2 ...)
Need to describe HOW it works?       → Functional Requirements (FR-NNN)
Need to describe "done" criteria?    → Acceptance Criteria (AC-N)
Need to reference another artifact?  → link-direction-rules.md
Need parallel agent dispatch?        → affected-files-frontmatter.md
```
