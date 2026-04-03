# ForgePlan Marketplace

Official plugin marketplace for [ForgePlan](https://github.com/ForgePlan) — Claude Code plugins for UX, frontend, and developer tools.

## Install marketplace

```bash
/plugin marketplace add ForgePlan/marketplace
```

## Available plugins

| Plugin | Description | Install |
|--------|-------------|---------|
| **laws-of-ux** | 30 Laws of UX applied to frontend code review | `/plugin install laws-of-ux@forgeplan-marketplace` |

## What you get with laws-of-ux

- `/ux-review` — full UX review of frontend code against 30 laws
- `/ux-law [name]` — look up any UX law with frontend implications
- **UX Reviewer Agent** — auto-activates for frontend tasks
- **Auto-hints** — gentle UX reminders when editing frontend files
- **Agentic RAG knowledge base** — 30 laws + 9 code pattern files

## Alternative: Install as Skill only

If you only want the knowledge base without commands/agents/hooks:

```bash
npx skills add ForgePlan/laws-of-ux-standalone -g
```

## License

MIT
