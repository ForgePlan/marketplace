# Custom Fields Reference

## Critical Rule

Custom fields are created at the **workspace level** in Orchestra. This means:
- They are available in ANY project within the workspace.
- They survive any project restructuring (migration A -> B -> C).
- They are created once and never need to be recreated.

## The 6 Custom Fields

| Field | Type | Values | Description | Required? |
|-------|------|--------|-------------|-----------|
| **Artifact** | `text` | `PRD-021`, `RFC-003`, `PROB-021` | Forgeplan artifact ID | Required for artifact-linked tasks |
| **Type** | `option` | PRD / RFC / ADR / Epic / Spec / Problem / Evidence / Note | Artifact type | Required if Artifact is set |
| **Depth** | `option` | Tactical / Standard / Deep / Critical | Depth from `forgeplan route` | Optional |
| **Phase** | `option` | Shape / Validate / Code / Evidence / Done | Current Forge pipeline phase | Recommended |
| **Sprint** | `text` | `Sprint 9`, `Sprint 10` | Sprint assignment | Recommended |
| **Branch** | `text` | `fix/adi-quality-prob021` | Git branch name | Optional |

## Why These 6 and Not More

### Artifact
The key link between Forgeplan and Orchestra. Without it, there is no mapping. This is like a foreign key — it references the artifact ID in Forgeplan.

### Type
Enables filtering "show all PRDs" or "show all Problems" in Orchestra without querying Forgeplan. Quick visibility into what kind of work a task represents.

### Depth
PM or tech lead can see complexity at a glance without reading the artifact. Informs sprint capacity planning.

### Phase
AI agent understands where in the methodology pipeline a task is without additional queries. Enables automated Status-Phase sync.

### Sprint
Time-based grouping. Works in any configuration (A, B, C). In Config C, sub-projects replace Sprint field for sprint tracking, but the field can still be used for cross-reference.

### Branch
Links task to git. AI can find code related to a task. Useful for PR creation and code review context.

## What NOT to Add

| Field | Why NOT |
|-------|---------|
| **R_eff** (score) | Computed value that stales instantly. Always query live via `forgeplan score`. |
| **Priority** | Orchestra already has a standard Priority field. Do not duplicate. |
| **Tags** | Orchestra already has a standard Tags field. Do not duplicate. |
| **Description/Body** | This is artifact content — it lives in Forgeplan markdown files. Orchestra is not a document store. |
| **Validation status** | Dynamic — changes with each `forgeplan validate`. Query live. |
| **Evidence links** | Part of the Forgeplan link graph. Query via `forgeplan show`. |

The rule: if the data is computed, dynamic, or content-heavy, it belongs in Forgeplan. Only stable reference data goes into Orchestra fields.

## Status <-> Phase Mapping

Two fields reflect different aspects of the same work:
- **Status** — Orchestra native field, visible to everyone, about "task state"
- **Phase** — Forge pipeline field, about "where in the methodology cycle"

| Orchestra Status | Forge Phase | What is Happening | Who Updates |
|------------------|-------------|-------------------|-------------|
| **Backlog** | Shape | Artifact created, sections being filled | Task creator |
| **To Do** | Validate | Artifact validated (PASS), ready to work | AI after `forgeplan validate` |
| **Doing** | Code | Code being written, sprint in progress | Developer or AI |
| **Review** | Evidence | Audit complete, evidence being created | AI after `/audit` |
| **Done** | Done | Artifact activated in Forgeplan | AI after `forgeplan activate` |

## Sync Rule

If one is updated, the other must be updated too. The AI agent updates both Phase and Status whenever either changes.

**Conflict resolution**: When Phase and Status disagree, **Status wins**. Orchestra is the source of truth for execution state.

## Creating Fields via MCP

To create all 6 fields in a new workspace:

```
mcp__orch__manage_field: create "Artifact" type=text
mcp__orch__manage_field: create "Type" type=option values=["PRD","RFC","ADR","Epic","Spec","Problem","Evidence","Note"]
mcp__orch__manage_field: create "Depth" type=option values=["Tactical","Standard","Deep","Critical"]
mcp__orch__manage_field: create "Phase" type=option values=["Shape","Validate","Code","Evidence","Done"]
mcp__orch__manage_field: create "Sprint" type=text
mcp__orch__manage_field: create "Branch" type=text
```

## Setting Fields on a Task

When creating or updating a task:

```
mcp__orch__set_fields(
  entityUid: "<task_uid>",
  fields: {
    "Artifact": "PRD-021",
    "Type": "PRD",
    "Depth": "Standard",
    "Phase": "Code",
    "Sprint": "Sprint 9",
    "Branch": "feat/adi-quality-prd021"
  }
)
```

## Tactical Tasks (No Artifact)

Not every task needs an artifact. Tactical tasks from `forgeplan route` (quick fixes, small changes) can exist in Orchestra without the Artifact field. They follow a simpler lifecycle:

```
Status: To Do -> Doing -> Done
Phase: (not set)
Artifact: (not set)
Type: (not set)
```

These tasks do not need validation, evidence, or activation — just execution.
