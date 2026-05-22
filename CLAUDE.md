# ForgePlan Marketplace — Claude Code Configuration

**Repo**: [ForgePlan/marketplace](https://github.com/ForgePlan/marketplace)
**Catalog version**: 1.61.0
**Plugins**: 15 (9 workflow + 5 agent packs + 1 memory plugin fpl-hsmem) — brownfield-pack now ships canonical Profile A `discover` agent
**Agents**: 18 of ~65 forgeplan-aware (PRD-026 canonical B2 paradigm — `disallowedTools` denylist + Sprint Q PRD-042 ASM-canon frontmatter + Sprint S Step 9c filesystem verification + Sprint T v0.32.1 native MCP adoption + Sprint V PRD-048 brownfield Discover Agent migrated to plugin. **`memory: project` REJECTED Sprint R** — Hindsight covers use case.)
**Last Updated**: 2026-05-22 (post Sprint U/V/adopt-#288/W autonomous run: Sprint U pivot empirically refuted Resume Prompt batch-fix premise + filed forgeplan#325; Sprint V migrated brownfield Discover Agent to plugin v1.4.0; Sprint adopt-#288 ADR-006 KEEP CURRENT 4-layer sentinel; Sprint W closed Anomaly #27+#28 — LR-8 lint rule active + canonical frontmatter schema formalises skills:/maxTurns:/isolation: fields. 28 anomalies (24 resolved) + 13 ML + 10 mental models, catalog v1.61.0)
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

## Plugin versions (catalog v1.60.0)

### Workflow plugins

| Plugin | Version |
|--------|:-------:|
| **fpl-skills** | **1.24.5** (Sprint T: forge-cleanup Step 2.5 + Profile B EVID 2-step) |
| **fpl-hsmem** | 2.1.0 |
| **forgeplan-workflow** | **1.10.3** (Sprint T: forgeplan_unlink MCP adopted) |
| **forgeplan-orchestra** | 1.4.1 |
| **forgeplan-brownfield-pack** | 1.3.2 |
| **fpf** | 1.4.1 |
| **agentic-rag** | **1.1.0** (Sprint Q: evals + anti-patterns refactor) |
| **fp-cookbook** | **1.2.1** (Sprint T: recipes updated к v0.32.1 patterns) |
| **laws-of-ux** | 1.4.1 |
| **dev-toolkit** | 1.6.3 |

### Agent packs (post-Sprint Q)

| Plugin | Version | Sprint Q changes |
|--------|:-------:|---|
| **agents-core** | **1.3.2** | 3 frontmatter (coder: isolation:worktree; code-reviewer + tester: memory:project) |
| **agents-domain** | 1.1.0 | — |
| **agents-pro** | **1.8.2** | 12 frontmatter (5 learners get memory:project) |
| **agents-github** | 1.1.0 | — |
| **agents-sparc** | **1.2.1** | 2 frontmatter (architecture gets memory:project) |

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

### Anomaly #21 (Sprint R discovery): Sprint Q sub-agent false-success on `memory: project`

**Sprint R audit 2026-05-21**: Sprint Q sub-agent A-1 (agents-pro frontmatter dispatch) reported "5 learners получили memory:project" but **on-disk verification revealed 0 agents got the field**. Other Sprint Q work (skills/maxTurns/isolation:worktree/MCP comments/evals/anti-patterns) WAS applied correctly.

**Side benefit**: Had `memory: project` been actually applied, it would have triggered a **silent security regression** — Anthropic docs confirm the field **force-enables Read/Write/Edit overriding `disallowedTools` denylist**. The sub-agent overreporting accidentally protected us from a contract-breaking change.

**Resolution**: Documented as ML-11 in SPRINT-A-E-RETROSPECTIVE. Mitigation = filesystem verification after every frontmatter dispatch. `memory: project` REJECTED as design (force-enable conflicts with B2 paradigm intent). Hindsight bank covers the use case without footgun. No upstream filing — this is orchestrator-side verification gap, not forgeplan bug.

### Anomaly #13 (NEW): restore returns artifact to draft, not prior status

`forgeplan_restore` after `_deprecate` or `_delete` returns artifact to `status=draft`, not prior status. FSM forbids `draft → deprecated` direct path, so operators must re-`_activate` then re-`_deprecate`. Captured as Sprint J+K Anomaly #13; **filed upstream as [forgeplan#291](https://github.com/ForgePlan/forgeplan/issues/291)** (2026-05-20).

### Anomaly #18 (Sprint M PRD-039): `forgeplan_drift` partial false-negative on markdown-table affected_files

Sprint M verification: `forgeplan_drift` returned `changed_files: []` for ADR-005 despite `git log --since=2026-05-16` showing 3 of its 10 affected_files (`autorun/SKILL.md`, `fpl-skills/plugin.json`, `marketplace.json`) demonstrably changed post-creation. Suspected root cause: parser fails on markdown-table syntax (ADR-005 stores affected_files as ` `path` | hash | ` table rows with backticks/pipes). 7 of 10 listed files never existed (legitimately skipped). Workaround: use `git log --since=<artifact_created>` directly. **Filed upstream as [forgeplan#293](https://github.com/ForgePlan/forgeplan/issues/293)** (2026-05-20).

### Anomaly #14 (Sprint H pre-work PRD-013): `forgeplan_discover_finding` response `status` ambiguous

The `status: active` field in `discover_finding` response refers to session state, NOT artifact state. Created artifact is in `status=draft`. Subsequent `forgeplan_deprecate` fails with FSM error. Workaround: orchestrator must `forgeplan_activate(force=true)` after each finding. **Filed upstream as [forgeplan#292](https://github.com/ForgePlan/forgeplan/issues/292)** (2026-05-20).

### Anomaly #19 (Sprint O): `_encode/_decode` zsh stderr noise — CONFIRMED USER-SIDE

`forgeplan` CLI emits `zsh: command not found: _encode/_decode` to stderr. Bash test confirmed clean output → this is user's zsh-completion setup, NOT a forgeplan bug. **NOT filed upstream.** Workaround for affected scripts: `grep -v "_encode\|_decode"`. Fix on user side: review `~/.zshrc` for stale completion plugin.

### Anomaly #20 (Sprint P): `forgeplan_activate` error UX for missing-evidence gate

PRD activation fails pre-evidence-link with "No evidence linked — create evidence and link it before activating. Use --force to override." Error doesn't suggest correct order. Operators reach for `--force` instead of fixing order. **Filed upstream as [forgeplan#294](https://github.com/ForgePlan/forgeplan/issues/294)** (2026-05-20).

### Feature request (related to Anomaly #20)

`forgeplan_new(kind="evidence", parent_id="PRD-XXX")` should auto-create `informs` link on creation, reducing 3-step EVID-creation flow to 2 steps. 100% of our Sprint A-P EVIDs (14 created) used this pattern. **Filed upstream as [forgeplan#295](https://github.com/ForgePlan/forgeplan/issues/295)** (2026-05-20).

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

## Sprint U/V/adopt-#288 session 2026-05-22 — autonomous 3-sprint run

User-mandated autonomous execution (no per-step confirmation): Sprint U → audit → Sprint V → audit → Sprint adopt-#288 → audit → final closure. All 3 sprints closed inline with ADI for disputes, parallel sub-agent dispatch where applicable.

| PRD | Sprint | Deliverable |
|-----|--------|-------------|
| **PRD-047** (active) | Sprint U **PIVOT** | ADI investigation: Resume Prompt batch-fix premise EMPIRICALLY REFUTED. 3-EVID test (YAML / mixed bold / strict canonical) all r_eff=0. Filed [forgeplan#325](https://github.com/ForgePlan/forgeplan/issues/325). mm-evid-body-convention updated with "necessary but not sufficient" qualifier. 0 sub-agents (saved ~145k tokens) |
| **PRD-048** (active) | Sprint V | Brownfield Discover Agent migrated standalone → `plugins/forgeplan-brownfield-pack/agents/discover/`. 4 sub-agents (3 coder Wave 1 + 1 reviewer Wave 2), 1 BLOCKER caught (missing Write/Edit/NotebookEdit) + fixed inline. Plugin v1.3.2 → v1.4.0, catalog v1.60.0 → v1.61.0 |
| **PRD-049** + **ADR-006** (both active) | Sprint adopt-#288 | ADI decision: KEEP CURRENT 4-layer NEEDS_ACTIVATION sentinel; defer native `auto_activate_source_if_complete` until forgeplan#325 unblocks. Revisit trigger documented. 0 sub-agents (decision-only) |

### Evidence (Sprint U/V/adopt-#288)

- **EVID-074** — Sprint U pivot closure (informs PRD-047) — empirical 3-EVID test case + upstream issue reference
- **EVID-075** — Sprint V closure (informs PRD-048) — 4-sub-agent dispatch + Profile B reviewer findings + post-fix verification
- **EVID-076** — Sprint adopt-#288 closure (informs PRD-049 + ADR-006) — full ADI synthesis

All 3 EVIDs created via `forgeplan_new(kind="evidence", parent_id="PRD-XXX")` (#295 auto-link feature) — **4 consecutive live demos** of #295 in Sprint T/U/V/adopt-#288 arc.

### Mental models updated

- **mm-evid-body-convention** — refreshed with Sprint U finding: bold-pattern is NECESSARY but NOT SUFFICIENT for r_eff > 0. Leaf EVIDs need either child evidence or upstream #325 fix to score > 0. Pattern: bold-pattern raises `granularity` 0.0 → 0.2, but `self_score` stays 0 until child evidence exists.

### Anomalies surfaced (Sprint U/V/adopt-#288)

- **Anomaly #25** (Sprint U) — `forgeplan_score` formula does not self-score leaf EVIDs from canonical bold-pattern body. Affects 82+ EVIDs in production marketplace graph. Filed upstream as [forgeplan#325](https://github.com/ForgePlan/forgeplan/issues/325). Severity: Low (cosmetic; no functional regression). Status: filed, accept as structural noise pending upstream fix.
- **Anomaly #26** (Sprint U process) — Resume Prompt session-handoff documents MUST be ADI-verified against current binary before launching multi-agent waves. Sprint U premise was confidently described "high ROI low risk" but premise failed empirical test in 5 minutes. ML-12 captured.
- **Anomaly #27** (Sprint V) — `scripts/validate-all-plugins.sh` LR-1..LR-7 lint rules check allowlist coverage but do NOT enforce Profile A `disallowedTools` denylist must-contain (`Write`, `Edit`, `NotebookEdit`). Allowed Sprint V BLOCKER to pass CI before Profile B reviewer audit. Recommended fix: add LR-8 rule in future hardening sprint.
- **Anomaly #28** (Sprint V observed) — Canonical agent frontmatter schema in AGENT-AUTHORING-GUIDE.md doesn't list `skills:` or `maxTurns:` fields, yet 18+ forgeplan-aware agents use them. Schema drift from documented spec. Low severity, GUIDE update sprint deferred.

### Meta-lessons (Sprint U/V/adopt-#288)

- **ML-12 (NEW)** — Resume Prompt scope claims MUST be ADI-verified against current binary before launching multi-agent waves. Pattern: "investigate first, dispatch only what survives investigation". Saved ~145k tokens + ~50 min wall-clock in Sprint U alone.
- **ML-13 (NEW)** — Profile B reviewer is mandatory even when Profile C-coder self-reports "ALL CHECKS PASS". Sprint V Coder A self-verified 7 grep checks but missed Profile A canon (Write/Edit/NotebookEdit denials). Reviewer reading the GUIDE caught it. Lesson: lint scripts check what's spec'd; reviewer reads spec to find what should be spec'd.

### Upstream issues filed (Sprint U)

| Issue | Description | Status |
|-------|-------------|--------|
| [forgeplan#325](https://github.com/ForgePlan/forgeplan/issues/325) | `forgeplan_score` returns r_eff=0 for leaf EVIDs with canonical bold-pattern bodies. 3-EVID reproducer + suggested formula change. Affects 82+ marketplace EVIDs. | Filed 2026-05-22; awaiting upstream triage |

### Sub-agent dispatch summary

| Sprint | Sub-agents | Tokens | Outcome |
|---|---:|---:|---|
| Sprint U pivot | 0 | ~5k | ADI refuted premise → no dispatch |
| Sprint V migration | 4 | ~333k | 3 parallel coder Wave 1 + 1 reviewer Wave 2, 0 failures, 1 BLOCKER caught+fixed |
| Sprint adopt-#288 | 0 | ~3k | Decision-only, inline orchestrator |
| **3-sprint total** | **4** | **~341k** | 14th-15th consecutive zero-failure sub-agent series |

### Production-grade outcomes

- Plugin layer **v1.61.0 baseline** — brownfield Discover Agent now canonical (Profile A pattern, 9 MCP brownfield tools wired)
- `forgeplan_health` = healthy post-cycle (147 artifacts, 134 active, 1 unrelated pre-existing draft)
- 18 forgeplan-aware agents (up from 17 with discover migration)
- Plugin manifest changes: brownfield-pack v1.3.2 → v1.4.0; catalog v1.60.0 → v1.61.0
- Zero modifications to non-Sprint-V plugin files (decision-only Sprint adopt-#288 + investigation-only Sprint U)

## Sprint W 2026-05-22 — Anomaly #27 + #28 closure

Inline tactical sprint post-Sprint-V closure. Closed 2 process anomalies that escaped Sprint V CI:

| PRD | Sprint | Deliverable |
|-----|--------|-------------|
| **PRD-050** (active, EVID-077 informs) | Sprint W | LR-8 lint rule added to validate-all-plugins.sh + AGENT-AUTHORING-GUIDE schema formalises `skills:`, `maxTurns:`, `isolation:` fields. Synthetic violation test verified LR-8 catches missing Write/Edit/NotebookEdit in <100ms. 0 sub-agents, ~5k tokens, ~20 min wall-clock |

### LR-8 — Profile A/B/D canon enforcement

New lint rule per AGENT-AUTHORING-GUIDE.md line 136. Agents that deny `forgeplan_activate` (Profile A creators, Profile B reviewers, Profile D maintainers) MUST also deny `Write`, `Edit`, `NotebookEdit` to enforce MCP-path-for-artifact-ops canon. Profile C-coder exception: identified by denying ALL forgeplan mutators (new/update/link), legitimately needs file-write access.

Pre-flight audit: 0/16 forgeplan-aware agents fail in current state (Sprint V discover.md fix already aligned the last outlier). Synthetic violator test verified rule fires correctly with exact error message: `"Profile A/B/D canon — disallowedTools missing file-write blocks: ['Edit', 'NotebookEdit', 'Write']"`.

### Frontmatter schema additions

Three previously-undocumented but widely-used fields now formalised in AGENT-AUTHORING-GUIDE canonical schema:

| Field | Used by | Why |
|---|---|---|
| `skills` | 18+ agents (adr-architect, specification, architecture, discover, ...) | Documents which skills agent orchestrates |
| `maxTurns` | coder (60), discover (60), Profile A/B agents (30-50) | Caps autonomous turn budget |
| `isolation: worktree` | agents-core:coder exclusively | Profile C-coder pattern — isolated git worktree for parallel safety |

### Sprint W metrics

- 0 sub-agents (decision-only inline work)
- ~5k tokens net
- ~20 min wall-clock
- 5th consecutive forgeplan#295 live demo (EVID-077 via parent_id auto-link)
- Cumulative session token spend: ~351k across 4 sprints
- Cumulative anomalies: 28 (24 resolved post-Sprint W: 12 internal + 6 upstream-filed-and-closed + 1 user-side + 5 process)

### Anomalies resolved Sprint W

- **#27** (Sprint V) → RESOLVED. LR-8 rule live; would catch exact Sprint V BLOCKER class in CI.
- **#28** (Sprint V) → RESOLVED. Canonical schema formalises de-facto fields used by 18+ agents.
