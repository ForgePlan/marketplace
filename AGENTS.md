# AGENTS.md — ForgePlan Marketplace

> **Cross-CLI primary context file.** Этот файл — root context для AI-агентов разных CLI: Claude Code (Anthropic), Gemini CLI (Google), OpenAI Codex CLI, Goose (Block) и любых других которые следуют [agents.md](https://agents.md) standard.
>
> Этот файл — **источник правды** для конвенций проекта. CLAUDE.md ссылается на этот файл для back-compat с Claude Code.

## Project overview

**Repo**: [ForgePlan/marketplace](https://github.com/ForgePlan/marketplace)
**Catalog version**: см. `.claude-plugin/marketplace.json`
**Plugins**: 12+ (workflow plugins + agent packs)
**Project board**: [orgs/ForgePlan/projects/5](https://github.com/orgs/ForgePlan/projects/5)

ForgePlan marketplace — каталог плагинов для AI coding agents с центральным `forgeplan` MCP server, обеспечивающим **artifact-driven SDLC pipeline**.

## Architecture canonical reference

Read these in order для понимания pipeline:

1. **PRD-024** (Full SDLC Pipeline with Quality Gates) — foundation
2. **PRD-025** (Multi-agent multi-CLI pipeline with Hindsight v2) — extensions
3. **RFC-002** (Canonical pipeline architecture)
4. **RFC-003** (Multi-agent multi-CLI architecture — 4 layers)
5. **ADR-005** (Keep `/forge-cycle` and `/autorun` as distinct orchestrators)
6. **NOTE-004** (Gas Town / Ruflo prior research)
7. **NOTE-005** (Multi-CLI ecosystem May 2026)

Все артефакты находятся в `.forgeplan/` (PRD/RFC/ADR/EVID/NOTE структура).

## Cross-CLI compatibility

Marketplace **CLI-agnostic** через MCP standard:

### MCP server registration

Любой CLI с MCP client может подключиться к forgeplan MCP server:

```jsonc
// Claude Code: .claude/settings.json
{ "mcpServers": { "forgeplan": { "command": "forgeplan", "args": ["serve"] } } }
```

```jsonc
// Gemini CLI: ~/.gemini/settings.json
{ "mcpServers": { "forgeplan": { "command": "forgeplan", "args": ["serve"] } } }
```

```toml
# Codex CLI: ~/.codex/config.toml
[mcp_servers.forgeplan]
command = "forgeplan"
args = ["serve"]
```

`forgeplan mcp-manifest` command (Batch F deliverable per RFC-003) генерирует все три config файла одним вызовом.

### Skills interop directory

Plugins публикуют skills в двух location:
- `plugins/<name>/skills/` — Claude Code path (existing)
- `plugins/<name>/.agents/skills/` — interop alias (agentskills.io standard) — symlinks к существующим skills

Любой CLI с agentskills.io support загружает skills из `.agents/skills/`.

### Agent identity

Каждый CLI выставляет environment variable для identity detection:
- Claude Code: `CLAUDECODE=1`
- Codex CLI: `CODEX_SANDBOX=*`
- Gemini CLI: `AGENT_CLIENT=gemini` (от ACP) или `GEMINI_CLI=1`

Identity format: `<cli_name>/<version>/<task_id>` записывается в claim/EVID/NOTE metadata.

## Git workflow

**CRITICAL: Только feature branches + PR. Прямой push в `main` и `dev` запрещён.**

```
feature-branch → push → PR → CI pass → merge
```

### Branches

| Branch | Назначение | Protection |
|---|---|---|
| `main` | Production | PR + 1 review + CI strict |
| `dev` | Integration | PR + CI |
| `feat/*`, `fix/*`, `chore/*`, `docs/*` | Working branches | None |

### Commit format

```
type(module): description

Refs: PRD-XXX, EVID-XXX

Co-Authored-By: Claude <noreply@anthropic.com>
```

Types: `feat`, `fix`, `docs`, `audit`, `chore`

## Forgeplan integration

Pipeline tools available via MCP (`mcp__forgeplan__*`):

- **Artifacts**: `new`, `update`, `link`, `validate`, `activate`, `supersede`, `deprecate`
- **Coordination**: `claim`, `release`, `claims`, `dispatch`
- **Quality**: `score`, `fgr`, `gaps`, `blindspots`, `coverage`, `drift`
- **AI-powered**: `reason` (FPF ADI), `decompose` (PRD→RFC), `generate`, `calibrate`, `estimate`
- **State**: `session`, `phase`, `phase_advance`, `journal`
- **Discovery**: `search`, `list`, `get`, `graph`

54 tools total. Per pipeline phase mapping — см. RFC-003 Layer 2 (Agent Pack Dispatch Matrix).

## Three orchestrator entrypoints

1. **`/forge-cycle <task>`** — reactive methodology enforcer. Per-task invocation, full pipeline до завершения, halts на conflicts.
2. **`/autorun <task>`** — autonomous long-running. Upfront briefing → multi-hour run → FPF for conflict resolution → NOTE artifacts as audit trail.
3. **`forgeplan playbook run <name>`** — declarative customization. YAML playbook (SPEC-003) для per-domain workflows.

Все три — full pipeline (Phase 1 → 10); **entry phase determined by smart resume** из artifact graph state.

## Validation

Перед PR всегда:

```bash
./scripts/validate-all-plugins.sh          # All plugins
./scripts/validate-all-plugins.sh plugin-name  # One plugin
```

## CI

**Workflow**: `.github/workflows/validate-plugins.yml`
**Job name**: `validate`
**Triggers**: push to `main`/`dev`, PR to `main`/`dev`

Checks: marketplace.json valid JSON, plugin.json required fields, v2 optional fields, command collisions, marketplace completeness, hooks.json valid JSON, SKILL.md YAML frontmatter.

## Security

- **Secret scanning**: enabled
- **Push protection**: enabled
- **Dependabot**: enabled

## Standalone agents

### Discover Agent (`agents/discover/`)

Brownfield codebase onboarding — protocol v3.2.0. Standalone agent (не плагин). Станет плагином после добавления MCP tools в ForgePlan CLI.

## Quick reference

```bash
# Workflow
git checkout -b feat/my-feature
git push -u origin feat/my-feature
gh pr create
gh pr merge --merge --admin

# Pipeline
/forge-cycle "task description"          # Reactive methodology enforcer
/autorun "long-scope task"                # Autonomous long run
forgeplan playbook run feature-dev-standard --yes "task"  # Declarative

# Forgeplan
forgeplan health                          # Project overview
forgeplan list --status active            # Active artifacts
forgeplan get PRD-025                     # Read artifact
forgeplan session                         # Current pipeline phase

# Validation
./scripts/validate-all-plugins.sh

# Cross-CLI setup (когда `forgeplan mcp-manifest` зарелижен)
forgeplan mcp-manifest --output-dir ~/    # Generates configs for 3 CLI
```

## Conventions

- **PascalCase** для ForgePlan ecosystem directories (e.g. `~/Work/ForgePlanMarketplace`)
- **English** in code/config files, **Russian** в comments и user-facing docs (per project convention)
- **Markdown** для все docs, YAML для playbooks/configs
- **Artifact IDs** PRD-NNN / RFC-NNN / ADR-NNN / EVID-NNN / NOTE-NNN — uppercase, zero-padded

---

> **For Claude Code users**: `CLAUDE.md` в этом же каталоге — Claude-specific overlay поверх этого файла. Содержит conventions specific к Claude Code (hooks settings.json formats, skill directory structure, etc.). При расхождениях с этим файлом — `AGENTS.md` источник правды для cross-CLI concerns, `CLAUDE.md` — для Claude Code specifics.
>
> **For Gemini CLI users**: можете создать `GEMINI.md` как symlink к этому файлу для Gemini-specific overlay.
>
> **For Codex CLI users**: этот файл будет прочитан native через `codex-rs/core/src/agents_md.rs`. Hierarchical scope (`child_agents_md`) поддерживается.
