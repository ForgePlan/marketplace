---
name: export-bank
description: Export the current Hindsight bank's content for backup or audit — memories, documents, mental models. Use when the user says "back up memory", "export bank", "save Hindsight state", or before doing risky operations like deleting / re-bootstrapping a bank.
allowed-tools: mcp__hindsight__memory_get_current_bank, mcp__hindsight__memory_status, mcp__hindsight__mental_model_list, mcp__hindsight__mental_model_get, mcp__hindsight__memory_recall, Bash, Write
---

# Export bank to disk

Snapshot the current bank into a folder for backup or audit. Hindsight
itself stores data in its embedded Postgres, but a markdown export is
useful for:
- Migrating between machines
- Sharing context with a teammate (without giving them Docker access)
- Pre-deletion safety net
- Auditing what the bank actually contains

## Steps

### 1. Confirm scope with the user

- Get bank ID via `memory_get_current_bank`
- Get stats via `memory_status` (memory count, document count)
- Ask: "Export bank `<id>` (~N memories) to `<cwd>/hindsight-export/<id>-<date>/`? [y/N]"

### 2. Create export directory

```bash
mkdir -p hindsight-export/<bank-id>-<YYYY-MM-DD>
```

### 3. Export mental models

For each model in `mental_model_list`:
1. `mental_model_get(id)` → fetches content
2. Write to `mental-models/<id>.md` with header (id, name, source_query, last refresh)

### 4. Export memories via broad recall

`memory_recall` doesn't dump everything by design — it returns ranked
results. To get a useful corpus, run 3-5 broad queries and merge:
- `recall("decisions and reasoning")` → write to `memories/decisions.md`
- `recall("bugs and fixes")` → `memories/bugs.md`
- `recall("project context and conventions")` → `memories/context.md`

Each result file: one memory per section with `[type]` and `(date)`.

### 5. Index file

Write `hindsight-export/<bank-id>-<date>/README.md`:
```
# Hindsight export — <bank-id>
Exported: <ISO timestamp>
URL: <hindsight URL at export time>
Stats: <N memories>, <M docs>, <K pages>

## Mental models
- [id1.md](mental-models/id1.md) — <name>
- [id2.md](mental-models/id2.md) — <name>

## Memory snapshots (curated by query)
- [decisions.md](memories/decisions.md)
- [bugs.md](memories/bugs.md)
- [context.md](memories/context.md)
```

### 6. Optional: raw Postgres dump

For a **complete** backup including raw memory graph, mention to the user:

```bash
docker exec hindsight pg_dump -U hindsight -d hindsight > pg-dump.sql
```

This captures everything (not just what `recall` surfaces), but is opaque
without restoring to a Postgres instance.

## What this is NOT

- Not a memory **import** mechanism — Hindsight doesn't have a generic
  import endpoint. Re-ingestion would re-run extraction LLM-side.
- Not a substitute for backing up the Postgres volume — for true DR,
  back up the Docker volume / `~/.pg0/` directory.

## Output

```
Exported bank "<id>" to ./hindsight-export/<id>-<date>/
  Mental models: <K>
  Memory snapshots: <Q> queries
  Index:    README.md
```
