[English](README.md) | [Русский](README-RU.md)

# ForgePlan Marketplace

Official plugin marketplace for Claude Code from [ForgePlan](https://github.com/ForgePlan) — UX, workflow, engineering, and developer tools.

**4 plugins** | **11 commands** | **4 agents** | **4 hooks** | **3 knowledge bases** | **318 files**

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

---

### forgeplan-workflow `v1.0.0`

> Structured engineering workflow for [forgeplan](https://github.com/ForgePlan/forgeplan) users.

Full dev cycle automation: route tasks, create PRDs, build, audit, create evidence, activate — all in one flow.

| Component | What you get |
|-----------|-------------|
| `/forge-cycle` | Complete cycle: health → route → shape → build → evidence → activate |
| `/forge-audit` | Multi-expert review (6 parallel agents) with structured report |
| **Forge Advisor** agent | Suggests routing before coding, evidence after implementation |
| **Quality hooks** | Safety hook + PRD check before code edits |
| **Methodology KB** | Agentic RAG: workflow, artifacts, depth, R_eff scoring, quality gates |

**Requires:** `forgeplan` CLI installed (`cargo install forgeplan` or download binary)

```bash
/plugin install forgeplan-workflow@forgeplan-marketplace
```

---

### dev-toolkit `v1.0.0`

> Universal engineering toolkit — works with **any project and language**. No dependencies.

| Component | What you get |
|-----------|-------------|
| `/audit` | Multi-expert code review (4 agents: logic, architecture, security, tests) |
| `/sprint` | Wave-based sprint planner: break tasks into phases, execute with parallel agents |
| `/recall` | Session context restore from git + CLAUDE.md + memory (Hindsight/mem0/forgeplan) |
| **Dev Advisor** agent | Suggests audit after changes, reminds about tests |
| **Safety hook** | Blocks `git push --force`, `rm -rf /`, `DROP TABLE` |
| **Test reminder** | Detects new public functions without tests |

**Supports:** JavaScript/TypeScript, Python, Rust, Go, Java, Ruby, PHP, C#

```bash
/plugin install dev-toolkit@forgeplan-marketplace
```

---

### fpf `v1.0.0`

> [First Principles Framework](https://github.com/ailev/FPF) — thinking amplifier for structured reasoning. By Anatoly Levenchuk, enhanced by ForgePlan.

One command `/fpf` routes to the right thinking mode — decompose, evaluate, reason, or lookup.

| Component | What you get |
|-----------|-------------|
| `/fpf` | Universal router: `/fpf decompose`, `/fpf evaluate`, `/fpf reason`, `/fpf lookup` |
| `/fpf-decompose` | Break systems into bounded contexts, roles, interfaces |
| `/fpf-evaluate` | Compare alternatives with F-G-R scoring and Trust Calculus |
| `/fpf-reason` | ADI reasoning cycle: 3+ hypotheses → test → conclude |
| **FPF Advisor** agent | Suggests FPF when architecture/decision tasks detected |
| **Knowledge base** | 224 FPF spec sections + 4 applied pattern guides (agentic RAG) |

```bash
/plugin install fpf@forgeplan-marketplace
```

---

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
