# good.md — non-overlapping section boundaries

Same content reorganized into sections with clear, non-overlapping ownership:

```markdown
# description-craft/_index.md

**Topic**: writing description: and triggers: (user-facing text that activates the skill)

| File | Description |
|------|-------------|
| description-field.md | How to write description: — "Use when" + "Triggers on:" formula |
| trigger-phrases.md | Vocabulary patterns, multilingual variants, ≥5 phrases rule |
```

```markdown
# structure/_index.md

**Topic**: SKILL.md layout, required frontmatter fields, file budgets

| File | Description |
|------|-------------|
| frontmatter-fields.md | All fields: name, description, triggers, model, skills, memory |
| file-budget.md | Line count limits: SKILL.md ≤150, content ≤70, _index ≤40 |
| activation-rules.md | How Claude decides when to load — threshold + context mechanics |
```

**Why this works**:
- `description-craft/` owns all content about _writing_ activation text
- `structure/` owns all content about _file layout_ and _field definitions_
- Zero topic overlap — any query routes unambiguously to one section
- New topics slot into exactly one section without ambiguity
