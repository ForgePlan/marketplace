# cc-best — Claude Code Ecosystem Best Practices

> Opinionated reference guide for the Claude Code ecosystem. Six topical sections (CLAUDE.md, plugins, agents, hooks, MCP, anti-patterns). Currently shipping section 1 of 6 (claude-md); the others are stubs queued for follow-up sprints.

## What this plugin gives you

When you install `cc-best`, the `cc-best` skill becomes available as an agentic-RAG knowledge base. The skill router maps user intent to the right section, then the section router loads the relevant file (≤300 lines per agentic-RAG canon).

Example queries the skill handles:

- "How should I structure my project CLAUDE.md?"
- "What is the difference between global and project CLAUDE.md?"
- "Show me real CLAUDE.md examples from production."
- "What anti-patterns should I avoid in CLAUDE.md?"

## Sections

| Section | Status | RFC | What's in it |
|---|---|---|---|
| **claude-md** | DONE | RFC-004 | File structure, hierarchy, patterns, anti-patterns, examples |
| plugins | STUB | RFC-005 | Manifest, components, distribution, versioning, common mistakes |
| agents | STUB | RFC-006 | Frontmatter canon, profiles, real production examples |
| hooks | STUB | RFC-007 | Types, ordering, BANNED patterns, examples |
| mcp | STUB | RFC-008 | When to use, propagation gotchas, debugging |
| antipatterns | STUB | RFC-009 | Synthesis of 30+ findings + standalone repo packaging |

## Install

```bash
# Via the ForgePlan marketplace:
/plugin marketplace add ForgePlan/marketplace
/plugin install cc-best@ForgePlan-marketplace
```

## Philosophy

Anthropic ships authoritative reference docs. This skill is **not** that. It is opinionated practitioner knowledge — patterns we keep on hand, mistakes we have made and do not want to repeat, real production examples from 15 plugins worth of marketplace work.

If the official docs say "you can do X", we say "do X like this — and avoid these three traps".

## How sections are organised

Each section is a folder with:

- `_index.md` — a router that maps intent to the right content file.
- 4-7 content files, each ≤300 lines, each self-contained.

The agent loads exactly one content file per turn — no big-bang context loads.

## Related plugins

- **agentic-rag** — the skill authoring methodology this plugin follows.
- **fp-cookbook** — recipes (different from reference; complementary).
- **forgeplan-workflow** — the orchestrator behind our anti-pattern observations.

## License

MIT. Use freely. Pull requests welcome.

## Refs

- PRD-015 — Parent product spec (Sprint Y decomposition).
- RFC-004 — claude-md section scope (this release).
- RFC-005..RFC-009 — the other 5 sections, future sprints.
