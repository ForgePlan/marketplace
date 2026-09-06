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
> **Tool names in this plugin are written bare** — `query_entities`, never a prefixed form. The prefix is doubly unstable: the runtime spelling differs (Claude Code puts two underscores between server and tool, OMP one), and the **server name itself is whatever the project's `.mcp.json` registered** — `orch` in one project, `orchestra-elirum` in another, and a project may legitimately register several Orchestra servers at once (different workspaces, different identities and rights — a human's session next to a scoped bot). So: resolve the server per project, not per plugin — and deterministically, not by judgement: run `scripts/orch-verify.sh` (ships with the `orchestra-task-cycle` skill). It finds the project's pin file — `.agents/orchestra.json` first (runtime-neutral: the same file serves Codex, OMP, Gemini), `.claude/orchestra.json` as legacy fallback — resolves the role to a server (`url` + `names` map runtime → registered name + `tokenEnv`, never a raw token), handshakes, and compares live `get_current_context` against the pinned workspace/user. Exit 0 = safe to write; 65 = mismatch, stop; 66 = no pin file (then: exactly one connected server with the Orchestra tool signature may be used, several — ask, never guess by name).
>
> **Orchestra also ships two server *variants*** with different tool sets: the desktop app's own endpoint (no auth; has `navigate_to`/`get_ui_context` and working message reads) and an agent endpoint behind a Bearer token (has `add_relation`/`remove_relation`/`approve_action`/`switch_workspace`/`list_workspaces`, but — as of 0.141-beta — no document layer, no entity creation, and hanging message reads). The capability split is catalogued in `skills/orchestra-task-cycle/references/failure-modes.md`.

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

## Skills

### `unified-workflow` — the architecture

How Orchestra tasks and forgeplan artifacts map onto one another.

### `orchestra-task-cycle` — the runbook

Working a single task end to end: **orient → read → claim → work → evidence → report → close**.
Seven stages, each with a gate — and a gate you cannot answer means the previous stage is not
finished. Every expensive failure in this workflow comes from starting stage N+1 on an unfinished
stage N.

Loads on its own when you say "what should I do next", "take this task", "close the task", "what is
blocked", "что дальше", "возьми задачу", "закрой задачу", or name a board, task, status, phase or
checklist.

Progressive disclosure — `SKILL.md` stays under the 2000-word threshold and the depth sits beside it:

| File | What is in it |
|---|---|
| `references/field-model.md` | eleven fields, the tag doctrine, the types that trap |
| `references/query-recipes.md` | reverse dependency search, sweeps, audits |
| `references/failure-modes.md` | how Orchestra refuses **silently** — the section to read before debugging |
| `examples/` | a full seven-stage pass, the `Blocked` variant, filing a task inline |
| `assets/` | skeletons for a task description and a completion report |
| `scripts/orch-verify.sh` | deterministic server resolution + write handshake against `orchestra.json` |
| `scripts/field-map.sh` | dumps the field-UID and option map |

Built from an audit of Orchestra's own sources and checked against a live board of 34 tasks — the
behaviour in `failure-modes.md` and `query-recipes.md` was observed on a running server, not derived
from documentation. One recipe was found wrong precisely because it was re-run rather than trusted.

#### The endpoint is not hardcoded

`scripts/field-map.sh` defaults to `http://localhost:28173/mcp` — the Orchestra desktop app on your
own machine. That is a fallback, not a fixed address:

```bash
ORCH_MCP_URL=https://orchestra.example.com/mcp ./scripts/field-map.sh
ORCH_MCP_TOKEN=<bearer> ORCH_MCP_URL=http://localhost:28174/mcp ./scripts/field-map.sh
```

Set `ORCH_MCP_URL` and the script talks to whatever server you point it at; set `ORCH_MCP_TOKEN`
too when the target is the Bearer-authenticated agent endpoint. Take both values from the
project's `.mcp.json` rather than guessing ports.

## Credits

- **[Orchestra](https://orch.so)** -- task tracking and team collaboration
- **[Forgeplan](https://github.com/ForgePlan)** -- artifact methodology and quality framework
- Architecture: [UNIFIED-WORKFLOW.md](https://github.com/ForgePlan/forgeplan/blob/dev/docs/guides/UNIFIED-WORKFLOW.md)

## License

MIT
