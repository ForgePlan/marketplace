---
name: briefing
description: Morning briefing on tasks and messages — collects overdue, due today, @mentions, unread chats, and project stats from any available task tracker (Orchestra MCP, Linear MCP, Jira MCP, GitHub Issues) or from local TODO files. Use at the start of the workday or when the user asks "what's on my plate", "morning standup", or similar. Triggers (EN/RU) — "daily briefing", "what's on my plate", "morning standup", "что у меня сегодня", "что висит", "брифинг", "standup", "/briefing".
---

# Daily Briefing

A 10-second morning snapshot: overdue, today, @mentions, unread, project stats.
The skill is task-tracker-agnostic — it works with any available MCP (Orchestra,
Linear, Jira, Asana, GitHub Issues) or, as a last resort, with local project
TODO files.

---

## Project context (read first)

If the project ran `/setup`, the concrete issue tracker is wired into:

- `@docs/agents/issue-tracker.md` — which tracker is in use, which commands/MCPs
  list/create issues, which labels map to canonical triage roles.

Check via `test -f docs/agents/issue-tracker.md`. If present, use the tracker
from there directly (don't probe again). If absent, detect as before:
`mcp__orch__*` → `gh` CLI → Linear MCP → glob TODO files.

---

## When to use

- Start of the workday — the user wants a single command surfacing what to focus on.
- The user asks: "what's on my plate", "what's hanging", "standup", "briefing", "what's new".
- Optional focus — a project name, or `urgent` mode (only overdue + mentions + unread).

## When NOT to use

- The user needs code context, not task context — use [`restore`](../restore/SKILL.md).
- No task tracker and no TODO files — the skill can't produce a briefing; say so and offer an alternative.
- The user wants a full project overview (architecture, RFC progress) — that's [`research`](../research/SKILL.md).

---

## Source detection (mandatory first step)

Before collecting data, find out **which source is available** — listed in priority order:

| Source | How to detect | Tools |
|---|---|---|
| **Orchestra MCP** | `mcp__orch__*` or `mcp__orchestra__*` present | `get_current_context`, `get_workspace_overview`, `get_unread_chats`, `get_mentions`, `query_entities` |
| **Linear MCP** | `mcp__linear__*` available | `list_my_issues`, `list_assigned_issues` |
| **Jira MCP** | `mcp__jira__*` or `mcp__atlassian__*` | `search_issues`, `get_my_issues` |
| **GitHub Issues** | `gh` CLI on PATH (via Bash) | `gh issue list --assignee @me --state open` |
| **Local TODO** | `TODO.md`, `TODO_*.md`, `**/docs/TODO.md` | Read + Grep |

If nothing is found — tell the user briefly and offer to specify a source or use [`restore`](../restore/SKILL.md).

---

## Input

`$ARGUMENTS` — optional modifier:

- empty → full briefing.
- `urgent` → only overdue + @mentions + unread.
- project name → filter by project.
- `full` → everything including starred / saved.

---

## Process

### 1. Parallel collection (source-dependent)

#### If Orchestra MCP is available:

```
mcp__orch__get_current_context()
mcp__orch__get_workspace_overview()
mcp__orch__get_unread_chats()
mcp__orch__get_mentions()
mcp__orch__get_reminders()
mcp__orch__get_starred_messages()
mcp__orch__query_entities(repoType="folder", repoUid="today")
mcp__orch__query_entities(repoType="folder", repoUid="expired")
mcp__orch__query_entities(repoType="folder", repoUid="assigned_to_me")
mcp__orch__query_entities(repoType="folder", repoUid="recently_completed")
```

Fire all queries in a single tool-call message (they're independent).

#### If Linear / Jira / GitHub Issues:

Same pattern — parallel calls to the relevant tools:

- my assigned tasks, status Open
- overdue (filter by due date < today)
- recently completed in the last 7 days
- comment mentions (if supported)

#### If only local TODOs:

```bash
# find every TODO file
find . -maxdepth 4 -name "TODO*.md" -not -path "*/node_modules/*" -not -path "*/.git/*"
```

Read and parse:

- `[ ]` without a date → backlog
- `[ ]` with date `(YYYY-MM-DD)` in the past → overdue
- `[ ]` with date = today → due today
- `[x]` — completed (last 7 days via git blame, if you want precision)

### 2. Apply the filter (`$ARGUMENTS`)

- `urgent` → only Overdue + Unread + Mentions + Recommended Actions.
- project name → filter every section by project.
- empty/`full` → everything.

### 3. Presentation

Output format — fixed-column tables:

```markdown
# Daily Briefing — $DATE

**Source**: $SOURCE  | **User**: $USER

---

## Urgent attention

### Overdue ($COUNT)
| Task | Project | Due | Days Late | Priority |

### Unread ($COUNT)
| Chat | Type | Unread | Last Message |

### @Mentions ($COUNT)
| From | In | Message | When |

---

## Today

### Due Today ($COUNT)
| Task | Project | Status | Priority |

### Assigned to Me ($COUNT)
| Task | Project | Status | Priority |

---

## Project Status
| Project | Total | Backlog | To Do | Doing | Review | Done |

---

## Quick Stats
| Metric | Count |
| Total active tasks | N |
| Assigned to me | N |
| Due today | N |
| Overdue | N |
| Recently completed (7d) | N |

---

## Recommended Actions

1. **[Priority]** [action] — [reason]
2. **[Priority]** [action] — [reason]
```

Empty sections (0 items) — **don't print** them, except Quick Stats (always shown).

### 4. Recommended Actions — logic

- Overdue → "Update or close: …".
- Unread (>5) → "Read most active chat: …".
- @Mentions → "Reply: …".
- Tasks in "Doing" >3 days → "Move to Review or close: …".
- Reminders due today → remind.

---

## Modes (via `$ARGUMENTS`)

### `urgent`

Only Overdue + Unread + Mentions + Recommended. Ideal when the user is checking in between meetings.

### Project name (e.g. `Development`)

All sections, filtered by project. Use the source's native filter (Orchestra `repoType="project"`, Linear `team`, Jira `project=`).

### `full`

Everything, including starred / reminders / saved. Default mode is compact and skips them.

---

## Related skills

- [`restore`](../restore/SKILL.md) — code-side context restoration (git, memory).
- [`do`](../do/SKILL.md) — after a briefing, users often launch a specific task.

## Anti-patterns

- **Don't invent tasks** when no source is available — say "no data" honestly.
- **Don't print 50 lines when 5 will do** — that's what `urgent` mode is for.
- **Don't recommend generic actions** — a recommendation without a concrete task UID/link is useless.
