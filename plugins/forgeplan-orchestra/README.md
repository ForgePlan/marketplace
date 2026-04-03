# forgeplan-orchestra

Unified workflow plugin connecting **Forgeplan** artifacts, **Orchestra** task tracking, and **Claude Code** AI execution into a single coherent system.

## Prerequisites

- **Forgeplan CLI** installed and initialized (`forgeplan init`)
- **Orchestra MCP server** configured in Claude Code (`mcp__orch__*` tools available)
- Orchestra workspace with custom fields created (see setup guide)

## Install

```bash
claude plugin add forgeplan-orchestra
```

## Features

### Commands

- **/sync** -- Bidirectional sync between Forgeplan artifacts and Orchestra tasks. Shows diff, proposes actions, waits for confirmation. Never syncs automatically.
- **/session-start** -- Session Start Protocol with Inbox Pattern. Restores context from CLAUDE.md, Hindsight, Orchestra, Git, and Forgeplan health. Triages signals and recommends next action.

### Agent

- **orchestra-advisor** -- Background advisor that suggests Orchestra sync actions when Forgeplan commands are used. Non-blocking, optional suggestions.

### Skill: unified-workflow

Agentic RAG knowledge base covering:
- Architecture (3 bounded contexts, what lives where)
- Setup (greenfield and brownfield/migration)
- Custom fields reference (6 fields, Status-Phase mapping)
- Playbook (10 daily scenarios, prohibitions, Inbox Pattern)
- Configurations (solo, small team 2-5, medium team 5-15)

### Hook

Post-tool reminder after `forgeplan activate` or `forgeplan new` to consider syncing with Orchestra.

## Credits

- [Orchestra](https://www.orchestra.pm/) -- task tracking and team collaboration platform
- [Forgeplan](https://github.com/ForgePlan) -- artifact methodology and quality framework

## License

MIT
