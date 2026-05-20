# bad.md — overlapping section boundaries example

Two sections whose topics bleed into each other:

```markdown
# section-a/_index.md

**Topic**: triggers and descriptions

| File | Description |
|------|-------------|
| trigger-phrases.md | How to write trigger phrases for SKILL.md |
| description-field.md | Writing the description: field in frontmatter |
| frontmatter-overview.md | What frontmatter fields mean |
```

```markdown
# section-b/_index.md

**Topic**: frontmatter, triggers, and activation rules

| File | Description |
|------|-------------|
| frontmatter-fields.md | All frontmatter fields: name, description, triggers, model |
| activation-triggers.md | How Claude decides when to load a skill |
| writing-triggers.md | Trigger phrase vocabulary and patterns |
```

**Why this fails**:
- `trigger-phrases.md` (section-a) and `writing-triggers.md` (section-b) are the same topic
- `frontmatter-overview.md` (section-a) and `frontmatter-fields.md` (section-b) overlap
- A query about "how to write trigger phrases" could route to either section
- Claude gets contradictory routing signals and may load both sections
