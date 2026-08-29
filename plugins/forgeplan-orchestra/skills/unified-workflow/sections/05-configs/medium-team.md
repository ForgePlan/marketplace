# Config C: Medium Team (5-15 People)

**For**: A team with roles (PM, Dev, QA, Designer). Parallel sprint scopes per area.

## When to Use

- Team of 5-15 people with different roles
- Parallel sprint scopes (Core and Desktop work independently)
- PM needs cross-area visibility
- QA involvement (Review status = QA queue)

## Structure

```
Workspace: <Your Workspace>
+-- Project: "Core Platform"                    <- area
|   +-- Sub-project: "Core Sprint 10"           <- sprint scope
|   |   +-- [PRD-021] ADI Quality       @alice  Doing
|   |   +-- [RFC-005] Routing v2        @bob    To Do
|   |   +-- [QA] Regression tests       @dave   Backlog
|   +-- Sub-project: "Core Sprint 11"           <- planning
|   |   +-- (planning items)
|   +-- Sub-project: "Core Backlog"             <- area backlog
|       +-- [PROB-023] Search ranking   --      Backlog
|
+-- Project: "Desktop App"                      <- area
|   +-- Sub-project: "Desktop Sprint 10"
|   |   +-- [PRD-025] Desktop MVP      @carol  Doing
|   +-- Sub-project: "Desktop Backlog"
|
+-- Project: "Operations"                       <- cross-area
|   +-- Release v0.8.0 coordination     @pm     Doing
|   +-- CI pipeline optimization        @eve    To Do
|
+-- Channel: "Engineering"                      <- team-wide comms
+-- Channel: "Standup"                          <- daily updates
+-- Document: "Sprint 10 Goals"                 <- shared context
```

## Characteristics

| Parameter | Value |
|-----------|-------|
| Projects | 3-5 areas x sub-projects |
| Max tasks | ~300 total |
| Assignee | Required |
| Sprint tracking | **Sub-project** per sprint per area (NOT field!) |
| Views | Per-role views |
| Daily overhead | ~15 minutes (standup + status + triage) |
| Setup time | 1-2 hours |
| Max nesting | 3 levels (workspace -> project -> sub-project) -- this is the Orchestra LIMIT |

## What Changes vs Config B

| Aspect | Config B | Config C |
|--------|----------|----------|
| Sprint tracking | Field | Sub-project |
| Sprint transition | Change field value | Create new sub-project |
| Parallel sprints | Shared sprint | Per-area sprints |
| Communication | Task messages | + Channels |
| Shared documents | N/A | Orchestra Documents |
| QA workflow | Review status | Review = QA queue |
| Nesting | Workspace -> Project | Workspace -> Project -> Sub-project (MAX!) |

## Roles and Views

| Role | What They See | Primary View |
|------|---------------|-------------|
| **Developer** | Their tasks in current sprint | My Tasks + Current Sprint |
| **PM** | All tasks across all areas | Cross-area Sprint Overview |
| **QA** | Tasks in Review | Review Queue |
| **Designer** | Spec/PRD tasks | Type = Spec OR PRD |
| **Tech Lead** | Architecture tasks | Type = RFC OR ADR |

## Sprint Transition

At the end of a sprint:

1. Create new sub-project: "Core Sprint 11"
2. Move unfinished tasks to "Core Sprint 11" using `move_entity`
3. Move new tasks from "Core Backlog" to "Core Sprint 11"
4. Archive "Core Sprint 10" sub-project (do NOT delete!)

**Important**: In Config C, sprint = sub-project, NOT field. Do not use Sprint field and sub-project simultaneously (this is an anti-pattern).

## Limitations

- **3 levels of nesting is the Orchestra MAXIMUM.** Cannot add another level. If more depth is needed, use parent-child tasks within a sub-project.
- **Sprint sub-projects multiply** -- 24+ sub-projects per area per year. Mitigation: archive completed sprints (showArchived=false by default).
- **Cross-area tasks** live in one sub-project with a subtask reference in another. Use Relations for visibility.

## When to Downsize to Config B

- Team shrinks below 5 people
- Overhead of sub-projects is not justified
- Single sprint scope is sufficient

Migration C -> B takes about 30 minutes. See brownfield.md for details.
