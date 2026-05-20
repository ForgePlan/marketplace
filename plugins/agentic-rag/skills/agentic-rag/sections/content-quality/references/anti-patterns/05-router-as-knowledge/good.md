# good.md — pure router SKILL.md

The same skill as a 30-line navigation-only file:

```markdown
---
name: laws-of-ux
description: >
  UX design principles from psychological and behavioral research.
  Use when reviewing UI, writing design feedback, or choosing interaction patterns.
  Triggers on: UX review, design principles, cognitive load, Fitts, Hick, Miller,
  gestalt, Jakob's Law, Doherty threshold, Postel's law, accessibility.
---

# Laws of UX

30 evidence-based UX laws organized into 4 categories.

## Index

| Category | What it covers | Section |
|----------|---------------|---------|
| Cognitive | Decision-making, memory limits, processing speed | [cognitive/_index.md](sections/cognitive/_index.md) |
| Motor | Touch targets, pointing, movement | [motor/_index.md](sections/motor/_index.md) |
| Gestalt | Visual grouping, pattern recognition | [gestalt/_index.md](sections/gestalt/_index.md) |
| Code patterns | Violation/correct pairs for each law | [code-patterns/_index.md](sections/code-patterns/_index.md) |
```

Knowledge lives entirely in sections/ — each law gets its own 35-40 line file.

**Why this works**:
- SKILL.md is 30 LOC — negligible context cost on every trigger
- A query about Fitts' Law loads: SKILL.md (30 lines) + motor/_index.md (20 lines) + fitts-law.md (35 lines) = 85 lines total
- The 400-line version loaded 400 lines for the same query
- Each law file is independently editable with zero collision risk
