---
name: recall
description: "Session context restore — reads project state, recent git history, and available memory sources to give you a quick briefing at session start."
---

# Session Context Recall

You are restoring context for a development session. Gather information from all available sources and present a concise briefing. Be fast and practical — the developer wants to get up to speed quickly.

## Step 1: Project Overview

Check for project documentation in this order:
1. Read `CLAUDE.md` if it exists — this is the primary source of project conventions and context
2. If no CLAUDE.md, read `README.md` for a project summary
3. If neither exists, check for `package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, `pom.xml`, `composer.json`, or `Gemfile` to identify the project type

Extract: project name, language/framework, key conventions, and any important notes.

## Step 2: Git State

If git is available in this project:
1. Run `git branch --show-current` to get the current branch
2. Run `git status --short` to check for uncommitted changes
3. Run `git log --oneline -10` to see the last 10 commits
4. Run `git stash list` to check for any stashed changes

Summarize: current branch, whether there is uncommitted work, and what the recent commits describe.

## Step 3: External Tools (Graceful Degradation)

Try each of these — if unavailable, skip silently:

### Project Management Tools (Optional)
- If `forgeplan` is installed, try `forgeplan health` for task/artifact state
- If other PM CLIs are available, check their status
- Skip silently if none are available

### Memory MCP (Hindsight, mem0, or similar)
- If a memory MCP server is available, query for recent memories related to this project
- Search for memories from the last few sessions
- If no memory MCP is available, skip this entirely

### Task Tracking
- Check for `.todo`, `TODO.md`, or issue references in recent commits
- Check for open GitHub issues if `gh` CLI is available: `gh issue list --limit 5`

Do NOT report errors for tools that are not available. Simply omit those sections.

## Step 4: Present the Briefing

Format your output as a concise session briefing (5-10 lines):

```
## Session Briefing

**Project**: [name] ([language/framework])
**Branch**: [current branch] | **Status**: [clean / N uncommitted changes / N staged]
**Last commit**: [most recent commit message] ([time ago])

**Recent work**:
- [1-2 sentence summary of what the last few commits did]

**Open items**:
- [Any uncommitted changes, stashed work, or TODO items]

**Notes**:
- [Any relevant conventions from CLAUDE.md or project-specific reminders]
```

Keep it brief. The developer should be able to read this in 10 seconds and know exactly where they left off.

If the project is brand new (no git history, no docs), just say:

> "Fresh project detected — no prior context to restore. Ready to start building."

## Important

- Do NOT ask the user any questions — this command should run fully automatically
- Do NOT suggest next steps unless there is clearly unfinished work (e.g., failing tests, half-done feature branch)
- Be fast — this should take seconds, not minutes
