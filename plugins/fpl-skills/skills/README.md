# skills/

Claude Code skills. Each skill is a **folder** with a `SKILL.md` file and,
optionally, supporting files (templates, regexes, examples).

---

## Skill structure

```
skills/<skill-name>/
├── SKILL.md            # required: YAML frontmatter + body
├── examples/           # optional: usage examples
└── resources/          # optional: templates, schemas, data
```

## `SKILL.md` template

```markdown
---
name: <skill-name>
description: Use when <trigger — describe the situation, not capabilities>. Example: "when refactoring React components" instead of "refactors React".
---

# <Title>

## When to use

- Trigger 1
- Trigger 2

## When NOT to use

- Counter-example 1

## Process

1. Step 1
2. Step 2

## Examples

See `examples/`.
```

---

## Rules

- **Folder name** = `name` from frontmatter, `kebab-case`.
- **`description`** — describe the **trigger**, not the capabilities. Claude
  uses this to decide whether to invoke the skill.
- One skill — one clear job. If the process turns into three paragraphs with
  branches, split it into multiple skills.
- Don't embed a full guide here; link to `../../guides/` instead.

## Install

```bash
# Copy
cp -r skills/<name> ~/.claude/skills/

# Or symlink (handy when iterating and testing live)
ln -s "$(pwd)/skills/<name>" ~/.claude/skills/<name>
```

(Wrapper script — `scripts/install-skill.sh`, once it exists.)

## After adding one

1. Update the root `INDEX.md` (Skills section).
2. Commit: `feat(skills): add <skill-name>`.
