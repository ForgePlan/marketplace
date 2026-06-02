---
name: forgeplan-cookbook
description: |
  Live reference for the 66 mcp__forgeplan__* MCP tools and the 82 forgeplan CLI subcommands shipped in forgeplan 0.32.1. Agents and humans consult this skill when they know what they want to do (create an artifact, score a graph, dispatch sub-agents, detect anomalies) but don't yet know which tool name to call. Organised by use-case (lifecycle / discovery / quality / health / AI-driven / multi-agent / brownfield / activity / FPF / playbooks / plugins / release / safety) rather than alphabetically. Each section maps tools to canonical use-cases + which Profile A / B / C / D agent or which skill should call them. Includes known safety warnings (forgeplan#350 MCP body literal-string-only, forgeplan#348 score-all hint typo, forgeplan#351 plugins doctor install syntax).

  Triggers: "forgeplan tool reference", "which forgeplan command", "forgeplan-cookbook", "/forgeplan-cookbook", "what mcp tool", "how do I create artifact via mcp", "forgeplan cli vs mcp", "forgeplan capabilities"
origin: forgeplan
---

# forgeplan-cookbook — tool reference for agents and humans

A working agent often knows **what** it wants to do (create a PRD, score the graph, find blind spots) but not **which forgeplan tool name** to call. This cookbook is the router. It is loaded lazily — start with this index, then read one section deeper when you have a use-case match.

## What is and isn't here

- **Is**: every `mcp__forgeplan__*` MCP tool + every `forgeplan` CLI subcommand in forgeplan 0.32.1. Mapped to use-case, owner profile, and canonical example.
- **Is not**: detailed schema for each tool. Schema lives in the MCP tool description itself (via `ToolSearch` for deferred MCP tools, or `forgeplan <cmd> --help` for CLI). This cookbook tells you which tool to call; the tool itself tells you the exact arguments.

## Surface picker — MCP vs CLI

For artifact lifecycle work — **prefer MCP** (`mcp__forgeplan__*`). MCP returns typed dicts with `_next_action` hints, is observed by the activity log automatically, and integrates with agent-frontmatter `disallowedTools` denylists.

For shell scripting, CI, or human exploration — **CLI is fine**. Behaviour is symmetric except where noted in section [`14-mcp-safety`](sections/14-mcp-safety-warnings.md).

If neither is available (no MCP wiring, no `forgeplan` on `$PATH`) — escalate to the user. Do not invent intermediate state.

## Section index

| Section | Coverage | Tool count |
|---|---|---:|
| [`01-lifecycle`](sections/01-lifecycle.md) | CRUD + lifecycle transitions (new / get / update / delete / activate / supersede / deprecate / link / unlink / restore / undo_last) | 11 |
| [`02-discovery-and-search`](sections/02-discovery-and-search.md) | Find existing artifacts (list / search / graph / order / journal) | 5 |
| [`03-quality-gates`](sections/03-quality-gates.md) | Validate, score, review, calibrate depth, estimate effort | 5 |
| [`04-pipeline-health`](sections/04-pipeline-health.md) | Anomalies, blind spots, blocked, orphans, contradictions, coverage, decay, drift, stale, health, status | 11 |
| [`05-session-and-phase`](sections/05-session-and-phase.md) | Methodology session phase (idle/routing/.../pr) + artifact lifecycle phase (shape/.../done) | 4 |
| [`06-ai-driven-commands`](sections/06-ai-driven-commands.md) | Commands that require an LLM provider (reason / generate / decompose / capture / route) | 5 |
| [`07-multi-agent-coordination`](sections/07-multi-agent-coordination.md) | Claim / release locks + parallel-safe dispatch (claim / claims / release / dispatch) | 4 |
| [`08-brownfield-discovery`](sections/08-brownfield-discovery.md) | Brownfield protocol (discover_*, hypothesis_*, interview_packet_*) | 7 |
| [`09-activity-and-audit`](sections/09-activity-and-audit.md) | Activity log query + workspace init / export / import / ingest | 6 |
| [`10-fpf-knowledge-base`](sections/10-fpf-knowledge-base.md) | FPF (First Principles Framework) KB query + rule introspection | 5 |
| [`11-playbooks`](sections/11-playbooks.md) | Declarative YAML orchestration (PRD-065 / SPEC-003) | 4 |
| [`12-plugins-registry`](sections/12-plugins-registry.md) | Installed plugin detection + doctor health-check + info | 3 |
| [`13-release-notes`](sections/13-release-notes.md) | Generate Keep-a-Changelog notes from git refs | 1 |
| [`14-mcp-safety-warnings`](sections/14-mcp-safety-warnings.md) | Known bugs + safe patterns + filed upstream issues | n/a |

## Quick router — by intent

| If you want to… | Read |
|---|---|
| Create a new PRD / RFC / ADR / EVID / NOTE | [`01-lifecycle`](sections/01-lifecycle.md) + [`06-ai-driven`](sections/06-ai-driven-commands.md) (for `generate` shortcut) |
| Find an existing artifact by topic | [`02-discovery-and-search`](sections/02-discovery-and-search.md) |
| Check if a PRD is ready to activate | [`03-quality-gates`](sections/03-quality-gates.md) `validate` + `review` + [`14-mcp-safety`](sections/14-mcp-safety-warnings.md) before mutating body |
| Score the project graph | [`03-quality-gates`](sections/03-quality-gates.md) `score` |
| Diagnose project health | [`04-pipeline-health`](sections/04-pipeline-health.md) `health` + `anomalies` + `blindspots` |
| Know "where am I" in the methodology | [`05-session-and-phase`](sections/05-session-and-phase.md) `session` |
| Generate ADI hypotheses | [`06-ai-driven`](sections/06-ai-driven-commands.md) `reason` (requires LLM key, see also smith-bootstrap Step 1b) |
| Decompose a big PRD into RFCs | [`06-ai-driven`](sections/06-ai-driven-commands.md) `decompose` |
| Coordinate N parallel sub-agents | [`07-multi-agent-coordination`](sections/07-multi-agent-coordination.md) `dispatch` + `claim` chain |
| Onboard a legacy codebase | [`08-brownfield-discovery`](sections/08-brownfield-discovery.md) `discover_start` |
| Audit what an agent did over the last 24h | [`09-activity-and-audit`](sections/09-activity-and-audit.md) `activity` + `activity_stats` |
| Look up an FPF rule or section | [`10-fpf-knowledge-base`](sections/10-fpf-knowledge-base.md) |
| Run a declarative workflow | [`11-playbooks`](sections/11-playbooks.md) |
| Verify which plugins are installed | [`12-plugins-registry`](sections/12-plugins-registry.md) |
| Generate release notes | [`13-release-notes`](sections/13-release-notes.md) |

## Ownership matrix — who calls what

The CRUD-R-A profile system (see `plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md`) constrains which agent profile is allowed to call which mutation. The cookbook respects that. When a section maps a tool to "owner: Profile A", it means Profile B / C / D agents physically cannot call it because their `disallowedTools` denies it.

| Operation | Owner profile | Tool examples |
|---|---|---|
| CREATE (new artifact) | Profile A | `forgeplan_new`, `forgeplan_generate` |
| READ (any) | Any | `forgeplan_get`, `forgeplan_list`, `forgeplan_search` |
| UPDATE (body / metadata) | Profile A (own kind), Profile D (cross-kind metadata) | `forgeplan_update` |
| LINK | Profile A | `forgeplan_link`, `forgeplan_unlink` |
| ACTIVATE / SUPERSEDE / DEPRECATE | Orchestrator (not agents) | `forgeplan_activate`, `forgeplan_supersede`, `forgeplan_deprecate` |
| REVIEW (read + emit EVID) | Profile B | `forgeplan_validate`, `forgeplan_score`, `forgeplan_review` |
| GATE | Profile B-gate (guardian) | reads everything, mutates nothing |
| RESEARCH | Profile C | read-only set: `forgeplan_search`, `forgeplan_get`, `forgeplan_graph` |
| SOURCE MUTATION | Profile C-coder | `Write` / `Edit` on source files; **never** calls forgeplan tools |

## Reference docs

- `forgeplan --help` — canonical CLI subcommand list (82 in 0.32.1).
- `ToolSearch query="mcp__forgeplan"` — canonical MCP tool surface (66 in 0.32.1).
- `plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md` — Profile A / B / C / D / D-orchestrator definitions + `disallowedTools` patterns.
- `AGENTS.md` `## Cross-CLI compatibility` — MCP registration + canonical wiring command.
- `forgeplan reason --help` — explicit list of which commands need LLM (only `reason`, `generate`, `decompose`, `capture`, `route` LLM-mode).

## When NOT to use this cookbook

- You already know the tool name and only need the argument schema → call the tool directly; its description carries the schema.
- You are writing source code in the user's project → that is Profile C-coder territory; forgeplan tools are not relevant.
- You are debugging a forgeplan bug → file upstream at [ForgePlan/forgeplan/issues](https://github.com/ForgePlan/forgeplan/issues). Three filed 2026-05-27: [#348](https://github.com/ForgePlan/forgeplan/issues/348), [#350](https://github.com/ForgePlan/forgeplan/issues/350), [#351](https://github.com/ForgePlan/forgeplan/issues/351).

## Anti-patterns

- ❌ Reading every section "to be thorough" — load only the section matching your intent. Agentic RAG, not exhaustive recall.
- ❌ Re-implementing what a forgeplan tool already does (e.g., manually parsing artifact frontmatter when `forgeplan_get` returns typed dict).
- ❌ Treating MCP and CLI as identical surfaces. Section [`14`](sections/14-mcp-safety-warnings.md) lists 3 documented asymmetries; expect more to surface over time.
- ❌ Skipping the [`14-mcp-safety`](sections/14-mcp-safety-warnings.md) section before writing artifact bodies. The `@filepath` data-loss bug is silent and consequential.

---

**Last verified**: forgeplan 0.32.1, marketplace catalog 1.78.1, fpl-skills 1.37.1 (2026-05-27).
