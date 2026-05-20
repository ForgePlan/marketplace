# ForgePlan Marketplace — Claude Code Configuration

**Repo**: [ForgePlan/marketplace](https://github.com/ForgePlan/marketplace)
**Catalog version**: 1.54.0
**Plugins**: 13 (7 workflow + 5 agent packs + 1 memory plugin fpl-hsmem)
**Agents**: 17 of ~65 forgeplan-aware (PRD-026 canonical B2 paradigm — `disallowedTools` denylist + `forgeplan_generate` primary creation path + 5 profiles A/B/C/C-coder/D)
**Last Updated**: 2026-05-20 (post Sprint A-N: PRD-040 doc sync + mm-evid-body-convention mental model, 18 anomalies + 10 ML, catalog v1.54.0)
**Project board**: [orgs/ForgePlan/projects/5](https://github.com/orgs/ForgePlan/projects/5)

---

<!-- gh-project-convention:v1 -->
## GitHub Projects integration (this project)

This project tracks work via GitHub Projects v2 board: [orgs/ForgePlan/projects/5](https://github.com/orgs/ForgePlan/projects/5). Per-project config in `.forgeplan/state/gh-project.yaml` (not committed). PRs auto-add via `.github/workflows/auto-add-to-project.yml`.

**What goes on the board**:
- All PRs (auto-added by workflow). Type derived from conventional-commit prefix in title.
- Standard+ PRDs/RFCs (manually via `/gh-project link-prd PRD-NNN`). Tactical artifacts → PR-only.

**Lifecycle sync**: after `forgeplan activate <ID>` run `/gh-project sync-status <ID>` to update board Status.

**Skill**: `/gh-project init` (one-time setup per repo), `add-pr`, `link-prd`, `sync-status`, `list`.
**Convention + setup guide**: [docs/GITHUB-PROJECTS.md](docs/GITHUB-PROJECTS.md) (EN) / [docs/GITHUB-PROJECTS-RU.md](docs/GITHUB-PROJECTS-RU.md) (RU).

---

## Git Workflow

**CRITICAL: Только feature branches + PR. Прямой push в `main` и `dev` запрещён.**

```
feature-branch → push → PR → CI pass → merge
```

### Ветки

| Ветка | Назначение | Protection |
|-------|-----------|------------|
| `main` | Production. Стабильный релиз | PR + 1 review + CI strict |
| `dev` | Интеграция. Следующий релиз | PR + CI |
| `feat/*`, `fix/*`, `chore/*`, `docs/*` | Рабочие ветки | Нет ограничений |

### Формат коммитов

```
тип(модуль): что сделал

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

Типы: `feat`, `fix`, `docs`, `audit`, `chore`

### Формат веток

```
тип/описание        # feat/new-plugin, fix/hook-regex, docs/readme-update
```

---

## Branch Protection (GitHub Rulesets)

### Main

- PR required, `required_approving_review_count: 1`
- CI check `validate` must pass
- `strict: true` — PR должен быть up-to-date с main
- No deletion, no force-push
- Merge methods: merge, squash
- Bypass: admin only (`--admin` flag)

### Dev

- PR required, `required_approving_review_count: 0`
- CI check `validate` must pass
- `strict: false`
- No deletion, no force-push
- Merge methods: merge, squash, rebase

### Tags

- Только admin может создавать/обновлять/удалять tags

---

## CI (GitHub Actions)

**Workflow**: `.github/workflows/validate-plugins.yml`
**Job name**: `validate`
**Triggers**: push to `main`/`dev`, PR to `main`/`dev`

### Что проверяет

1. `marketplace.json` — валидный JSON
2. `plugin.json` — name, version, description обязательны
3. v2 optional fields — category, components (info)
4. Command collisions — уникальность имён команд
5. Marketplace completeness — все плагины на диске есть в каталоге
6. `hooks.json` — валидный JSON
7. `SKILL.md` — наличие YAML frontmatter

### Path filters

CI запускается только при изменениях в:
- `plugins/**`
- `.claude-plugin/marketplace.json`
- `.github/workflows/**`

---

## Security

- **Secret scanning**: enabled — GitHub сканирует код на токены/ключи
- **Push protection**: enabled — push с секретами блокируется
- **Dependabot**: enabled — алерты о CVE в зависимостях

---

## Local Hooks

**Файл**: `.claude/hooks/safety-hook.sh`
**Config**: `.claude/settings.json`

### Что блокирует (PreToolUse → Bash)

- `git push --force` / `git push -f`
- `git push origin main` / `git push origin dev`
- `git reset --hard`
- `git clean -fd`
- `rm -rf /` / `rm -rf ~` / `rm -rf .`
- `DROP TABLE` / `DROP DATABASE`
- `git branch -D main` / `git branch -D dev`

### Как обойти (если нужно)

Admin bypass для rulesets: `gh pr merge --admin`
Hook bypass: временно убрать из `.claude/settings.json` (не рекомендуется)

---

## Запрещено

- `git push --force` — НИКОГДА
- `git push origin main` / `git push origin dev` — только через PR
- `git add .` / `git add -A` — только конкретные файлы
- `--no-verify` — не пропускать hooks
- Merge без зелёного CI
- Файлы с секретами (.env, credentials, tokens)

---

## Version Bumping

При изменении плагина — bump version в двух местах:

1. `plugins/X/.claude-plugin/plugin.json` → `version`
2. `.claude-plugin/marketplace.json` → соответствующий плагин `version`

| Изменение | Bump |
|-----------|------|
| Typo, README | patch (1.2.0 → 1.2.1) |
| Bug fix, hook fix | minor (1.2.0 → 1.3.0) |
| Новый command/agent, breaking change | major (1.2.0 → 2.0.0) |

---

## Validation

Перед PR всегда:

```bash
./scripts/validate-all-plugins.sh          # Все плагины
./scripts/validate-all-plugins.sh plugin-name  # Один плагин
```

---

## Plugin cache troubleshooting (workaround for users)

If users report that updates to canonical agents don't appear after `/plugin marketplace update`, the cause is usually Claude Code's plugin cache invalidation behavior (upstream issue, captured in PROB-001 deprecated 2026-05-19):

| Symptom | Root cause | Workaround |
|---------|------------|------------|
| `/plugin install` says "already installed" but new version present | Cache exists, settings.local.json shows enabled | `/plugin uninstall` + `/plugin install` (force re-resolve) |
| `/plugin uninstall` doesn't free disk space | Settings toggle, cache files remain | Manual: `rm -rf ~/.claude-code-plugins/<plugin-name>` then reinstall |
| New version in marketplace.json not picked up | Catalog `metadata.version` not bumped | Verify catalog `metadata.version` was bumped — required for `/plugin marketplace update` to refresh |
| Agent loaded but new tools/config not active | Stale subagent cache in conversation | `/reload-plugins` (Claude Code session-level) |

**Rule of thumb when shipping**: always bump both per-plugin `version` AND catalog `metadata.version`. Without the catalog bump, no user gets the update via `/plugin marketplace update`.

---

## Standalone Agents

### Discover Agent (agents/discover/)

Brownfield codebase onboarding — protocol v3.2.0.

| Файл | Назначение |
|------|-----------|
| `agent.md` | Claude Code agent config — 3 modes, 3 passes, progress tracking |
| `protocol.json` | Machine-readable protocol — layers, phases, rules, state schema |
| `README.md` | Документация + примеры + manual workflow |

**Не плагин** — standalone agent. Станет плагином после добавления MCP tools в ForgePlan CLI.

---

## Quick Reference

```bash
# Workflow
git checkout -b feat/my-feature        # Создать ветку
git push -u origin feat/my-feature     # Push ветку
gh pr create                           # Создать PR
gh pr merge --merge --admin            # Merge (admin bypass review)

# Проверки
gh pr checks <N>                       # Статус CI
gh api repos/ForgePlan/marketplace/rulesets --jq '.[] | .name'  # Rulesets

# Валидация
./scripts/validate-all-plugins.sh      # Перед PR
```

---

## Plugin versions (catalog v1.54.0)

### Workflow plugins

| Plugin | Version |
|--------|:-------:|
| **fpl-skills** | 1.24.2 |
| **fpl-hsmem** | 2.1.0 |
| **forgeplan-workflow** | 1.10.1 |
| **forgeplan-orchestra** | 1.4.1 |
| **forgeplan-brownfield-pack** | 1.3.2 |
| **fpf** | 1.4.1 |
| **laws-of-ux** | 1.4.1 |
| **dev-toolkit** | 1.6.3 |

### Agent packs

| Plugin | Version |
|--------|:-------:|
| **agents-core** | 1.3.0 |
| **agents-domain** | 1.1.0 |
| **agents-pro** | 1.8.0 |
| **agents-github** | 1.1.0 |
| **agents-sparc** | 1.2.0 |

> Source of truth: `.claude-plugin/marketplace.json` and `plugins/*/.claude-plugin/plugin.json`. Always verify before PR.

---

## Sprint A-E session 2026-05-19 — autonomy framework

Five consecutive sprints shipped the full autonomy framework. All PRDs closed R_eff=1.0 grade A.

| PRD | Sprint | Deliverable |
|-----|--------|-------------|
| **PRD-029** (active, R_eff=1.0 grade A) | Sprint A | UX layer: `/agent-advisor` skill + `NEED_USER_INPUT` sentinel protocol + prompt-router hook |
| **PRD-030** (active, R_eff=1.0 grade A) | Sprint B | Closure pack: 7 deliverables in 3 waves — parser integration into `/forge-cycle` + `/autorun`, methodology citation in 17 forgeplan-aware agents, Profile A Step 10 retain convention, `/project-agent-scaffold`, `/agent-fetcher`, `/forge-progress` |
| **PRD-031** (active, R_eff=1.0 grade A) | Sprint C | `/autorun` resume protocol + `docs/SESSION-CHECKPOINT-SCHEMA.md` (643-line spec) |
| **PRD-032** (active, R_eff=1.0 grade A) | Sprint D | Pipeline self-healing: `/forge-cleanup` skill + `NEEDS_ACTIVATION` sentinel + parsers in `/forge-cycle` + `/autorun` + 3-tier resolution (AUTO/ADI/USER) |
| **PRD-033** (active, R_eff=1.0 grade A) | Sprint E | Closure pack + GA v2.3.0: 7 Profile B agent body patches for organic sentinel emission + docs sync + AGENTS.md + live smoke + GA release |

### Evidence (Sprint A-E)

- **EVID-056** — Sprint A closure (informs PRD-029)
- **EVID-057** — Sprint B closure (informs PRD-030)
- **EVID-058** — Sprint C closure (informs PRD-031)
- **EVID-059** — Sprint D closure (informs PRD-032)
- **EVID-060** — Sprint E closure (informs PRD-033)

### Mental models added

- **mm-draft-hygiene** — pattern: EVIDs stick in draft because Profile B denied activate; resolution: coder/orchestrator calls `forgeplan_activate` after EVID creation
- **mm-pipeline-anomalies** — 3-tier resolution framework (AUTO/ADI/USER) with 9 initial anomaly kinds; see PRD-032

### Upstream issues filed

| Issue | Description |
|-------|-------------|
| forgeplan#286 | Unlink primitive (filed Sprint A-B era) |
| forgeplan#287 | Brownfield MCP tools epic |
| forgeplan#288 | Pipeline hygiene auto-activate + stale-draft + chain hint |
| forgeplan#289 | `forgeplan_anomalies` MCP tool |

### Known anomalies (Sprint A-E session log)

| # | Anomaly | Status |
|---|---------|--------|
| 1 | Profile B `forgeplan_activate` denied → EVID stays draft | AUTO-resolved: orchestrator activates post-EVID |
| 2 | `/forge-cycle` missing parser for `NEEDS_ACTIVATION` sentinel | Resolved Sprint D (PRD-032) |
| 3 | `/autorun` missing resume on checkpoint load | Resolved Sprint C (PRD-031) |
| 4 | Methodology citation absent in 17 forgeplan-aware agents | Resolved Sprint B (PRD-030) |
| 5 | `/agent-fetcher` unimplemented (dependency gap) | Resolved Sprint B (PRD-030) |
| 6 | `/forge-progress` missing real-time visibility command | Resolved Sprint B (PRD-030) |
| 7 | `/forge-cleanup` unimplemented (stale artifact cleanup) | Resolved Sprint D (PRD-032) |
| 8 | `NEED_USER_INPUT` sentinel not emitted organically by Profile B agents | Resolved Sprint E (PRD-033): 7 agent body patches |
| 9 | Documentation drift — catalog v1.37 vs actual v1.47 | Resolved Sprint E (PRD-033): this sync |
| 10 | AGENTS.md missing (cross-CLI context shim) | Resolved Sprint E (PRD-033) |

## Sprint G 2026-05-20 — Forgeplan core adoption + R_eff cascade fix

Five issues filed earlier closed upstream during Sprint A-F (forgeplan core was building in parallel):
- **#286** `forgeplan_unlink` — CLOSED (CLI v0.31.0 ships it; MCP surface pending)
- **#287** Brownfield extraction MCP epic — STILL OPEN
- **#288** Pipeline hygiene (auto-activate + stale-draft + chain hint) — CLOSED (MCP surface pending)
- **#289** `forgeplan_anomalies` MCP tool — CLOSED (MCP surface pending)

Partial adoption pattern: when an issue is closed in core repo, its MCP surface may not be in our session's binary yet. Sprint G adapts:

**Anomaly #5 (R_eff cascade footgun) — PARTIAL FIX**:
- Used `forgeplan unlink PRD-021 EVID-033 --relation based_on` CLI (works in v0.31.0)
- PRD-021 weakest_link moved from EVID-033 to PRD-018 (cascade deeper than expected)
- Specific anomaly link RESOLVED at surface; deeper PRD-018 → NOTE-003 draft chain remains as follow-up

**7 NEW MCP tools discovered** (landed during Sprint A-F):
- `forgeplan_discover_*` — brownfield protocol (start/finding/complete)
- `forgeplan_release_notes` — auto-generated changelog
- `forgeplan_ingest` — mapping-driven artifact import
- `forgeplan_restore` — soft-delete recovery
- `forgeplan_playbook_run` — playbook orchestration
- `forgeplan_activity` + `_stats` — tool-use audit log
- `forgeplan_fpf_rules` — FPF rule introspection

Sprint G inventory only; live verification deferred to Sprint H+.

### Artifacts (Sprint G)
- PRD-035 (active) — Sprint G scope + partial-adoption documentation
- EVID-062 (active) — verification of Anomaly #5 partial fix + 7-tool discovery
- v1.49.0 → **v1.50.0** catalog (this Sprint G milestone)

## Sprint J+K 2026-05-20 — 4 new MCP tools verified live

Sprint G inventoried 7 new MCP tools; Sprint J+K exercised 4 testable ones:

| Tool | Verdict | Canonical example | Notes |
|---|---|---|---|
| `forgeplan_release_notes` | **Limited use** in split-repo layouts | `forgeplan_release_notes(since="v2.3.0")` | Requires `.forgeplan/` + `.git/` co-located; workaround via shell from git repo |
| `forgeplan_restore` | **Delivers value** | `forgeplan_restore(id="NOTE-XXX")` after deprecate/supersede/delete | Verified roundtrip Sprint J+K K2; body preserves `## Deprecation` section |
| `forgeplan_activity_stats` | **Delivers value** | `forgeplan_activity_stats(since_hours=24)` | Use to find slow tools / error counts; this session 133 calls / 3 errs / forgeplan_score slowest p95=3.5s |
| `forgeplan_fpf_rules` | **Delivers value** | `forgeplan_fpf_rules(summary=true)` | 5 default rules: blind-spot, weak-evidence, orphan-active, medium-quality, ready-to-build |

3 tools NOT yet exercised (need external context):
- `forgeplan_discover_*` — needs brownfield codebase context (Sprint H+ scope)
- `forgeplan_playbook_run` — needs playbook artifact + security gate (`yes: true`)
- `forgeplan_ingest` — needs mapping YAML + source file

### Anomaly #12 (NEW): release_notes split-repo constraint

When `.forgeplan/` and `.git/` are in different directories (workspace root vs child repo), `forgeplan_release_notes` returns "git log failed: fatal: not a git repository". Workaround documented in Phase 7.3 of `/forge-cycle`. Captured as Sprint J+K Anomaly #12; **filed upstream as [forgeplan#290](https://github.com/ForgePlan/forgeplan/issues/290)** (2026-05-20).

### Anomaly #13 (NEW): restore returns artifact to draft, not prior status

`forgeplan_restore` after `_deprecate` or `_delete` returns artifact to `status=draft`, not prior status. FSM forbids `draft → deprecated` direct path, so operators must re-`_activate` then re-`_deprecate`. Captured as Sprint J+K Anomaly #13; **filed upstream as [forgeplan#291](https://github.com/ForgePlan/forgeplan/issues/291)** (2026-05-20).

### Anomaly #18 (Sprint M PRD-039): `forgeplan_drift` partial false-negative on markdown-table affected_files

Sprint M verification: `forgeplan_drift` returned `changed_files: []` for ADR-005 despite `git log --since=2026-05-16` showing 3 of its 10 affected_files (`autorun/SKILL.md`, `fpl-skills/plugin.json`, `marketplace.json`) demonstrably changed post-creation. Suspected root cause: parser fails on markdown-table syntax (ADR-005 stores affected_files as ` `path` | hash | ` table rows with backticks/pipes). 7 of 10 listed files never existed (legitimately skipped). Workaround: use `git log --since=<artifact_created>` directly. Filed-upstream-decision deferred until forgeplan v0.32.0 ship verifies whether parser is updated.

### Artifacts (Sprint J+K)
- PRD-037 (active) — Sprint J+K scope (PRD-036 superseded as transient duplicate)
- EVID-063 (active) — per-tool verdicts + K2 roundtrip log + activity stats snapshot
- catalog v1.50.0 → **v1.51.0**
- forgeplan-workflow v1.10.0 → v1.10.1 (Phase 7.3 added)

## Sprint L 2026-05-20 — 6 more MCP tools exercised (post-Sprint J+K closure pack)

Continuation of Sprint J+K methodology. PRD-038 wrapped 4 closure deliverables (issues filed + ML-9/10 + mm-fpf-active-rules + Sprint H scaffolding); Sprint L extended with 6 more MCP tool verdicts inline within the same session.

| Tool | Verdict | Canonical example | Notes |
|---|---|---|---|
| `forgeplan_journal` | **RECOMMENDED-INTEGRATE** | `forgeplan_journal(kind="adr")` | Decision-kind timeline (ADR/Note/Problem/Solution) with R_eff + evidence count |
| `forgeplan_phase` | **RECOMMENDED-INTEGRATE** | `forgeplan_phase(id="PRD-XXX")` | Advisory lifecycle phase + append-only history; never blocks |
| `forgeplan_phase_advance` | **READY-TO-USE** | `forgeplan_phase_advance(id, to="audit")` | Schema verified; out-of-order jumps allowed (advisory layer) |
| `forgeplan_calibrate` | **RECOMMENDED-INTEGRATE** | `forgeplan_calibrate(id="PRD-XXX")` | Depth suggestions (Tactical/Standard/Deep/Critical) from dependency_links + section_count + body_length |
| `forgeplan_dispatch` | **LIMITED-USE** | `forgeplan_dispatch(agents=N, status="any")` | Requires PRDs to declare `affected_files` in frontmatter for parallel bucketing; 26/37 our PRDs lack it → serial fallback |
| `forgeplan_supersede` | **WORKS-AS-INTENDED** | `forgeplan_supersede(id="active-X", by="new-X")` | FSM correctly rejects non-active source (must be active or stale); helpful error message |

### Sprint L artifacts

- PRD-038 (active, R_eff=0.90 grade A) — closure-pack scope
- EVID-064 (active, R_eff=1.0) — verifies PRD-038 against 6 AC
- mm-fpf-active-rules — new mental model
- forgeplan#290, #291 — upstream issues filed
- SCAFFOLDING.md (brownfield-pack/agents/discover/) — Sprint H pre-work

### Anomalies surfaced (Sprint L)

- **Anomaly #14** — `discover_finding` response `status` field is session status, not artifact status (captured in EVID-064, deferred upstream filing post-v0.32)
- **Anomaly #15** — `forgeplan_link supersedes` direction is source→target (newer→older), can be set backwards silently
- **Anomaly #16** — `forgeplan_link informs` direction same risk as #15 — informs follows source-gives-info-to-target
- **Anomaly #17** — Custom YAML frontmatter fields ignored; congruence_level/verdict/evidence_type only parsed from markdown bold-pattern body (`**Congruence level**: N` numeric)

### Sprint L tools NOT exercised

`forgeplan_capture` — needs domain context (state capture for what?), DEFERRED
`forgeplan_session` — needs session lifecycle context, DEFERRED
`forgeplan_undo_last` — would mutate workspace state, DEFERRED until needed
