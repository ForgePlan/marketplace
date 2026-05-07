---
name: restore
description: Restores working session context — collects fresh info on the current branch, recent commits, uncommitted changes, stashes, and (if available) decisions from a memory system. Use at the start of a new session or after a long break, when you need to recall "where we left off". Triggers (EN/RU) — "restore context", "where did I stop", "что я делал", "восстанови контекст", "напомни на чём я остановился", "session start", "/recall".
---

# Restore Context

Quick session context restore: git history + working copy + (optionally)
persistent memory. Goal — give Claude and the user a clear "what was done,
what's left" snapshot in one pass, so work resumes without manually reopening files.

---

## Project context (read first)

If the project ran `/setup`, concrete paths and tracker are wired into:

- `@docs/agents/paths.md` — where TODOs/RFCs live (for git filters and recent-change search)
- `@docs/agents/issue-tracker.md` — which tracker (for fresh in-progress issues during recall)

Check via `test -d docs/agents`. If present, filter git log and memory queries
by the project's real paths. If absent, fall back to git log + glob over TODO files.

---

## When to use

- Start of a new session after a pause (a day, a week, a release).
- The user asks: "remind me", "recall", "where did we stop", "what was I doing", "restore".
- Before invoking [`do`](../do/SKILL.md), [`sprint`](../sprint/SKILL.md), or any long operation — so the plan reflects current state.
- Optional topic argument: "recall webhooks", "recall auth" — focuses the search on a specific area.

## When NOT to use

- Everything is already fresh in the current conversation — re-running recall just bloats the window.
- The user wants to change code or make a decision — that's a different task; recall is preparation only.

---

## Input

- Optional topic (`$ARGUMENTS`) — word/phrase to focus memory queries and the git filter.
- Empty → general overview (branch, recent commits, dirty state, stash, recent decisions).

---

## Process

### 1. Parallel collection

These steps are independent — run them in parallel (one tool-call message for everything):

#### 1a. Git snapshot

```bash
git branch --show-current
git status --short
git log --oneline --all --graph -15
git log --format="%h %ad %s" --date=relative -10
git diff --stat HEAD~5..HEAD 2>/dev/null || echo "Less than 5 commits"
git stash list
```

If the repo isn't git — skip this block and note it in the report.

#### 1b. Memory (optional, if available)

Check which persistent-memory sources exist in this session:

- **Hindsight MCP** — `memory_recall(query)` / `memory_reflect(query)`.
- **Knowledge files** — `notes/`, `decisions/`, `docs/decisions/`, `ADR-*.md`, `KNOWN-ISSUES.md` at the root or under `docs/`.
- **Custom system** — check `CLAUDE.md` for "project memory" conventions.

If no source is configured — skip the block, don't invent.

Baseline queries (adapt to whichever system is available):

```
"recent decisions, architecture changes, current sprint status"
"blockers, bugs, known issues, pending work"
```

If `$ARGUMENTS` is set:

```
"$ARGUMENTS — recent work, decisions, status, next steps"
```

#### 1c. Working copy

- Read the first 20–30 lines of `CLAUDE.md` (if present) — usually states "what this project is".
- Glance at the top-level `README.md` if there's no CLAUDE.md.

### 2. Synthesis

From what you collected, extract:

1. **Branch and intent** — branch names often contain RFC/issue/feature; mention if so.
2. **Progress** — last 5–10 commits in one phrase.
3. **Decisions** — key choices from memory (if available).
4. **Open items** — blockers, bugs, unfinished work.
5. **Dirty state** — uncommitted changes, stashes.

### 3. Presentation

A single markdown block with fixed structure:

```markdown
# Context — $DATE

**Branch**: `$BRANCH` | **Last commit**: $TIME ago

---

## Recent Commits

| Commit | When | Description |
| ------ | ---- | ----------- |

## Touched areas

(group by subdir/package/module)

## From memory

### Decisions

- ...

### Current focus

- ...

### Known issues

- ...

---

## Working tree

$STATUS  (or "Clean")

## Stashes

$STASHES (or "None")

---

## Possible next steps

1. ...
2. ...
```

Skip empty sections — don't print "no data" under each one.

### 4. Next-step hints

End with 2–4 recommendations grounded in what you found:

- Uncommitted changes → "Check `git diff` before continuing."
- Memory mentions an unfinished TODO → "Resume with: …".
- All commits clustered in one area → "Focus was [X], natural next step is [Y]."
- `$ARGUMENTS` matches an RFC/spec file → link the file and a one-line status.

---

## Related skills

- [`do`](../do/SKILL.md) — after restoring context, it's natural to delegate the task to the orchestrator.
- [`briefing`](../briefing/SKILL.md) — when restoration is about "human" tasks (deadlines, assignments) rather than code.
- [`research`](../research/SKILL.md) — when deep-diving into a topic instead of taking a quick snapshot.

## Anti-patterns

- **Don't recall before every message** — this is a session-start operation, not a health check.
- **Don't invent memory that isn't there** — if Hindsight/MCP is unavailable, mark "memory: not configured" instead of hallucinating decisions.
- **Don't dump the full `git log`** — 10–15 lines is enough; the rest is on demand.
