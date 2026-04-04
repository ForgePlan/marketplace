# Config B: Small Team (2-5 People)

**For**: A small development team, possibly with a PM. Each person may work on their own area.

## When to Use

- Team of 2-5 people
- Clear area separation (backend/frontend/infra)
- One sprint cycle for the whole team
- PM needs visibility across areas

## Structure

```
Workspace: <Your Workspace>
+-- Project: "Core Platform"          <- backend, core, CLI
|   +-- [PRD-021] ADI Quality         @alice  Doing    Sprint 9
|   +-- [RFC-005] New routing         @bob    To Do    Sprint 9
|   +-- [PROB-022] Parser edge case   @alice  Backlog  Sprint 10
|
+-- Project: "Desktop App"            <- Tauri, React, UI
|   +-- [PRD-025] Desktop MVP         @carol  Doing    Sprint 9
|   +-- [SPEC-001] UI Components      @carol  Backlog  Sprint 10
|
+-- Project: "Backlog"                <- unsorted, needs triage
|   +-- [PROB-023] Search ranking     --      Backlog  --
|   +-- New feature idea              --      Backlog  --
|
+-- Project: "Operations"             <- CI, infra, releases
    +-- Release v0.8.0 prep           @bob    To Do    Sprint 9
    +-- CI pipeline optimization      --      Backlog  --
```

## Characteristics

| Parameter | Value |
|-----------|-------|
| Projects | 3-5 (by areas + Backlog + Operations) |
| Max tasks | ~100 total, ~30 per project |
| Assignee | Required -- who is responsible |
| Sprint tracking | "Sprint" field (shared sprint for all) |
| Views | Per-project defaults + workspace views |
| Daily overhead | ~5 minutes (briefing + status check) |
| Setup time | 30 minutes |

## What Changes vs Config A

| Aspect | Config A | Config B |
|--------|----------|----------|
| Projects | 1 | 3-5 by areas |
| Assignee | Not needed | Required |
| Backlog | In same project | Separate project |
| Operations | None | Separate project |
| Task creation | Everything in "Development" | Need to choose project |
| Cross-area work | N/A | Parent task + subtasks |

## Area Routing Rules

When creating a task, route to the correct project:

- If Type = PRD/RFC/ADR/Problem AND scope contains "cli"/"core"/"backend" -> "Core Platform"
- If Type = PRD/Spec AND scope contains "ui"/"desktop"/"react"/"tauri" -> "Desktop App"
- If Type = None (operational task) -> "Operations"
- Otherwise -> "Backlog" (triage later)

## Rules for Working with Areas

1. **Task belongs to the area** where the main work happens. If a PRD needs both backend and frontend, main task goes in "Core Platform", subtask in "Desktop App".

2. **Backlog** = tasks without sprint and without assignee. Triage means: move to correct project + assign sprint.

3. **Operations** = everything not linked to artifacts: CI, releases, infra, docs.

4. **Cross-area dependencies** = use Orchestra Relations (related entities) + `forgeplan blocked`.

## Saved Views

| View | Scope | Filter |
|------|-------|--------|
| My Tasks | Workspace | Assignee = me AND Status != Done |
| Current Sprint | Workspace | Sprint = "Sprint N" AND Status != Done |
| All In Progress | Workspace | Status = Doing OR Review |
| Overdue | Workspace | Due date < today AND Status != Done |
| Needs Triage | Backlog project | Assignee = none |

## When to Upgrade to Config C

- Team grows to 5+ people with different roles (PM, Dev, QA, Designer)
- Need parallel sprint scopes (Backend and Desktop work independently)
- QA involvement requires a Review queue

Migration B -> C takes 1-2 hours. See brownfield.md for details.
