---
name: gh-project
description: Project-agnostic GitHub Projects v2 integration. Reads per-project config from .forgeplan/state/gh-project.yaml; never hardcodes project numbers. Five operations — init (one-time setup), add-pr (current/given PR → board), link-prd (Standard+ PRD → matching GH issue + board entry with Forgeplan-ID field), sync-status (read forgeplan artifact status, write project board Status field), list (current items on board). Gracefully degrades when gh CLI scopes are missing or config absent. Triggers (EN/RU) — "gh-project", "add to project", "link prd to issue", "sync project status", "/gh-project", "добавь на доску", "связи с проектом", "обнови статус на доске".
disable-model-invocation: true
allowed-tools: Read Write Edit Bash(test *) Bash(ls *) Bash(cat *) Bash(pwd *) Bash(command *) Bash(git *) Bash(gh *) Bash(forgeplan *) Bash(jq *) Bash(python3 *)
---

# gh-project — GitHub Projects v2 integration

**Project-agnostic** skill that bridges forgeplan artifacts with a GitHub Projects v2 board. Reads per-project configuration from `.forgeplan/state/gh-project.yaml`; never hardcodes project numbers or owner names.

The marketplace's project board is `https://github.com/orgs/ForgePlan/projects/5` — but this skill works in **any** repo whose `.forgeplan/state/gh-project.yaml` points at any project owned by anyone. Setup is one-time per repo via `/gh-project init`.

---

## Project context (read first)

@docs/agents/issue-tracker.md
@docs/agents/paths.md

If `forgeplan` CLI is on `$PATH`, this skill is forgeplan-aware (cross-references PRD/RFC/ADR/Evidence). If not — `/gh-project add-pr` and `list` still work (they don't depend on forgeplan); `link-prd` and `sync-status` will refuse with a clear error.

---

## Configuration file

Single YAML at `.forgeplan/state/gh-project.yaml`. Created by `/gh-project init`, **never committed** (project board ID may be private; add to `.gitignore` if not already).

```yaml
schema_version: 1
project_number: 5             # GitHub project number (visible in URL)
project_owner: ForgePlan      # org or user that owns the project
project_node_id: PVT_kw...    # cached after init
field_ids:
  status:        PVTSSF_xxx
  type:          PVTSSF_yyy
  forgeplan_id:  PVTF_zzz     # text field
  plugin:        PVTSSF_www
  priority:      PVTSSF_vvv   # optional
status_options:
  Backlog:       abc123
  Ready:         def456
  In Progress:   ghi789
  In Review:     jkl012
  Done:          mno345
  Cancelled:     pqr678
type_options:
  PRD:           ...
  RFC:           ...
  ADR:           ...
  Feature:       ...
  Bug:           ...
  Docs:          ...
  Chore:         ...
auto_add_default_status: Backlog
last_sync: 2026-05-08T12:34:56Z
```

Field IDs cached for speed — `gh project item-edit` requires IDs not names. If a field is renamed/recreated upstream, `/gh-project init` re-runs to refresh.

---

## When to use

- One-time per repo: `/gh-project init` (interactive — asks project number, owner, verifies fields).
- After opening a PR: `/gh-project add-pr` (without args, picks up current PR via `gh pr view`).
- After `forgeplan new prd` for a Standard+ PRD: `/gh-project link-prd PRD-NNN` (creates issue, adds to board, sets Forgeplan-ID + Type).
- After forgeplan artifact transition (`activate`, `deprecate`, `supersede`): `/gh-project sync-status PRD-NNN` (writes Status to board).
- Anytime: `/gh-project list` (current board items, filtered).

## When NOT to use

- Tactical fixes — they take the PR-only path; auto-add workflow handles them automatically. Manual `/gh-project add-pr` only needed if auto-add is disabled.
- Project board doesn't exist yet — create it first via GitHub UI or `gh project create --owner ForgePlan --title "..."`. This skill assumes board exists.
- gh CLI not installed — refuse with install instruction (`brew install gh` / `apt install gh` / etc.).

---

## Auth scopes

`gh` CLI must have these scopes:

| Token type | Required scopes |
|---|---|
| Classic PAT | `project` (read+write projects), `repo` (for private repo issues) |
| Fine-grained | Organization permissions → **Projects: read+write**; Repository permissions → **Issues: read+write**, **Pull requests: read** |

Probe + surface (never auto-refresh):

```bash
gh auth status 2>&1 | grep -E "Token scopes|Active account"
```

If `project` scope is missing, surface:

```
Missing GH auth scope: project (read+write).
Run once: gh auth refresh -s read:project,write:project
Then re-run /gh-project <operation>.
```

---

## Operations

### `/gh-project init`

One-time per repo. Interactive prompts:

1. **Probe**: `gh auth status` → confirm scopes; `command -v gh` → confirm CLI.
2. **Ask**: project number (e.g. `5`), owner (e.g. `ForgePlan`).
3. **Verify** with `gh project view <num> --owner <owner> --format json`. If 404 → error with link to `gh project list --owner <owner>` for discovery.
4. **List fields** with `gh project field-list <num> --owner <owner> --format json`.
5. **Map** fields to expected slots (Status, Type, Forgeplan-ID, Plugin, Priority).
6. **Warn on missing recommended fields** — print exact `gh project field-create ...` command for each missing one. Don't auto-create (user-owned schema).
7. **Cache** project node-id, field IDs, single-select option IDs into `.forgeplan/state/gh-project.yaml`.
8. **Append** `.forgeplan/state/gh-project.yaml` to `.gitignore` if not already there.

**Re-run behaviour**: if config exists, prompt "Config exists. Refresh field IDs from server? [y/n]" — refreshing only updates `field_ids` and `*_options`, leaves project_number/owner/auto_add_default_status alone.

### `/gh-project add-pr [<pr-url>]`

Add a PR (current branch's open PR, or explicit URL) to the configured project board.

```bash
# Resolve PR URL (no arg → current branch)
PR_URL=${1:-$(gh pr view --json url -q .url)}

# Read config
CONFIG=$(cat .forgeplan/state/gh-project.yaml)
PROJ_NUM=$(yq '.project_number' <<<"$CONFIG")
OWNER=$(yq '.project_owner' <<<"$CONFIG")

# Add to board
gh project item-add "$PROJ_NUM" --owner "$OWNER" --url "$PR_URL"
```

If PR title starts with `fix(`, set Type=`Bug`; with `feat(` → `Feature`; with `docs(` → `Docs`; with `chore(`/`audit(`/`refactor(` → `Chore`. All optional — skill prompts user once and remembers PR-title-to-Type mapping for the session.

Status defaults to `In Review` (PRs go straight to review, not backlog).

### `/gh-project link-prd <PRD-NNN>`

For Standard+ PRDs only. Creates GH issue + adds to board + sets Forgeplan-ID and Type fields.

```bash
PRD_ID="$1"

# Read forgeplan artifact
ART_TITLE=$(forgeplan get "$PRD_ID" 2>/dev/null | head -3 | tail -1 | sed 's/^# //')

# Create issue
ISSUE_URL=$(gh issue create \
  --title "$PRD_ID: $ART_TITLE" \
  --label "prd,forgeplan" \
  --body "## Forgeplan artifact

This issue tracks **$PRD_ID**: $ART_TITLE

See \`.forgeplan/prds/${PRD_ID}-*.md\` for the full body.

## Sync

Run \`/gh-project sync-status $PRD_ID\` to update board Status from forgeplan state.
" --json url -q .url)

# Add to board, set fields
gh project item-add "$PROJ_NUM" --owner "$OWNER" --url "$ISSUE_URL"
# Then gh project item-edit with Forgeplan-ID = $PRD_ID, Type = "PRD"
```

If `forgeplan get $PRD_ID` shows depth=tactical, refuse with hint to use `/gh-project add-pr` for the eventual PR instead.

### `/gh-project sync-status <ARTIFACT-ID>`

Read forgeplan artifact status, write to project Status field.

| Forgeplan status | Project Status |
|---|---|
| draft | Backlog (or Ready if validated — check via `forgeplan validate <id>`) |
| active | In Progress |
| superseded | Done |
| deprecated | Cancelled |

Find issue on board by Forgeplan-ID field match. If no item exists → suggest `/gh-project link-prd` first.

### `/gh-project list [--filter status=<X>]`

`gh project item-list <num> --owner <owner> --format json | jq '...'` filtered by Status. Pretty-print to stdout.

---

## Anti-patterns

- ❌ Don't hardcode project number in skill body or workflow files. Always read config (skill) or use template placeholders (workflow).
- ❌ Don't auto-create missing project fields. User owns the schema; skill warns + prints command.
- ❌ Don't auto-refresh GH tokens. Surface the `gh auth refresh` command, let user run it.
- ❌ Don't commit `.forgeplan/state/gh-project.yaml` (project node IDs are not secret but field IDs change between projects; checking it in is misleading). `init` adds to `.gitignore` automatically.
- ❌ Don't link Tactical-depth artifacts. Tactical = no artifact ceremony; PR alone is enough on the board.

---

## Related

- [`fpl-init`](../fpl-init/SKILL.md) — bootstrap orchestrator. Future: could call `/gh-project init` as step 9-bis when user has GitHub remote.
- [`shape`](../shape/SKILL.md) — interactive PRD authoring. After it creates a Standard+ PRD, `/gh-project link-prd` is a natural follow-up.
- [`forge-cycle`](../../forgeplan-workflow/skills/forge-cycle/SKILL.md) — full forgeplan cycle. Could chain `/gh-project link-prd` after PRD creation, `/gh-project sync-status` after activate.
- `docs/GITHUB-PROJECTS.md` — bilingual guide (convention, field schema, setup, end-to-end).
- `docs/templates/auto-add-to-project.yml` — reusable workflow template.

---

## Errors and recovery

| Symptom | Action |
|---|---|
| `.forgeplan/state/gh-project.yaml` missing | Refuse, print "Run `/gh-project init` first." |
| `gh: not found` | Print install command for the OS, refuse. |
| Missing `project` scope | Print `gh auth refresh -s read:project,write:project`, refuse. |
| `gh project view <num>` returns 404 | "Project not found. Run `gh project list --owner <owner>` to discover, then re-run `/gh-project init`." |
| Field ID stale (server returns "field not found") | Auto-trigger field-IDs refresh: re-run init in --refresh mode. |
| `forgeplan get $ID` returns nothing | Refuse with "artifact ID not found in `.forgeplan/`. Check `forgeplan list`." |
| Auto-add workflow fires but item not on board | Check workflow logs, GH_TOKEN secret presence, project URL correctness. Skill itself doesn't manage the workflow file — it's per-repo `.github/workflows/auto-add-to-project.yml`. |

---

## Idempotency

- `init` re-run: prompts to refresh field IDs only (preserves user choices).
- `add-pr`: GH project item-add is naturally idempotent (no-op if already on board).
- `link-prd`: detects existing issue with `Forgeplan-ID == PRD-NNN` and reuses it; doesn't create duplicates.
- `sync-status`: pure update, idempotent.
