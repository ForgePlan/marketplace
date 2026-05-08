# Setup Guide — Bring a new repo into the ForgePlan ecosystem

> Пошаговый гайд для bootstrap'а **любого** нового или существующего репо: forgeplan + Claude Code plugins + GitHub Projects v2 + auto-add workflow + конвенция артефактов. Время: ~20 минут (10 host-actions + 10 автоматизированных).

Эта инструкция превращает чистый репо в полноценный artifact-driven проект, где:
- Артефакты (PRD/RFC/ADR/Evidence) лежат в `.forgeplan/`
- Каждый PR/Issue автоматически попадает на GitHub Projects v2 доску
- Skills из `fpl-skills` плагина используют forgeplan unconditionally
- Convention для labels, статусов, custom-fields единая

---

## Pre-requisites (host-level, один раз)

| # | Что | Команда / URL | Время |
|---|---|---|---|
| 0.1 | Установить `forgeplan` CLI | (ваш приватный канал — см. internal docs) | 1 мин |
| 0.2 | Установить `gh` CLI | `brew install gh` или [cli.github.com](https://cli.github.com) | 1 мин |
| 0.3 | Login в gh с правильными scopes | `gh auth login --scopes "project,repo,workflow,read:org"` или после initial login → `gh auth refresh -s project` | 1 мин |
| 0.4 | Установить Claude Code | [claude.ai/code](https://claude.ai/code) | 1 мин |
| 0.5 | Подключить ForgePlan marketplace | В Claude Code: `/plugin marketplace add ForgePlan/marketplace` | 30 сек |
| 0.6 | Поставить flagship плагин | `/plugin install fpl-skills@ForgePlan-marketplace` | 30 сек |
| 0.7 | (Опц.) Поставить forgeplan-workflow для `/forge-cycle` | `/plugin install forgeplan-workflow@ForgePlan-marketplace` | 30 сек |

**Verify**: `gh auth status` должен показать `'project'` в Token scopes (не `read:project` — нужен полный).

---

## Шаг 1 — Создать репо + GitHub Projects v2 board

```bash
# 1.1 — создать репо
gh repo create my-org/my-project --public --clone
cd my-project

# 1.2 — создать project board (если ещё нет общего на org)
gh project create --owner my-org --title "My Project Tracking"
# → запомни project number (см. URL: github.com/orgs/my-org/projects/<N>)
```

Если board общий на org — пропусти 1.2.

---

## Шаг 2 — Bootstrap forgeplan + Claude Code (`/fpl-init`)

В Claude Code, в директории нового репо:

```
/fpl-init
```

`/fpl-init` пройдёт 11 шагов автоматически:
1. Probe (forgeplan CLI ✅, git ✅, project files)
2. План plan (один yes-prompt в начале)
3. `forgeplan init -y` → создаст `.forgeplan/`
4. Wire `.mcp.json` (если поставлен MCP)
5. Wire `.claude/settings.json` (опц safety hook)
6. Bootstrap CLAUDE.md из template
7. **Inject forgeplan operating contract** в CLAUDE.md (PRD-018, marker `<!-- forgeplan-operating-contract:v1 -->`)
8. `/setup` — настраивает `docs/agents/` (issue-tracker / build-config / paths / domain)
9. Recommend companion plugins
10. Verify
11. Final report

**После этого шага** в репо будут:
- `.forgeplan/` (with discover/health working)
- `CLAUDE.md` (with operating contract)
- `docs/agents/*.md` (4 files)
- `.mcp.json` (if MCP available)

---

## Шаг 3 — Field schema на project board

Заранее — какие поля convention'у нужны:

| Поле | Тип | Опции | Цель |
|---|---|---|---|
| Status | single-select (built-in) | `Backlog`, `Ready`, `In progress`, `In review`, `Done` | Lifecycle |
| **Kind** ⚠ | single-select | `PRD`, `RFC`, `ADR`, `Feature`, `Bug`, `Docs`, `Chore` | Тип работы (НЕ "Type" — reserved!) |
| **Forgeplan-ID** | text | n/a | Ссылка `forgeplan ↔ board` |
| Plugin | single-select | список плагинов | Scope (опц.) |
| Priority | single-select | `P0`, `P1`, `P2` (`P3` если нужно — добавить) | Приоритет (опц.) |

Создание (один раз, требует `gh auth refresh -s project`):

```bash
PROJ=<your-project-number>
OWNER=<your-org-or-user>

gh project field-create $PROJ --owner $OWNER \
  --name "Kind" --data-type SINGLE_SELECT \
  --single-select-options "PRD,RFC,ADR,Feature,Bug,Docs,Chore"

gh project field-create $PROJ --owner $OWNER \
  --name "Forgeplan-ID" --data-type TEXT

gh project field-create $PROJ --owner $OWNER \
  --name "Plugin" --data-type SINGLE_SELECT \
  --single-select-options "fpl-skills,custom-1,custom-2,..."

# Priority — обычно есть по дефолту (P0/P1/P2). Если нужен P3 — добавь через UI:
# Project page → ⋯ → Settings → Fields → Priority → Add option "P3"
```

**Если получаешь `Name has already been taken` для Type** — это reserved word. Используй `Kind`.

---

## Шаг 4 — Подключить `/gh-project` skill в репо

```
/gh-project init
```

Skill интерактивно спросит project number и owner, проверит fields через `gh project field-list`, кеширует field IDs + option IDs в `.forgeplan/state/gh-project.yaml`. Файл автоматически добавляется в `.gitignore`.

**Что проверить после init**:
```bash
cat .forgeplan/state/gh-project.yaml
# должны быть:
# project_node_id: PVT_xxx
# field_ids: { status, kind, forgeplan_id, plugin, priority }
# status_options + kind_options + plugin_options + priority_options (с server-side IDs)
```

---

## Шаг 5 — Auto-add workflow в репо

```bash
# 5.1 — скопировать template
mkdir -p .github/workflows
cp $HOME/.claude/plugins/marketplaces/ForgePlan-marketplace/plugins/fpl-skills/../../docs/templates/auto-add-to-project.yml \
   .github/workflows/auto-add-to-project.yml

# 5.2 — отредактировать project URL
# Замени {{PROJECT_URL}} → https://github.com/orgs/<your-org>/projects/<N>
sed -i.bak 's|{{PROJECT_URL}}|https://github.com/orgs/<your-org>/projects/<N>|' \
   .github/workflows/auto-add-to-project.yml
rm .github/workflows/auto-add-to-project.yml.bak

# 5.3 — проверить что в workflow github-token: secret поле подходит
# По дефолту: secrets.GITHUB_TOKEN (org может не разрешать; см. ниже)
```

**Если GITHUB_TOKEN не имеет org-project access** (типичная ситуация для ForgePlan-style orgs):

```bash
# 5.4 — создать fine-grained PAT
# https://github.com/settings/personal-access-tokens/new
# Resource owner: <your-org>
# Repository access: только этот репо
# Organization permissions → Projects: Read and write
# Repository permissions → Issues: Read-only, Pull requests: Read-only

# 5.5 — добавить как secret
gh secret set ADD_TO_PROJECT_PAT  # вставь токен → Enter

# 5.6 — отредактировать workflow
sed -i.bak 's|secrets.GITHUB_TOKEN|secrets.ADD_TO_PROJECT_PAT|' \
   .github/workflows/auto-add-to-project.yml
rm .github/workflows/auto-add-to-project.yml.bak
```

```bash
# 5.7 — commit + push
git add .github/workflows/auto-add-to-project.yml
git commit -m "chore(ci): auto-add issues+PRs to project N"
git push
```

---

## Шаг 6 — Создать labels (опц., если convention требует)

```bash
gh label create "forgeplan" --color "5319E7" --description "Tracks a forgeplan artifact"
gh label create "prd" --color "0E8A16" --description "Product Requirements Document"
gh label create "rfc" --color "1D76DB" --description "Request for Comment"
gh label create "adr" --color "B60205" --description "Architecture Decision Record"
```

---

## Шаг 7 — Smoke test

### 7.1 — Открыть тестовый issue

```bash
gh issue create --title "Smoke test setup" --body "Testing auto-add"
# → через 30 сек на доске должна появиться карточка
gh project item-list <N> --owner <owner> | grep "Smoke test"
```

### 7.2 — Запустить chat-driven /sprint

В Claude Code:
```
/sprint "rename CONFIG.md to README.md and update links"
```

Должно появиться:
- `forgeplan claims` — записи с `SESSION-YYYY-MM-DD-HHMMSS` ID для каждого teammate
- В конце — `forgeplan new evidence ...` запись

### 7.3 — Запустить full forge-cycle

```
/forge-cycle "Add CONTRIBUTING.md guide"
```

Прогон: route → shape (PRD) → build (с claim/release per SPARC phase) → evidence → activate.

---

## Шаг 8 — Daily flow (что делать дальше)

### Standard+ feature

```
/shape "<feature description>"        # → создаёт PRD, validate, score
/gh-project link-prd PRD-NNN          # → GH issue + добавление на доску
git checkout -b feat/<slug>            # работа
gh pr create                          # → auto-add на доску как PR-карточка
forgeplan activate PRD-NNN            # после merge
/gh-project sync-status PRD-NNN       # → board Status → Done
```

### Tactical fix

```
git checkout -b fix/<slug>
# работа
gh pr create                          # → auto-add (no PRD ceremony)
```

### Audit

```
/forge-audit PRD-018                  # → claim AUDIT-... → multi-expert review → evidence
```

---

## Что проверять на старте каждой сессии

```bash
forgeplan health           # должно быть "healthy"
forgeplan claims           # текущие активные claim'ы
gh project item-list <N> --owner <owner> --limit 20  # board snapshot
```

В Claude Code:
- SessionStart hook автоматически покажет статус («🛠 fpl-skills active — N artifacts...»)
- Если non-clean — surface'ит next-action

---

## Troubleshooting

| Симптом | Причина | Решение |
|---|---|---|
| `gh project field-create --name "Type"` returns "reserved" | GitHub зарезервировал слово Type | Используй `Kind` |
| Auto-add workflow CI fails: "Could not resolve to a ProjectV2" | GITHUB_TOKEN не имеет org-project access | Создай PAT, store as `ADD_TO_PROJECT_PAT` secret |
| `gh auth refresh -s project` не меняет scope | Browser-flow не завершён | Дождись "Authentication complete" в терминале |
| `/gh-project link-prd` graceful-degrade'ит | Поле не создано на доске | Run step 3 commands, потом re-run `/gh-project init` |
| `forgeplan claims` пусто после `/sprint` | Старая версия плагина | `/plugin marketplace update ForgePlan-marketplace` (нужно ≥1.9.0) |
| `timeout` not found на macOS hook | bare macOS без homebrew | Хук уже handles fallback (v1.7.1+); `brew install coreutils` для full feature |

---

## Reference

- [docs/GITHUB-PROJECTS.md](GITHUB-PROJECTS.md) — детальная convention для GH Projects
- [docs/GITHUB-PROJECTS-RU.md](GITHUB-PROJECTS-RU.md) — RU версия
- [docs/templates/auto-add-to-project.yml](templates/auto-add-to-project.yml) — workflow template
- forgeplan CHANGELOG: ключевые версии плагинов — fpl-skills 1.9.1+, forgeplan-workflow 1.6.0+
- Forgeplan operating contract в CLAUDE.md target проекта (создаётся через `/fpl-init` step 7-bis)

---

## Чеклист (печатный)

```
[ ] forgeplan CLI installed
[ ] gh CLI with project scope
[ ] Claude Code + ForgePlan/marketplace + fpl-skills
[ ] Repo created + project board exists
[ ] /fpl-init done (artifacts: .forgeplan/, CLAUDE.md, docs/agents/)
[ ] 4 fields on board (Kind, Forgeplan-ID, Plugin + Status default)
[ ] /gh-project init done (.forgeplan/state/gh-project.yaml created)
[ ] Auto-add workflow file in .github/workflows/
[ ] PAT secret if needed (ADD_TO_PROJECT_PAT)
[ ] Labels created (forgeplan/prd/rfc/adr)
[ ] Smoke test PR/issue → appears on board
[ ] /sprint smoke → SESSION-claim в forgeplan claims
```

Готово — репо в ecosystem, работает «как часы».
