---
name: session-start
description: "Session Start Protocol with Inbox Pattern. Restores context, collects signals from Orchestra/Git/Forgeplan, triages inbox, recommends next action."
---

# Session Start Protocol with Inbox Pattern

## Purpose

Restore full project context at the beginning of each Claude Code session.
Collect signals from all sources, triage them, and recommend concrete next actions.
Output should be brief and actionable — 10-15 lines max.

## Procedure

### Step 1: Context Restore

- CLAUDE.md loads automatically (project conventions, rules).
- If Hindsight MCP is available: call `memory_recall` with query "Forgeplan" to restore cross-session context.
- If no memory MCP available: check `~/.claude/projects/*/memory/MEMORY.md` for auto-memory notes.
- Skip memory step silently if neither is available.

### Step 2: Inbox Collection (read-only)

Collect signals from all sources in parallel. This step is purely read-only and safe.

**Orchestra signals:**
- `mcp__orch__query_entities(repoType:"folder", repoUid:"all")` — find tasks with Status = Doing or Review
- Check for unread messages and @mentions on active tasks

**Git signals:**
- `git log --oneline --since="24 hours ago"` — recent commits (adjust timeframe based on last session)

**Forgeplan signals:**
- `forgeplan health` — blind spots (active without evidence), orphans (no links), stale artifacts

### Step 3: Project Health

Synthesize health from both systems:

**Forgeplan health:**
- Active artifacts count, draft count
- Blind spots (active without evidence)
- Orphans (artifacts without links)
- Stale artifacts (no updates in 30+ days)

**Orchestra health:**
- Tasks in Doing / Review (active work)
- Overdue tasks (due date < today, Status != Done)
- Unread messages count

### Step 4: Inbox Triage (if signals exist)

If any signals were collected, prioritize them:

- **Red — action needed**: overdue tasks, @mentions, blind spots, failing tests
- **Yellow — good to know**: new commits by others, chat messages, stale artifacts
- **White — background**: AI observations, minor health issues

Present the inbox to the user with suggested actions for each signal.
Wait for user decisions before executing anything.

If no signals beyond normal work — skip this step entirely.

### Step 5: Synthesis and Recommend

Produce a brief summary:

```
Session Start:
  In progress: [list active tasks with Status/Phase]
  Health: [blind spots, overdue, key metrics]
  Inbox: [N signals — X red, Y yellow] (if any)
  Next action: [concrete recommendation based on methodology]
```

## Recommendation Logic

- If there are red inbox signals -> "Address [signal] first"
- If there are blind spots -> "Fix blind spots: [artifact] needs evidence"
- If there are Doing tasks -> "Continue [task] (Phase: X)"
- If all current work is Done -> "Start next sprint task: [suggestion]"
- If sprint is empty -> "Plan next sprint — check Backlog"

## Rules

- Keep output to 10-15 lines maximum — brief and actionable
- All collection steps are read-only — never modify state during session start
- If Orchestra is unreachable, proceed with Forgeplan + Git only (graceful degradation)
- For short questions ("how does X work?"), CLAUDE.md context is sufficient — skip full protocol
- For continuation of explicit work ("continue where I left off"), context already exists — skip
