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

## Smith — master orchestrator

**Smith** is the master orchestrator of the ForgePlan ecosystem — the canonical first point of contact when an agent (or a human via an agent) does not yet know which methodology, dispatch chain, or pipeline depth applies to the work in front of them. Smith inspects repository state and user intent, applies a **12-context routing matrix** (greenfield, brownfield, feature, bug, refactor, architecture decision, security audit, performance audit, product discovery, tech-debt cleanup, live incident, hotfix), and recommends a specialist-agent dispatch sequence plus evidence requirements per the 4-layer S10–S13 pipeline. Smith is the ForgePlan ecosystem's equivalent of BMAD's «Master» persona — a Profile B-orchestrator agent that **never writes code or activates artifacts**; it routes and recommends. Smith lives in `plugins/agents-pro/agents/smith.md` (the agent) plus `plugins/fpl-skills/skills/smith/` (the 12-context brain) and is reachable from any CLI that honours AGENTS.md.

### When to invoke smith

- At **session start** when unsure what to do next — smith reads `forgeplan_health` + recent journal and proposes the next action.
- For a **fresh repository** with no artifacts yet — invoke `/smith-bootstrap` to seed Brief / PRD / first ADR via the greenfield row of the routing map.
- For a **specific task** of any depth — invoke `/smith-plan <task description>` and smith picks the matching row, names the methodology, and lists the dispatch sequence.
- For **learning the methodology surface** — invoke `/smith-routing` to inspect the 12 contexts + 25 methodology cards without committing to a task.
- When the existing entry points (`/forge-cycle`, `/autorun`) do not fit — e.g. cross-context work, ambiguous depth, methodology mismatch — smith disambiguates first.
- **Trigger phrases** (EN / RU): `smith`, `кузнец`, `что дальше`, `what's next`, `scrum master`, `master orchestrator`, `which methodology`, `какую методологию`.

### The 12 contexts smith routes

Full table with primary methodology + dispatch sequence + evidence requirements lives in `plugins/fpl-skills/skills/smith/routing-map.md`. Compact summary:

| # | Context | One-liner |
|---|---|---|
| 1 | Greenfield | Fresh project bootstrap — BMAD-METHOD + Spec Kit |
| 2 | Brownfield | Legacy modernisation — Strangler Fig + DDD + ACL |
| 3 | New feature | Add capability to existing service — SPARC + Hexagonal |
| 4 | Production bug (non-trivial) | Disciplined RCA — RIPER-5 + 5 Whys |
| 5 | Trivial hotfix | Tactical fast-path — typo, off-by-one, broken link |
| 6 | Refactoring | Safe restructure — Branch-by-Abstraction + Mikado |
| 7 | Architecture decision | Irreversible choice — FPF ADI + ADR/MADR + C4 |
| 8 | Security audit | Threat coverage — OWASP Top 10 2025 + STRIDE/ASTRIDE |
| 9 | Performance audit | Falsifiable baseline — DORA + SRE + perf-budget |
| 10 | Product discovery (PDLC) | What to build — JTBD + Lean + Double Diamond |
| 11 | Tech debt cleanup | Pay-down sprint — A3 + Fishbone + ADR-supersede |
| 12 | Live incident response | Outage handling — Incident Command + blameless post-mortem |

Smith **picks exactly one row** per task — methodology cocktails are forbidden. If the situation sits between two rows, smith emits the `<<NEED_USER_INPUT>>` sentinel with ≥3 hypotheses on which row to pick (FPF ADI discipline per Sprint Z7/PRD-059). Only in autonomous-mode incidents where the ambiguity blocks a live response does smith pick the higher-risk row (brownfield > greenfield, audit > feature) and record the deviation in its Plan output. The single-row rule prevents the common failure mode where teams blend BMAD + SPARC + Spec Kit «to cover all bases» and end up with artefacts that match no community pattern — none of the three communities recognise the output as their canonical shape.

### How smith works internally

1. **Intake** — read user intent (free-form text from `/smith-plan` or session start), call `forgeplan_health` + `forgeplan_session` for current state, infer context tags (greenfield vs brownfield, depth, urgency).
2. **Route** — match intake against the 12 rows in `routing-map.md`; on ambiguity, dispatch FPF ADI (`forgeplan_reason`) to surface ≥3 candidate rows + recommend one.
3. **Recommend** — emit a structured plan: chosen row, primary + secondary methodology, dispatch sequence (named agents, in order), evidence requirements per S10–S13 layer.
4. **Hand off** — the orchestrator (Claude Code session, `/forge-cycle`, `/autorun`, or a human) executes the plan; smith does **not** dispatch agents itself unless explicitly asked, because Profile B-orchestrator's role is to recommend, not to mutate state.

Example output shape (abbreviated):

```text
Row chosen: 3 — New feature in existing service
Primary methodology: SPARC (Specification → Pseudocode → Architecture → Refinement → Completion)
Secondary: Hexagonal Architecture + JTBD framing
Dispatch sequence:
  1. brief-intake (Profile A) → Brief NOTE
  2. specification (Profile A) → PRD
  3. architecture (Profile A) → RFC
  4. goal-planner (Profile A) → task DAG
  5. coder (Profile C-coder) → source files
  6. code-reviewer (Profile B) → EVID with ≥1 finding
  7. tester (Profile B) → tester EVID
  8. guardian (Profile B-gate) → activation verdict
Evidence required: PRD + ADI EVID (≥3 hypotheses) + BMAD EVID with ≥1 finding + tester EVID
```

### Methodologies smith knows

Twenty-five methodologies are catalogued in `routing-map.md` with cards covering one-sentence definition, when it shines, when NOT to use, and a primary source link. Grouped:

- **AI-coding workflows**: BMAD-METHOD, SPARC, RIPER-5, GitHub Spec Kit, FPF ADI (Abduction → Deduction → Induction).
- **Architecture lenses**: C4 Model, Domain-Driven Design, Event Storming, Clean Architecture, Hexagonal Architecture (Ports & Adapters), ADR / MADR.
- **Brownfield patterns**: Strangler Fig, Branch-by-Abstraction, Anti-Corruption Layer.
- **Root-cause / bug-fix**: 5 Whys, Fishbone (Ishikawa), A3 Problem Solving, Blameless post-mortem.
- **Security**: OWASP Top 10 2025, STRIDE, ASTRIDE (AI-specific threats).
- **Lifecycle / ops**: DORA metrics, SRE error-budgets, Incident Command System.
- **PDLC / product**: Jobs-To-Be-Done (JTBD), Lean Startup, Double Diamond.

Every row of the routing map cites a primary methodology + 1–2 secondary methodologies; smith never invents combinations not present in the table.

### Cross-CLI portability

Smith's manifest is declared here in AGENTS.md so non-Claude-Code CLIs (Codex, Gemini, Goose, Cursor) can discover it via the [agents.md](https://agents.md) standard. Each CLI invokes smith through its own dispatch primitive:

- **Claude Code**: `Task(subagent_type="agents-pro:smith", ...)` via the Agent tool.
- **Gemini CLI**: equivalent dispatch via the Gemini agent SDK; the routing-map skill loads via `.agents/skills/smith/` interop directory.
- **Codex CLI**: dispatch via Codex's agent invocation; AGENTS.md is read natively per `codex-rs/core/src/agents_md.rs`.
- **Goose / Cursor**: dispatch via their respective agent layers; routing-map skill is portable Markdown.

The 12-context routing table is **CLI-agnostic** — it names methodologies and Profile-A/B/C/D agent roles, not Claude-specific primitives. Each CLI maps the Profile names to its own dispatch model.

### References

- `plugins/agents-pro/agents/smith.md` — the smith agent itself (Profile B-orchestrator master agent, 368 lines).
- `plugins/fpl-skills/skills/smith/routing-map.md` — the 12-context routing table + 25 methodology cards + agent index.
- `plugins/fpl-skills/skills/smith/SKILL.md` — the main entry skill (loader + index).
- `plugins/fpl-skills/skills/smith-bootstrap/SKILL.md` — greenfield bootstrap dispatch path.
- `plugins/fpl-skills/skills/smith-plan/SKILL.md` — per-task planning skill.
- `plugins/fpl-skills/skills/smith-routing/SKILL.md` — routing-table inspection skill.
- `plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md` — Profile A / B / B-orchestrator / C / C-coder / D canonical definitions.
- **BMAD-METHOD source**: https://github.com/bmad-code-org/BMAD-METHOD — the «Master persona» concept smith adapts.
- **AGENTS.md source**: https://agents.md — the Linux Foundation cross-CLI manifest standard (Dec 2025).

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

## Brownfield discovery

### Discover Agent (`plugins/forgeplan-brownfield-pack/agents/discover/`)

Brownfield codebase onboarding via the 7-phase MCP discovery protocol. Migrated from a standalone agent into the `forgeplan-brownfield-pack` plugin in Sprint V (PRD-048, v1.4.0). Pre-migration version archived at `agents/_archive/discover-pre-sprint-v/`.

Dispatch: `Task(subagent_type="forgeplan-brownfield-pack:discover", ...)`.

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
