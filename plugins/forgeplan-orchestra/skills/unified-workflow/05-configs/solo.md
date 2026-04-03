# Config A: Solo Dev + AI

**For**: One developer with AI agents. The most common case for Forgeplan.

## When to Use

- Personal project or pet project
- Solo development with AI-assisted workflow
- Beginning a new project (greenfield) before bringing on a team
- Prototyping and MVP phase

## Structure

```
Workspace: <Your Workspace>
+-- Project: "Development"
    +-- [PRD-021] ADI Quality           Doing / Code      Sprint 9
    +-- [PROB-021] ADI prompt bugs      Review / Evidence  Sprint 9
    +-- [RFC-005] New routing           Backlog / Shape    Sprint 10
    +-- Desktop App research            Backlog / Shape    --
    +-- ...
```

## Characteristics

| Parameter | Value |
|-----------|-------|
| Projects | 1 ("Development") |
| Max tasks | ~50 comfortably, ~100 with Views |
| Assignee | Not needed (everything = me) |
| Sprint tracking | "Sprint" field on task |
| Views | Current Sprint, In Progress, By Type |
| Daily overhead | ~0 minutes (AI does Session Start) |
| Setup time | 15 minutes |

## Workflow

**Morning:**
```
/session-start -> what's in progress, unread signals
forgeplan health -> blind spots
```

**Work:**
```
forgeplan route "task" -> depth
forgeplan new prd "Title" -> artifact
-> Orchestra: create task with fields
/sprint or /wave -> implementation
-> Orchestra: Status=Doing
/audit -> review
-> Orchestra: Status=Review
forgeplan activate -> done
-> Orchestra: Status=Done
```

**End of day:**
```
Check Orchestra status -> is everything current?
```

## Saved Views

| View | Filter |
|------|--------|
| Current Sprint | Sprint = "Sprint N" AND Status != Done |
| In Progress | Status = Doing OR Review |
| All PRDs | Type = PRD |
| Problems | Type = Problem |

## When to Upgrade to Config B

- A second person joins the project
- You need distinct area separation (backend vs frontend)
- You want assignee tracking

Migration A -> B takes about 30 minutes. See brownfield.md for details.
