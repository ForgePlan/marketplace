[English](README.md) | [Русский](README-RU.md)

# forgeplan-workflow

> From idea to production through structured artifacts. Route -> Shape -> Build -> Evidence -> Activate.

A Claude Code plugin that provides structured engineering workflow automation for [forgeplan](https://github.com/ForgePlan/forgeplan) users.

> **Note:** Requires **forgeplan CLI** -- private ForgePlan application, access through project admin. After receiving the binary: place it in PATH and run `forgeplan init -y` in your project.
>
> **Tip:** Works great with the global `/forge` skill for quick methodology reference. This plugin adds automation (commands, hooks, agent) on top of it.

## Quick Start

```bash
/plugin install forgeplan-workflow@ForgePlan-marketplace
```

## Usage

### `/forge-cycle` -- Full Engineering Cycle

```
> /forge-cycle

Step 1: Health check
  Active: 5, Draft: 12, Blind spots: 1 (RFC-003 no evidence)
  -> Fix blind spot first? [skip/fix]

Step 2: Task
  > "Add PDF export for artifacts"

Step 3: Route
  forgeplan route -> Depth: Standard, Pipeline: PRD -> RFC

Step 4: Shape
  forgeplan new prd "PDF Export" -> PRD-025
  Filling: Problem, Goals, FR...
  forgeplan validate PRD-025 -> PASS

Step 5: Build
  Implementing FR-001..FR-003...
  Tests: 12 new, all passing

Step 6: Evidence
  forgeplan new evidence "12 tests, audit clean" -> EVID-008
  forgeplan link EVID-008 PRD-025
  R_eff: 0.00 -> 1.00

Step 7: Activate
  forgeplan activate PRD-025 -> active

Step 8: Commit
  feat(export): add PDF export for artifacts
  Refs: PRD-025, FR-001..003
```

## What's Included

| Type | Name | Description |
|------|------|-------------|
| Command | `/forge-cycle` | Full engineering cycle: health check, route, shape, build, evidence, activate, commit |
| Command | `/forge-audit` | Multi-expert code audit: logic, architecture, security, tests, performance, docs |
| Agent | `forge-advisor` | Background advisor: suggests routing, evidence, and health checks (non-blocking) |
| Hook | Safety hook | Blocks dangerous Bash commands (force push, hard reset, rm -rf /, DROP TABLE) |
| Hook | PRD check | Warns when editing code without an active PRD |
| KB | `forgeplan-methodology` | Agentic RAG skill covering the full forgeplan methodology |

## Methodology KB Sections

| Section | Content |
|---------|---------|
| Workflow | Route -> Shape -> Build -> Evidence -> Activate pipeline |
| Artifacts | PRD, RFC, ADR, Evidence -- types and templates |
| Depth | Tactical / Standard / Deep / Critical calibration |
| R_eff | Evidence scoring and quality gates |
| Memory | Cross-session memory via CLAUDE.md and Hindsight |

### Hint Contract (v1.5.0+, requires Forgeplan v0.25.0+)

Forgeplan v0.25.0 introduced the **5-rule hint contract** — every CLI/MCP output emits one of:
- `Next: <command>` — primary action
- `Or: <command>` — fallback
- `Wait: <condition>` — async retry
- `Done.` — terminal
- `Fix: <command>` — error remediation

This plugin now teaches agents to read these markers automatically. Coverage in Forgeplan v0.25.0 binary: **100%** (70/70 CLI commands). See methodology skill section `06-output-hints/agent-protocol.md` for the full reading protocol.

## License

MIT
