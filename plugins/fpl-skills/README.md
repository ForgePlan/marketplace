# fpl-skills

Flagship workflow plugin for the [ForgePlan](https://github.com/ForgePlan/forgeplan) ecosystem. 14 engineering skills designed to give you a complete, opinionated workflow on top of forgeplan's artifact lifecycle.

> This repository (CC-templates) is the **lab** where the plugin is authored.
> The published plugin lives in [`ForgePlan/marketplace/plugins/fpl-skills/`](https://github.com/ForgePlan/marketplace).
> Snapshot via `./scripts/build-fpl-skills.sh --apply`.

## Skills

| Skill | What it does |
|---|---|
| `/research` | Deep research with 5 parallel agents (code · docs · status · references · memory). |
| `/refine` | Interview-driven refinement of plans/RFCs — sharpens terminology, surfaces contradictions, lazy-creates CONTEXT.md/ADRs. |
| `/rfc` | Create / read / update RFCs and ADRs (canonical structure, phase progress, ADR format). |
| `/sprint` | Wave-based feature execution with strict file ownership and inter-wave dependencies. |
| `/audit` | Multi-expert code review with ≥4 specialised reviewers (logic, architecture/SOLID, types, security). |
| `/diagnose` | 6-phase disciplined debug loop. Phase 1 ("build a feedback loop") is the entire skill — the rest is mechanics. |
| `/autorun` | Autopilot orchestrator: one prompt → research → sprint → audit → report with no approval checkpoints. For overnight runs. |
| `/do` | Interactive task orchestrator — pauses for approval at each step. The non-overnight variant of `/autorun`. |
| `/build` | Execute an existing IMPLEMENTATION-PLAN.md from a research report (wave-by-wave). |
| `/restore` | Restore session context from git + working copy + (optional) persistent memory. |
| `/briefing` | Daily morning briefing of tasks/messages from your task tracker (Orchestra/Linear/Jira/GitHub) or local TODO files. |
| `/setup` | Interactive wizard that configures the current project for fpl-skills (writes `docs/agents/*.md`). |
| `/bootstrap` | Drops the universal CLAUDE.md template into a new or existing project (stack-aware). |
| `/team` | Foundation for multi-agent teams — TeamCreate vs sub-agents, file ownership, recipes, cleanup. |

`/fpl-init` (Phase 3) — one-command project bootstrap: probes forgeplan, runs `forgeplan init`, wires `.mcp.json`, runs `/bootstrap` + `/setup`, prints next steps.

## Install

Prerequisites: Claude Code, git, [forgeplan CLI](https://github.com/ForgePlan/forgeplan) on `$PATH`.

```bash
# In any Claude Code session:
/plugin marketplace add ForgePlan/marketplace
/plugin install fpl-skills@ForgePlan-marketplace
/reload-plugins
```

For full project bootstrap (a new project from zero), see [`GETTING-STARTED.md`](./GETTING-STARTED.md).

## Relationship to other ForgePlan plugins

- **forgeplan CLI** — required runtime dependency. fpl-skills delegates artifact lifecycle (PRD/RFC/ADR creation, R_eff scoring, validation, health) to forgeplan.
- **forgeplan-workflow** — companion plugin. Provides `/forge-cycle` and `/forge-audit` as a tighter forgeplan-only workflow. fpl-skills is broader (research, refine, diagnose, multi-tracker briefing, etc.).
- **forgeplan-orchestra** — companion. Multi-session coordination via `/sync` and `/session`. Use alongside fpl-skills when working across sessions/agents.
- **agents-core / agents-domain / agents-pro** — agent packs. fpl-skills' `/audit` and `/sprint` reference these `subagent_type`s when available; install if you want richer reviewer/teammate options.
- **fpf** — First Principles Framework. Pairs naturally with `/refine` and `/diagnose` Phase 3 (hypothesis generation).
- **laws-of-ux** — frontend reviewer. `/audit` will spawn `ux-reviewer` from this plugin if installed and the changeset is frontend-heavy.
- **dev-toolkit** — superseded by fpl-skills (overlapping `/audit` and `/sprint`). Don't install both.

## Repository layout

```
CC-templates/                      ← this repo (the lab)
├── .claude-plugin/plugin.json     ← plugin manifest
├── hooks/
│   ├── hooks.json                 ← SessionStart hook
│   └── scripts/session-start.sh
├── skills/                        ← 14 skills (canonical source)
├── guides/                        ← author's notes (NOT shipped in plugin)
├── scripts/
│   └── build-fpl-skills.sh        ← snapshot lab → marketplace
├── INDEX.md                       ← artifact index
├── README.md                      ← this file
└── CLAUDE.md                      ← project memory for Claude Code
```

## License

MIT
