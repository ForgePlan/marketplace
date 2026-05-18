[English](README.md) | [Русский](README-RU.md)

# fpl-hsmem

> Long-term, cross-session memory for Claude Code. Wraps [Hindsight](https://github.com/vectorize-io/hindsight) with 13 MCP tools, 3 auto hooks, and 5 helper skills — Claude remembers context across sessions, projects, and weeks.

Install once, every project gets a private memory bank. Auto-recall injects relevant history before every prompt; auto-retain captures the conversation after every response. Manual MCP tools cover synthesis (`memory_reflect`), living knowledge pages (`mental_model_*`), and document ingestion.

> [!WARNING]
> Requires a running [Hindsight](https://github.com/vectorize-io/hindsight) server. Easiest path — Docker with `claude-code` provider (no external LLM keys needed, uses your Claude subscription for fact extraction). See [Quick Start](#quick-start).

## Quick Start

```bash
# 1. Run Hindsight in Docker (no API keys needed)
docker run -d --name hindsight -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_PROVIDER=claude-code \
  ghcr.io/vectorize-io/hindsight:latest

# 2. Install the plugin
/plugin install fpl-hsmem@ForgePlan-marketplace

# 3. Verify in any project
/fpl-hsmem:status
```

For a fresh setup from zero — Docker, plugin install, first bootstrap, first mental model — see [`GETTING-STARTED.md`](./GETTING-STARTED.md).

## Usage Examples

### Auto-recall in conversation

```
> What did we decide about authentication last week?

[hidden context injected by recall.js hook]
  - JWT RS256 over symmetric HS256 — security review NOTE-003
  - Refresh token rotation every 7d (Orchestra ADR-012)
  - Service-to-service auth via mTLS, not JWT

We landed on JWT RS256 with 7-day refresh token rotation, recorded in
ADR-012. Service-to-service traffic stays on mTLS — JWT only for
end-user sessions.
```

The user never sees the `<hindsight_memories>` block — but Claude does, and answers with full context.

### `/fpl-hsmem:bootstrap` — wire memory to a new project

```
> /fpl-hsmem:bootstrap

Bootstrap plan for "my-project" bank:
  • set mission         "TypeScript API for billing — focus on technical
                         decisions, data model changes, deprecations."
  • ingest 4 documents  forge/prds/PRD-001-billing.md
                        forge/rfcs/RFC-002-stripe.md
                        forge/adrs/ADR-003-currency.md
                        docs/architecture.md
  • create 2 pages      "decisions-log" — synthesizes architectural decisions
                        "tech-debt" — open items we've flagged but not fixed

Proceed? [y/n]
```

One-shot setup for a new bank — mission, existing artifacts, starter mental models.

### `/fpl-hsmem:mental-model` — guided knowledge page creation

```
> /fpl-hsmem:mental-model

Existing pages in bank "my-project":
  decisions-log    | "What architectural decisions and why?"
  tech-debt        | "What tech debt have we flagged?"

Proposed new page:
  id:           billing-edge-cases
  source_query: "What unusual billing edge cases have we discussed —
                 partial refunds, currency mismatches, dispute flows?"

Living page — Hindsight auto-rebuilds the content after every
consolidation. Content appears after a few retain cycles.

Create? [y/n]
```

Validates the source query, prevents duplicates, explains the lifecycle.

## What's Included

### 13 MCP tools

| Group | Tools |
|-------|-------|
| **Core memory** | `memory_retain`, `memory_recall`, `memory_reflect`, `memory_status`, `memory_get_current_bank`, `memory_set_mission` |
| **Mental models** (auto-refreshing pages) | `mental_model_list`, `mental_model_get`, `mental_model_create`, `mental_model_update`, `mental_model_delete` |
| **Documents** | `document_ingest`, `document_ingest_file` |

### 3 auto hooks

| Hook | Trigger | Behavior |
|------|---------|----------|
| `recall.mjs` | UserPromptSubmit | Semantic recall before every prompt; results injected as `additionalContext`. Optional multi-turn query composition. |
| `retain.mjs` | Stop | Saves transcript after every response. Throttling via `retainEveryNTurns` (default 10). **Compaction detection** — preserves prior long document when Claude Code compacts a session. |
| `session-end.mjs` | SessionEnd | Force-retain on close. Safety net for short sessions (< `retainEveryNTurns`). |

### 5 skills

| Skill | Purpose |
|-------|---------|
| `/fpl-hsmem:status` | Quick health check + bank statistics + active mental models. |
| `/fpl-hsmem:bootstrap` | One-shot setup for a new bank — mission, ingest existing artifacts, create starter mental models. |
| `/fpl-hsmem:mental-model` | Guided mental-model creation with source-query validation. |
| `/fpl-hsmem:diagnose` | 6-step diagnostic (server, bank, content, hooks, config, opt-out). |
| `/fpl-hsmem:export-bank` | Markdown snapshot of a bank for backup or audit. |

### 3 activation modes

| Mode | How | Hooks? | Skills? | Best for |
|------|-----|--------|---------|----------|
| **Plugin install** | `/plugin install fpl-hsmem` | ✅ auto | ✅ auto | Default-on across all projects |
| **Setup CLI** | `node dist/setup.mjs` per project | ✅ created by CLI | ❌ | Explicit per-project control, committed `.mcp.json` |
| **Direct MCP** | Hand-wire `dist/index.mjs` in `.mcp.json` | ❌ | ❌ | One-off use, MCP tools without background machinery |

All three coexist — project-level `.mcp.json` wins over plugin-level config. **Opt-out** in any project: `touch .hindsight-disabled` or `HINDSIGHT_DISABLED=true`. See [`CONFIGURATION.md`](./CONFIGURATION.md) for details.

## Companion plugins

| Plugin | When to add |
|---|---|
| [`fpl-skills`](../fpl-skills/) | Workflow skills — `/restore`, `/briefing`, `/research`. fpl-hsmem auto-recall **complements** `/restore` for cross-session context. |
| [`forgeplan-orchestra`](../forgeplan-orchestra/) | Multi-session coordination — `/sync` artifacts to memory via `document_ingest_file`. |
| [`forgeplan-workflow`](../forgeplan-workflow/) | `/forge-cycle` Step 0 calls `mental_model_get` to seed engineering loops with synthesized context. |

## Documentation

- [`GETTING-STARTED.md`](./GETTING-STARTED.md) — 10-minute walkthrough from zero
- [`USAGE.md`](./USAGE.md) — real use cases + integration with `fpl-skills` and forgeplan artifacts
- [`CONFIGURATION.md`](./CONFIGURATION.md) — full env-var reference, 3-mode setup recipes
- [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) — diagnostic recipes for common issues
- [`CHANGELOG.md`](./CHANGELOG.md) — version history

## Credits

Built on top of [Hindsight](https://github.com/vectorize-io/hindsight) by vectorize-io. Implements the [Ruflo](https://ruflo.com/) outcome-feedback pattern (NOTE-004). Plugin scaffolding follows the [`fpl-skills`](../fpl-skills/) flagship conventions.

## License

MIT
