# Anti-patterns — 5 Concrete Examples

## AP-1: Wall of text in a content file

**BAD** — 300-line file mixing background, rules, examples, edge cases.
The agent loads 300 lines when the user needs 40.

**GOOD** — split into focused files: `topic-overview.md` (30 lines),
`topic-examples.md` (40 lines), `topic-edge-cases.md` (35 lines).

---

## AP-2: Duplicate content across sections

**BAD** — Hick's Law fully explained in both `cognitive/_index.md`
AND `code-patterns/navigation-choices.md`.

**GOOD** — `cognitive/hicks-law.md` owns the definition.
`code-patterns/navigation-choices.md` links to it and adds only code content:
```markdown
See [Hick's Law](../cognitive/hicks-law.md) for the principle.
Code rule: nav menus must have ≤7 top-level items.
```

---

## AP-3: SKILL.md as a knowledge container

**BAD** — SKILL.md has 400 lines of knowledge. Every query loads the full file.
```markdown
## Hick's Law
The time to decide increases with number of choices...
[full explanation — 60 lines inside SKILL.md]
```

**GOOD** — SKILL.md is 80 lines of navigation only. Knowledge lives in sections/:
```markdown
| Hick's Law | [cognitive](sections/02-cognitive/_index.md) |
```

---

## AP-4: Missing _index.md

**BAD** — section directory has 5 files, no `_index.md`.
The agent cannot discover those files — it reads only what the router points to.

**GOOD** — every section directory has an `_index.md` listing all files
with one-line descriptions and line counts.

---

## AP-5: Sections with overlapping boundaries

**BAD** — two sections both cover "triggers and frontmatter":
- `section-a/` — "triggers and descriptions"
- `section-b/` — "frontmatter, triggers, and activation rules"

Agent cannot reliably route between them.

**GOOD** — non-overlapping responsibilities:
- `description-craft/` — how to write description + triggers
- `structure/` — SKILL.md layout and file budgets

One topic per section, zero overlap. If two sections share a topic, merge them.
