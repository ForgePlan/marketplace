# content-quality

Anti-patterns to avoid when building agentic RAG skills, with concrete bad/good examples.
These are lessons learned from building fpf-knowledge (224 sections) and ux-laws (30 laws).

## Contents

| File | Description | Lines |
|------|-------------|-------|
| [anti-patterns.md](anti-patterns.md) | 5 anti-pattern overview (quick reference) | 20 |
| [quality-checklist.md](quality-checklist.md) | Pre-publish checklist for RAG skills | 36 |

## Detailed anti-pattern references

Each anti-pattern has a paired bad/good example with explicit "why" commentary.

| Pattern | Folder | What it is |
|---------|--------|------------|
| Walls of text | [references/anti-patterns/01-walls-of-text/](references/anti-patterns/01-walls-of-text/README.md) | 300+ line files loaded entirely on every trigger |
| Duplicate content | [references/anti-patterns/02-duplicate-content/](references/anti-patterns/02-duplicate-content/README.md) | Same definition in multiple files, causes drift |
| Unclear boundaries | [references/anti-patterns/03-unclear-boundaries/](references/anti-patterns/03-unclear-boundaries/README.md) | Overlapping sections confuse routing |
| Missing _index.md | [references/anti-patterns/04-missing-index/](references/anti-patterns/04-missing-index/README.md) | Content files that are unreachable by navigation |
| Router as knowledge | [references/anti-patterns/05-router-as-knowledge/](references/anti-patterns/05-router-as-knowledge/README.md) | SKILL.md accumulating content instead of routing |

Each folder contains: `README.md` (what + why + how to fix), `bad.md` (concrete failing example),
`good.md` (correct equivalent).

## The core quality principle

Each file should do exactly one thing. A reader (human or agent) should be able to
describe the file's purpose in one sentence. If you need "and" — split the file.

A section should have a single coherent theme. If a section's _index.md lists files
that cover unrelated topics, the section boundaries are wrong.
