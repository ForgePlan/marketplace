# bad.md — SKILL.md used as knowledge container

A SKILL.md that has grown to 400 lines of embedded knowledge:

```markdown
---
name: laws-of-ux
description: UX principles. Triggers on: UX review, design feedback.
---

# Laws of UX

## Hick's Law

Decision time grows logarithmically with the number of choices:
T = b * log2(n + 1). Design implication: expose ≤7 options in any menu.

Practical examples:
- Navigation bars should have ≤7 top-level items
- Form dropdowns with >15 options should use autocomplete
- Button groups should not exceed 4-5 actions
[30 more lines of detail and examples]

## Fitts' Law

The time to reach a target depends on distance and target size.
T = a + b * log2(D/W + 1). Design implications:
- Primary actions need large click targets (≥44px on mobile)
- Destructive actions should be small and distant from primary actions
[30 more lines]

## Miller's Rule
[30 lines]

## [27 more laws, each with full explanation]
[300+ more lines]
```

**Why this fails**:
- All 400 lines load on every UX query — including queries about one law
- Context budget consumed before Claude reads anything from sections/
- SKILL.md mutation required for every law update — high collision risk
