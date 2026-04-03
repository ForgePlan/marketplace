[English](README.md) | [Русский](README-RU.md)

# forgeplan-workflow

A Claude Code plugin that provides structured engineering workflow automation for [forgeplan](https://github.com/forgeplan/forgeplan) users.

## Prerequisites

- Claude Code CLI installed
- **forgeplan CLI** — приватное приложение ForgePlan. Для получения доступа обратитесь к администратору проекта. После получения: поместите бинарник в PATH и выполните `forgeplan init -y` в проекте.

## Installation

```bash
claude plugin add /path/to/forgeplan-workflow
```

Or clone into your Claude Code plugins directory.

## Features

### Commands

- **`/forge-cycle`** — Run the full engineering cycle: health check, route, shape, build, evidence, activate, commit. Takes a task from idea to committed code with full traceability.

- **`/forge-audit`** — Multi-expert code audit. Launches parallel reviewers (logic, architecture, security, tests, performance, docs) and produces a structured findings report.

### Agent

- **forge-advisor** — Background advisor that suggests routing before coding, evidence after implementation, and periodic health checks. Non-blocking, all suggestions are optional.

### Hooks

- **Safety hook** — Blocks dangerous Bash commands (force push, hard reset, rm -rf /, DROP TABLE).
- **PRD check** — Warns when editing code without an active PRD (requires forgeplan).

### Knowledge Base

- **forgeplan-methodology** — Agentic RAG skill covering the full forgeplan methodology: workflow stages, artifact types (PRD/RFC/ADR/Evidence), depth calibration, R_eff scoring, quality gates, and cross-session memory.

## Workflow Overview

```
Route --> Shape --> Build --> Audit --> Evidence --> Activate
  |         |         |         |          |            |
  v         v         v         v          v            v
Depth    PRD/RFC   Code +    Review    Link to      Mark
Level    /ADR      Tests    findings   artifacts    complete
```

## License

MIT
