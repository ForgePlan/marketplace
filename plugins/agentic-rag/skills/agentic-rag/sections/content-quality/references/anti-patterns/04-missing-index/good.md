# good.md — section directory with proper _index.md

Same directory, now fully navigable:

```
sections/
  cognitive/
    _index.md           # router — 20 lines
    hicks-law.md        # 35 lines
    fitts-law.md        # 30 lines
    miller-rule.md      # 28 lines
    gestalt.md          # 42 lines
```

`_index.md` content:

```markdown
# cognitive

Laws describing how humans process information and make decisions.

| File | Description | Lines |
|------|-------------|-------|
| [hicks-law.md](hicks-law.md) | Decision time grows with number of choices | 35 |
| [fitts-law.md](fitts-law.md) | Target acquisition time vs size and distance | 30 |
| [miller-rule.md](miller-rule.md) | Working memory limit: 7 ± 2 items | 28 |
| [gestalt.md](gestalt.md) | Grouping, proximity, similarity principles | 42 |
```

From SKILL.md:

```markdown
| Cognitive laws | [sections/cognitive/_index.md](sections/cognitive/_index.md) |
```

**Why this works**:
- Every file is reachable via a two-hop chain: SKILL.md → _index.md → content
- Adding a new law = add the file + one row in `_index.md`
- Validation script can confirm every listed file exists
