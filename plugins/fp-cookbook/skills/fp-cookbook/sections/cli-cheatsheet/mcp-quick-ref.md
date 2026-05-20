# Forgeplan MCP Tools Quick Reference

All `mcp__forgeplan__forgeplan_*` tools available via the forgeplan MCP server.
Use from Claude Code or any MCP-compatible client (Gemini CLI, Codex CLI, Goose).

## Core CRUD

| Tool | Key params | Example |
|------|-----------|---------|
| `forgeplan_get` | `id` | `forgeplan_get(id="PRD-026")` |
| `forgeplan_list` | `status`, `kind`, `limit` | `forgeplan_list(status="active", kind="prd")` |
| `forgeplan_search` | `query`, `kind` | `forgeplan_search(query="R_eff cascade")` |
| `forgeplan_delete` | `id` | `forgeplan_delete(id="NOTE-OLD")` |

## Artifact authoring

| Tool | Key params | Example |
|------|-----------|---------|
| `forgeplan_generate` | `kind`, `title`, `body` | `forgeplan_generate(kind="prd", title="Feature X", body="...")` |
| `forgeplan_capture` | `id`, `content` | `forgeplan_capture(id="PRD-NNN", content="...")` |
| `forgeplan_import` | `mapping_yaml` | `forgeplan_import(mapping_yaml="...")` — batch import |
| `forgeplan_ingest` | `path`, `mapping` | For mapping-driven artifact creation |

## Lifecycle

| Tool | Key params | Example |
|------|-----------|---------|
| `forgeplan_validate` | `id` | `forgeplan_validate(id="PRD-013")` |
| `forgeplan_activate` (Profile B denied) | `id` | `forgeplan_activate(id="PRD-013")` |
| `forgeplan_deprecate` | `id` | `forgeplan_deprecate(id="ADR-002")` |
| `forgeplan_supersede` | `id`, `by` | `forgeplan_supersede(id="ADR-004", by="ADR-005")` |
| `forgeplan_restore` | `id` | `forgeplan_restore(id="NOTE-007")` → returns draft |

## Links

| Tool | Key params | Example |
|------|-----------|---------|
| `forgeplan_link` | `source`, `target`, `relation` | `forgeplan_link(source="EVID-069", target="PRD-013", relation="informs")` |

## Analysis

| Tool | Key params | Example |
|------|-----------|---------|
| `forgeplan_score` | `id` | `forgeplan_score(id="PRD-033")` → R_eff + grade |
| `forgeplan_drift` | `id` | `forgeplan_drift(id="ADR-005")` — check file changes since create |
| `forgeplan_stale` | `days` | `forgeplan_stale(days=30)` |
| `forgeplan_health` | — | `forgeplan_health()` |
| `forgeplan_graph` | `id`, `depth` | `forgeplan_graph(id="PRD-024", depth=2)` |
| `forgeplan_coverage` | `id` | `forgeplan_coverage(id="PRD-NNN")` |
| `forgeplan_blindspots` | — | `forgeplan_blindspots()` |

## Dispatch & workflow

| Tool | Key params | Example |
|------|-----------|---------|
| `forgeplan_dispatch` | `agents`, `status` | `forgeplan_dispatch(agents=4, status="active")` |
| `forgeplan_phase` | `id` | `forgeplan_phase(id="PRD-NNN")` — advisory lifecycle |
| `forgeplan_phase_advance` | `id`, `to` | `forgeplan_phase_advance(id="PRD-NNN", to="audit")` |
| `forgeplan_route` | `description` | `forgeplan_route(description="add plugin")` |
| `forgeplan_order` | `ids` | `forgeplan_order(ids=["PRD-A","PRD-B"])` |
| `forgeplan_estimate` | `id` | `forgeplan_estimate(id="PRD-NNN")` |

## Audit & activity

| Tool | Key params | Example |
|------|-----------|---------|
| `forgeplan_activity` | `since_hours`, `kind` | `forgeplan_activity(since_hours=24)` |
| `forgeplan_activity_stats` | `since_hours` | `forgeplan_activity_stats(since_hours=24)` → p95 latency |
| `forgeplan_journal` | `kind` | `forgeplan_journal(kind="adr")` — decision timeline |

## FPF integration

| Tool | Key params | Example |
|------|-----------|---------|
| `forgeplan_fpf_check` | `id` | `forgeplan_fpf_check(id="PRD-NNN")` |
| `forgeplan_fpf_rules` | `summary` | `forgeplan_fpf_rules(summary=true)` — list active rules |
| `forgeplan_fpf_list` | — | List all FPF artifacts |
| `forgeplan_fpf_search` | `query` | `forgeplan_fpf_search(query="blind spot")` |
| `forgeplan_fpf_section` | `id`, `section` | `forgeplan_fpf_section(id="...", section="01")` |
