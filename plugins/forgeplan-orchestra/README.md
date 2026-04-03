[English](README.md) | [Русский](README-RU.md)

# forgeplan-orchestra

> Three systems as one organism. Each does what it does best.

## The Idea

| System | Owns | Role |
|--------|------|------|
| **Forgeplan** | Artifacts, validation, R_eff, evidence, quality gates | **What** to do and why |
| **Orchestra** | Tasks, statuses, assignees, due dates, messages | **Who** does what and when |
| **Claude Code** | Skills, hooks, agents, memory, git workflow | **How** to do it |

Each system does what it does best. We don't duplicate -- we link. Artifact ID in Orchestra points to Forgeplan content. Status in Orchestra maps to Phase in Forge pipeline automatically.

> **Note:** Requires **forgeplan CLI** (private ForgePlan application, access through project admin) + **Orchestra MCP server** configured (`mcp__orch__*` tools available). Product: [orchestra.pm](https://www.orchestra.pm/)

## Quick Start

```bash
/plugin install forgeplan-orchestra@ForgePlan-marketplace
```

## Usage

### `/session` -- Session Start Protocol

```
> /session

Step 1: Context restored from Hindsight + CLAUDE.md
Step 2: Inbox collection...
  2 new messages in Orchestra
  3 commits since last session
  forgeplan health: 1 blind spot (RFC-003)

Step 3: Project health
  Active tasks: [PRD-021] Doing, [PROB-021] Review
  Overdue: none

Step 4: Inbox triage
  Inbox (3 signals):
  1. @alice on PROB-021: "Should we add caching?" -> New idea (PRD?)
  2. 3 commits without artifact -> Probably tactical
  3. RFC-003 stale 60 days -> Renew or deprecate?
  
  What to do? [1->PRD, 2->skip, 3->deprecate]

Step 5: Synthesis
  Continue: [PRD-021] ADI Quality (Doing)
  Then: fix RFC-003 blind spot
```

### `/sync` -- Bidirectional Sync

```
> /sync

Comparing Forgeplan <-> Orchestra...

| Status | Artifact | In Forge | In Orch | Action |
|--------|----------|----------|---------|--------|
| MISSING | PRD-025 | active | -- | Create task? |
| MISMATCH | PRD-021 | active | Doing | Update to Done? |
| OK | PROB-021 | draft | Review | In sync |

Apply changes? [y/n]
```

## Status <-> Phase Mapping

| Orchestra Status | Forge Phase | What's happening |
|------------------|-------------|------------------|
| Backlog | Shape | Artifact being filled |
| To Do | Validate | Artifact validated, ready for work |
| Doing | Code | Code being written |
| Review | Evidence | Audit + evidence creation |
| Done | Done | Artifact activated |

## Custom Fields (6 total, workspace-level)

| Field | Type | Example |
|-------|------|---------|
| Artifact | text | `PRD-021` |
| Type | option | PRD / RFC / ADR / Epic / Spec / Problem / Evidence / Note |
| Depth | option | Tactical / Standard / Deep / Critical |
| Phase | option | Shape / Validate / Code / Evidence / Done |
| Sprint | text | `Sprint 10` |
| Branch | text | `feat/pdf-export` |

## Safety Rules

- **NEVER** `mcp__orch__send_message` without explicit user request
- **NEVER** `mcp__orch__delete_entity` without confirmation
- **ALWAYS** `mcp__orch__search_entities` before `create_entity` (no duplicates)

## Credits

- **[Orchestra](https://www.orchestra.pm/)** -- task tracking and team collaboration
- **[Forgeplan](https://github.com/ForgePlan)** -- artifact methodology and quality framework
- Architecture: [UNIFIED-WORKFLOW.md](https://github.com/ForgePlan/forgeplan/blob/dev/docs/guides/UNIFIED-WORKFLOW.md)

## License

MIT
