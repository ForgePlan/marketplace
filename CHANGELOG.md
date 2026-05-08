# Changelog

All notable changes to the ForgePlan Marketplace will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.23.0] - 2026-05-08

**MCP-first wiring across fpl-skills ecosystem (Phase 1)** — implements `mcp__forgeplan__*` tool preference in /sprint, /autorun, /forge-cycle, /forge-audit; bumps operating contract `:v1` → `:v2` with idempotent migration via `/fpl-init`; setup guide gains `/mcp` smoke step. Refs PRD-021 (Deep depth, conf 90%, validated PASS).

### The motivation

User directive: «mcp да должен быть в скиллах и во всей нашей экосистеме» («MCP should be in the skills and in our whole ecosystem»). PRD-018 contract `:v1` had a forward-compat note ("prefer `mcp__forgeplan__*` tools when wired"), but until v1.9.2 (PR #57) the MCP server didn't actually start due to bad `args` config. Post-v1.9.2 fix: ~60 `mcp__forgeplan__*` tools available, full lifecycle empirically validated end-to-end (EVID-033). PRD-021 makes this default behaviour in all 4 high-traffic multi-agent skills.

### Phase 1 scope (this PRD ships)

4 high-traffic skills + operating contract migration + setup guide. Phase 2 (PRD-022) will cover remaining ~18 skills.

### Added
- `fpl-skills` v1.9.2 → **1.10.0** (minor — new MCP-first behaviour with shell fallback):
  - **Operating contract `:v2` block + idempotent migration** in `/fpl-init` step 7-bis:
    - New marker `<!-- forgeplan-operating-contract:v2 -->` keys idempotency
    - `:v1` block detected → user prompted to upgrade (one yes/no, default yes)
    - Python migration replaces `:v1` block with `:v2` preserving surrounding content
    - `:v2` content adds explicit "Tool selection" preamble: prefer `mcp__forgeplan__*` when present, fallback to shell, warn if neither
    - Workflow commands now use MCP-style names (`forgeplan_search`, `forgeplan_claim`, `forgeplan_dispatch`, `forgeplan_new`, `forgeplan_link`, `forgeplan_score`, `forgeplan_activate`, `forgeplan_health`)
  - **`/sprint` SKILL.md**:
    - New top-level **"Tool selection (MCP vs shell — PRD-021)"** preamble with probe pattern + decision table
    - §4a-bis dispatch: MCP-first variant (`mcp__forgeplan__forgeplan_dispatch`) + shell fallback
    - §4b.g teammate-prompt: both MCP and shell variants — teammate selects MCP if `mcp__forgeplan__forgeplan_claim` is in their tool list
    - §4b-bis evidence: MCP-first via `mcp__forgeplan__forgeplan_new` + `forgeplan_link`; shell fallback preserved
    - `_next_action` field from MCP responses gets relayed to user reports
  - **`/autorun` SKILL.md** autopilot directive: MCP-first preference baked in, propagates to delegated skills (sprint inherits)

- `forgeplan-workflow` v1.6.0 → **1.7.0** (minor — MCP-first in /forge-cycle + /forge-audit):
  - **`/forge-cycle` Step 5 Build**:
    - New "Tool selection (MCP vs shell)" subsection with probe instructions
    - SPARC pipeline (specification/pseudocode/architecture/refinement) shows both MCP variants (`mcp__forgeplan__forgeplan_claim` + `forgeplan_release`) and shell fallback
    - Direct-implementation path (Standard/Tactical without SPARC) also gets MCP-first treatment
  - **`/forge-audit` Step 1 + Step 5**:
    - Step 1 claim slot: MCP-first with `ttl_minutes=60`; shell fallback
    - Step 5 evidence emission: `mcp__forgeplan__forgeplan_new` + `forgeplan_link` + optional `forgeplan_score` re-compute on parent; shell fallback

- **`docs/SETUP-GUIDE-NEW-REPO.md`** Step 7 (Smoke test):
  - New §7.0 "MCP server reachable (PRD-021)" — instructs user to run `/mcp` after Claude Code restart, verify `forgeplan · ✓ connected`, troubleshoot if `failed` (typical cause: stale `args: ["mcp"]` — re-run `/fpl-init` auto-fixes)

### Changed
- `marketplace.json`: catalog 1.22.2 → **1.23.0** (minor — new behavior across two plugins); fpl-skills 1.9.2 → 1.10.0; forgeplan-workflow 1.6.0 → 1.7.0; descriptions updated to mention PRD-021.
- `plugin.json` (fpl-skills): version 1.9.2 → 1.10.0.
- `plugin.json` (forgeplan-workflow): version 1.6.0 → 1.7.0; description mentions MCP-first per PRD-021.

### Notes

**What this fundamentally changes**: previously skills called `forgeplan` via shell only. Even after MCP server worked (post-v1.9.2), agents kept calling shell because that's what the prose said. PRD-021 updates skill prose so agents *actively prefer* the structured MCP path when available.

**`_next_action` methodology-as-protocol**: every MCP response includes a `_next_action` field where the forgeplan server itself populates the next correct workflow step ("Add structured fields, then forgeplan_link", "All passed! → forgeplan_activate", etc.). Skills relay this verbatim — server-driven methodology rather than skill-prose-encoded methodology.

**Backward compat**: shell fallback preserved everywhere. If MCP tools absent (server not running, or pre-v1.9.2 broken config still in place), skills work identically to v1.9.2 behaviour. No regression for shell-only environments.

**Migration**: existing user CLAUDE.md `:v1` blocks unchanged unless user re-runs `/fpl-init` and confirms upgrade. Fully idempotent — no surprise mutations.

### Phase 2 (deferred to PRD-022)

Remaining ~18 forgeplan-aware skills get MCP-first wiring in a follow-up PR:
- /research, /audit, /diagnose, /refine, /build, /restore (single-agent flows)
- /shape, /rfc, /riper (authoring flows — benefit most from `forgeplan_new` + `forgeplan_validate`)
- /briefing, /forge-report, /do, /team (reports + orchestration)
- /c4-diagram, /ddd-decompose, /migrate-from-dev-toolkit (specialised)
- /bootstrap, /setup, /gh-project (init + integration)

Phase 1 covers ~80% of forgeplan-traffic by user action volume; Phase 2 covers the long tail.

### PRD-021 — Acceptance criteria status

- [x] AC-1..AC-6 verified by design (skill prose includes both MCP and shell paths with probe-based selection)
- [x] AC-7: `./scripts/validate-all-plugins.sh` passes
- [x] AC-8: setup guide updated with `/mcp` smoke step
- [ ] AC-9 (PRD-022 stub for Phase 2): deferred to next session

## [1.22.2] - 2026-05-08

**Fix `/fpl-init` MCP server config** — `args: ["mcp"]` produced a hanging command (`forgeplan mcp` is a parent command waiting for subcommand), causing Claude Code to report `failed to reconnect to forgeplan` for every project bootstrapped with v1.6.0+ of `/fpl-init`. Switched to `args: ["serve"]` — the direct stdio MCP server entry-point.

### Fixed
- `fpl-skills` v1.9.1 → **1.9.2** (patch — config-template fix in `/fpl-init`):
  - `plugins/fpl-skills/skills/fpl-init/SKILL.md` step 5 (Wire `.mcp.json`):
    - **Target shape `args` field**: `["mcp"]` → `["serve"]`. `forgeplan mcp` is a parent command with subcommands (`serve`, `install`, `help`); without a subcommand it hangs awaiting one, which manifests as MCP handshake failure in Claude Code.
    - **Python merge implementation**: now detects the buggy `args == ["mcp"]` shape on existing `.mcp.json` files and upgrades to `["serve"]` automatically (idempotent — re-running `/fpl-init` migrates broken configs).
    - **Added "Why `args: ["serve"]` not `["mcp"]`" rationale** inline so future edits don't regress.

### Changed
- `marketplace.json`: catalog 1.22.1 → **1.22.2**; fpl-skills 1.9.1 → 1.9.2.
- `plugin.json` (fpl-skills): version 1.9.1 → 1.9.2.

### Notes
**Discovery process**: user ran `/mcp` in Claude Code, output showed `forgeplan · ✘ failed`. Investigation: `forgeplan serve --help` revealed `Usage: forgeplan serve` (no subcommand needed, no `--stdio` flag), while `forgeplan mcp --help` showed it's a parent command. Empirical fix on this repo's `.mcp.json` from `["mcp"]` → `["serve"]` confirmed working.

**Existing `.mcp.json` files in user projects**: the upgraded merge logic in `/fpl-init` step 5 will auto-fix them on re-run (`args == ["mcp"]` is detected and replaced). Users can also patch manually with one-liner:
```bash
python3 -c "import json,pathlib; p=pathlib.Path('.mcp.json'); d=json.loads(p.read_text()); d['mcpServers']['forgeplan']['args']=['serve']; p.write_text(json.dumps(d,indent=2)+'\n')"
```

**No behavior change in working systems** — only repairs broken MCP wiring. Skills using forgeplan via shell (existing flow) are unaffected.

**Forward-compat to Option B (forgeplan MCP-first wiring)**: now that the MCP server actually starts, `mcp__forgeplan__*` tools should appear in Claude Code's deferred-tools list. PRD-021 (skill prose preferring MCP over shell) becomes practically possible — was theoretical until this fix.

## [1.22.1] - 2026-05-08

**Convention drift fix** — `/gh-project` skill prose + bilingual guides now match `orgs/ForgePlan/projects/5` server reality discovered during empirical setup (Step 4-6 of post-PRD-020 verification, EVID-031).

### Fixed
- `fpl-skills` v1.9.0 → **1.9.1** (patch — docs/prose only, no code or behavior change):
  - **`Type` → `Kind`**: `Type` is a reserved word in GitHub Projects v2 (`gh project field-create --name "Type"` returns `Name has already been taken`). Renamed to `Kind` throughout `plugins/fpl-skills/skills/gh-project/SKILL.md`, `docs/GITHUB-PROJECTS.md`, `docs/GITHUB-PROJECTS-RU.md`. Field name matches forgeplan's internal `kind: prd|rfc|adr` terminology — semantically cleaner.
  - **Status options lowercase**: server stores `In progress` / `In review` (lowercase compound noun); docs previously wrote `In Progress` / `In Review`. Now matches server.
  - **`Cancelled` status note**: GitHub default Status field has 5 options (`Backlog`, `Ready`, `In progress`, `In review`, `Done`) — no `Cancelled`. Convention table now notes "add via UI or remap `deprecated`→`Done`".
  - Added new section **"Server reality vs documented convention"** to `gh-project/SKILL.md` summarising 4 quirks (Type→Kind, Cancelled missing, lowercase Status, P3 missing) with mitigations.

### Added
- **`docs/SETUP-GUIDE-NEW-REPO.md`** (~300 lines) — comprehensive end-to-end setup guide for bringing **any** new or existing repo into the ForgePlan ecosystem. Bilingual prose (RU primary, EN technical terms). Covers:
  - Pre-requisites (host-level, one-time): forgeplan CLI, gh CLI scopes, Claude Code, ForgePlan marketplace plugin install
  - Step 1: create repo + GitHub Projects v2 board
  - Step 2: `/fpl-init` 11-step bootstrap (forgeplan init + CLAUDE.md + docs/agents/)
  - Step 3: field schema setup with `gh project field-create` x4 (Kind/Forgeplan-ID/Plugin/Priority)
  - Step 4: `/gh-project init` to write `.forgeplan/state/gh-project.yaml` with cached IDs
  - Step 5: auto-add workflow copy + edit + PAT secret (when GITHUB_TOKEN insufficient)
  - Step 6: labels creation (forgeplan/prd/rfc/adr)
  - Step 7: smoke tests (test issue, chat-driven /sprint, /forge-cycle)
  - Step 8: daily flow examples (Standard+ feature, Tactical fix, audit)
  - Reference + Troubleshooting (6 common failure modes with fixes) + printable Checklist
  - All lessons learned from `orgs/ForgePlan/projects/5` setup empirical run baked in (no `Type` reserved-word hits, correct lowercase status, PAT setup if GITHUB_TOKEN denied).

### Changed
- `marketplace.json`: catalog 1.22.0 → **1.22.1**; fpl-skills 1.9.0 → 1.9.1.
- `plugin.json` (fpl-skills): version 1.9.0 → 1.9.1.

### Notes
**No behavior change** — only doc text and skill prose. Existing `.forgeplan/state/gh-project.yaml` files (created post-`/gh-project init` with actual server-side IDs cached) already had correct field IDs and option labels. This patch makes the *human-facing* docs match what the skill *actually does* at runtime.

**Discovery process**: post-PRD-020 verification run did empirical `gh project field-create` calls. 3 of 4 needed fields created cleanly; `Type` returned reserved-word error. Lookup of actual `gh project field-list` output revealed lowercase status options + missing P3/Cancelled. Documented in Hindsight Group 5 (`forge-marketplace` bank).

## [1.22.0] - 2026-05-08

**Unconditional `forgeplan claim/dispatch/evidence` wiring across `/sprint`, `/autorun`, `/forge-cycle`, `/forge-audit`** — closes the gap discovered in v1.21.0 audit (T4+T5 FAIL CONFIRMED) where chat-driven sprints and SPARC pipelines bypassed the artifact graph entirely. Refs PRD-020 (Deep depth, conf 90%, validated PASS).

### The gap that motivated this

PRD-018 (v1.20.0) put the operating contract in CLAUDE.md as the always-on enforcement lever. But the skill bodies still had **conditional** wiring: line 350 of `/sprint` SKILL.md literally said "Forgeplan-aware (only if task references an artifact ID like PRD-NNN/RFC-NNN/SPEC-NNN)". `/forge-cycle` and `/forge-audit` had **zero** claim mentions — they spawned SPARC and review agents directly via Task tool.

Real-world impact (per dev quote that surfaced it): "у меня все равно в обход forgeplan agents их спавнит, только если ему прямо не сказать использовать forgeplan". Confirmed empirically by audit T4 (3 cite-by-line proofs in `/sprint` SKILL.md) and T5 (`/forge-cycle` 4 SPARC agents → 0 claims, `/forge-audit` 0 claim mentions).

### Added — synthetic SESSION-id pattern

When a task is chat-driven (no `PRD-NNN/RFC-NNN/SPEC-NNN` referenced), skills now derive:

```bash
SESSION_ID="SESSION-$(date -u +%Y-%m-%d-%H%M%S)"
```

…and use it as the artifact-id for `forgeplan claim/release/evidence` calls. Format is sortable, parseable, unambiguous. TTL stays at the default 30 min; auto-expire keeps the claim graph clean.

`/forge-audit` uses the `AUDIT-` prefix instead (`AUDIT-2026-05-08-123456`) to distinguish audit work from sprint work in `forgeplan claims` output.

### Added (changes per skill)

- `fpl-skills` v1.8.0 → **1.9.0** (minor — behavior change, fully backward-compatible for artifact-driven flows):
  - **`/sprint` §4a-bis**: renamed "Forgeplan dispatch (artifact-driven sprints)" → "Forgeplan dispatch + session derivation". Always derives `SESSION_ID` first; calls `forgeplan dispatch` only when real artifact-IDs present (dispatch needs `affected_files` to be useful — no point calling it for chat-driven plans).
  - **`/sprint` §4b.g**: removed `(only if task references an artifact ID like PRD-NNN/RFC-NNN/SPEC-NNN)` gate. Pattern `${ARTIFACT_ID:-$SESSION_ID}` — every teammate claims unconditionally. Includes failure-path `forgeplan release` so abandoned waves don't leave stale claims.
  - **`/sprint` §4b-bis**: removed `(artifact-driven sprints)` qualifier. Both modes now emit ≥1 evidence per sprint — chat-driven mode uses `SESSION_ID` in the evidence title, optionally linked to a NOTE for persistence.
  - **`/autorun` autopilot directive**: `FORGEPLAN-AWARE — UNCONDITIONAL when forgeplan CLI is on $PATH (PRD-020)`. Delegated skills (sprint, etc.) inherit the unconditional wiring.

- `forgeplan-workflow` v1.5.0 → **1.6.0** (minor — adds claim/release wiring to a workflow that previously had zero):
  - **`/forge-cycle` Step 5 (Build)**: SPARC pipeline now wraps each phase (specification/pseudocode/architecture/refinement) with explicit `forgeplan claim` + `forgeplan release` keyed on `${PRD_ID:-SESSION-...}`. For Tactical work (no PRD created in Shape phase), uses synthetic SESSION-id. Direct-implementation path (Standard/Tactical without SPARC) also gets claim wrapping.
  - **`/forge-audit` Step 1 + Step 5**: claims `${1:-AUDIT-...}` at start (60-min TTL — audits run longer than sprints), releases at end. Step 5 evidence emission moved from "Optional" to mandatory — audit trail is the *point* of this command.

### Changed
- `marketplace.json`: catalog 1.21.0 → **1.22.0** (minor — behavior change in two plugins); fpl-skills 1.8.0 → 1.9.0; forgeplan-workflow 1.5.0 → 1.6.0; descriptions on both updated to mention PRD-020.

### Notes

**Why "unconditional" and not "always claim if forgeplan present"**: same thing operationally — if forgeplan CLI is missing, all `forgeplan` calls are no-ops via the existing `command -v forgeplan && ...` probe in §4a-bis. The "unconditional" wording in the SKILL.md prose is what changed: removing the guard that gated on artifact-ID presence in the task description.

**Backward compat — artifact-driven flows**: identical trace to v1.21.0. The `${ARTIFACT_ID:-$SESSION_ID}` pattern resolves to the real artifact-ID first. Existing `/sprint "implement PRD-018"` produces same claim/evidence pattern as before (verified by AC-2 / AC-8 design review).

**TTL housekeeping**: synthetic claims auto-expire after 30 min (sprint) / 60 min (audit). For long-running sessions, teammates can refresh via re-claim. Stale-claim cleanup not yet automated — `forgeplan claims --filter expired=true` future improvement.

**Operating contract `:v1` → `:v2` (deferred)**: PRD-020 FR-008 specifies bumping the CLAUDE.md operating contract marker so existing repos can detect a content change and re-inject. Implemented in this PR for the marketplace itself; existing user-project CLAUDE.md files will stay on `:v1` until they re-run `/fpl-init` (which is idempotent). Not a blocker — `:v1` says "claim per teammate before they start" which is *also* what `:v2` says, just stronger phrasing.

**Out of scope (deferred)**:
- `forgeplan claims --filter session=true` housekeeping subcommand (forgeplan-core change, not marketplace).
- Auto-derive `affected_files` from task descriptions for chat-driven dispatch usefulness (heuristic-prone; requires file-mention parsing).
- Migration tool for existing `:v1` CLAUDE.md → `:v2` re-inject (manual via `/fpl-init` re-run).

### PRD-020 — Acceptance criteria status

- [x] AC-1..AC-9 — design verified in skill prose. Empirical smoke-test (post-merge): chat-driven `/sprint "refactor X"` should produce ≥1 SESSION-claim + ≥1 evidence (`forgeplan claims` and `forgeplan list -k evidence` confirm).
- [x] AC-7: `./scripts/validate-all-plugins.sh` passes.
- [x] AC-8: backward compat — artifact-driven trace unchanged.

## [1.21.0] - 2026-05-08

**GitHub Projects v2 integration** — project-agnostic skill, convention guide, auto-add workflow template. Refs PRD-019 (validated via `/forge-cycle` autonomous run; routed Standard, conf 90%).

The gap this fixes: ForgePlan/marketplace ships PRs daily and has a project board (`orgs/ForgePlan/projects/5`), but no convention for what goes there, no automation, and no documented mapping between forgeplan artifact lifecycle and project Status. Same enforcement-via-convention pattern as PRD-018 (operating contract), now applied to GitHub Projects.

### Added
- `fpl-skills` v1.7.1 → **1.8.0** (minor — new skill, fully backward-compatible):
  - **`/gh-project` skill** (~250 LOC SKILL.md) — five operations:
    - `init` — interactive one-time setup; reads project number + owner, verifies via `gh project view`, lists fields, warns on missing recommended fields (Status, Type, Forgeplan-ID, Plugin), caches field IDs + single-select option IDs into `.forgeplan/state/gh-project.yaml`.
    - `add-pr [<url>]` — adds current PR (or explicit URL) to configured board with Type derived from conventional-commit prefix in title.
    - `link-prd <PRD-NNN>` — for Standard+ PRDs: creates GH issue with body referencing the artifact, adds to board, sets Forgeplan-ID + Type fields. Refuses for Tactical-depth artifacts (PR-only path).
    - `sync-status <ARTIFACT-ID>` — reads forgeplan artifact status, writes Status field on the board with full mapping (draft/active/superseded/deprecated → Backlog/In Progress/Done/Cancelled).
    - `list [--filter status=<X>]` — pretty-prints current board items.
  - **Project-agnostic by design**: skill never hardcodes project numbers or owner names. All values live in per-project `.forgeplan/state/gh-project.yaml` (added to `.gitignore` automatically by `init`). The same skill works in marketplace (project 5), in any other ForgePlan repo with a different board, in user-owned projects, etc.
  - **Field IDs cached** in config for speed — `gh project item-edit` requires field IDs not names. Refresh via re-running `init`.

### Added (workflow + docs)
- `docs/templates/auto-add-to-project.yml` — reusable GitHub Actions workflow template using official `actions/add-to-project@v1`. Two placeholders: `{{PROJECT_URL}}` (must replace before commit). Includes inline comments on auth (`GITHUB_TOKEN` vs fine-grained PAT), label filters, AND/OR/NOT operators.
- `.github/workflows/auto-add-to-project.yml` — filled-in copy for marketplace (project=5, owner=ForgePlan). Auto-adds new issues + PRs to the project board.
- `docs/GITHUB-PROJECTS.md` + `-RU.md` (~250 LOC each) — bilingual convention guide:
  - TL;DR (6-step quickstart)
  - Convention table: what goes on the board, when, why
  - Status mapping (Forgeplan ↔ Project)
  - Label conventions
  - Recommended field schema (5 fields with rationale per field)
  - Two auto-add paths (built-in project workflow vs `actions/add-to-project@v1`) — when to choose which
  - Authentication (classic PAT vs fine-grained, required scopes per case)
  - End-to-end examples (new repo setup, Standard+ PRD lifecycle, Tactical-PR-only path)
  - CLAUDE.md inject pattern (analogue to PRD-018 operating contract)
  - Troubleshooting (5 common failure modes + fixes)
  - References (GitHub docs + actions/add-to-project + gh CLI manual)
- `CLAUDE.md` (marketplace) — gains 13-line `## GitHub Projects integration` section with `<!-- gh-project-convention:v1 -->` marker for idempotency. Catalog version bumped to 1.21.0; plugin count "10 → 11" reflects fpl-skills' new skill being a notable enough addition to flag.

### Changed
- `marketplace.json`: catalog 1.20.1 → **1.21.0** (minor — new skill in fpl-skills); fpl-skills entry 1.7.1 → 1.8.0; description mentions `/gh-project`.
- `plugin.json` (fpl-skills): version 1.7.1 → 1.8.0; skills array gains `gh-project` (alphabetically inserted between `fpl-init` and `migrate-from-dev-toolkit`); description updated to "22 engineering skills".

### Notes
**Why project-agnostic from day 1**: original design hardcoded `project 5` in skill body. User caught it during design review ("я верно понимаю что скилл не завязан на конкретном проекте?") — drove the redesign to per-project `.forgeplan/state/gh-project.yaml` config. The skill now works in any repo without code change; only the YAML differs.

**Two auto-add paths documented because both have valid use-cases**:
- Built-in project workflow (UI-configured, no `.github/workflows/` file needed) — simplest case.
- `actions/add-to-project@v1` — needed for label-based AND/OR/NOT filters or multi-repo source.

Marketplace uses the Action path so the convention is reproducible (workflow file is reviewable + version-controlled + copy-pasteable to other ForgePlan repos).

**Out of scope (deferred)**:
- Auto-creating missing project fields. User owns the schema; skill warns + prints `gh project field-create` command. Auto-create would silently mutate user's project.
- Bidirectional issue body ↔ forgeplan body sync. One-way reference (issue body has `## Forgeplan artifact` line pointing at PRD-NNN) is sufficient.
- GitHub Projects v1 (classic) — discontinued; only v2 supported.
- Bot-owned automatic Forgeplan-ID assignment based on PR title regex. Heuristic-prone; manual `link-prd` is more reliable.

### PRD-019 — Acceptance criteria status (post-build, pre-merge)

- [x] AC-1..AC-7 — see PRD-019 body. All implemented in skill prose / template / guide; AC-7 (works on hypothetical second repo) verified by design review.

## [1.20.1] - 2026-05-08

Bug-fix found during smoke-test of v1.20.0 SessionStart hook (PRD-018 deliverable). Routed Tactical (`forgeplan route`, confidence 90%, no PRD pipeline — just do it). Evidence to be linked back to PRD-018 post-merge.

### Fixed
- `fpl-skills` v1.7.0 → **1.7.1**:
  - `plugins/fpl-skills/hooks/scripts/session-start.sh` — `timeout` is GNU coreutils; on bare macOS without homebrew it's not on `$PATH`, causing the new health-probe block to silently fail (exit 127) and never surface the next-action warning. Fix: detect `timeout` availability with `command -v timeout`; if absent, run `forgeplan health --json` directly without the wrapper. forgeplan CLI itself is fast (<1s typical) and the hook still has its own 3-second timeout from `hooks.json`, so the safety net stays intact even without GNU coreutils.

### Changed
- `marketplace.json`: catalog 1.20.0 → **1.20.1**; fpl-skills entry 1.7.0 → 1.7.1.
- `plugin.json` (fpl-skills): version 1.7.0 → 1.7.1.

### Notes
**How this was found**: smoke-test 2 (SessionStart hook all paths) used a fake forgeplan shim with `env PATH="/tmp/fakebin:/usr/bin:/bin"` to simulate non-clean health. The PATH-strip incidentally removed `/opt/homebrew/bin/timeout`, causing `bash -x` trace to show `timeout 2 forgeplan health --json` exiting 127 silently. Real-world impact: any macOS user without homebrew or `gnu-coreutils` had a no-op health hook, defeating the v1.20.0 SessionStart improvement on those systems.

**Re-test after fix**: same simulation now correctly prints `⚠ forgeplan health: 1 orphan / 2 stub(s) (PRD-100, PRD-101) / 1 possible-dup pair(s) / 2 stale evidence — close before new work` plus `→ forgeplan supersede PRD-100 --by <NEW>`.

## [1.20.0] - 2026-05-08

**Forgeplan operating contract enforcement** — closes the gap where skills described forgeplan integration but didn't enforce it across sessions. Refs PRD-018 (planned and validated via `/forge-cycle` autonomous run).

The frustration this fixes: agents read SKILL.md only when a skill triggers; between skill invocations they fall back to general heuristics and skip artifact-graph operations (`forgeplan search`, `new evidence`, `link`, `activate`). User had to manually remind every session. Now the contract lives in CLAUDE.md (auto-loaded into every session context) plus the SessionStart hook surfaces concrete next-action when health is non-clean.

### Added
- `fpl-skills` v1.6.0 → **1.7.0** (minor — two new behaviours, both forgeplan-CLI-gated, fully backward-compatible):
  - **`/fpl-init` step 7-bis: operating contract injection into project CLAUDE.md**
    - When `/fpl-init` runs in a project with forgeplan CLI on `$PATH`, it offers (one yes/no prompt, defaults to yes per step-3 plan approval) to append a 13-line `## Forgeplan operating contract` section to project CLAUDE.md.
    - Section structure: **Before** (`forgeplan search` + `list -s draft`) → **During** (multi-agent: `claim` + `dispatch`) → **After** (`new evidence` + `link` + `score` + `activate`). Plus a forward-compat note about preferring `mcp__forgeplan__*` tools when available.
    - Idempotent via marker `<!-- forgeplan-operating-contract:v1 -->`. Re-running `/fpl-init` detects the marker and skips re-injection silently.
    - Step 11 (Report) gains an "Operating contract" line.
  - **SessionStart hook: `forgeplan health --json` next-action surfacing**
    - `plugins/fpl-skills/hooks/scripts/session-start.sh` now runs `timeout 2 forgeplan health --json` (gracefully degrading on absence/error) and surfaces a 2-line next-action when the artifact graph is non-clean (orphans, stubs, possible-duplicates, or stale evidence).
    - Output format: `⚠ forgeplan health: <N orphans / N stubs (id-list) / N possible-dup pairs / N stale evidence> — close before new work` + `→ <first concrete CLI from forgeplan's own next_actions array>`.
    - Healthy projects print no extra line. CLI absent → no extra line. Python3 used for JSON parsing (already a hook dependency); 2-second timeout caps the cost.

### Changed
- `marketplace.json`: catalog 1.19.0 → **1.20.0**; fpl-skills entry 1.6.0 → 1.7.0; description updated to mention contract injection + hook.
- `plugin.json` (fpl-skills): version 1.6.0 → 1.7.0.

### Notes
**Why CLAUDE.md and not skill prose**: skill descriptions live in SKILL.md and load only when their skill triggers. Between triggers, agents work from system context where skill rules don't reach. CLAUDE.md is auto-loaded into every session by Claude Code — the contract sits in the always-on context. This is the strongest enforcement lever the marketplace can pull without changing forgeplan-core.

**Forward-compat to option B (MCP wiring)**: contract mentions `mcp__forgeplan__*` tools as preferred when available. When option B lands (separate PR — `.mcp.json` config + `mcp__forgeplan__*` callsites in skills), no contract change needed.

**Out of scope (deferred)**:
- Refactoring all 22 forgeplan-aware skills to share a single `FORGEPLAN-PROBE.md` reference (option C from prior discussion). With contract in CLAUDE.md, the per-skill probe-section refactor has diminishing returns.
- Auto-detecting forgeplan and injecting without asking. The contract injection requires explicit user yes — agent autonomy stops at modifying user-owned files.

### PRD-018 — Acceptance criteria status

- [x] AC-1: `/fpl-init` in fresh repo offers contract injection — implemented via step 7-bis prose.
- [x] AC-2: Contract section appears in CLAUDE.md with the four-phase template — verified template in skill prose.
- [x] AC-3: Re-running `/fpl-init` skips on marker presence — idempotency guard documented.
- [x] AC-4: SessionStart in repo with stubs prints concrete warning + tip — parser tested with simulated non-clean JSON.
- [x] AC-5: SessionStart in repo without forgeplan CLI prints baseline only — `command -v forgeplan` guard.
- [x] AC-6: `./scripts/validate-all-plugins.sh` passes — verified pre-commit.

## [1.19.0] - 2026-05-08

`/sprint` and `/autorun` now wire the **forgeplan dispatch + claim + evidence loop** for artifact-driven sprints. Tasks taken from forgeplan as artifacts (PRD-NNN/RFC-NNN/SPEC-NNN), parallel-safe grouping computed by PRD-057 dispatcher, soft-claim per teammate, evidence emitted per artifact at wave-close.

This is **option A** from the agent-team integration roadmap — prose-only patch, no new MCP tools, no new code. Uses existing forgeplan CLI capabilities (`dispatch`, `claim`, `new evidence`) wired into skill prose so teammates pull tasks from the artifact graph instead of operating in a vacuum.

### Added
- `fpl-skills` v1.5.0 → **1.6.0** (minor — new behavior in two skills, fully backward-compatible):
  - `/sprint` SKILL.md gains three new sub-steps:
    - **§4a-bis "Forgeplan dispatch (artifact-driven sprints)"** — when wave plan tasks reference forgeplan IDs, calls `forgeplan dispatch -n {agents} --json` for a parallel-safe grouping with Jaccard file-overlap detection (threshold 0.3, PRD-057). Used as a second-opinion check on the human-built wave plan; surfaces conflicts in a 3-row decision table (agree → go, conservative → go, disagree → stop and re-check ownership).
    - **§4b.g "Forgeplan-aware teammate prompt addendum"** — every teammate working on an artifact runs `forgeplan claim {artifact-id} --agent {kebab-name}` before starting (PRD-057 soft signal). Skipped if no artifact ID in task.
    - **§4b-bis "Per-artifact evidence emission"** — at wave-close, team-lead emits `forgeplan new evidence` + `forgeplan link --relation informs` per completed artifact (one evidence per artifact, not per teammate, not per wave — because a single artifact may span multiple teammates and waves).
  - `/sprint` "Forgeplan integration" section restructured: "Before / During / After" — During row mentions dispatch + claim flow; existing pre/post recommendations preserved.
  - `/autorun` SKILL.md autopilot directive extended with FORGEPLAN-AWARE block — surfaces the dispatch/claim/evidence wiring to delegated skills so they don't have to re-discover it.
  - `/autorun` "Forgeplan integration (clarified)" table row 2 (forgeplan CLI without forgeplan-workflow) updated to mention dispatch + claim per-teammate when task is artifact-driven.

### Changed
- `marketplace.json`: catalog 1.18.2 → **1.19.0** (minor — fpl-skills feature add); fpl-skills entry 1.5.0 → 1.6.0; description mentions PRD-057 dispatcher and claim/evidence loop.
- `plugin.json` (fpl-skills): version 1.5.0 → 1.6.0.

### Notes
**Backward compatibility**: skills detect artifact-driven mode by presence of forgeplan IDs in task descriptions. Chat-driven sprints (no IDs) take the existing path unchanged — no claim, no evidence per artifact, no dispatch. Existing `/sprint` invocations continue to work identically.

**No new MCP tools added** — uses existing `forgeplan dispatch`/`claim`/`new evidence` CLI subcommands (forgeplan ships an MCP server via `forgeplan serve --stdio`; that path is option B for a future patch and is out of scope here).

**Soft-claim trade-off**: `forgeplan claim` is a soft signal, not a hard lock. Two parallel sessions claiming the same artifact will both succeed locally; conflict detection happens at the artifact graph level, not at claim-time. Acceptable for current single-orchestrator use; if multi-orchestrator races become real, upstream forgeplan would add TTL + lease-renewal to claim.

## [1.18.2] - 2026-05-08

User-reported bug: `/plugin marketplace update forgeplan-marketplace` (lowercase) fails because Claude Code is case-sensitive and the canonical name in `marketplace.json` is `ForgePlan-marketplace` (PascalCase). Two top-level READMEs printed the broken lowercase form.

### Fixed
- `README.md`: update command line 310 — `forgeplan-marketplace` → `ForgePlan-marketplace`.
- `README-RU.md`: update command line 284 — same fix.
- `marketplace.json`: catalog 1.18.1 → **1.18.2**.

### Notes
`docs/USAGE-GUIDE.md` and `-RU.md` already documented the case-sensitivity correctly (with explicit "Wrong: forgeplan-marketplace / Right: ForgePlan-marketplace" examples) — those were intentional and not touched. Plugin install commands across all docs already use the correct `@ForgePlan-marketplace` form (148+ occurrences, none broken).

The marketplace name in your local registry is set when you run `/plugin marketplace add ForgePlan/marketplace` — so the canonical name is what GitHub reports for the marketplace.json `"name"` field. PascalCase F + P, lowercase rest. No version bump for plugins; this is a docs-only patch.

## [1.18.1] - 2026-05-08

Documentation sync for v1.18.0 — brings README/METHODOLOGIES/USAGE-GUIDE/ARCHITECTURE/AUTORESEARCH-INTEGRATION docs in line with the new mappings shipped in v1.18.0. No code or mapping changes.

### Changed
- `forgeplan-brownfield-pack` v1.3.0 → **1.3.1** (patch — docs only):
  - `README.md` and `README-RU.md`: section "2 mappings" → "5 mappings"; lists all five (c4, ddd, madr, obsidian, autoresearch) with one-line descriptions each.
- `docs/METHODOLOGIES.md` and `-RU.md`: added per-methodology sections for **MADR** and **Obsidian** (alongside existing DDD and C4 entries). Quick lookup table extended with rows for MADR, Obsidian, plus an updated Autoresearch row mentioning the new ingest mapping.
- `docs/USAGE-GUIDE.md` and `-RU.md`: brownfield-pack section description now lists all five mappings by name instead of generic "Obsidian, MADR, ad-hoc markdown".
- `docs/ARCHITECTURE.md` and `-RU.md`: brownfield-pack capability row updated from "Mappings + playbooks for migrating legacy docs (Obsidian, MADR)" to "5 mappings (c4, ddd, madr, obsidian, autoresearch) + 12 extraction skills + 2 playbooks".
- `docs/AUTORESEARCH-INTEGRATION.md` and `-RU.md`: "See also" section now distinguishes the two directions — `autoresearch-hooks.md` (outbound: skill → autoresearch command) and `autoresearch-to-forge.yaml` (inbound: autoresearch outputs → forge artifacts).
- `marketplace.json`: catalog 1.18.0 → **1.18.1**; brownfield-pack entry 1.3.0 → 1.3.1.

### Notes
This patch closes the documentation gap from v1.18.0 — the mappings YAMLs were shipped, but the user-facing docs that point at them weren't updated in the same PR. No new files; only edits to existing docs.

## [1.18.0] - 2026-05-08

Three new brownfield ingestion mappings: MADR, Obsidian vaults, and autoresearch outputs. The `forgeplan-brownfield-pack` plugin now covers five upstream formats end-to-end (c4, ddd, madr, obsidian, autoresearch).

### Added
- `forgeplan-brownfield-pack` v1.2.0 → **1.3.0** (minor — three new mappings):
  - **`mappings/madr-to-forge.yaml`** (~110 lines) — MADR (Markdown Architectural Decision Records, https://adr.github.io/madr/) → forge `adr` kind. Supports MADR 3.x and 4.x. Status normalization (proposed → draft, accepted → active, rejected → deprecated, superseded → superseded). Supersession-link extraction (`superseded by ADR-NNNN` / `supersedes ADR-NNNN`). Heading synonyms for the variants between MADR 3 and 4 templates. Path patterns: `docs/adr/`, `docs/decisions/`, `doc/architecture/decisions/`, `adr/` plus opt-in via frontmatter `kind: adr`.
  - **`mappings/obsidian-to-forge.yaml`** (~190 lines) — Obsidian vault → forge artifacts. Detects vault by `.obsidian/` marker; excludes templates/, daily/, journal/. Four-tier signal priority: frontmatter `kind:` → tag (`#prd`, `#epic`, `#adr`, `#hypothesis`) → folder pattern (PARA / Johnny.Decimal) → default to Note. MOC files → Epic; Project notes → PRD; tagged decision notes → ADR (with delegation to `madr-to-forge` if MADR-shaped). Resolves `[[wikilinks]]` to `relates_to` edges (lazy — broken links warn rather than fail).
  - **`mappings/autoresearch-to-forge.yaml`** (~210 lines) — autoresearch (uditgoenka/autoresearch v2.x) outputs → forge artifacts. Companion to existing `integration/autoresearch-hooks.md` (which describes the inverse direction). Maps each of the 7 autoresearch modes to the right forge kind: `--mode=glossary` → glossary, `--mode=use-case` → use-case, `--mode=invariant` → invariant, `--mode=intent` → note, `--mode=triangulate` → hypothesis, `--template=gherkin` → scenario, `--mode=canonical` → spec. Journal dispatcher routes per-artifact entries from `.autoresearch/journal-*.json`. Preserves anti-herd flag, mirrors decay policy, and surfaces `extract_score` composite metric as a Note for trend tracking.

### Changed
- `forgeplan-brownfield-pack/.claude-plugin/plugin.json`: version 1.2.0 → 1.3.0; description "2 mappings (c4-to-forge, ddd-to-forge)" → "5 mappings (c4-to-forge, ddd-to-forge, madr-to-forge, obsidian-to-forge, autoresearch-to-forge)".
- `marketplace.json`: catalog 1.17.0 → **1.18.0**; brownfield-pack entry 1.2.0 → 1.3.0; description updated to mention all 5 mappings.

### Notes
All three mappings follow the established schema-v1.0 convention (same as `c4-to-forge.yaml` and `ddd-to-forge.yaml`): `schema_version`, `mapping_name`, `source_plugin`, `sources` (path/frontmatter/tag patterns), per-mapping `extract` rules with `body_sections`, `synthesized` stubs, `extract_links` for cross-artifact edges, `source_ref` for traceability, `universal_rules`, `compat_notes` for pre-EPIC-008 fallbacks, and realistic `example_counts`. Pre-EPIC-008 fallback chain unified: glossary→note, use-case→prd, invariant→spec, hypothesis→problem, scenario→note.

The brownfield-pack now has reasonable coverage of the formats teams actually keep their decisions and notes in: Architecture-as-Code (c4, ddd), Decision Records (madr), Knowledge Management (obsidian), and Research Pipelines (autoresearch). The remaining gaps are intentional — domain-specific formats (Confluence exports, Notion, Jira tickets) belong in separate add-on mappings rather than bloating the core pack.

## [1.17.0] - 2026-05-08

Final piece of the methodology coverage trio: `/riper` orchestrator + AI-SDLC mapping doc + upstream methodologies bibliography.

### Added
- `fpl-skills` v1.4.0 → **1.5.0** (minor — one new skill):
  - **`/riper`** (~250 lines) — RIPER methodology orchestrator (Research → Innovate → Plan → Execute → Review). Thin wrapper that walks a task through 5 phases by delegating to existing fpl-skills (`/research` → `/refine` or `/fpf-decompose` → `/rfc create` → `/sprint` or `/forge-cycle` → `/audit`). Tracks current phase visibly. Honest about being a vocabulary overlay on top of `/forge-cycle` — the two converge on the same forgeplan artifact graph; choose by team vocabulary preference.
- `docs/AI-SDLC-MAPPING.md` and `-RU.md` (~200 lines each) — phase-by-phase reference table mapping common AI-SDLC phases (Concept → Research → Design → Specification → Build → Test → Release → Operate → Maintain) onto our marketplace commands. Worked example for "add magic-link auth" through all 9 phases. Honest about what we don't cover (production deployment, observability dashboards, compliance audits — typically the CI/CD and APM layers above us).
- `docs/UPSTREAM-METHODOLOGIES.md` and `-RU.md` (~250 lines each) — bibliography of the upstream projects forgeplan integrates: Quint-code (DDR + Verification Gate), BMAD-METHOD (PRD validation + adversarial review), OpenSpec (artifact DAG + delta-specs), FPF (F-G-R + ADI + CL), Karpathy autoresearch (loop discipline), git-adr (Rust CLI reference), adr-tools (canonical ADR), ccpm (Claude Code patterns). For each: where the upstream lives, what forgeplan adopted, what forgeplan adapted, when to read it.

### Changed
- `plugin.json` (fpl-skills): skills array `20 → 21` entries (+riper, alphabetically inserted). Description updated to mention RIPER orchestrator. Version 1.4.0 → 1.5.0.
- `marketplace.json`: catalog 1.16.0 → **1.17.0**; fpl-skills entry 1.4.0 → 1.5.0; description updated.
- `docs/USAGE-GUIDE.md` and `-RU.md`: Quick Reference adds `/riper` row right after `/c4-diagram`.
- Root `README.md` and `README-RU.md`: Documentation block extended to 8 entries — added "AI-SDLC mapping" and "Upstream methodologies" rows.

### Notes
With this release, the methodology coverage story is complete:
- **Built into forgeplan CLI** — BMAD validate, OpenSpec DAG, FPF/ADI reason, DDR template, R_eff, Evidence Decay (documented in METHODOLOGIES)
- **Marketplace skills** — `/shape`, `/refine`, `/ddd-decompose`, `/c4-diagram`, `/forge-cycle`, `/sprint`, `/audit`, `/research`, `/diagnose` etc.
- **Vocabulary overlays** — `/riper` (RIPER terminology), AI-SDLC-MAPPING.md (AI-SDLC vocabulary)
- **External companions** — autoresearch integration documented (AUTORESEARCH-INTEGRATION)
- **Reference** — UPSTREAM-METHODOLOGIES bibliography

The user picking "RIPER" or "AI-SDLC" terminology no longer hits a "not in our ecosystem" wall — they get either a wrapper command (`/riper`) or a mapping table (AI-SDLC) that translates to our canonical workflow.

## [1.16.0] - 2026-05-08

Two new interactive design skills — top-down complement to the existing brownfield-pack extraction skills (which work bottom-up from code).

### Added
- `fpl-skills` v1.3.0 → **1.4.0** (minor — two new interactive skills):
  - **`/ddd-decompose`** (~280 lines) — interview-driven Domain-Driven Design decomposition. Walks through identifying bounded contexts, ubiquitous language per context, aggregates, domain events, integration map. Outputs context map (Markdown + Mermaid) plus, when forgeplan CLI is available, Epic + per-context PRDs + Spec for cross-context contracts. Pairs with `/fpf-decompose` (general decomposition without DDD framing) and the `ddd-domain-expert` agent in `agents-pro` (advisory).
  - **`/c4-diagram`** (~280 lines) — interactive C4 architecture diagram generator. Walks through L1 Context (system + actors), L2 Container (runtime units inside system), L3 Component (per-container detail, optional), L4 Code (rare). Outputs Mermaid diagrams plus written context per level. Maps cleanly to forgeplan via `c4-to-forge.yaml` from `forgeplan-brownfield-pack` — top-down design vs the brownfield bottom-up ingestion path.

### Changed
- `plugin.json` (fpl-skills): skills array `18 → 20` entries (+ddd-decompose, +c4-diagram). Description updated. Version 1.3.0 → 1.4.0.
- `marketplace.json`: catalog version 1.15.0 → **1.16.0**; fpl-skills entry version 1.3.0 → 1.4.0.
- `docs/USAGE-GUIDE.md` and `-RU.md`: Quick Reference adds `/ddd-decompose` and `/c4-diagram` rows in the fpl-skills section.

### Notes
The two new skills close a real gap. We had:
- Bottom-up (brownfield): `forgeplan-brownfield-pack` extraction skills work from existing code → produce DDD/C4-style artifacts
- Mappings only (forgeplan integration): `c4-to-forge.yaml` and `ddd-to-forge.yaml` ingest existing diagrams/contexts
- Advisory agent: `ddd-domain-expert` and `architect-reviewer` in `agents-pro`

What was missing — **top-down interactive design**. A new system needs DDD/C4 decomposition through structured questions, not by analysing code that doesn't exist yet. `/ddd-decompose` and `/c4-diagram` fill this. The interview pattern is consistent with `/shape` and `/refine` (one focused question per turn, surface contradictions immediately, cap output to a draft).

## [1.15.0] - 2026-05-08

Reframed `autoresearch` (the metric-driven loop plugin by Udit Goenka) from "external mention" to **recommended companion** with a proper integration guide. Earlier docs treated it as a distant reference; in reality it composes naturally with `/forge-cycle` and the brownfield extraction skills.

### Added
- `docs/AUTORESEARCH-INTEGRATION.md` and `-RU.md` (~280 lines each) — full integration guide covering the autoresearch v2.0.03 command set (`plan`, `debug`, `security`, `predict`, `reason`), three integration patterns (autoresearch as Build phase of `/forge-cycle`; autoresearch standalone → Note + Evidence; security audit → Evidence), brownfield mapping (which extraction skills delegate to which autoresearch command), setup instructions, decision matrix, anti-patterns. RU version in plain Russian.

### Changed
- `docs/METHODOLOGIES.md` and `-RU.md`: Autoresearch promoted from "External" section to a new "Recommended companion" section. Quick lookup table updated with link to the integration guide.
- `docs/PLAYBOOK.md` and `-RU.md`: new use-case "Metric-driven iteration (autoresearch + ForgePlan)" with three patterns showing how PRD success criteria become autoresearch metrics, results captured as CL3 Evidence with `evidence_type: measurement`.
- Root `README.md` and `README-RU.md`: Documentation block extended to 6 entries (added "Autoresearch integration" row).
- `forgeplan-brownfield-pack` v1.1.0 → **1.2.0** (patch — description refreshed to mention autoresearch integration; no skill changes).
- Marketplace catalog metadata.version 1.14.0 → **1.15.0**.

### Notes
The earlier framing in METHODOLOGIES called autoresearch "an external tool we don't implement". Technically true, but strategically misleading — the brownfield-pack `integration/autoresearch-hooks.md` already maps each of our 12 extraction skills to autoresearch commands, and autoresearch's loop pattern is exactly what `/forge-cycle` Build phase needs when a mechanical metric exists. This release surfaces that.

Reframing matters because users who read METHODOLOGIES decide what to install. "External, not in our ecosystem" → likely skip. "Recommended companion, here's how it composes" → likely try.

## [1.14.0] - 2026-05-08

Brownfield extraction pack ported from upstream forgeplan repo. The 12-skill methodology that's been ready in `/docs/brownfield-extraction-package/` is now installable.

### Added
- `forgeplan-brownfield-pack` v1.0.0 → **1.1.0** — full content port from `/Users/explosovebit/Work/ForgePlan/docs/brownfield-extraction-package/`:
  - **12 extraction skills** in `skills/`, each with Claude Code frontmatter + the original methodology body:
    `ubiquitous-language` (C1), `use-case-miner` (C2), `intent-inferrer` (C3), `invariant-detector` (C4), `causal-linker` (C5), `hypothesis-triangulator` (C6), `interview-packager` (C7), `scenario-writer` (C8), `kg-curator` (C9), `canonical-reproducer` (C10), `reproducibility-validator` (C11), `rag-packager` (C12).
  - **2 orchestration playbooks** in `playbooks/`: `extract-business-logic.md` (full sequence), `phase-transitions.md` (quality gates between phases).
  - **3 integration recipes** in `integration/`: `autoresearch-hooks.md`, `forgeplan-mcp-additions.md`, `rag-export-format.md`.
  - **6 templates** in `templates/`: glossary, use-case, hypothesis, scenario, invariant, domain-model.
  - **6 artifact-kind definitions** in `artifact-kinds/`.
  - **5 examples** in `examples/` from the TripSales reference project.
  - **4 methodology docs** in pack root: `METHODOLOGY.md`, `ARCHITECTURE.md`, `SKILLS-INVENTORY.md`, `GLOSSARY.md`.

### Changed
- `plugins/forgeplan-brownfield-pack/.claude-plugin/plugin.json`: skills array now lists all 12 (was empty); description rewritten to enumerate what's shipped; version 1.0.0 → 1.1.0; keywords updated (`extraction`, `factum-intent`, `domain-modeling`).
- `plugins/forgeplan-brownfield-pack/README.md` and `-RU.md`: full rewrite to reflect actual contents — sections for each skill category, two-tier methodology summary, typical workflow chain, when-to-use / when-not-to-use, companion plugins. RU version written in plain Russian (less anglicism, terms like "разведка", "уверенно выведено", "ограниченный контекст").
- Marketplace catalog: brownfield-pack description updated; metadata.version 1.13.0 → **1.14.0**.

### Notes
The pack alpha-status from v1.0.0 is now lifted to **production-ready for content**, but **playbook orchestration** still depends on forgeplan CLI v0.25+ runtime features (EPIC-007 / PRD-065 in upstream). Skills can be invoked individually now; full automated pipeline awaits the upstream playbook engine.

The two-tier extraction methodology (Factum vs Intent) is the conceptual core. Every intent claim must carry a confidence tag (verified ✅ / strong-inferred 🟢 / inferred 🟡 / speculation 🟠 / unknown ⬜). This separation is enforced by skill `03-intent-inferrer` and validated downstream by `06-hypothesis-triangulator`.

## [1.13.0] - 2026-05-08

Closes the lifecycle front-end gap (`/shape` skill) and adds two strategic docs (`PLAYBOOK`, `METHODOLOGIES`).

### Added
- `fpl-skills` v1.2.0 → **1.3.0** (minor — new skill + plugin description rework):
  - **New skill `/shape <idea>`** — interview-from-scratch that turns a fuzzy idea into a draft PRD via 8-12 focused questions. Pairs with `/refine` (which polishes existing plans). Forgeplan-aware: writes the draft as a real PRD via `forgeplan new prd` if the CLI is available; falls back to plain markdown otherwise.
- `docs/PLAYBOOK.md` and `-RU.md` — use-case matrix mapping situations ("empty project + idea", "brownfield migration", "night-run with full methodology", "interview-driven feature shaping", multi-session team work) to setup commands and workflows. RU version written in plain Russian, not English-translated.
- `docs/METHODOLOGIES.md` and `-RU.md` — clarifies what's built into the forgeplan CLI (BMAD via `forgeplan validate`, OpenSpec as artifact DAG, ADI in `forgeplan reason`, DDR template for ADRs, R_eff scoring, Evidence Decay, Verification Gate, Pareto Front, Two-tier Factum/Intent extraction for brownfield) vs what's available as separate plugins (SPARC, FPF interactive, Laws of UX) vs what's external or not implemented (Autoresearch, DDD modelling engine, C4 modelling engine, RIPER, AI-SDLC). Includes a quick lookup table.

### Changed
- Root `README.md` and `README-RU.md`: documentation block now includes 5 entries (Developer Journey, Playbook, Usage Guide, Architecture, Methodologies) — added Playbook and Methodologies. Skill count stat updated to 18.
- `docs/USAGE-GUIDE.md` and `-RU.md`: Quick Reference adds `/shape` row right before `/refine` (pairs them as front-end + polishing). See-also section adds Playbook and Methodologies.
- Marketplace catalog metadata.version 1.12.0 → **1.13.0**.

### Notes
The `/shape` skill closes a real onboarding gap: previously, users with raw ideas had to either write a PRD draft themselves first (then call `/refine`) or commit to `/forge-cycle` automation immediately. Now the front-end interview is explicit and bounded (8-12 questions, capped to avoid drift into refinement territory).

The METHODOLOGIES doc is corrective — earlier guides implied BMAD, OpenSpec, ADI etc. were "missing from the marketplace" but they're built into the forgeplan CLI itself. This doc surfaces them properly.

## [1.12.0] - 2026-05-07

Closes a real architectural gap — until now, `fpl-skills` skills (`/sprint`, `/audit`, `/research`, `/refine`, `/rfc`, `/diagnose`, `/build`, `/do`, `/restore`, `/briefing`) didn't mention `forgeplan` at all. Documentation promised they "delegate artifact lifecycle to forgeplan" but the skill bodies didn't. After this release, every workflow skill is **forgeplan-aware**: it recommends the right CLI calls (route, new prd/evidence/note/adr, link, score, activate) at the right times and points the user at `/forge-cycle` for full orchestration.

### Added
- `fpl-skills` v1.1.1 → **1.2.0** (minor — feature: cross-skill forgeplan integration):
  - **10 workflow skills now include a "Forgeplan integration" section**: `/sprint`, `/audit`, `/research`, `/refine`, `/rfc`, `/diagnose`, `/build`, `/do`, `/restore`, `/briefing`. Each section is tailored to what the skill produces — `/sprint` recommends `forgeplan route → new prd → new evidence → activate`; `/audit` writes Evidence; `/research` proposes Note vs PRD vs ADR depending on output; `/refine` adds ADR for surfaced decisions; `/rfc` prefers `forgeplan new rfc/adr` over plain markdown; `/diagnose` writes Evidence on verified fix; `/build` activates PRD on completion; `/do` mirrors `/autorun`'s probe-and-delegate pattern; `/restore` and `/briefing` add `forgeplan health`/`blocked`/`stale` to the recall block.
  - Each section ends with a **"Want this orchestrated for you?"** callout pointing at `/forge-cycle` (in `forgeplan-workflow`) — the one-command alternative that does all the recommended CLI calls automatically.
- `/autorun` integration block clarified: explicit table of "what happens with/without forgeplan-workflow installed".

### Changed
- `docs/DEVELOPER-JOURNEY.md` and `-RU.md`: new section **"`/forge-cycle` — first time"** (50+ lines each) — short walkthrough showing the 8-step cycle, decision matrix `/forge-cycle` vs `/sprint` vs `/autorun` vs `/do`, setup checklist, and integration with `@forgeplan/web` for visual exploration. Closes the onboarding gap for users who want the orchestrated path rather than manual coordination.
- Marketplace catalog metadata.version 1.11.1 → **1.12.0**.

### Notes
**This is a documentation-and-design change, not a behaviour change for the CLI side**. Skills now *recommend* the right `forgeplan` calls inline; they don't *invoke* them. This keeps `fpl-skills` simple (executors) and `forgeplan-workflow` differentiated (orchestrator). Users who want automation install `forgeplan-workflow` and get `/forge-cycle`; users who prefer manual control install just `fpl-skills` and follow the inline recommendations.

The architectural decision: **don't dilute `fpl-skills` skills with `forgeplan-workflow`'s logic**. Two plugins with overlapping orchestration would create dual-pathways and divergence. Instead, every skill points to the orchestrator as the canonical "automate this" answer.

## [1.11.1] - 2026-05-07

Automated migration helper.

### Added
- `fpl-skills` v1.1.0 → **1.1.1** (patch — new utility skill):
  - **New skill: `migrate-from-dev-toolkit`** (`plugins/fpl-skills/skills/migrate-from-dev-toolkit/SKILL.md`) — automates the dev-toolkit → fpl-skills migration. Probes installed plugins + forgeplan CLI, scans CLAUDE.md and project docs for `/dev-toolkit:*` references, offers Mode A (side-by-side, zero-risk default) or Mode B (clean cut), runs file-level sed-replacements with `.bak.fpl-migrate` backups, tells the user which `/plugin install`/`uninstall` commands to type, verifies post-state.
- Marketplace catalog metadata.version 1.11.0 → **1.11.1**.

### Changed
- `docs/MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS.md` and `-RU.md`: added `[!TIP]` block at the top recommending the new skill as the preferred automated path; the manual guide remains canonical for users who want to understand each step.
- `docs/USAGE-GUIDE.md` and `-RU.md`: Quick Reference table now includes `/migrate-from-dev-toolkit` in the fpl-skills section.
- `plugins/fpl-skills/README.md` and `-RU.md`: skill table extended with `/migrate-from-dev-toolkit` row (16 → 17 skills).

### Notes
The skill never invokes `/plugin install` or `/plugin uninstall` itself — those are host-level operations. It orchestrates the file-level work (CLAUDE.md updates, smoke-test prompts) and tells the user which `/plugin` commands to run. This keeps the migration auditable and reversible at every step.

`/dev-toolkit:report` references are deliberately NOT auto-substituted — there's no `/report` command in fpl-skills (the underlying `forge-report` skill is invoked by name). The skill annotates these references with a migration note for human review.

## [1.11.0] - 2026-05-07

Full feature parity with the legacy `dev-toolkit`. Migration guide can now claim "everything is ported".

### Added
- `fpl-skills` v1.0.3 → **1.1.0** (minor — feature additions):
  - **Ported `forge-report` skill** from dev-toolkit. Card-based structured report templates (build/audit/decision/incident/migration), section anchors, required sections, anti-patterns. 23 markdown files in `skills/forge-report/sections/`.
  - **Ported `dev-advisor` agent** from dev-toolkit. Background advisor that suggests `/audit` after multi-file changes, flags missing tests on new public functions, warns on security-sensitive edits.
  - **Ported safety hook** (`PreToolUse:Bash`) — blocks `git push --force`, `git reset --hard`, `rm -rf /`, `DROP TABLE`.
  - **Ported test-reminder hook** (`PostToolUse:Write|Edit|MultiEdit`) — suggests tests when new public functions are added.
  - **Ported `forge-report` auto-trigger hooks** — `forge-report-session-start.sh` (resets counter) and `forge-report-counter.sh` (PostToolUse:.* counter that triggers the skill when criteria met).
- Marketplace catalog metadata.version 1.10.3 → **1.11.0**.

### Changed
- Root README.md and README-RU.md: added a prominent **📚 Documentation** block as a table with all 8 user-facing docs (Developer Journey · Usage Guide · Architecture · Migration · Tracker Integration · Forgeplan Web · Changelog · Contributing). Stats line updated to "16 skills".
- `plugins/dev-toolkit/README.md` and `-RU.md`: deprecation callout updated — now states all dev-toolkit components are ported as of fpl-skills v1.1.0. Restored the missing RU deprecation block (was lost in PR #36 squash merge).
- `docs/MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS.md` and `-RU.md`: "What stays the same" table updated — `forge-report`, `dev-advisor`, hooks all marked "✅ ported in v1.1.0". Removed the "/dev-toolkit:report stays" caveat.
- `docs/USAGE-GUIDE.md` and `-RU.md`: legacy `/report` row reframed — the underlying `forge-report` skill is now in fpl-skills.
- `plugins/fpl-skills/README.md` and `-RU.md`: added rows for `forge-report` skill, `dev-advisor` agent, and the hook bundle.

### Notes
The migration-from-dev-toolkit story is now clean: install `fpl-skills`, get everything dev-toolkit had plus 13 more skills. No "feature gap" reasons to keep dev-toolkit installed.

When both plugins are installed, hooks fire twice (e.g. safety hook from both plugins). The hook scripts are independent — no collision but doubled output. Migration guide flags this and recommends Mode A (side-by-side) → uninstall dev-toolkit once verified, or Mode B (clean cut) for users comfortable with one transition.

A `migrate-from-dev-toolkit` skill that automates the migration steps is planned for v1.1.1 (next PR).

## [1.10.3] - 2026-05-07

Operational docs overhaul — migration guide, tracker recipes, forgeplan-web walkthrough, plus a corrected `.forgeplan/` setup contract.

### Added
- `docs/MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS.md` and `-RU.md` — migration guide for users moving from `dev-toolkit` to `fpl-skills`. Covers the side-by-side mode (zero-risk default), clean-cut mode, slash command namespacing (`/dev-toolkit:audit` vs `/fpl-skills:audit`), `CLAUDE.md` reference updates, rollback plan, and explicit "what this migration does NOT change".
- `docs/TRACKER-INTEGRATION.md` and `-RU.md` — per-tracker recipes for Orchestra, GitHub Issues, Linear, Jira, and local `TODO.md`. Each section provides `docs/agents/issue-tracker.md` template, MCP/CLI commands, `/briefing` integration notes, and triage label conventions.
- `docs/FORGEPLAN-WEB.md` and `-RU.md` — guide to `@forgeplan/web` (the browser viewer at [github.com/ForgePlan/forgeplan-web](https://github.com/ForgePlan/forgeplan-web)). When to install, time-travel slider, graph viewer, integration with marketplace plugins, setup checklist (which pieces of `.gitignore` contract are mandatory for full functionality).

### Changed
- `plugins/fpl-skills/skills/bootstrap/resources/guides/FORGEPLAN-SETUP.md` — rewritten with the authoritative `.gitignore` contract: detailed effects-of-mistakes tables (config.yaml leak, notes/ ignore, session.yaml tracked, state/ ignore, memory/ ignore, literal API key in config.yaml), single-config-file model (`secrets.yaml` does not exist; only `config.yaml`), default fallback chain for `api_key_env`, agent-session anti-patterns (4 grouping mistakes), the two "memory" concepts disambiguation (forgeplan `memory/` vs Hindsight MCP).
- `fpl-skills` v1.0.2 → 1.0.3 (patch — documentation accuracy + new resource references in plugin tree).

### Notes
The setup contract update reflects authoritative info: `memory/` is a first-class Forgeplan artifact kind (categories: fact / convention / constraint / observation / procedure) and **must be tracked**, not gitignored. There is no separate `secrets.yaml` — `config.yaml` uses `api_key_env: VAR_NAME` and the actual key lives in process env (12-factor pattern).

## [Unreleased]

### Added
- `docs/DEVELOPER-JOURNEY.md` and `DEVELOPER-JOURNEY-RU.md` — narrative onboarding ("From Zero to Shipping") with 4 persona Day 0 walkthroughs (Solo / Frontend / Architect / Team with Orchestra), worked example "add user authentication" threading through commands, and a Mermaid diagram of ecosystem composition.

### Changed
- `docs/USAGE-GUIDE.md` and `USAGE-GUIDE-RU.md` rewritten as a reference manual (vs the old "first guide" framing). New structure: Installation → Recommended stacks (by persona) → Quick reference (15 commands) → Daily workflow → Agent activation rules → Hook behavior → Plugin reference → Troubleshooting. fpl-skills positioned as flagship; /fpl-init featured throughout; dev-toolkit demoted to legacy.
- `docs/ARCHITECTURE.md` and `ARCHITECTURE-RU.md` Plugin Map updated: fpl-skills added as the "glue layer" flagship; dev-toolkit reframed as legacy (soft-deprecated). Recommended Stacks rewritten persona-first.

## [1.10.2] - 2026-05-07

### Added
- New plugin resource: `plugins/fpl-skills/skills/bootstrap/resources/guides/FORGEPLAN-SETUP.md` — canonical `.forgeplan/` setup contract (gitignore, secrets layout via 12-factor `api_key_env`, env var overrides, anti-patterns, pre-commit verification).
- `plugins/fpl-skills/README-RU.md` — Russian mirror of the plugin README, aligned with marketplace bilingual convention.

### Changed
- `fpl-skills` v1.0.1 → 1.0.2: corrected `.forgeplan/` storage layout in `CLAUDE.md.template` (config.yaml is tracked but uses `api_key_env`; canonical .gitignore includes logs/, .lock, session.yaml, trash/, discovery/, .env; memory/ and state/*.yaml clarified as tracked artifact dirs).
- `plugins/fpl-skills/README.md` (67 → 139 lines) — aligned with canonical marketplace plugin README structure (tagline → Quick Start → Usage Examples → What's Included → Lifecycle integration → Companion plugins → Resource guides → Credits → License).
- Root `README.md` and `README-RU.md`: stats updated to 12 plugins / 15 commands / 5 KBs; "Where to Start?" matrix recommends fpl-skills as the flagship for forgeplan users; dev-toolkit moved down with `[!CAUTION]` deprecation callout; fpl-skills entry added FIRST in Available Plugins.

### Notes
This release addresses real-world feedback from smoke-testing `/fpl-init` on a fresh project. The earlier v1.0.1 template was inaccurate about secrets layout (claimed config.yaml was untracked); v1.0.2 corrects this and ships the full setup contract as a reference doc.

## [1.10.1] - 2026-05-07

### Added
- `plugins/fpl-skills/skills/fpl-init/SKILL.md` step 7 mandates literal template rendering (Read the file, abort-if-missing, no improvising, no reordering of sections).
- `plugins/fpl-skills/skills/bootstrap/resources/templates/CLAUDE.md.template` enriched 170 → 447 lines following the U-curve attention layout from `CLAUDE-MD-GUIDE.ru.md`.

### Changed
- `fpl-skills` v1.0.0 → 1.0.1: fix for `/fpl-init` agent that was improvising thin (~60-line) CLAUDE.md instead of rendering the full template. New sections added: Routing depth table, Artifact ID rules (slug/predicted/assigned), EvidencePack structured fields, Lifecycle commands, Standard flow example, Multi-agent dispatch/claim/release, Validator section aliases, Permission zones (🟢/🟡/🔴), Agent teams listing the 5 packs, Unified workflow (Forgeplan × Tracker × Memory).

### Notes
The verbosity of the template is load-bearing — primacy/reference/recency zones need population for U-curve attention. Earlier "thin" template silently stripped guard rails.

## [1.10.0] - 2026-05-07

### Added
- New plugin: `fpl-skills` v1.0.0 — flagship workflow plugin bundling 15 engineering skills (research, refine, sprint, audit, diagnose, autorun + bootstrap, /fpl-init, restore, briefing, build, do, rfc, setup, team) on top of forgeplan's artifact lifecycle.
- `/fpl-init` skill — one-command project bootstrap that probes forgeplan CLI, runs forgeplan init, merges .mcp.json and .claude/settings.json, then chains /bootstrap (universal CLAUDE.md template with stack detection) and /setup (docs/agents wizard).
- `plugins/fpl-skills/GETTING-STARTED.md` — human-readable bootstrap walkthrough.
- SessionStart hook in fpl-skills surfacing context-aware next-step hints (e.g. "Run /fpl-init" for fresh repos).

### Changed
- `dev-toolkit` v1.6.1 → 1.6.2: marked `deprecated: true`, `supersededBy: fpl-skills`. README opens with `[!CAUTION]` deprecation callout pointing to fpl-skills. Soft-sunset; existing installs continue to work. Hard removal deferred to catalog v2.0 (ADR-003 in `.forgeplan/adrs/`).
- Marketplace catalog metadata updated to mirror dev-toolkit deprecation flags on the catalog entry.

### Notes
First major catalog reshape since v1.6.0 (Agent Army). fpl-skills enters as the canonical entry point for forgeplan users. dev-toolkit kept in catalog for backward compatibility — no forced migration.

## [1.8.0] - 2026-04-26

### Added
- New plugin: `forgeplan-brownfield-pack` v1.0.0 — orchestrator pack for brownfield migrations. Composes existing marketplace plugins (`c4-architecture`, `autoresearch`, `ddd-expert`, `feature-dev`) with forgeplan's ingest engine via mapping YAMLs and playbook recipes (per ADR-009).

### Notes
Implements the orchestrator model: forgeplan does not re-implement extraction. Mapping layer (c4-to-forge) validated at CL3 on Forgeplan repo (2026-04-20).

## [1.7.0] - 2026-04-28

Aligned `forgeplan-workflow` with Forgeplan v0.25.0 (PRD-071 unified hint contract). All plugins bumped to v1.5.0, marketplace catalog to v1.7.0.

### Added

- `forgeplan-workflow`: new skill section `06-output-hints/agent-protocol.md` — full agent reading protocol for the 5-rule hint contract (Next/Or/Wait/Done/Fix markers)
- `forgeplan-workflow`: new prelude step "Reading Forgeplan Output" in `/forge-cycle` command — instructs the agent to read contract markers after every command
- `forgeplan-workflow`: new behavior #5 "Hint Contract Awareness" in `forge-advisor` agent — gently reminds when user/agent ignores `Next:`/`Fix:` markers (existing SPARC behavior renumbered to #6)

### Changed

- `forgeplan-workflow`: bumped to v1.5.0
- Marketplace catalog: bumped to v1.7.0
- `forgeplan-methodology` SKILL: Section router updated with new "hint protocol" topic; new top-level section "Hint Protocol" added
- README.md + README-RU.md: feature mention of v1.5.0 hint contract awareness

### Notes

Without v1.5.0, users installing `forgeplan-workflow` get an agent that does NOT read the new hint markers — wastes Forgeplan v0.25.0's contract work. v1.5.0 closes the distribution gap.

Compatibility:
- Requires Forgeplan binary >= v0.25.0 for full benefit (older versions still work but agent will not see contract markers)
- Backward compat: existing `/forge-cycle`, `/forge-audit`, advisor behaviors unchanged

## [1.6.0] - 2026-04-04

### Added
- Agent Army: 55 agents across 5 packs (agents-core, agents-domain, agents-pro, agents-github, agents-sparc)
- SPARC development methodology integration with /sprint Deep tasks
- ARCHITECTURE.md and ARCHITECTURE-RU.md documentation (4 Systems, 4 Layers)
- Bilingual architecture docs with cross-links

### Fixed
- Duplicate sections in USAGE-GUIDE.md (Advisor Agents, Agent Packs, How Agents Work appeared twice)
- README.md Quick Start updated with step-by-step flow
- Added "Where to Start?" role-based guide to README.md
- Architecture link added to README header stats

## [1.4.0] - 2026-04-04

### Added
- plugin.json v2 schema support
- Collision detection for overlapping plugin commands

### Changed
- Marketplace catalog updated with v2 schema fields

## [1.3.1] - 2026-04-04

### Changed
- USAGE-GUIDE.md expanded with Advisor Agents, Agent Packs, How Agents Work, SPARC Methodology sections
- USAGE-GUIDE-RU.md expanded with matching Russian translations

### Fixed
- Small formatting fixes in usage guides

## [1.3.0] - 2026-04-04

### Added
- CHANGELOG.md for tracking marketplace changes
- hooks.json schema documentation in CONTRIBUTING.md
- Mandatory PR workflow rules in CLAUDE.md
- Version bumping policy in CLAUDE.md

### Changed
- CONTRIBUTING.md: added hooks.json schema reference and examples

## [1.2.0] - 2026-04-04

### Fixed
- Python injection vulnerability in validate-all-plugins.sh and CI workflow (use sys.argv)
- Safety hooks fail-open when jq absent (added python3 fallback, fail-closed)
- Incomplete rm -rf patterns in safety hooks (broadened regex)
- set -euo pipefail crash in forge-safety-hook.sh (removed -e)
- WARN on missing required fields changed to FAIL with error counting
- Unbound variable $1 in validate script
- Install commands in 6 README files (3 plugins x EN+RU)
- GitHub org URL casing in forgeplan-workflow READMEs

### Changed
- Pinned GitHub Actions to SHA (actions/checkout@11bd719...)
- Added version field assertion in CI
- Orchestra unified-workflow sections moved to sections/ subdirectory
- pre-code-check.sh: matcher narrowed to Write-only, added 5-minute cache
- FPF update-fpf.sh: added submodule SHA integrity verification
- All plugins bumped to v1.2.0, marketplace catalog to v1.3.0
- laws-of-ux plugin.json: added Svelte to description

## [1.1.2] - 2026-04-03

### Changed
- forgeplan-orchestra bumped to v1.1.2 (milestone approach + sync)

## [1.1.1] - 2026-04-03

### Fixed
- Hook scripts: sanitize inputs, scope DROP rule, add explicit exit 0
- All prompt hooks replaced with command hooks (silent when not matching)

### Changed
- All plugins bumped to v1.1.0-1.1.1

## [1.0.0] - 2026-04-03

### Added
- Initial marketplace release with 5 plugins
- laws-of-ux: 30 UX laws, 9 code patterns, 2 commands, 1 agent, 1 hook
- dev-toolkit: 3 commands (audit, sprint, recall), 1 agent, 2 hooks
- forgeplan-workflow: 2 commands (forge-cycle, forge-audit), 1 agent, 2 hooks
- fpf: 4 commands, 1 agent, 224 FPF spec sections + 4 applied patterns
- forgeplan-orchestra: 2 commands (sync, session), 1 agent, 1 hook
- Validation script and CI workflow
- CONTRIBUTING.md with plugin submission guidelines
- Usage Guide (EN + RU)
