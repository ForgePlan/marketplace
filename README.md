# ForgePlan Marketplace

Official plugin marketplace for Claude Code from [ForgePlan](https://github.com/ForgePlan) — UX, frontend, and developer tools.

**1 plugin** | **30 UX laws** | **9 code pattern files** | **2 commands** | **1 agent** | **1 hook**

## Quick Start

```bash
# Add the ForgePlan marketplace
/plugin marketplace add ForgePlan/marketplace

# Browse available plugins
/plugin

# Install a specific plugin
/plugin install laws-of-ux@forgeplan-marketplace
```

## Available Plugins

### laws-of-ux `v1.0.0`

> 30 Laws of UX applied to frontend code review with actionable recommendations.

Review HTML/CSS/JS/React/Vue code against psychological principles from [lawsofux.com](https://lawsofux.com/) by Jon Yablonski.

| Component | What you get |
|-----------|-------------|
| `/ux-review` | Full UX audit of all frontend files |
| `/ux-law [name]` | Look up any of the 30 laws |
| **UX Reviewer** agent | Auto-activates for frontend tasks |
| **Auto-hints** hook | UX reminders when editing .html/.css/.jsx/.tsx/.vue |
| **Knowledge base** | 30 laws + 9 code pattern files (agentic RAG) |

**Categories covered:**

| Category | Laws | Examples |
|----------|:----:|---------|
| Heuristics | 4 | Fitts's Law (44px targets), Hick's Law (7 nav items max) |
| Cognitive | 10 | Miller's Law (7±2 chunks), Cognitive Load, Von Restorff |
| Gestalt | 6 | Proximity (spacing ratios), Similarity (consistent tokens) |
| Principles | 10 | Doherty Threshold (400ms), Jakob's Law, Postel's Law |

```bash
/plugin install laws-of-ux@forgeplan-marketplace
```

## How It Works

Each plugin uses **agentic RAG** — the agent navigates a section hierarchy, loading only relevant laws into context (~300 lines at a time) instead of dumping the entire knowledge base. This keeps responses fast and focused.

```
SKILL.md (router)
  → sections/01-heuristics/_index.md → specific-law.md
  → sections/02-cognitive/_index.md  → specific-law.md
  → sections/05-code-patterns/       → concrete CSS/HTML/JS rules
```

## Alternative: Skill Only (via skills.sh)

If you only want the knowledge base without commands, agents, or hooks:

```bash
npx skills add ForgePlan/laws-of-ux-standalone -g
```

| | Plugin (marketplace) | Skill (npx) |
|---|:---:|:---:|
| 30 UX laws knowledge base | Yes | Yes |
| 9 code pattern files | Yes | Yes |
| `/ux-review` command | Yes | No |
| `/ux-law` command | Yes | No |
| UX Reviewer agent | Yes | No |
| Auto-hint hooks | Yes | No |

## Update

Get the latest plugins:

```bash
/plugin marketplace update forgeplan-marketplace
```

## Contributing

Want to add a plugin? See **[CONTRIBUTING.md](CONTRIBUTING.md)** for the guide.

```bash
# Validate before submitting
./scripts/validate-all-plugins.sh your-plugin-name
```

**Quick checklist:**
1. Create `plugins/your-plugin/` with `.claude-plugin/plugin.json`
2. Add entry to `.claude-plugin/marketplace.json`
3. Run validation script
4. Submit PR

## Plugin Structure

```
plugins/your-plugin/
├── .claude-plugin/plugin.json    # Required: name, version, description
├── commands/                     # Optional: slash commands
├── agents/                       # Optional: specialized agents
├── skills/                       # Optional: knowledge bases (SKILL.md)
├── hooks/                        # Optional: automation hooks
└── README.md
```

## CI/CD

Every PR and push to `main` is automatically validated:
- `marketplace.json` syntax and completeness
- `plugin.json` required fields
- `hooks.json` validity
- `SKILL.md` frontmatter

## License

MIT

---

Built by [ForgePlan](https://github.com/ForgePlan)
