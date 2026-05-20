# agentic-rag

Methodology skill for building large Claude Code knowledge bases using the agentic RAG
pattern: SKILL.md as a thin router, `sections/_index.md` as table-of-contents, and
30-50 line content files as the actual knowledge.

## Install

```
/plugin install agentic-rag@ForgePlan-marketplace
```

## What's included

One skill with 6 sections:

| Section | What it teaches |
|---------|----------------|
| `when-to-use` | Decision tree: flat skill vs agentic RAG |
| `structure` | Router pattern, _index.md format, file budget |
| `description-craft` | Triggers, EN/RU bilingual, frontmatter rules |
| `content-quality` | 5 anti-patterns with bad/good examples |
| `templates` | Copy-pasteable starter-kit |
| `distribution` | Plugin vs standalone, CI sync pattern |

## Live examples referenced

- `plugins/fpf/skills/fpf-knowledge/` — 224 sections, large-scale RAG
- `plugins/laws-of-ux/skills/ux-laws/` — 30 laws, medium-scale RAG

## When to use

When building a skill with > 300 lines, > 5 topics, or users request one of many
sub-topics at a time.

## License

MIT — ForgePlan
