[English](TRACKER-INTEGRATION.md) | [Русский](TRACKER-INTEGRATION-RU.md)

# Tracker integration recipes

How to wire `fpl-skills` to read from your task tracker (Orchestra, GitHub Issues, Linear, Jira) or local TODO files. The tracker config lives in `docs/agents/issue-tracker.md`, written by `/setup` and read by `/briefing`, `/restore`, `/session`.

> [!NOTE]
> `/fpl-init` and `/setup` auto-detect the tracker by probing the environment (Orchestra MCP availability, `gh` CLI, Linear MCP, local `TODO*.md`). The recipes below are for **manual configuration** if auto-detection picked the wrong tracker, or for adding a tracker to an existing project.

---

## Pick your tracker

| Tracker | Why pick it | Cost |
|---|---|---|
| **Orchestra** | Tightest fpl-skills integration: bidirectional sync via `forgeplan-orchestra`, Inbox Pattern, Status↔Phase mapping. Best for teams. 5-free seats | [orch.so](https://orch.so) — paid SaaS |
| **GitHub Issues** | Free, lives next to your code. Works for OSS or repos already on GitHub. | Free with the repo |
| **Linear** | Modern UX, MCP-first integration. Good for teams already on Linear. | Paid SaaS, free tier exists |
| **Jira** | Enterprise standard. Use if your org mandates it. | Paid SaaS |
| **Local `TODO.md`** | Zero deps. Good for solo work or as fallback when MCP servers are unavailable. | Free |

---

## Orchestra (recommended for teams)

### Prerequisites

- [`forgeplan-orchestra`](../plugins/forgeplan-orchestra/README.md) plugin installed.
- Orchestra MCP server running and declared in `.mcp.json`:

```json
{
  "mcpServers": {
    "orch": {
      "type": "http",
      "url": "http://localhost:28173/mcp"
    }
  }
}
```

(Adjust URL to your Orchestra instance — local proxy or hosted.)

### `docs/agents/issue-tracker.md`

```markdown
# Issue tracker

**Type**: Orchestra
**Workspace**: `<your-orchestra-workspace-id>`
**MCP server**: `orch` (declared in `.mcp.json`)

## How to list

```
mcp__orch__query_entities(status: "in_progress")
mcp__orch__query_entities(assignee: "me")
```

## How to create

```
mcp__orch__create_entity(
  type: "task",
  title: "[PRD-NNN] description",
  status: "Backlog",
  phase: "Shape"
)
```

## Triage labels

- `priority:p0`/`p1`/`p2`/`p3`
- `kind:bug`/`feature`/`chore`/`docs`
- `phase:shape`/`validate`/`code`/`evidence`/`done`
```

### What works

- `/briefing` reads open Orchestra entities for "today's focus".
- `/session` (from `forgeplan-orchestra`) inboxes signals: messages, mentions, due tasks, forgeplan blind spots.
- `/sync` does bidirectional diff between Forgeplan artifacts and Orchestra tasks (per Status↔Phase mapping).
- Task naming convention: `[ARTIFACT-ID] description` so the resolver can map both ways.

---

## GitHub Issues

### Prerequisites

- `gh` CLI installed and authenticated: `gh auth status`.
- Repo declared as a GitHub remote: `git remote -v` shows `github.com/<org>/<repo>`.

### `docs/agents/issue-tracker.md`

```markdown
# Issue tracker

**Type**: GitHub Issues
**Repo**: `<org>/<repo>` (auto-detected from `git remote`)
**Auth**: `gh auth status` must show authenticated

## How to list

```bash
gh issue list --state open --limit 20
gh issue list --assignee @me
gh issue list --label "priority:p0"
```

## How to create

```bash
gh issue create --title "[PRD-NNN] description" --body "..." \
  --label "kind:feature,priority:p1"
```

## How /briefing reads

Runs `gh issue list --state open --assignee @me` and groups by:
- Open & assigned to me
- Open & mentioned in last 7 days (`gh search issues mentions:@me created:>7d`)
- Open with priority p0/p1

## Triage labels

- `priority:p0`/`p1`/`p2`/`p3`
- `kind:bug`/`feature`/`chore`/`docs`
- `phase:shape`/`code`/`review`
```

### What works

- `/briefing` runs `gh issue list` and presents grouped output.
- `/restore` reads the issue mentioned in the current branch name (`feat/issue-42-auth` → fetches Issue #42).
- Manual sync only — no `/sync` equivalent for GitHub Issues yet.

### Tip — issue ↔ branch convention

Use `feat/issue-NNN-short-description` branch naming. `/restore` extracts the issue number and fetches it for context.

---

## Linear

### Prerequisites

- Linear MCP server (e.g. [`linear-mcp`](https://github.com/linear/linear-mcp)) declared in `.mcp.json`.
- Linear API key set in env: `export LINEAR_API_KEY=lin_...`.

### `docs/agents/issue-tracker.md`

```markdown
# Issue tracker

**Type**: Linear
**Workspace**: `<your-linear-team-id>`
**MCP server**: `linear` (declared in `.mcp.json`)
**Auth**: `LINEAR_API_KEY` in env

## How to list

```
mcp__linear__list_issues(state: "in_progress")
mcp__linear__list_issues(assignee: "me")
```

## How to create

```
mcp__linear__create_issue(
  title: "[PRD-NNN] description",
  team: "<team-id>",
  priority: 2,
  labels: ["bug" | "feature"]
)
```

## How /briefing reads

`mcp__linear__list_issues(filter: { assignee: { isMe: true }, state: { type: { in: ["unstarted", "started"] } } })`
```

### What works

- `/briefing` reads Linear issues assigned to you.
- `/restore` cross-references the current branch with a Linear issue ID (Linear issue IDs like `ENG-123` are visible in branch names).
- No bidirectional `/sync` yet — request it via [forgeplan-orchestra issues](https://github.com/ForgePlan/marketplace/issues) if useful.

---

## Jira

### Prerequisites

- Jira API token: `export JIRA_API_TOKEN=...` and `JIRA_EMAIL=...` and `JIRA_BASE_URL=https://yourorg.atlassian.net`.
- A Jira MCP server (community options exist; check `mcpservers.org`).

### `docs/agents/issue-tracker.md`

```markdown
# Issue tracker

**Type**: Jira
**Project**: `<your-jira-project-key>`  (e.g. PROJ)
**Base URL**: `https://yourorg.atlassian.net`
**Auth**: `JIRA_API_TOKEN` + `JIRA_EMAIL` in env (or via MCP server config)

## How to list

```bash
# JQL via curl:
curl -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_BASE_URL/rest/api/3/search?jql=assignee=currentUser()+AND+status!=Done&maxResults=20"

# Or via MCP server:
mcp__jira__search(jql: "assignee=currentUser() AND status!=Done")
```

## How to create

```
mcp__jira__create_issue(
  project: "PROJ",
  summary: "[PRD-NNN] description",
  issuetype: "Story",
  priority: "Medium"
)
```

## Field conventions

- Priority: `Highest` / `High` / `Medium` / `Low` / `Lowest` (Jira default)
- Type: `Story` / `Bug` / `Task` / `Epic`
- Custom field for forgeplan artifact ID (recommended): `Artifact-ID`
```

### What works

- `/briefing` runs JQL via MCP, groups by status / priority.
- Status mapping (similar to Orchestra): `To Do → Shape`, `In Progress → Code`, `In Review → Evidence`, `Done → Done`.
- No bidirectional sync yet — manual or via Atlassian's own automation rules.

---

## Local `TODO.md` (no MCP, no SaaS)

Best when working solo, on a laptop without internet, or as a fallback.

### `docs/agents/issue-tracker.md`

```markdown
# Issue tracker

**Type**: Local
**File**: `TODO.md` at repo root (or `docs/TODO.md`)

## Format

```markdown
# TODO

## P0 (today)
- [ ] [PRD-NNN] description
- [x] completed task

## P1 (this week)
- [ ] [RFC-MMM] description

## Backlog
- [ ] idea worth keeping
```

## How /briefing reads

Parses `TODO.md` looking for:
- Unchecked items in `## P0` and `## P1` sections
- `[ARTIFACT-ID]` patterns to cross-reference with forgeplan
- Items modified in the last 7 days (`git log -p TODO.md`)

## How to create

Just edit `TODO.md` — `/briefing` picks up changes on next run.
```

### What works

- `/briefing` parses the file and outputs grouped tasks.
- Zero deps — works offline.
- No statuses (just checked/unchecked), no assignees, no due dates. Use a real tracker for those.

### Combining local + remote

You can keep `TODO.md` for personal scratch + GitHub Issues for tracked work. `/briefing` will check both if `docs/agents/issue-tracker.md` lists both as fallback:

```markdown
**Type**: GitHub Issues + Local
**Primary**: GitHub Issues (gh CLI)
**Fallback**: TODO.md (when offline or for personal tasks)
```

---

## Re-running `/setup` to switch trackers

If you started with one tracker and want to switch:

```
/setup
```

`/setup` re-prompts the tracker section (Section A). It probes available options in priority order:

1. Orchestra MCP (`mcp__orch__get_current_context`)
2. GitHub Issues (`gh repo view`)
3. Linear (`linear-cli` or Linear MCP)
4. Local `TODO*.md` exists

Confirm or override the auto-detection. The wizard rewrites `docs/agents/issue-tracker.md` with the new tracker.

---

## Troubleshooting

### "/briefing returns nothing"

Check `docs/agents/issue-tracker.md` exists and has `**Type**:` set. If empty or `Type: None` — re-run `/setup`.

### "MCP server unavailable"

```
mcp__hindsight__memory_status   # generic MCP probe
```

If your tracker MCP returns disconnected, the briefing falls back to local `TODO.md` (if configured) or returns "tracker offline; no signals collected".

### "GitHub Issues briefing is slow"

`gh issue list` can be slow on large repos. Add a filter to `docs/agents/issue-tracker.md`:

```markdown
## How to list (optimised)

```bash
gh issue list --assignee @me --state open --limit 10
```
```

`/briefing` will use the optimised query.

### "Linear/Jira: API key not picked up"

Ensure the env var is exported in the shell that started Claude Code, not just in `.env` (Claude Code reads process env, not arbitrary `.env` files). Use `direnv` or `set -a && source .env && set +a` before launching `claude`.

---

## Multi-tracker setups

Some teams use Orchestra for engineering work and GitHub Issues for OSS contributors. `docs/agents/issue-tracker.md` supports a primary/fallback scheme:

```markdown
# Issue tracker

**Type**: Multi
**Primary**: Orchestra (`mcp__orch__*`)
**Fallback**: GitHub Issues (`gh` CLI for external contributors)

## Routing rules

- Internal team work → Orchestra
- Issues opened by external contributors → GitHub Issues, mirrored to Orchestra weekly via manual sync
```

`/briefing` reads both and groups results by source.

---

## See also

- [DEVELOPER-JOURNEY.md § Team with Orchestra](DEVELOPER-JOURNEY.md#-team-with-orchestra) — narrative walkthrough of the Orchestra setup.
- [USAGE-GUIDE.md § Daily workflow](USAGE-GUIDE.md#daily-workflow) — where `/briefing` and `/session` fit into the day.
- [`plugins/forgeplan-orchestra/README.md`](../plugins/forgeplan-orchestra/README.md) — Orchestra plugin specifics.
- [`plugins/fpl-skills/skills/setup/SKILL.md`](../plugins/fpl-skills/skills/setup/SKILL.md) — `/setup` wizard internals.
