# ForgePlan Marketplace

Official plugin marketplace for [ForgePlan](https://github.com/ForgePlan) — Claude Code plugins for UX, frontend, and developer tools.

## Quick Start

```bash
/plugin marketplace add ForgePlan/marketplace
```

Then browse and install plugins:

```bash
/plugin
```

Or install a specific plugin:

```bash
/plugin install laws-of-ux@forgeplan-marketplace
```

## Available Plugins

| Plugin | Version | Description |
|--------|---------|-------------|
| **[laws-of-ux](plugins/laws-of-ux/)** | 1.0.0 | 30 Laws of UX applied to frontend code review |

### laws-of-ux

Review frontend code against 30 Laws of UX with actionable recommendations.

| Feature | What it does |
|---------|--------------|
| `/ux-review` | Full UX review of all frontend files |
| `/ux-law [name]` | Look up any UX law |
| UX Reviewer Agent | Auto-activates for frontend tasks |
| Auto-hints | UX reminders when editing frontend files |
| Knowledge Base | 30 laws + 9 code pattern files (agentic RAG) |

```bash
/plugin install laws-of-ux@forgeplan-marketplace
```

## Alternative: Install as Skill (knowledge base only)

```bash
npx skills add ForgePlan/laws-of-ux-standalone -g
```

## For Contributors

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add or update plugins.

```bash
# Validate a plugin before submitting
./scripts/validate-all-plugins.sh your-plugin-name
```

## Update marketplace

Users get the latest plugins with:

```bash
/plugin marketplace update forgeplan-marketplace
```

## License

MIT
