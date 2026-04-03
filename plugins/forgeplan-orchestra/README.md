[English](README.md) | [Русский](README-RU.md)

# forgeplan-orchestra

> Three systems as one organism. Each does what it does best. Data lives in one place, links everywhere.

Unified workflow plugin connecting **Forgeplan** (methodology + artifacts), **[Orchestra](https://www.orchestra.pm/)** (task tracking + team collaboration), and **Claude Code** (AI execution + memory) into a coherent system.

## The Idea

| System | Owns | Source of Truth |
|--------|------|-----------------|
| **Forgeplan** | Artifacts, validation, R_eff, evidence, quality gates | What to do and why |
| **Orchestra** | Tasks, statuses, assignees, due dates, checklists, messages | Who does what and when |
| **Claude Code** | Skills, hooks, agents, memory, git workflow | How to do it |

Each system does what it does best. We don't duplicate — we link. Artifact ID in Orchestra → Forgeplan holds the content. Status in Orchestra → Phase in Forge pipeline maps automatically.

## Install

```bash
/plugin install forgeplan-orchestra@forgeplan-marketplace
```

## Prerequisites

- **Forgeplan CLI** — private ForgePlan application, access through project admin
- **Orchestra MCP server** configured (`mcp__orch__*` tools available). Product: https://www.orchestra.pm/
- Orchestra workspace with 6 custom fields created (see knowledge base → Setup)
- **Recommended:** `dev-toolkit` plugin for `/sprint` and `/audit` commands

## Commands

### `/sync` — Bidirectional Sync

Shows diff between Forgeplan artifacts and Orchestra tasks, proposes actions, waits for your confirmation. **Never syncs automatically.**

```
📊 Sync Diff:
  IN FORGE NOT IN ORCH:  PRD-025 "PDF Export" — Create task?
  STATUS MISMATCH:       PRD-021 Forge=active, Orch=Doing — Update to Done?
  IN ORCH NOT IN FORGE:  "CI Pipeline" (no artifact) — OK (tactical)

What to do? [create PRD-025, update PRD-021, skip CI]
```

### `/session-start` — Session Start Protocol

5-step protocol with Inbox Pattern:

1. **Context Restore** — CLAUDE.md + Hindsight memory
2. **Inbox Collection** (read-only) — Orchestra chats, git log, forgeplan health
3. **Project Health** — blind spots, orphans, overdue tasks
4. **Inbox Triage** — prioritized signals (🔴 action / 🟡 info / ⚪ background)
5. **Synthesis** — what's in progress, what's next

## Status ↔ Phase Mapping

| Orchestra Status | Forge Phase | What's happening |
|---|---|---|
| Backlog | Shape | Artifact being filled |
| To Do | Validate | Artifact validated, ready for work |
| Doing | Code | Code being written |
| Review | Evidence | Audit + evidence creation |
| Done | Done | Artifact activated |

## Custom Fields (6 total, workspace-level)

| Field | Type | Example |
|---|---|---|
| Artifact | text | `PRD-021` |
| Type | option | PRD / RFC / ADR / Epic / Spec / Problem / Evidence / Note |
| Depth | option | Tactical / Standard / Deep / Critical |
| Phase | option | Shape / Validate / Code / Evidence / Done |
| Sprint | text | `Sprint 10` |
| Branch | text | `feat/pdf-export` |

## Agent: orchestra-advisor

Non-blocking background advisor:
- After `forgeplan new` → "Create matching task in Orchestra?"
- After `forgeplan activate` → "Mark task as Done?"
- At session start → suggests `/session-start`

## Knowledge Base

Agentic RAG with 5 sections from [UNIFIED-WORKFLOW.md](https://github.com/ForgePlan/forgeplan/blob/dev/docs/guides/UNIFIED-WORKFLOW.md):

| Section | Content |
|---|---|
| Architecture | 3 bounded contexts, what NOT to duplicate |
| Setup | Greenfield (3 configs) + brownfield migration |
| Fields | 6 custom fields, Status↔Phase mapping |
| Playbook | 10 daily scenarios + Inbox Pattern + prohibitions |
| Configs | Solo Dev, Small Team (2-5), Medium Team (5-15) |

## Safety Rules

- **NEVER** `mcp__orch__send_message` without explicit user request
- **NEVER** `mcp__orch__delete_entity` without confirmation
- **ALWAYS** `mcp__orch__search_entities` before `create_entity` (no duplicates)

## Credits

- **[Orchestra](https://www.orchestra.pm/)** — task tracking and team collaboration
- **[Forgeplan](https://github.com/ForgePlan)** — artifact methodology and quality framework
- Architecture: [UNIFIED-WORKFLOW.md](https://github.com/ForgePlan/forgeplan/blob/dev/docs/guides/UNIFIED-WORKFLOW.md) (1400 строк, v1.2)

## License

MIT
