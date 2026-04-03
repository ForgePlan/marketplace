# Brownfield Migration

Migrating an existing project to the unified workflow. You already have artifacts in Forgeplan, or tasks in Orchestra, or both.

## Scenario 1: Forgeplan Exists, Orchestra is Empty

You have artifacts in Forgeplan but no tasks in Orchestra.

### Steps

1. **Create custom fields** at workspace level (same as greenfield — all 6 fields).

2. **Create project structure** based on your chosen config (A, B, or C).

3. **Backfill: create tasks for existing artifacts.**

```bash
# Get all active artifacts
forgeplan list --status active

# Get all draft artifacts
forgeplan list --status draft
```

For each **active** artifact:
```
create_entity: task "[<ID>] <Title>"
set_fields: Artifact=<ID>, Type=<kind>, Phase=Done, Status=Done
```

For each **draft** artifact:
```
create_entity: task "[<ID>] <Title>"
set_fields: Artifact=<ID>, Type=<kind>, Phase=<current_phase>, Status=<mapped_status>
```

Use the Phase-Status mapping:
- Shape -> Backlog
- Validate -> To Do
- Code -> Doing
- Evidence -> Review
- Done -> Done

4. **Verify** by running `/sync` — should show zero discrepancies.

## Scenario 2: Both Forgeplan and Orchestra Exist (Independently)

You have artifacts and tasks, but they are not linked.

### Steps

1. **Add custom fields** to the workspace (if not already present).

2. **Map existing tasks to artifacts.** This is a manual process:
   - For each Orchestra task, check if there is a corresponding Forgeplan artifact.
   - If yes: set the Artifact field on the task to the artifact ID.
   - If no match: the task stays as-is (it may be a Tactical task with no artifact).

3. **Create tasks for unmatched artifacts.**
   - For each Forgeplan artifact without an Orchestra task, create one.

4. **Evaluate unmatched tasks.**
   - For Orchestra tasks without artifacts, run `forgeplan route "<task description>"`.
   - If Tactical: no artifact needed, leave the task as-is.
   - If Standard+: create an artifact in Forgeplan and link it.

5. **Verify** with `/sync`.

## Scenario 3: Migrating from Another Task Tracker

You are moving from Jira, Linear, Trello, etc. to Orchestra.

### Steps

1. Export tasks from the old tracker (CSV/JSON).
2. Set up Orchestra (fields + project structure).
3. Import tasks via `create_entity` batch operations.
4. Map artifact IDs where there is a Forgeplan connection.
5. Forgeplan remains unchanged — it is the source of truth for artifacts.

## Migration Between Configurations

### A -> B: Solo -> Small Team

**When**: A second person joins the project.

**What to do:**
1. Custom fields are already at workspace level — no changes needed.
2. Rename "Development" project to your primary area (e.g., "Core").
3. Create additional area projects (e.g., "Frontend", "Backlog", "Operations").
4. Move tasks to appropriate projects using `mcp__orch__move_entity`.
5. Start using the Assignee field on all tasks.
6. Update sync routing rules if applicable.

**Effort**: 30 minutes. **Risk**: Low — fields are preserved, tasks are moved.

### B -> C: Small Team -> Medium Team

**When**: Team grows to 5+, need parallel sprint scopes per area.

**What to do:**
1. Custom fields — no changes.
2. In each area project, create sub-projects for sprints:
   - "Backend" -> "Backend Sprint N", "Backend Backlog"
3. Move tasks from project root into the appropriate sub-projects.
4. Create Channels for team communication.
5. Set up Views per role (Developer, PM, QA, Tech Lead).
6. Sprint field becomes optional (sub-project = sprint in Config C).

**Effort**: 1-2 hours. **Risk**: Medium — tasks need to be moved, history may shift.

### C -> B: Downsizing (Team Shrinks)

**When**: Team shrinks, Config C overhead is not justified.

**What to do:**
1. Merge sub-projects back into project root.
2. Delete empty sub-projects.
3. Return to Sprint field instead of sub-projects.
4. Channels can stay or be archived.

**Effort**: 30 minutes. **Risk**: Low.

### B -> A: Back to Solo

**What to do:**
1. Merge all area projects into one "Development" project.
2. Delete empty projects.
3. Stop using Assignee (everything is you).

## Migration Safety Notes

- Custom fields at workspace level means they NEVER need to be recreated during migration.
- Always verify with `/sync` after migration.
- Do not delete old projects — archive them to preserve history.
- Move tasks, do not recreate them (preserves messages, checklists, history).
