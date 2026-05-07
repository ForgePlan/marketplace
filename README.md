[English](README.md) | [Русский](README-RU.md)

<p align="center">
  <img src="assets/cover-slim.png" alt="ForgePlan — From Raw Idea To Proven Decision" width="100%" />
</p>

# ForgePlan Marketplace

Official plugin marketplace for Claude Code from [ForgePlan](https://github.com/ForgePlan) — UX, workflow, engineering, and developer tools.

**12 plugins** | **60+ agents** | **16 skills** | **5 knowledge bases**

> **ForgePlan ecosystem**: this marketplace + [`forgeplan` CLI](https://github.com/ForgePlan/forgeplan) (artifact lifecycle) + [`@forgeplan/web`](https://github.com/ForgePlan/forgeplan-web) (browser viewer with time-travel + graph). Three siblings; install what you need.

## 📚 Documentation

| Guide | When to read |
|---|---|
| 🚀 [Developer Journey](docs/DEVELOPER-JOURNEY.md) | **Start here** — 30-min walkthrough from zero to your first shipped feature, with 4 persona Day 0 walkthroughs |
| 📋 [Playbook](docs/PLAYBOOK.md) | Use-case matrix: which command for which scenario (empty project, brownfield, night-run, …) |
| 📖 [Usage Guide](docs/USAGE-GUIDE.md) | Reference manual: 18 commands, hooks, agent activation rules, troubleshooting |
| 🏛 [Architecture](docs/ARCHITECTURE.md) | 4-layer mental model — Orchestra (where) · Forgeplan (what) · FPF (how to think) · SPARC (how to code) |
| 🔬 [Methodologies](docs/METHODOLOGIES.md) | What's built into forgeplan (BMAD, OpenSpec, ADI, F-G-R, DDR, Verification Gate) vs what's external |
| 🔁 [Autoresearch integration](docs/AUTORESEARCH-INTEGRATION.md) | Combining `uditgoenka/autoresearch` (metric-driven loops) with `/forge-cycle` lifecycle |
| 🚚 [Migration: dev-toolkit → fpl-skills](docs/MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS.md) | Switching plugins safely (side-by-side or clean-cut, with rollback plan) |
| 🗂 [Tracker Integration](docs/TRACKER-INTEGRATION.md) | Recipes for Orchestra · GitHub Issues · Linear · Jira · local TODO |
| 🌐 [Forgeplan Web](docs/FORGEPLAN-WEB.md) | Browser viewer — time-travel slider + artifact graph + health dashboard |
| 📜 [Changelog](CHANGELOG.md) | Release history |
| 🤝 [Contributing](CONTRIBUTING.md) | Add a new plugin to the marketplace |

## Quick Start

```bash
# 1. Add the ForgePlan marketplace
/plugin marketplace add ForgePlan/marketplace

# 2. Install your first plugin (works with any project, no dependencies)
/plugin install dev-toolkit@ForgePlan-marketplace

# 3. Reload to activate
/reload-plugins

# 4. Try it — run a code audit
/audit
```

## Where to Start?

> **New here?** Pick the row that matches you. Each row is a complete setup — no need to read the full catalog.

| Your role | Install these | Why |
|-----------|--------------|-----|
| **Forgeplan user (recommended)** | **fpl-skills** | One install, 15 skills, full route → ship loop |
| Any developer (no forgeplan) | dev-toolkit + agents-core | Universal tools, no CLI dependency |
| Frontend | fpl-skills + laws-of-ux + agents-domain | UX + framework agents |
| Architect | fpl-skills + fpf + agents-pro + agents-sparc | Thinking + SPARC |
| Multi-session / team | fpl-skills + forgeplan-orchestra | Coordination + Inbox Pattern |
| Brownfield migration | fpl-skills + forgeplan-brownfield-pack | Ingest legacy docs + C4/DDD/research analyses |
| Everything | All 12 plugins | Complete ecosystem |

## Available Plugins

### [fpl-skills](plugins/fpl-skills/)

> [!TIP]
> **Flagship — recommended for forgeplan users.** Bundles 15 engineering skills built on top of forgeplan's artifact lifecycle. Replaces `dev-toolkit` (now soft-deprecated).

Full **route → shape → build → audit → activate** loop in one install. Includes `/fpl-init` for one-command project bootstrap.

| Component | What you get |
|-----------|-------------|
| `/fpl-init` | One-shot project bootstrap: forgeplan init, MCP wiring, CLAUDE.md, docs/agents/ |
| `/research`, `/refine`, `/rfc` | Discovery → planning → formalisation |
| `/sprint`, `/do`, `/autorun`, `/build`, `/team` | Execution (interactive, autopilot, multi-agent) |
| `/audit`, `/diagnose` | Multi-expert review + 6-phase debug loop |
| `/restore`, `/briefing`, `/setup`, `/bootstrap` | Session and project helpers |
| **SessionStart hook** | Context-aware next-step hint (status, /fpl-init prompt for new repos) |

> [!WARNING]
> Requires the [`forgeplan`](https://github.com/ForgePlan/forgeplan) CLI on `$PATH`.

```bash
/plugin install fpl-skills@ForgePlan-marketplace
```

---

### [dev-toolkit](plugins/dev-toolkit/) — deprecated

> [!CAUTION]
> **Superseded by [`fpl-skills`](plugins/fpl-skills/).** New installs should use `fpl-skills`. Existing dev-toolkit installs keep working — soft-sunset until catalog v2.0.

Universal engineering toolkit — audit, sprint planning, and session context restore. No CLI dependency.

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
/plugin install dev-toolkit@ForgePlan-marketplace
```

---

### [laws-of-ux](plugins/laws-of-ux/)

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
/plugin install laws-of-ux@ForgePlan-marketplace
```

---

### [fpf](plugins/fpf/)

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
/plugin install fpf@ForgePlan-marketplace
```

---

### [forgeplan-workflow](plugins/forgeplan-workflow/)

> Structured engineering workflow for [forgeplan](https://github.com/ForgePlan/forgeplan) users.

Full dev cycle automation: route tasks, create PRDs, build, audit, create evidence, activate — all in one flow.

| Component | What you get |
|-----------|-------------|
| `/forge-cycle` | Complete cycle: health → route → shape → build → evidence → activate |
| `/forge-audit` | Multi-expert review (6 parallel agents) with structured report |
| **Forge Advisor** agent | Suggests routing before coding, evidence after implementation |
| **Quality hooks** | Safety hook + PRD check before code edits |
| **Methodology KB** | Agentic RAG: workflow, artifacts, depth, R_eff scoring, quality gates |

> [!WARNING]
> Requires `forgeplan` CLI — private application, access through project admin.

```bash
/plugin install forgeplan-workflow@ForgePlan-marketplace
```

---

### [forgeplan-orchestra](plugins/forgeplan-orchestra/)

> Unified workflow: Forgeplan artifacts + [Orchestra](https://orch.so) task tracking + Claude Code AI execution.

Bidirectional sync, Session Start Protocol with Inbox Pattern, and methodology knowledge base.

| Component | What you get |
|-----------|-------------|
| `/sync` | Bidirectional sync: Forgeplan artifacts ↔ Orchestra tasks |
| `/session` | Session Start Protocol: health + inbox + tasks + synthesis + next action |
| **Orchestra Advisor** agent | Suggests sync on artifact create/activate |
| **Unified Workflow KB** | Agentic RAG: architecture, setup, playbook, configs (Solo/Team/Medium) |

> [!WARNING]
> Requires `forgeplan` CLI + Orchestra MCP server (`orch`).

```bash
/plugin install forgeplan-orchestra@ForgePlan-marketplace
```

---

### [forgeplan-brownfield-pack](plugins/forgeplan-brownfield-pack/)

> Brownfield migration pack — ingest legacy docs and agent analyses into a structured forgeplan graph.

Implements the **orchestrator model** ([ADR-009](https://github.com/ForgePlan/forgeplan/blob/dev/.forgeplan/adrs/ADR-009-forgeplan-as-orchestrator-playbook-skill-agent-mapping-pack-marketplace-model.md)): forgeplan does not re-implement extraction. Instead, this pack composes existing marketplace plugins (`c4-architecture`, `autoresearch`, `ddd-expert`, `feature-dev`) with forgeplan's ingest engine via mapping YAMLs and playbook recipes.

| Component | What you get |
|-----------|-------------|
| `mappings/c4-to-forge.yaml` | Maps C4 context markdown to forge artifacts (Epic, PRD, ADR, Evidence) |
| `playbooks/` | (scaffolded) Recipes for brownfield discovery + migration — requires forgeplan runtime v0.25+ |
| `skills/` | (scaffolded) Extraction-specific guidance — forge-classify, madr-detection |
| `agents/` | (scaffolded) Brownfield-specific sub-agents |

> [!WARNING]
> **Alpha.** Mapping layer (c4-to-forge) validated at CL3 on Forgeplan repo (2026-04-20). Playbook runtime in active development (Forgeplan EPIC-007 / PRD-065). Requires `forgeplan` CLI v0.25+.

```bash
/plugin install forgeplan-brownfield-pack@ForgePlan-marketplace
```

---

## Agent Packs

Five specialized agent packs providing 55 ready-to-use agents for Claude Code.

Install any pack: `/plugin install <pack-name>@ForgePlan-marketplace`

| Pack | Agents | Focus | Install |
|------|:------:|-------|---------|
| [agents-core](plugins/agents-core/) | 11 | debugger, code-reviewer, planner, tester, TDD, production-validator | `agents-core` |
| [agents-domain](plugins/agents-domain/) | 11 | TypeScript, Go, React, Next.js, Electron, mobile, WebSocket | `agents-domain` |
| [agents-pro](plugins/agents-pro/) | 21 | security, architecture, creative, research, infrastructure | `agents-pro` |
| [agents-github](plugins/agents-github/) | 7 | PR management, issues, releases, multi-repo, workflows | `agents-github` |
| [agents-sparc](plugins/agents-sparc/) | 5 | SPARC methodology: spec → pseudo → architecture → refinement | `agents-sparc` |

---

## Standalone Agents

### [discover](agents/discover/)

> Brownfield codebase onboarding — structured analysis of existing projects with multi-pass discovery and tiered source priority. Code first, docs last.

Three modes for any project size:

| Mode | For | What happens |
|------|-----|-------------|
| `default` | <100K LOC | Single agent, 4 layers sequentially (~15-30 min) |
| `--deep` | 100K-2M LOC | Team of agents, parallel modules + deepening (~1-2 hours) |
| `--full` | 2M+ LOC | Deep + synthesis: gap analysis, impact mapping (~2-4 hours) |

**3 passes**: Discovery (layers 1-4) → Deepening (per artifact) → Synthesis (cross-reference)
**3 source tiers**: Code (T1, highest trust) > Tests (T2) > Docs (T3, lowest)

See [agents/discover/README.md](agents/discover/README.md) for full documentation.

---

## How It Works

Each plugin uses **agentic RAG** — the agent navigates a section hierarchy, loading only relevant content into context (~300 lines at a time) instead of dumping the entire knowledge base. This keeps responses fast and focused.

```
SKILL.md (router)
  → sections/01-heuristics/_index.md → specific-law.md
  → sections/02-cognitive/_index.md  → specific-law.md
  → sections/05-code-patterns/       → concrete CSS/HTML/JS rules
```

## Alternative: Skill Only (via skills.sh)

If you only want the knowledge base without commands, agents, or hooks:

```bash
# Laws of UX:
npx skills add ForgePlan/loux -g

# First Principles Framework:
npx skills add ForgePlan/fpf -g
```

These standalone repos are **auto-mirrored** from the marketplace — same content, shorter install command. Issues and PRs go to this marketplace repo.

> Legacy alias `ForgePlan/laws-of-ux-standalone` still works but is deprecated in favour of `ForgePlan/loux`.

### Plugin vs Skill — what's included

| | Plugin (marketplace) | Skill (npx) |
|---|:---:|:---:|
| Knowledge base (laws / FPF spec) | Yes | Yes |
| Code pattern files | Yes | Yes |
| Slash commands (`/ux-review`, `/fpf`, ...) | Yes | No |
| Reviewer / advisor agents | Yes | No |
| Auto-hint hooks | Yes | No |

## Update

Get the latest plugins:

```bash
/plugin marketplace update forgeplan-marketplace
```

## Contributing

Want to add a plugin? See **[CONTRIBUTING.md](CONTRIBUTING.md)** for the plugin structure, CI/CD validation, and submission guide.

## License

MIT

---

Built by [ForgePlan](https://github.com/ForgePlan)
