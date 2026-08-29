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

> **Note:** Requires **forgeplan CLI** (private ForgePlan application, access through project admin) + **Orchestra MCP server** configured. Product: [orch.so](https://orch.so)
>
> **Tool names in this plugin are written bare** — `query_entities`, not `mcp__orch__query_entities`. The prefix differs per runtime (Claude Code uses two underscores between server and tool, OMP uses one), so a prefixed name is wrong in one of them. If you search your tool list for `mcp__orch__*` and find nothing, the server is probably fine — check your host's `/mcp` listing before concluding it is down.

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

- **ALWAYS** read a task's chat before acting on it — reading notifies nobody and is never optional
- **NEVER** `send_message` unless chat writing is explicitly enabled for the workspace; then only into the task's own chat, no `@`-mentions, one marked message per event
- **NEVER** `delete_entity` — orphans are reported, never deleted
- **NEVER** resolve the target workspace from `get_current_context` — it follows the UI; use configured UIDs and report mismatches
- **NEVER** set an assignee automatically — it pushes a notification to a person
- **NEVER** write a phase alongside a `Blocked` status — the task keeps the phase it had
- **ALWAYS** `search_entities` before `create_entity` (no duplicates)
- **ALWAYS** read `failedFields` before reporting a field as set — it arrives inside a *successful* response

## Credits

- **[Orchestra](https://orch.so)** -- task tracking and team collaboration
- **[Forgeplan](https://github.com/ForgePlan)** -- artifact methodology and quality framework
- Architecture: [UNIFIED-WORKFLOW.md](https://github.com/ForgePlan/forgeplan/blob/dev/docs/guides/UNIFIED-WORKFLOW.md)

## License

MIT
