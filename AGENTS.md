# AGENTS.md — ForgePlan Marketplace

> **Cross-CLI primary context file.** This file is the root context for AI agents across CLIs: Claude Code (Anthropic), Gemini CLI (Google), OpenAI Codex CLI, Goose (Block), and any other client that follows the [agents.md](https://agents.md) standard.
>
> This file is the **source of truth** for project conventions. `CLAUDE.md` points back to this file for Claude Code back-compat.

## Project overview

**Repo**: [ForgePlan/marketplace](https://github.com/ForgePlan/marketplace)
**Catalog version**: see `.claude-plugin/marketplace.json`
**Plugins**: 12+ (workflow plugins + agent packs)
**Project board**: [orgs/ForgePlan/projects/5](https://github.com/orgs/ForgePlan/projects/5)

ForgePlan marketplace is a catalog of plugins for AI coding agents with a central `forgeplan` MCP server that delivers an **artifact-driven SDLC pipeline**.

## Architecture canonical reference

Read these in order to understand the pipeline:

1. **PRD-024** (Full SDLC Pipeline with Quality Gates) — foundation
2. **PRD-025** (Multi-agent multi-CLI pipeline with Hindsight v2) — extensions
3. **RFC-002** (Canonical pipeline architecture)
4. **RFC-003** (Multi-agent multi-CLI architecture — 4 layers)
5. **ADR-005** (Keep `/forge-cycle` and `/autorun` as distinct orchestrators)
6. **NOTE-004** (Gas Town / Ruflo prior research)
7. **NOTE-005** (Multi-CLI ecosystem May 2026)

All artifacts live in `.forgeplan/` (PRD / RFC / ADR / EVID / NOTE structure).

## Smith — master orchestrator

**Smith** is the master orchestrator of the ForgePlan ecosystem — the canonical first point of contact when an agent (or a human via an agent) does not yet know which methodology, dispatch chain, or pipeline depth applies to the work in front of them. Smith inspects repository state and user intent, applies a **12-context routing matrix** (greenfield, brownfield, feature, bug, refactor, architecture decision, security audit, performance audit, product discovery, tech-debt cleanup, live incident, hotfix), and recommends a specialist-agent dispatch sequence plus evidence requirements per the 4-layer S10–S13 pipeline. Smith is the ForgePlan ecosystem's equivalent of BMAD's "Master" persona — a Profile B-orchestrator agent that **never writes code or activates artifacts**; it routes and recommends. Smith lives in `plugins/agents-pro/agents/smith.md` (the agent) plus `plugins/fpl-skills/skills/smith/` (the 12-context brain) and is reachable from any CLI that honours AGENTS.md.

### When to invoke smith

- At **session start** when unsure what to do next — smith reads `forgeplan_health` + recent journal and proposes the next action.
- For a **fresh repository** with no artifacts yet — invoke `/smith-bootstrap` to seed Brief / PRD / first ADR via the greenfield row of the routing map.
- For a **specific task** of any depth — invoke `/smith-plan <task description>` and smith picks the matching row, names the methodology, and lists the dispatch sequence.
- For **learning the methodology surface** — invoke `/smith-routing` to inspect the 12 contexts + 25 methodology cards without committing to a task.
- When the existing entry points (`/forge-cycle`, `/autorun`) do not fit — e.g. cross-context work, ambiguous depth, methodology mismatch — smith disambiguates first.
- **Trigger phrases** (English): `smith`, `what's next`, `scrum master`, `master orchestrator`, `which methodology`, `take charge`, `captain mode`. The agent file at `plugins/agents-pro/agents/smith.md` also registers bilingual Russian triggers per the agent-frontmatter exception in the Language policy section below — those triggers exist in the agent file, not here.

### The 12 contexts smith routes

The full table — primary methodology + dispatch sequence + evidence requirements — lives in `plugins/fpl-skills/skills/smith/routing-map.md`. Compact summary:

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

Smith **picks exactly one row** per task — methodology cocktails are forbidden. If the situation sits between two rows, smith emits the `<<NEED_USER_INPUT>>` sentinel with ≥3 hypotheses on which row to pick (FPF ADI discipline per Sprint Z7/PRD-059). Only in autonomous-mode incidents where the ambiguity blocks a live response does smith pick the higher-risk row (brownfield > greenfield, audit > feature) and record the deviation in its Plan output. The single-row rule prevents the common failure mode where teams blend BMAD + SPARC + Spec Kit "to cover all bases" and end up with artefacts that match no community pattern — none of the three communities recognise the output as their canonical shape.

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
- **Goose / Cursor**: dispatch via their respective agent layers; the routing-map skill is portable Markdown.

The 12-context routing table is **CLI-agnostic** — it names methodologies and Profile-A / B / C / D agent roles, not Claude-specific primitives. Each CLI maps the Profile names to its own dispatch model.

### References

- `plugins/agents-pro/agents/smith.md` — the smith agent itself (Profile B-orchestrator master agent, 368 lines).
- `plugins/fpl-skills/skills/smith/routing-map.md` — the 12-context routing table + 25 methodology cards + agent index.
- `plugins/fpl-skills/skills/smith/SKILL.md` — the main entry skill (loader + index).
- `plugins/fpl-skills/skills/smith-bootstrap/SKILL.md` — greenfield bootstrap dispatch path.
- `plugins/fpl-skills/skills/smith-plan/SKILL.md` — per-task planning skill.
- `plugins/fpl-skills/skills/smith-routing/SKILL.md` — routing-table inspection skill.
- `plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md` — Profile A / B / B-orchestrator / C / C-coder / D canonical definitions.
- **BMAD-METHOD source**: https://github.com/bmad-code-org/BMAD-METHOD — the "Master persona" concept smith adapts.
- **AGENTS.md source**: https://agents.md — the Linux Foundation cross-CLI manifest standard (Dec 2025).

## Cross-CLI compatibility

The marketplace is **CLI-agnostic** via the MCP standard:

### MCP server registration

Any CLI with an MCP client can connect to the forgeplan MCP server.

**Canonical wiring command** — `forgeplan mcp install`. It is the supported, idempotent, smart-merge way to register the forgeplan MCP server with any major CLI. Prefer this over editing the JSON config by hand:

```bash
# Claude Code (project-scope — wiring travels with the repo)
forgeplan mcp install --client claude --scope project

# Claude Code (user-scope — every project sees forgeplan, host-personal)
forgeplan mcp install --client claude --scope user

# Cursor / Windsurf
forgeplan mcp install --client cursor   --scope project
forgeplan mcp install --client windsurf --scope project

# Dry-run (recommended on a populated .mcp.json the first time)
forgeplan mcp install --client claude --scope project --dry-run
```

Smart-merge preserves existing entries (`hindsight`, `orch`, any other MCP servers). Re-running is safe — already-correct configs are no-ops.

**Where the command writes** — the resulting block in `.mcp.json` (Claude Code) / `settings.json` (Gemini) / `config.toml` (Codex):

```jsonc
// Claude Code: .mcp.json (project scope) or ~/.claude.json (user scope)
{ "mcpServers": { "forgeplan": { "command": "forgeplan", "args": ["serve"], "transport": "stdio" } } }
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

For multi-CLI environments, the `forgeplan mcp-manifest` command (Batch F deliverable per RFC-003) generates all three config files in one call. `mcp install` handles the per-client case; `mcp-manifest` handles the everything-at-once case.

**Used by**: `/smith-bootstrap` Step 0b (active runner, calls `mcp install --scope project` automatically when `.mcp.json` lacks the forgeplan block) and `/fpl-init` Step 5 (same primitive).

### Skills interop directory

Plugins publish skills in two locations:
- `plugins/<name>/skills/` — Claude Code path (existing)
- `plugins/<name>/.agents/skills/` — interop alias (agentskills.io standard) — symlinks to the existing skills

Any CLI with agentskills.io support loads skills from `.agents/skills/`.

### Agent identity

Each CLI exposes an environment variable for identity detection:
- Claude Code: `CLAUDECODE=1`
- Codex CLI: `CODEX_SANDBOX=*`
- Gemini CLI: `AGENT_CLIENT=gemini` (per ACP) or `GEMINI_CLI=1`

Identity format: `<cli_name>/<version>/<task_id>` is written into claim / EVID / NOTE metadata.

## Git workflow

**CRITICAL: feature branches + PR only. Direct push to `main` and `dev` is forbidden.**

```
feature-branch → push → PR → CI pass → merge
```

### Branches

| Branch | Purpose | Protection |
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

54 tools in total. Per-pipeline-phase mapping — see RFC-003 Layer 2 (Agent Pack Dispatch Matrix).

## Three orchestrator entrypoints

1. **`/forge-cycle <task>`** — reactive methodology enforcer. Per-task invocation, full pipeline to completion, halts on conflicts.
2. **`/autorun <task>`** — autonomous long-running. Upfront briefing → multi-hour run → FPF for conflict resolution → NOTE artifacts as audit trail.
3. **`forgeplan playbook run <name>`** — declarative customization. YAML playbook (SPEC-003) for per-domain workflows.

All three drive the full pipeline (Phase 1 → 10); the **entry phase is determined by smart resume** from the artifact graph state.

## Validation

Always before opening a PR:

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

# Cross-CLI setup (once `forgeplan mcp-manifest` ships)
forgeplan mcp-manifest --output-dir ~/    # Generates configs for 3 CLIs
```

## Conventions

- **PascalCase** for ForgePlan ecosystem directories (e.g. `~/Work/ForgePlanMarketplace`)
- **Markdown** for all docs, YAML for playbooks/configs
- **Artifact IDs** PRD-NNN / RFC-NNN / ADR-NNN / EVID-NNN / NOTE-NNN — uppercase, zero-padded

## Language policy (international project)

This is an **international project**. The default language for all artifacts — code, configuration, documentation, commit messages, branch names, PR titles and bodies, issue titles and bodies, comments in source files, error messages, agent system prompts, skill bodies, hook scripts — is **English**.

**Russian is permitted only in files explicitly suffixed `.ru.md` or `-RU.md`** (and their internal contents). These are intentional Russian-language siblings of English documents (e.g. `ONBOARDING-RU.md` next to `ONBOARDING.md`, `SMITH-RU.md` next to `SMITH.md`).

### Hard rules

- **Commit messages**: English only. No quoted Russian fragments, even when documenting a user request — translate the quote.
- **Branch names**: English only (slug from English description).
- **PR titles and bodies**: English only.
- **GitHub issue titles and bodies**: English only.
- **Source code, scripts, configs, CI workflows**: English only (identifiers, strings, comments).
- **Markdown files NOT ending in `.ru.md` / `-RU.md`**: English only.

### Narrow exceptions (do not expand)

- **Bilingual agent frontmatter** in `plugins/agents-*/agents/*.md` MAY contain a Russian description paragraph and Russian trigger phrases — required for cross-language prompt matching (a Russian-speaking user typing a Russian command must still reach the right agent). The English paragraph and English triggers are mandatory; the Russian additions are additive.
- **Hook scripts** (`plugins/*/hooks/scripts/*.sh`) MAY include Russian patterns inside regex alternations for the same reason — they classify user prompts and must cover the bilingual surface.
- **Anti-pattern teaching examples** in `CLAUDE.md` "User-facing communication style" section MAY quote Russian text — those examples exist specifically to teach the model how *not* to write Russian. Touching that section requires preserving the quoted Russian.
- **forge-report templates** (`plugins/*/skills/forge-report/sections/01-templates/*.md`) — pre-existing baseline; produces RU-language reports for the project owner. Not retroactively cleaned; new templates should ship English-first with optional `*-ru.md` siblings.

### Going forward

Any new file, commit, PR, or issue created on or after **2026-05-27** is held to the Hard rules above. The pre-2026-05-27 baseline (commit history that already contains Russian quotes, the bilingual agent files, the forge-report templates) is grandfathered — it cannot be retroactively cleaned without `git push --force`, which the Git workflow forbids. The grandfather is documented here so reviewers know not to chase historical violations during audits.

If you must reference a Russian-language user request in a commit message or PR body, **translate the quote into English** and (optionally) mention "(translated from Russian)" once. Example:

- WRONG: a commit message that quotes the user's Russian phrase verbatim.
- RIGHT: `Closes user feedback: "guardian agent should check and report this" (translated from Russian)`

---

> **For Claude Code users**: `CLAUDE.md` in the same directory is a Claude-specific overlay on top of this file. It contains conventions specific to Claude Code (hooks settings.json formats, skill directory structure, etc.). On disagreement with this file — `AGENTS.md` is the source of truth for cross-CLI concerns; `CLAUDE.md` is the source of truth for Claude Code specifics.
>
> **For Gemini CLI users**: you can create `GEMINI.md` as a symlink to this file for a Gemini-specific overlay.
>
> **For Codex CLI users**: this file is read natively via `codex-rs/core/src/agents_md.rs`. Hierarchical scope (`child_agents_md`) is supported.
