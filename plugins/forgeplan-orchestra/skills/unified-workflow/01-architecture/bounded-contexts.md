# Three Bounded Contexts

## Overview

The unified workflow connects three systems as a single organism. Each system does what it does best. Data lives in one place, references live everywhere.

## The Three Systems

### Forgeplan — What + Why (Methodology)

**Owns**: Artifacts, validation, R_eff scoring, evidence chains, lifecycle, depth routing, quality gates.

**Source of truth for**: What to do, why, and at what quality level.

Forgeplan manages the methodology layer. It knows about artifact types (PRD, RFC, ADR, Epic, Spec, Problem, Evidence, Note), their quality requirements, validation rules, and the evidence chain that proves work was done properly.

Key commands: `forgeplan health`, `forgeplan route`, `forgeplan new`, `forgeplan validate`, `forgeplan score`, `forgeplan activate`, `forgeplan list`, `forgeplan blocked`.

### Orchestra — Who + When (Task Tracking)

**Owns**: Tasks, statuses, assignees, due dates, checklists, messages, projects, sprints.

**Source of truth for**: Who is doing what, when, and in what status.

Orchestra manages the execution layer. It tracks the human and team aspects — who is responsible, what is the deadline, what is the current status, and what needs discussion.

Key MCP tools: `mcp__orch__query_entities`, `mcp__orch__create_entity`, `mcp__orch__set_fields`, `mcp__orch__search_entities`, `mcp__orch__get_entity`, `mcp__orch__read_messages`, `mcp__orch__manage_field`, `mcp__orch__list_fields`, `mcp__orch__move_entity`.

### Claude Code — How (AI Execution)

**Owns**: Skills, hooks, plugins, memory, agents, git workflow.

**Source of truth for**: How to do the work, cross-session context.

Claude Code is the execution engine. It does not store data long-term — it delegates to Forgeplan (artifacts) and Orchestra (tasks). It maintains session context through CLAUDE.md, Hindsight memory, and the Session Start Protocol.

## What NOT to Duplicate

These data items have a single source of truth. Never copy them into Orchestra:

| Data | Lives in | Why not duplicate |
|------|----------|-------------------|
| Artifact content (body, sections) | Forgeplan (LanceDB + .md files) | Orchestra is not a document store |
| R_eff score | Forgeplan (computed) | Stales instantly — always query live |
| Validation results | Forgeplan | Dynamic, changes with each validate |
| Evidence chain | Forgeplan (link graph) | Dependency graph belongs in Forgeplan |
| Git history | Git | `git log` / `git blame` are authoritative |

## What LIVES in Orchestra

These data items belong in Orchestra and should be maintained there:

| Data | Purpose |
|------|---------|
| Task name + Artifact ID field | Mapping and quick search |
| Status (Backlog -> Done) | Who and when |
| Phase (Shape -> Done) | Where in the methodology pipeline |
| Sprint | Grouping by time period |
| Branch | Link to git |
| Assignee | Who is responsible |
| Due date | Deadlines |
| Checklists | FR items for tracking progress |
| Messages | Communication in task context |

## Key Principles

### 1. Single Source of Truth

Data lives in one place. References (links, IDs) live everywhere. If you need artifact content, query Forgeplan. If you need task status, query Orchestra. Never copy data between systems.

### 2. Fields at Workspace Level

Custom fields are created at the workspace level in Orchestra. This means they are available in ANY project within the workspace and survive any project restructuring (migration between configs A, B, C).

### 3. Minimum Duplication

Do not copy what you can query. The Artifact field in Orchestra is a reference (like a foreign key), not a copy of the artifact content.

### 4. Graceful Degradation

If Orchestra is unavailable, Forgeplan works autonomously. Claude Code tasks serve as a fallback. Sync after Orchestra is restored.

### 5. Progressive Enhancement

Start with Config A (solo), grow to B (small team) or C (medium team) as needed. The workspace-level fields make migration painless.

## Bounded Context Boundaries

Each system has a strict boundary. Crossing these boundaries creates confusion:

| System | Does NOT handle |
|--------|----------------|
| **Forgeplan** | Task tracking, assignees, due dates, team communication |
| **Orchestra** | Artifact validation, R_eff scoring, evidence chains, quality gates |
| **Claude Code** | Long-term data storage (delegates to Forgeplan and Orchestra) |

## FPF Principles Behind This Architecture

- **FPF A.1.1 U.BoundedContext**: "Make meaning local; make translation explicit." Each system is a semantic locale with its own vocabulary. "Status" in Orchestra and "lifecycle" in Forgeplan are DIFFERENT concepts, even if they map to each other.

- **FPF A.7 Strict Distinction**: method != work != role. Forgeplan = method (HOW to think about work). Orchestra = work (WHAT is done by WHOM). Claude Code = role (WHO executes).

- **FPF B.3 Trust Calculus**: Custom fields in Orchestra are low-trust proxies. They show a reference to the artifact, but quality scoring is Forgeplan's responsibility.

- **FPF A.14 Mereology**: Forge has TWO orthogonal axes — artifact hierarchy (Epic -> PRD -> RFC) and execution flow (Sprint -> Wave -> Task). Orchestra reflects execution, not the artifact hierarchy.

## Hand-Off Points

The systems connect at these explicit hand-off points:

1. **Artifact created in Forgeplan** -> Task created in Orchestra (with Artifact field)
2. **Phase changes in Forgeplan** -> Status updated in Orchestra (and vice versa)
3. **Artifact activated in Forgeplan** -> Task marked Done in Orchestra
4. **Session starts in Claude Code** -> Context restored from both Forgeplan and Orchestra
5. **Sprint planned** -> Tasks created/moved in Orchestra, artifacts routed in Forgeplan

## Sync Direction

When Phase and Status conflict, **Status wins**. Orchestra is the source of truth for execution state. The AI agent updates both whenever either changes.

Mapping:
- Backlog <-> Shape
- To Do <-> Validate
- Doing <-> Code
- Review <-> Evidence
- Done <-> Done
