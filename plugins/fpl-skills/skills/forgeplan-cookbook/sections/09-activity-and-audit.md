# Section 09 — Activity, audit, init / export / import / ingest

**6 tools** for workspace administration + observability.

## 09.1 forgeplan_activity — query activity log

Append-only JSONL log of every MCP tool invocation at `.forgeplan/logs/tools-YYYY-MM-DD.jsonl`. Use to reconstruct what an agent did over a time window.

```python
forgeplan_activity(since_hours=24, status="ok", limit=500)
forgeplan_activity(tool="forgeplan_update,forgeplan_link", since_hours=1)
```

**Use case**: post-incident reconstruction, attribution of LLM-token spend (each `_reason` / `_generate` / `_decompose` call is logged), destructive op audit.

## 09.2 forgeplan_activity_stats — aggregate stats

Grouped by tool name: count, error count, p50/p95 duration, total time.

```python
forgeplan_activity_stats(since_hours=24)
# → [{"tool": "forgeplan_score", "count": 47, "errors": 0,
#     "p50_ms": 120, "p95_ms": 3500, "total_ms": ...}, ...]
```

**Use case**: identify slow tools, hotspots, runaway loops.

## 09.3 forgeplan_init — initialize workspace

Creates `.forgeplan/` with LanceDB tables, config.yaml, artifact subdirectories.

```python
forgeplan_init()                    # standard init
forgeplan_init(force=true)          # force re-init (destructive — use with care)
```

**CLI**: `forgeplan init -y` (the standard `/smith-bootstrap` Step 1 path).

**Owner**: orchestrator at greenfield bootstrap. Should be called exactly once per project.

## 09.4 forgeplan_export — export workspace to JSON

```python
forgeplan_export()                              # returns JSON directly
forgeplan_export(output=".forgeplan/backup-2026-05-27.json")    # writes to file
```

**Use case**: backups, migration to another forgeplan instance, debug snapshots.

## 09.5 forgeplan_import — import from JSON bundle

```python
forgeplan_import(data=json_string)
forgeplan_import(data=json_string, force=true)    # overwrite existing artifacts
```

**Gotcha**: import does not preserve assigned_number IDs across workspaces. Use for fresh imports into empty workspaces; for selective merge use the `forgeplan ingest` engine ([`09.6`](#096-forgeplan_ingest)).

## 09.6 forgeplan_ingest — mapping-driven plugin output ingestion

Apply a mapping YAML to a source file → generate forge artifacts with `file:line` source refs (PRD-066 / SPEC-004).

```python
# Wave 3: dry-run only (Wave 4 will wire artifact::Store)
forgeplan_ingest(mapping=".forgeplan/mappings/eslint-to-problems.yaml",
                 source="eslint-output.json",
                 dry_run=true)

forgeplan_ingest(mapping=..., source=..., update=true)    # idempotent re-ingest
```

**Use case**: ingest lint / coverage / security-scan reports into forgeplan as PROB / EVID artifacts. Wave 3 limits to dry-run; production writes lan in Wave 4.

## Related CLI-only commands (not yet in MCP)

These exist in `forgeplan --help` but have no MCP surface. Use the CLI directly when needed:

| Command | Purpose |
|---|---|
| `forgeplan tag <ID> <tag>` | Add tag to artifact |
| `forgeplan untag <ID> <tag>` | Remove tag |
| `forgeplan promote <mem-id> --kind <kind>` | Promote Hindsight memory to full artifact |
| `forgeplan log` | Show change log — audit trail of mutations |
| `forgeplan watch` | Watch `.forgeplan/` files, sync changes to LanceDB |
| `forgeplan git-sync` | Sync artifact changes from git pull/merge into LanceDB |
| `forgeplan reindex` | Rebuild LanceDB from `.md` files (files-first sync) |
| `forgeplan embed` | Generate embeddings for semantic search |
| `forgeplan remember <text>` | Save memory for later recall |
| `forgeplan recall <query>` | Search / list saved memories |
| `forgeplan scan` | Scan codebase for source modules |
| `forgeplan migrate` | Run schema migrations on existing workspace |
| `forgeplan migrate-dry-run` | Pre-Phase-4 collision check (PROB-060) |
| `forgeplan migrate-secrets` | Import LLM API keys from env to `.forgeplan/secrets.env` (PRD-077) — used by `smith-bootstrap` Step 1b |
| `forgeplan ci-assign-id` | CI atomic assigner of `assigned_number` (PROB-060) |
| `forgeplan reconcile-ids` | Manual cleanup of identity drift (PROB-060 Phase 2.4) |
| `forgeplan reopen <ID>` | Create new draft + deprecate old |
| `forgeplan renew <ID>` | Extend stale artifact's `valid_until` |
| `forgeplan scan-import` | Scan for existing docs + import as artifacts |
| `forgeplan tree` | ASCII tree of artifact hierarchy |
| `forgeplan setup-skill` | Install `/forge` skill for Claude Code (forgeplan-native onboarding) |
