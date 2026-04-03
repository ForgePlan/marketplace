---
name: sync
description: "Bidirectional sync between Forgeplan artifacts and Orchestra tasks. Shows diff, proposes actions, waits for confirmation."
---

# Bidirectional Sync: Forgeplan <-> Orchestra

## Purpose

Detect and resolve discrepancies between Forgeplan artifacts and Orchestra tasks.
Never syncs automatically — always shows diff and waits for user confirmation.

## Procedure

### Step 1: Collect Forgeplan Artifacts

Run `forgeplan list` to get all artifacts with their IDs, types, and statuses.
Parse each line to extract: artifact ID, type (PRD/RFC/ADR/etc.), status (draft/active/deprecated).

### Step 2: Collect Orchestra Tasks

Use `mcp__orch__query_entities(repoType:"folder", repoUid:"all")` to get all tasks.
Then use `mcp__orch__list_fields()` to get custom field definitions (Artifact, Type, Phase, etc.).
For each task, check if it has an Artifact field value.

### Step 3: Cross-Reference

For each Forgeplan artifact:
- Use `mcp__orch__search_entities(query: "<ARTIFACT_ID>")` to find matching Orchestra task.
- Record whether a match exists, and if so, compare Phase and Status.

### Step 4: Build Diff Table

Categorize all items into three groups:

**IN FORGE NOT IN ORCH** — Artifacts that have no matching Orchestra task:
```
| Artifact   | Type    | Status | Action Proposed          |
|------------|---------|--------|--------------------------|
| PRD-021    | PRD     | draft  | Create task in Orchestra |
```

**IN ORCH NOT IN FORGE** — Tasks with Artifact field but no matching Forgeplan artifact:
```
| Task           | Artifact Field | Status | Action Proposed           |
|----------------|----------------|--------|---------------------------|
| "[PRD-099]..." | PRD-099        | Doing  | Verify — artifact missing |
```

**STATUS MISMATCH** — Artifact exists in both but Phase/Status mapping is wrong:
```
| Artifact | Orch Status | Orch Phase | Expected Phase | Action Proposed |
|----------|-------------|------------|----------------|-----------------|
| PRD-021  | Doing       | Shape      | Code           | Update Phase    |
```

### Status-Phase Mapping Reference

| Orchestra Status | Expected Forge Phase |
|------------------|---------------------|
| Backlog          | Shape               |
| To Do            | Validate            |
| Doing            | Code                |
| Review           | Evidence            |
| Done             | Done                |

### Step 5: Present Diff to User

Show the complete diff table to the user.
Propose specific actions for each discrepancy.
**NEVER execute any action without explicit user confirmation.**

Ask: "Which actions should I execute? (all / numbers / none)"

### Step 6: Execute Confirmed Actions

For confirmed actions only:

**Create missing task:**
1. ALWAYS `mcp__orch__search_entities(query: "<ARTIFACT_ID>")` first — no duplicates
2. `mcp__orch__create_entity(entityType: "task", name: "[<ID>] <Title>", ...)` 
3. `mcp__orch__set_fields(entityUid: <new_task>, fields: {Artifact: "<ID>", Type: "<type>", Phase: "<phase>"})`

**Update Status/Phase mismatch:**
1. `mcp__orch__set_fields(entityUid: <task>, fields: {Phase: "<correct_phase>"})` or update Status as needed.

**Remove orphan task (IN ORCH NOT IN FORGE):**
- Suggest marking as Done or investigating — NEVER delete without explicit confirmation.

## Safety Rules

- Before `mcp__orch__create_entity` -> ALWAYS `mcp__orch__search_entities` first (prevent duplicates)
- NEVER use `mcp__orch__send_message` (safety rule — no automated messages)
- NEVER use `mcp__orch__delete_entity` without explicit user confirmation for each entity
- NEVER sync automatically — always show diff and wait for user decision
- If Orchestra is unreachable, report the error and stop — do not guess task state

## Output Format

```
=== Forgeplan <-> Orchestra Sync ===

Forgeplan artifacts: N
Orchestra tasks with Artifact field: M

--- IN FORGE NOT IN ORCH (X items) ---
[table]

--- IN ORCH NOT IN FORGE (Y items) ---
[table]

--- STATUS MISMATCH (Z items) ---
[table]

--- IN SYNC (W items) ---
All good.

Actions proposed: [list]
Execute which? (all / 1,3,5 / none)
```
