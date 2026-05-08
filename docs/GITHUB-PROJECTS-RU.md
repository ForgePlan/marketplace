# Интеграция с GitHub Projects v2 — гайд

> Двуязычный документ. English version: [GITHUB-PROJECTS.md](GITHUB-PROJECTS.md).

Этот документ описывает **convention** (соглашение) использования GitHub Projects v2 в репо ForgePlan, **схему полей** на которой convention построена, и **скилл `/gh-project` + шаблон auto-add workflow** которые автоматизируют процесс.

Интеграция **project-agnostic** (не зависит от конкретной доски). Маркетплейс использует `https://github.com/orgs/ForgePlan/projects/5`, но всё описанное здесь работает в любом другом ForgePlan репо со своей доской.

---

## TL;DR

```
1. Создать доску в GitHub UI (или `gh project create --owner <owner> --title <title>`).
2. В любом репо:
   /gh-project init      ← интерактивно: project number + owner + проверка полей
3. Скопировать шаблон auto-add:
   cp docs/templates/auto-add-to-project.yml .github/workflows/
   # отредактировать project-url
4. Workflow автоматически добавляет новые issues и PR на доску.
5. После `forgeplan new prd` для Standard+:
   /gh-project link-prd PRD-NNN     ← создаёт issue + добавляет на доску с Forgeplan-ID
6. После `forgeplan activate PRD-NNN`:
   /gh-project sync-status PRD-NNN  ← обновляет поле Status на доске
```

---

## Convention

### Что попадает на доску

| Источник | На доску | Поле Type | Дефолтный Status |
|---|---|---|---|
| Forgeplan PRD (Standard+) | ✅ через `/gh-project link-prd` (создаёт GH issue + добавляет на доску) | `PRD` | `Backlog` (или `Ready` если validated) |
| Forgeplan RFC (Standard+) | ✅ так же | `RFC` | `Backlog` |
| Forgeplan ADR | ✅ так же; обычно сразу `Done` после активации | `ADR` | `Done` |
| Forgeplan PRD/RFC (Tactical) | ❌ — Tactical = без артефакт-церемонии; PR достаточно | n/a | n/a |
| Forgeplan Evidence | ❌ — внутренний артефакт; отдельной карточки не нужно | n/a | n/a |
| Forgeplan Note | ❌ — слишком гранулярно; reference-материал | n/a | n/a |
| GitHub PR (любой) | ✅ автоматически добавляется workflow | `Feature` / `Bug` / `Docs` / `Chore` (парсится из title) | `In Review` |
| GitHub Issue (любой opened) | ✅ автоматически добавляется workflow | `Bug` (по умолчанию) — переразметить вручную | `Backlog` |

**Почему Tactical не на доске**: Tactical scope = «просто сделай» (per `forgeplan route`). Добавление на доску создаёт шум — финальный PR это уже достаточный сигнал.

### Соответствие статусов (Forgeplan ↔ Project)

| Forgeplan status | Project Status | Триггер |
|---|---|---|
| Артефакт `draft`, ещё не validated | `Backlog` | После `forgeplan new` |
| Артефакт `draft`, `forgeplan validate` PASS | `Ready` | После validate |
| Артефакт `active` (после `forgeplan activate`) | `In Progress` (если работа идёт) или `Done` (если зашиппено) | После activate + judgement |
| Артефакт `superseded` | `Done` | После `forgeplan supersede` |
| Артефакт `deprecated` | `Cancelled` | После `forgeplan deprecate` |
| PR opened | `In Review` | Auto-add workflow |
| PR merged | `Done` | Built-in workflow (настраивается в UI проекта) |

### Convention для labels

Issues созданные через `/gh-project link-prd` маркируются:

| Label | Когда |
|---|---|
| `forgeplan` | Все issues отслеживающие артефакт |
| `prd` / `rfc` / `adr` | Зеркалит kind артефакта |
| `active` | Когда `forgeplan activate` запускается (добавляется `/gh-project sync-status`) |
| `closed` | Когда superseded или deprecated |

PR автоматически labelятся по conventional-commit префиксу title (`fix(...)`, `feat(...)`, `docs(...)`, `chore(...)`, `audit(...)`, `refactor(...)`). Auto-add workflow от labels не зависит, но `/gh-project add-pr` читает префикс title чтобы установить поле Type.

---

## Field schema (рекомендуемая)

Создать эти поля **один раз** на доске (или verify через `/gh-project init` который warning'ует о пропусках).

| Поле | Тип | Опции | Обязательно для скилла? |
|---|---|---|---|
| **Status** | single-select (built-in) | `Backlog`, `Ready`, `In Progress`, `In Review`, `Done`, `Cancelled` | да |
| **Type** | single-select | `PRD`, `RFC`, `ADR`, `Feature`, `Bug`, `Docs`, `Chore` | да |
| **Forgeplan-ID** | text | n/a | да (для `link-prd` и `sync-status`) |
| **Plugin** | single-select | `fpl-skills`, `forgeplan-workflow`, `forgeplan-orchestra`, `forgeplan-brownfield-pack`, `fpf`, `laws-of-ux`, `agents-core`, `agents-domain`, `agents-pro`, `agents-github`, `agents-sparc`, `marketplace` | опционально, рекомендуется |
| **Priority** | single-select | `P0`, `P1`, `P2`, `P3` | опционально |

### Зачем именно эти

- **Status** — самое часто-смотримое поле любой доски. Шесть опций покрывают все фазы lifecycle артефактов.
- **Type** разделяет архитектурные артефакты (PRD/RFC/ADR) от исполнительной работы (Feature/Bug/Docs/Chore).
- **Forgeplan-ID** — обратный указатель в граф артефактов; load-bearing поле. Без него карточки на доске оторваны от `.forgeplan/`.
- **Plugin** скоупит работу к конкретным компонентам маркетплейса — полезно когда много плагинов эволюционируют параллельно.
- **Priority** — действительно team-specific. GitHub не задаёт canonical-смысл ([discussion](https://github.com/orgs/community/discussions/54055)). P0/P1/P2/P3 — одна из распространённых схем.

### Создание полей через `gh` CLI

Если `/gh-project init` репортит missing-поля, вот команды которые он подсказывает:

```bash
# Single-select пример (Type field с несколькими опциями)
gh project field-create 5 --owner ForgePlan \
  --name "Type" \
  --data-type SINGLE_SELECT \
  --single-select-options "PRD,RFC,ADR,Feature,Bug,Docs,Chore"

# Text field (Forgeplan-ID)
gh project field-create 5 --owner ForgePlan \
  --name "Forgeplan-ID" \
  --data-type TEXT
```

Reference: [gh project field-create](https://cli.github.com/manual/gh_project_field-create).

---

## Auto-add — два пути

### Вариант 1 — Built-in project workflow (рекомендуется для простых случаев)

Настраивается в UI проекта, файл Actions не нужен.

1. Откройте проект: `https://github.com/orgs/<owner>/projects/<num>`
2. Клик `⋯` (top-right) → `Workflows`
3. Найти `Auto-add to project` (built-in)
4. Настроить: выбрать source repo, опциональные фильтры (issue state, labels)
5. Save & Enable

**Плюсы**: ноль кода, ноль секретов, ~30 секунд.
**Минусы**: меньше гибкости (например AND/OR/NOT label-фильтры труднее).

[GitHub docs reference](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/adding-items-automatically).

### Вариант 2 — `actions/add-to-project@v1` workflow

Когда нужно больше контроля: AND/OR/NOT label-фильтры, multi-repo source, кастомные триггеры.

1. Скопировать `docs/templates/auto-add-to-project.yml` → `.github/workflows/auto-add-to-project.yml`
2. Заменить `{{PROJECT_URL}}` placeholder
3. Настроить auth:
   - **GITHUB_TOKEN** работает если ваша организация позволяет токену писать в проекты (Settings → Actions → Workflow permissions). Многие org это запрещают.
   - Иначе создайте **fine-grained PAT** с Organization → Projects (read+write), сохраните как `ADD_TO_PROJECT_PAT` секрет, измените строку `github-token:`.
4. Закоммитить. Workflow срабатывает на следующий opened/reopened issue или PR.

[Action repo](https://github.com/actions/add-to-project).

### Что выбрать

| Хочется | Путь |
|---|---|
| Один репо → один проект, все items | Вариант 1 (built-in) |
| Фильтр по labels (AND/OR/NOT) | Вариант 2 (Action) |
| Multi-repo → один проект | Вариант 2 — копировать workflow в каждый репо |
| Org-wide auto-add | Вариант 1 (built-in поддерживает несколько источников) |

Маркетплейс использует **Вариант 2** чтобы convention был полностью воспроизводимым (workflow-файл reviewable, version-controlled, copy-paste'able в другие репо).

---

## Аутентификация

`gh` CLI должен иметь project-scope:

| Тип токена | Нужные scopes |
|---|---|
| Classic PAT | `project` (read+write), `repo` (private repo issues) |
| Fine-grained | Organization → **Projects: read+write**; Repository → **Issues: read+write**, **Pull requests: read** |

```bash
# Проверка
gh auth status

# Если `project` scope отсутствует
gh auth refresh -s read:project,write:project
```

`/gh-project init` делает эту проверку и подсказывает refresh-команду.

---

## End-to-end примеры

### Установка нового репо

```bash
# 1. Создать project board (один раз, в любом репо или глобально)
gh project create --owner ForgePlan --title "Marketplace tracking"

# 2. В вашем репо
cd my-new-repo
forgeplan init                                # если ещё не сделано
/gh-project init                              # интерактивно: project num + owner

# 3. Скопировать auto-add шаблон
mkdir -p .github/workflows
cp $(forgeplan path)/docs/templates/auto-add-to-project.yml .github/workflows/
# редактировать, заменить {{PROJECT_URL}}
git add .github/workflows/auto-add-to-project.yml
git commit -m "chore(ci): auto-add to ForgePlan project"
```

### Жизненный цикл Standard+ PRD на доске

```bash
# Авторинг
/shape "magic-link auth для админ-панели"      # создаёт PRD-024 (Standard)
forgeplan validate PRD-024                     # PASS

# Линковка к доске
/gh-project link-prd PRD-024
# → создаёт GH issue "PRD-024: magic-link auth для админ-панели"
# → добавляет на доску с Type=PRD, Forgeplan-ID=PRD-024, Status=Backlog

# Реализация
git checkout -b feat/magic-link-auth
# ... работа ...
gh pr create --title "feat(auth): magic-link admin login (PRD-024)"
# → workflow auto-добавляет PR на доску, Type=Feature, Status=In Review

# Активация
forgeplan activate PRD-024
/gh-project sync-status PRD-024
# → обновляет Status на Done (или In Progress если работа продолжается)
```

### Tactical-фикс (БЕЗ церемонии)

```bash
# Быстрый фикс
forgeplan route "fix typo in README" → Tactical
git checkout -b fix/readme-typo
# ... фикс ...
gh pr create --title "fix(docs): typo in README"
# → workflow auto-добавляет PR на доску, Type=Docs, Status=In Review
# → нет PRD, нет /gh-project link-prd, нет ручных карточек
```

---

## Добавление в CLAUDE.md

Когда `/gh-project init` запускается, опционально добавляется 13-строчная заметка в project CLAUDE.md описывающая convention. Работает так же как forgeplan operating contract из PRD-018.

Marker для идемпотентных re-runs: `<!-- gh-project-convention:v1 -->`

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

| Симптом | Вероятная причина | Решение |
|---|---|---|
| `gh project view <num>` возвращает 404 | Неверный номер или owner | `gh project list --owner <owner>` для discovery |
| Workflow срабатывает но item не на доске | Token не может писать в проект | Переключиться с `GITHUB_TOKEN` на PAT-секрет |
| `/gh-project link-prd` падает с "missing field 'Forgeplan-ID'" | Поле не создано на доске | Запустить `gh project field-create` команду из warning'а `/gh-project init` |
| `gh auth refresh` говорит "fine-grained tokens cannot be refreshed" | Используется fine-grained PAT | Сгенерировать новый PAT вручную с нужными scopes |
| Item уже на доске, дубль создаётся | Старый `actions/add-to-project@v0` имел bug | Обновить до `@v1` |

---

## Ссылки

- [Best practices for Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/best-practices-for-projects)
- [Adding items automatically](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/adding-items-automatically)
- [actions/add-to-project](https://github.com/actions/add-to-project)
- [gh project CLI manual](https://cli.github.com/manual/gh_project)
- [Custom fields docs](https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields)
- Тело скилла: `plugins/fpl-skills/skills/gh-project/SKILL.md`
- Workflow template: `docs/templates/auto-add-to-project.yml`
