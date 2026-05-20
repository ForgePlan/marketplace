# good.md — router + focused files equivalent

The same content split into a router and 4 focused files:

```markdown
---
name: my-skill
description: Guides component design. Use when designing components.
---

# My Skill

For core principles, read `sections/principles/_index.md`.
For design patterns, read `sections/patterns/_index.md`.
For anti-patterns, read `sections/anti-patterns/_index.md`.
For code examples, read `sections/examples/_index.md`.
```

Plus each section `_index.md` (~20 LOC each):

```markdown
# principles/_index.md

| File | Topic | Lines |
|------|-------|-------|
| [srp.md](srp.md) | Single responsibility principle | 35 |
| [separation.md](separation.md) | Separating display from logic | 30 |
```

Each content file covers one topic in 30-40 lines.

**Why this works**:
- SKILL.md is 15 LOC — loads instantly on every trigger
- Claude reads only the section relevant to the user's question
- Each file is independently editable — no merge conflicts across topics
- New topics = new files, not edits to a shared monolith
