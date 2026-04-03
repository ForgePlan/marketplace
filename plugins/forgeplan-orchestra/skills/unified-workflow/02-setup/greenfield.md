# Greenfield Setup

Setting up the unified workflow from scratch — no existing artifacts, no existing tasks.

## Step 1: Choose Your Configuration

```
How many people will work on the project?
|
+-- 1 person (+ AI agents) -----------> CONFIG A: Solo Dev
|
+-- 2-5 people -----------------------> CONFIG B: Small Team
|   +-- Clear area separation? (backend/frontend/...)
|       +-- Yes -> Config B with area projects
|       +-- No (all fullstack) -> Config B with single project
|
+-- 5-15 people ----------------------> CONFIG C: Medium Team
    +-- Parallel sprint scopes?
        +-- Yes (different areas/teams) -> Config C full
        +-- No (one sprint for all) -> Config B is sufficient
```

## Step 2: Create Custom Fields

Custom fields are created at the **workspace level**. This is critical — workspace-level fields survive any project restructuring.

Use Orchestra MCP to create all 6 fields:

```
manage_field: create Artifact (text)
manage_field: create Type (option) -> PRD, RFC, ADR, Epic, Spec, Problem, Evidence, Note
manage_field: create Depth (option) -> Tactical, Standard, Deep, Critical
manage_field: create Phase (option) -> Shape, Validate, Code, Evidence, Done
manage_field: create Sprint (text)
manage_field: create Branch (text)
```

These 6 fields are the same for ALL configurations (A, B, C).

## Step 3: Create Project Structure

### Config A: Solo Dev

```
Workspace: <Your Workspace>
+-- Project: "Development"
```

One project. All tasks go here. Simple.

```
create_entity: Project "Development"
```

### Config B: Small Team (2-5)

```
Workspace: <Your Workspace>
+-- Project: "Backend"        (or "Core Platform")
+-- Project: "Frontend"       (or "Desktop App")
+-- Project: "Backlog"        (unsorted, triage)
+-- Project: "Operations"     (CI, infra, releases)
```

```
create_entity: Project "Backend"
create_entity: Project "Frontend"
create_entity: Project "Backlog"
create_entity: Project "Operations"
```

### Config C: Medium Team (5-15)

```
Workspace: <Your Workspace>
+-- Project: "Backend"
|   +-- Sub-project: "Backend Sprint 1"
|   +-- Sub-project: "Backend Backlog"
+-- Project: "Frontend"
|   +-- Sub-project: "Frontend Sprint 1"
|   +-- Sub-project: "Frontend Backlog"
+-- Project: "Operations"
+-- Channel: "Engineering"
+-- Channel: "Standup"
```

```
create_entity: Project "Backend"
  create_entity: Sub-project "Backend Sprint 1" (contextUid=Backend)
  create_entity: Sub-project "Backend Backlog" (contextUid=Backend)
create_entity: Project "Frontend"
  create_entity: Sub-project "Frontend Sprint 1" (contextUid=Frontend)
  create_entity: Sub-project "Frontend Backlog" (contextUid=Frontend)
create_entity: Project "Operations"
create_entity: Channel "Engineering"
create_entity: Channel "Standup"
```

## Step 4: Initialize Forgeplan

```bash
forgeplan init -y
forgeplan health
```

## Step 5: Create First Artifact + Task

```bash
forgeplan route "project description"
forgeplan new epic "Project Name"
# -> EPIC-001 created

# Then in Orchestra:
create_entity: task "[EPIC-001] Project Name"
set_fields: Artifact=EPIC-001, Type=Epic, Phase=Shape
```

## Step 6: First Sprint

1. `forgeplan route` each planned task to determine depth
2. Create artifacts (PRD, RFC based on depth)
3. Create matching tasks in Orchestra with all fields
4. Set Sprint = "Sprint 1"
5. Use `/sprint` to begin work

## Step 7: Verify AI Environment

1. Confirm CLAUDE.md contains Session Start Protocol reference
2. Confirm memory contains unified workflow architecture context
3. Run `/sync` to verify Forgeplan-Orchestra connection
4. Run `/session-start` to confirm it sees tasks and artifacts

## Quick Verification Checklist

- [ ] 6 custom fields created at workspace level
- [ ] Project structure matches chosen config
- [ ] `forgeplan init` completed
- [ ] First artifact created in Forgeplan
- [ ] Matching task created in Orchestra with fields
- [ ] `/session-start` shows both Forgeplan health and Orchestra tasks
- [ ] `/sync` shows no discrepancies
