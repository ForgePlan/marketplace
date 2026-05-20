# SKILL.md — The Router Pattern

SKILL.md is a **navigation surface**, not a knowledge container.
Its job is to tell the agent where to look, not what the answer is.

## What belongs in SKILL.md

- YAML frontmatter: `name`, `description`, `triggers`
- A one-paragraph "what this skill does" summary
- A "when to use / when NOT to use" decision table
- A "how to navigate" section with 3 steps (identify need → read _index → read file)
- A section INDEX table mapping need → section path

## What does NOT belong in SKILL.md

- The actual knowledge (laws, rules, patterns, definitions)
- Step-by-step guides (those go in content files)
- Full examples (those go in content files)
- Anti-patterns (those go in a content-quality section)

## Router table format

Each row in the INDEX table answers: "when user needs X, go to Y."

```markdown
| What you need | Go to |
|---|---|
| Decision tree for flat vs RAG | [when-to-use](sections/when-to-use/_index.md) |
| Copy-paste starter-kit | [templates](sections/templates/_index.md) |
```

Link directly to the `_index.md` of the section, not to individual files.
The agent reads the _index to decide which file to load next.

## Size target

SKILL.md should be 60-100 lines. If it grows past 150 lines, you have
knowledge content in the router — extract it to a section.

See `plugins/laws-of-ux/skills/ux-laws/SKILL.md` for a 89-line router example.
See `plugins/fpf/skills/fpf-knowledge/SKILL.md` for a 149-line router with a larger index.
