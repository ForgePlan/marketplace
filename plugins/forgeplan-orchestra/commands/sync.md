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
Then use `mcp__orch__list_fields(contextUid: "<workspace_uid>", targetType: "task")` to get
custom field definitions (Artifact, Type, Phase, etc.).

**Keep two maps from that response — Step 6 cannot write fields without them:**
- field name -> field `uid`
- per option field, option name -> option `uid`

Both are per-workspace. Never hardcode them, and never carry them over from another
workspace.

For each task, check if it has an Artifact field value. Note the response shapes differ
between tools: in `query_entities` a text field is a bare string while an option field is
an object with a nested `value`. Reading `fields[uid].value` uniformly yields `undefined`
on text fields and makes every artifact ID look empty.

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

**MILESTONE CANDIDATE** — When IN FORGE NOT IN ORCH has 10+ items, suggest milestone approach:
```
⚠️ 15 artifacts have no Orchestra task.
   Consider creating one milestone task instead of 15 individual Done tasks:
   "[EPIC-XXX] Pre-Orchestra Milestone — 15 artifacts"
   Then only create individual tasks for draft/active items.
   Use milestone approach? [y/n]
```

### Step 5: Present Diff to User

Show the complete diff table to the user.
Propose specific actions for each discrepancy.
**NEVER execute any action without explicit user confirmation.**

Ask: "Which actions should I execute? (all / numbers / none)"

### Step 6: Execute Confirmed Actions

For confirmed actions only:

Field writes need the UID maps from Step 2. If you skipped that step, run
`mcp__orch__list_fields` now — field and option UIDs are per-workspace and cannot be
guessed. See the `03-fields/custom-fields.md` section for the full contract.

**Create missing task:**
1. ALWAYS `mcp__orch__search_entities(query: "<ARTIFACT_ID>")` first — no duplicates
2. Create the task and set its fields in one call:

```
mcp__orch__create_entity(entities: [{
  type: "task",
  name: "[<ID>] <Title>",
  contextUid: "<project_uid>",
  fields: [
    { fieldUid: "<Artifact uid>", value: "<ID>" },              // text -> bare string
    { fieldUid: "<Type uid>",     value: "<option uid of type>" },
    { fieldUid: "<Phase uid>",    value: "<option uid of phase>" }
  ]
}])
```

3. Read `failedFields` inside `created[0]`. Report any entry to the user — do NOT
   report a field as set without checking.

**Update Status/Phase mismatch:**

```
mcp__orch__update_entity(
  entityUid: "<task_uid>",
  fields: [ { fieldUid: "<Phase uid>", value: "<option uid of correct phase>" } ]
)
```

Send only fields whose value actually changed. Re-writing a field with the value it
already holds comes back in `failedFields` as `"Missing or insufficient permissions."`
even though nothing is wrong — sending unchanged fields makes every clean run look
broken. `failedFields` is at the top level on `update_entity`.

**Remove orphan task (IN ORCH NOT IN FORGE):**
- Suggest marking as Done or investigating — NEVER delete without explicit confirmation.

## Safety Rules

- Before `mcp__orch__create_entity` -> ALWAYS `mcp__orch__search_entities` first (prevent duplicates)
- NEVER write fields without resolving UIDs via `mcp__orch__list_fields` first — there is no `set_fields` tool, and option fields take the option UID, not its name
- ALWAYS read `failedFields` from the response before reporting a field as set
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
