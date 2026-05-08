# GitHub Projects v2 integration — guide

> Bilingual: this is the English version. The Russian version is at [GITHUB-PROJECTS-RU.md](GITHUB-PROJECTS-RU.md).

This document describes the **convention** for using GitHub Projects v2 boards across ForgePlan repos, the **field schema** that the convention assumes, and the **`/gh-project` skill + auto-add workflow template** that automate it.

The integration is **project-agnostic**. The marketplace's board is `https://github.com/orgs/ForgePlan/projects/5`, but everything in this guide works in any other ForgePlan repo with its own board.

---

## TL;DR

```
1. Create board on GitHub UI (or `gh project create --owner <owner> --title <title>`).
2. In any repo:
   /gh-project init     ← interactive: project number + owner + field check
3. Copy auto-add template:
   cp docs/templates/auto-add-to-project.yml .github/workflows/
   # then edit project-url
4. Workflow now auto-adds new issues + PRs to the board.
5. After `forgeplan new prd` for Standard+:
   /gh-project link-prd PRD-NNN     ← creates issue + adds to board with Forgeplan-ID
6. After `forgeplan activate PRD-NNN`:
   /gh-project sync-status PRD-NNN  ← updates board Status field
```

---

## Convention

### What goes on the board

| Source | Goes to board | Kind field | Default Status |
|---|---|---|---|
| Forgeplan PRD (Standard+) | ✅ via `/gh-project link-prd` (creates GH issue, adds to board) | `PRD` | `Backlog` (or `Ready` if validated) |
| Forgeplan RFC (Standard+) | ✅ same | `RFC` | `Backlog` |
| Forgeplan ADR | ✅ same; usually goes straight to `Done` after activation | `ADR` | `Done` |
| Forgeplan PRD/RFC (Tactical) | ❌ — Tactical = no artifact ceremony; PR alone is enough | n/a | n/a |
| Forgeplan Evidence | ❌ — internal artifact; no separate board card | n/a | n/a |
| Forgeplan Note | ❌ — too granular; reference material | n/a | n/a |
| GitHub PR (any) | ✅ auto-added by workflow | `Feature` / `Bug` / `Docs` / `Chore` (parsed from title) | `In review` |
| GitHub Issue (any opened) | ✅ auto-added by workflow | `Bug` (default) — relabel manually | `Backlog` |

**Why Tactical isn't on the board**: Tactical scope = "just do it" (per `forgeplan route`). Adding it to the board creates noise — the eventual PR is enough signal.

### Status mapping (Forgeplan ↔ Project)

| Forgeplan status | Project Status | Trigger |
|---|---|---|
| Artifact `draft`, not yet validated | `Backlog` | After `forgeplan new` |
| Artifact `draft`, `forgeplan validate` PASS | `Ready` | After validate |
| Artifact `active` (post-`forgeplan activate`) | `In progress` (if work ongoing) or `Done` (if shipped) | After activate + judgement |
| Artifact `superseded` | `Done` | After `forgeplan supersede` |
| Artifact `deprecated` | `Cancelled` | After `forgeplan deprecate` |
| PR opened | `In review` | Auto-add workflow |
| PR merged | `Done` | Built-in workflow on PR close (configure in project UI) |

### Label conventions

Issues created via `/gh-project link-prd` are labelled with:

| Label | When |
|---|---|
| `forgeplan` | All artifact-tracking issues |
| `prd` / `rfc` / `adr` | Mirrors artifact kind |
| `active` | When `forgeplan activate` runs (added by `/gh-project sync-status`) |
| `closed` | When superseded or deprecated |

PRs are auto-labelled by their conventional-commit title prefix (`fix(...)`, `feat(...)`, `docs(...)`, `chore(...)`, `audit(...)`, `refactor(...)`). The auto-add workflow doesn't depend on labels, but the `/gh-project add-pr` operation reads the title prefix to set the Kind field.

---

## Field schema (recommended)

Create these fields **once** on your project board (or verify with `/gh-project init` which warns about missing ones).

| Field | Type | Options | Required by skill? |
|---|---|---|---|
| **Status** | single-select (built-in) | `Backlog`, `Ready`, `In progress`, `In review`, `Done` (note: `Cancelled` not in default GitHub schema; add via UI or remap `deprecated`→`Done`) | yes |
| **Kind** | single-select | `PRD`, `RFC`, `ADR`, `Feature`, `Bug`, `Docs`, `Chore` | yes |
| **Forgeplan-ID** | text | n/a | yes (for `link-prd` and `sync-status`) |
| **Plugin** | single-select | `fpl-skills`, `forgeplan-workflow`, `forgeplan-orchestra`, `forgeplan-brownfield-pack`, `fpf`, `laws-of-ux`, `agents-core`, `agents-domain`, `agents-pro`, `agents-github`, `agents-sparc`, `marketplace` | optional but recommended |
| **Priority** | single-select | `P0`, `P1`, `P2`, `P3` | optional |

### Why these specifically

- **Status** is the single most-viewed field in any board. Six options cover every artifact lifecycle phase.
- **Kind** distinguishes architectural artifacts (PRD/RFC/ADR) from execution work (Feature/Bug/Docs/Chore).
- **Forgeplan-ID** is the back-pointer into the artifact graph — the load-bearing field. Without it, board cards are disconnected from `.forgeplan/`.
- **Plugin** scopes work to specific marketplace components, useful when many plugins evolve in parallel.
- **Priority** is genuinely team-specific. GitHub provides no canonical meaning ([per docs discussion](https://github.com/orgs/community/discussions/54055)). P0/P1/P2/P3 is one common scheme.

### Creating fields via `gh` CLI

If `/gh-project init` reports missing fields, here are the commands it suggests:

```bash
# Single-select example (Kind field with several options)
gh project field-create 5 --owner ForgePlan \
  --name "Kind" \
  --data-type SINGLE_SELECT \
  --single-select-options "PRD,RFC,ADR,Feature,Bug,Docs,Chore"

# Text field (Forgeplan-ID)
gh project field-create 5 --owner ForgePlan \
  --name "Forgeplan-ID" \
  --data-type TEXT
```

Reference: [gh project field-create](https://cli.github.com/manual/gh_project_field-create).

---

## Auto-add — two paths

### Option 1 — Built-in project workflow (recommended for simple cases)

Configured in the project UI, no Actions file needed.

1. Open project: `https://github.com/orgs/<owner>/projects/<num>`
2. Click `⋯` (top-right) → `Workflows`
3. Find `Auto-add to project` (built-in)
4. Configure: pick the source repo, optional filters (issue state, labels)
5. Save & Enable

**Pros**: zero code, zero secrets, ~30 seconds.
**Cons**: less flexible (e.g. can't AND/OR/NOT label filters as easily).

[GitHub docs reference](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/adding-items-automatically).

### Option 2 — `actions/add-to-project@v2` workflow (SHA-pinned)

When you need more control: AND/OR/NOT label filters, multi-repo source, custom triggers.

1. Copy `docs/templates/auto-add-to-project.yml` → `.github/workflows/auto-add-to-project.yml`
2. Replace `{{PROJECT_URL}}` placeholder
3. Ensure auth:
   - **GITHUB_TOKEN** works if your org allows token to write to projects (Settings → Actions → Workflow permissions). Many orgs disable this.
   - Otherwise create a **fine-grained PAT** with Organization → Projects (read+write), store as `ADD_TO_PROJECT_PAT` secret, change `github-token:` line.
4. Commit. Workflow fires on next opened/reopened issue or PR.

[Action repo](https://github.com/actions/add-to-project).

### Which to choose

| You want | Path |
|---|---|
| One repo → one project, all items | Option 1 (built-in) |
| Filter by labels (AND/OR/NOT) | Option 2 (Action) |
| Multi-repo → one project | Option 2 — copy workflow into each repo |
| Org-wide auto-add | Option 1 (built-in workflow supports multiple sources) |

The marketplace uses **Option 2** so the convention is fully reproducible (workflow file is reviewable, version-controlled, and copy-pasteable to other repos).

---

## Authentication

`gh` CLI must have project scope:

| Token type | Required scopes |
|---|---|
| Classic PAT | `project` (read+write), `repo` (private repo issues) |
| Fine-grained | Organization → **Projects: read+write**; Repository → **Issues: read+write**, **Pull requests: read** |

```bash
# Probe
gh auth status

# If `project` scope missing
gh auth refresh -s read:project,write:project
```

`/gh-project init` does this probe and surfaces the refresh command.

---

## End-to-end examples

### Setting up a new repo

```bash
# 1. Create project board (one time, in any repo or globally)
gh project create --owner ForgePlan --title "Marketplace tracking"

# 2. In your repo
cd my-new-repo
forgeplan init                                # if not already
/gh-project init                              # interactive: project num + owner

# 3. Copy auto-add template
mkdir -p .github/workflows
cp $(forgeplan path)/docs/templates/auto-add-to-project.yml .github/workflows/
# edit, replace {{PROJECT_URL}}
git add .github/workflows/auto-add-to-project.yml
git commit -m "chore(ci): auto-add to ForgePlan project"
```

### Standard+ PRD lifecycle on the board

```bash
# Authoring
/shape "magic-link auth for admin panel"          # creates PRD-024 (Standard)
forgeplan validate PRD-024                         # PASS

# Linking to board
/gh-project link-prd PRD-024
# → creates GH issue "PRD-024: magic-link auth for admin panel"
# → adds to board with Kind=PRD, Forgeplan-ID=PRD-024, Status=Backlog

# Implementing
git checkout -b feat/magic-link-auth
# ... work ...
gh pr create --title "feat(auth): magic-link admin login (PRD-024)"
# → workflow auto-adds PR to board, Kind=Feature, Status=In Review

# Activating
forgeplan activate PRD-024
/gh-project sync-status PRD-024
# → updates board Status to Done (or In Progress if work ongoing)
```

### Tactical fix (NO ceremony)

```bash
# Quick fix
forgeplan route "fix typo in README" → Tactical
git checkout -b fix/readme-typo
# ... fix ...
gh pr create --title "fix(docs): typo in README"
# → workflow auto-adds PR to board, Kind=Docs, Status=In Review
# → no PRD, no /gh-project link-prd, no manual cards
```

---

## Adding to CLAUDE.md

When `/gh-project init` runs, optionally append a 13-line note to project CLAUDE.md describing the convention. This works the same way as the forgeplan operating contract from PRD-018.

Marker for idempotent re-runs: `<!-- gh-project-convention:v1 -->`

```markdown
<!-- gh-project-convention:v1 -->
## GitHub Projects integration (this project)

This project tracks work via GitHub Projects v2 board: <PROJECT_URL>.
Configuration is in `.forgeplan/state/gh-project.yaml` (per-project, not committed).

**What goes on the board**:
- All PRs (auto-added by `.github/workflows/auto-add-to-project.yml`).
- Standard+ PRDs/RFCs (manually via `/gh-project link-prd PRD-NNN`). Tactical artifacts → PR-only.

**Lifecycle sync**: after `forgeplan activate <ID>` run `/gh-project sync-status <ID>`.

**Skill**: `/gh-project init` (one-time setup), `add-pr`, `link-prd`, `sync-status`, `list`.
**Guide**: `docs/GITHUB-PROJECTS.md` in marketplace, or its mirror in any repo using this convention.
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `gh project view <num>` returns 404 | Wrong number or owner | `gh project list --owner <owner>` to discover |
| Workflow fires but item not on board | Token can't write to project | Switch from `GITHUB_TOKEN` to PAT-secret |
| `/gh-project link-prd` fails with "missing field 'Forgeplan-ID'" | Field not created on board | Run the `gh project field-create` command from `/gh-project init` warning |
| `gh auth refresh` says "fine-grained tokens cannot be refreshed" | Using fine-grained PAT | Generate new PAT manually with required scopes |
| `Unable to resolve action @v1` | No floating `v1` tag — only `v1.0.x` versions and `v2`/`v2.0.0` | Use `@v2` (latest major) or pin SHA `@<sha> # v2.0.0` |
| Item already on board, duplicate created | Old `actions/add-to-project@v0` had a bug | Upgrade to `@v2` (SHA-pinned) |

---

## References

- [Best practices for Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/best-practices-for-projects)
- [Adding items automatically](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/adding-items-automatically)
- [actions/add-to-project](https://github.com/actions/add-to-project)
- [gh project CLI manual](https://cli.github.com/manual/gh_project)
- [Custom fields docs](https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields)
- Skill body: `plugins/fpl-skills/skills/gh-project/SKILL.md`
- Workflow template: `docs/templates/auto-add-to-project.yml`
