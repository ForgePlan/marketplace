---
name: export-bank
description: Export the current Hindsight bank's content for backup or audit — memories, documents, mental models. Use when the user says "back up memory", "export bank", "save Hindsight state", or before doing risky operations like deleting / re-bootstrapping a bank.
hindsight-tools: [memory_get_current_bank, memory_status, mental_model_list, mental_model_get, memory_recall, memory_list, document_list]
extra-tools: [Bash, Write]
allowed-tools: mcp__hindsight__memory_get_current_bank, mcp__plugin_fpl-hsmem_hindsight__memory_get_current_bank, mcp__hindsight__memory_status, mcp__plugin_fpl-hsmem_hindsight__memory_status, mcp__hindsight__mental_model_list, mcp__plugin_fpl-hsmem_hindsight__mental_model_list, mcp__hindsight__mental_model_get, mcp__plugin_fpl-hsmem_hindsight__mental_model_get, mcp__hindsight__memory_recall, mcp__plugin_fpl-hsmem_hindsight__memory_recall, mcp__hindsight__memory_list, mcp__plugin_fpl-hsmem_hindsight__memory_list, mcp__hindsight__document_list, mcp__plugin_fpl-hsmem_hindsight__document_list, Bash, Write
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

- **Not the way to move memory between banks.** This markdown export is for a
  human to read. Hindsight has a real transfer path — export the documents
  from one bank and import that archive into another:

  ```
  POST /v1/default/banks/<source>/document-transfer/export   → job id
  POST /v1/default/banks/<target>/document-transfer          → upload the archive
  ```

  It carries documents, chunks and extracted facts. It does **not** carry
  embeddings, and it does not carry derived beliefs or knowledge pages — those
  are recomputed against whatever the target bank already knows, so the
  imported material integrates rather than sitting beside it. Run
  `POST .../consolidate` on the target afterwards and rebuild the pages.

  Two cautions from a live run here: an export of a large bank has been seen to
  fail with a timeout after three retries, so check `memory_operations` rather
  than assuming; and the admin CLI's `import-bank` is a different thing — it
  restores a whole bank and **fails if the target already exists**, so it
  cannot merge.

- Not a substitute for backing up the Postgres volume — for true DR,
  back up the Docker volume / `~/.pg0/` directory.

## Output

```
Exported bank "<id>" to ./hindsight-export/<id>-<date>/
  Mental models: <K>
  Memory snapshots: <Q> queries
  Index:    README.md
```
