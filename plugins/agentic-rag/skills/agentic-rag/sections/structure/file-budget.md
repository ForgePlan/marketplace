# File Budget and Directory Conventions

## _index.md format

Every section directory must have an `_index.md`. Format:

```markdown
# Section Name

One-sentence description of what this section covers.

## Contents

| File | Description | Lines |
|------|-------------|-------|
| [file-name.md](file-name.md) | What this file covers | 38 |
```

Include the approximate line count — it helps the agent decide whether to load the file.

## Content file budget

| File type | Target lines | Hard limit |
|-----------|:------------:|:----------:|
| Content file | 30-50 | 70 |
| _index.md | 15-30 | 40 |
| SKILL.md | 60-100 | 150 |

If a content file exceeds 70 lines: split it into two files, update `_index.md`.

## Directory naming

Use lowercase kebab-case for section directories and file names:
- `when-to-use/` not `WhenToUse/` or `when_to_use/`
- `decision-tree.md` not `DecisionTree.md`

Match directory names to the section INDEX table in SKILL.md exactly.
A mismatch breaks the router — the agent follows a dead link.

## Real-world reference

`plugins/laws-of-ux/skills/ux-laws/sections/01-heuristics/`:
4 content files (34-38 lines each) + `_index.md` (12 lines).
Total section: ~160 lines loaded only when heuristics are relevant.
