[English](TRACKER-INTEGRATION.md) | [Русский](TRACKER-INTEGRATION-RU.md)

# Recipes для интеграции с трекерами

Как настроить `fpl-skills` чтобы читать из твоего трекера задач (Orchestra, GitHub Issues, Linear, Jira) или локальных TODO. Конфиг трекера живёт в `docs/agents/issue-tracker.md`, пишется `/setup`-ом и читается `/briefing`, `/restore`, `/session`.

> [!NOTE]
> `/fpl-init` и `/setup` авто-детектят трекер пробами окружения (наличие Orchestra MCP, `gh` CLI, Linear MCP, локальный `TODO*.md`). Recipes ниже — для **ручной конфигурации** если автодетект выбрал не тот трекер, или для добавления трекера к существующему проекту.

---

## Выбор трекера

| Трекер | Зачем брать | Стоимость |
|---|---|---|
| **Orchestra** | Самая тесная интеграция с fpl-skills: bidirectional sync через `forgeplan-orchestra`, Inbox Pattern, Status↔Phase mapping. Лучше для команд. | [orch.so](https://orch.so) — платный SaaS но с 5 бесплатными пользователями|
| **GitHub Issues** | Бесплатно, рядом с кодом. Подходит OSS или репам уже на GitHub. | Бесплатно с репо |
| **Linear** | Современный UX, MCP-first интеграция. Хорошо для команд уже на Linear. | Платный SaaS, есть free tier |
| **Jira** | Enterprise standard. Бери если организация требует. | Платный SaaS |
| **Локальный `TODO.md`** | Ноль зависимостей. Хорошо для соло-работы или fallback когда MCP серверы недоступны. | Бесплатно |

---

## Orchestra (рекомендовано для команд)

### Prerequisites

- Установлен плагин [`forgeplan-orchestra`](../plugins/forgeplan-orchestra/README-RU.md).
- Запущен Orchestra MCP сервер и объявлен в `.mcp.json`:

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

(URL подкорректируй под свой Orchestra инстанс — локальный proxy или хостед.)

### `docs/agents/issue-tracker.md`

```markdown
# Issue tracker

**Type**: Orchestra
**Workspace**: `<your-orchestra-workspace-id>`
**MCP server**: `orch` (объявлен в `.mcp.json`)

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

### Что работает

- `/briefing` читает open Orchestra entities для «фокус на сегодня».
- `/session` (из `forgeplan-orchestra`) inbox-ит сигналы: сообщения, упоминания, due-задачи, forgeplan blind spots.
- `/sync` делает bidirectional diff между Forgeplan-артефактами и Orchestra-задачами (по Status↔Phase mapping).
- Конвенция именования задач: `[ARTIFACT-ID] description` чтобы resolver мапил в обе стороны.

---

## GitHub Issues

### Prerequisites

- Установлен `gh` CLI и аутентифицирован: `gh auth status`.
- Репо имеет GitHub remote: `git remote -v` показывает `github.com/<org>/<repo>`.

### `docs/agents/issue-tracker.md`

```markdown
# Issue tracker

**Type**: GitHub Issues
**Repo**: `<org>/<repo>` (auto-detect из `git remote`)
**Auth**: `gh auth status` должен показать аутентификацию

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

## Как `/briefing` читает

Запускает `gh issue list --state open --assignee @me` и группирует:
- Open & assigned to me
- Open & mentioned in last 7 days (`gh search issues mentions:@me created:>7d`)
- Open with priority p0/p1

## Triage labels

- `priority:p0`/`p1`/`p2`/`p3`
- `kind:bug`/`feature`/`chore`/`docs`
- `phase:shape`/`code`/`review`
```

### Что работает

- `/briefing` запускает `gh issue list` и презентует grouped output.
- `/restore` читает issue упомянутый в имени текущей ветки (`feat/issue-42-auth` → fetches Issue #42).
- Только manual sync — нет `/sync` эквивалента для GitHub Issues пока.

### Совет — конвенция issue ↔ branch

Используй именование `feat/issue-NNN-short-description`. `/restore` извлекает номер issue и подтягивает контекст.

---

## Linear

### Prerequisites

- Linear MCP сервер (например [`linear-mcp`](https://github.com/linear/linear-mcp)) объявлен в `.mcp.json`.
- Linear API ключ в env: `export LINEAR_API_KEY=lin_...`.

### `docs/agents/issue-tracker.md`

```markdown
# Issue tracker

**Type**: Linear
**Workspace**: `<your-linear-team-id>`
**MCP server**: `linear` (объявлен в `.mcp.json`)
**Auth**: `LINEAR_API_KEY` в env

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

## Как `/briefing` читает

`mcp__linear__list_issues(filter: { assignee: { isMe: true }, state: { type: { in: ["unstarted", "started"] } } })`
```

### Что работает

- `/briefing` читает Linear issues assigned тебе.
- `/restore` cross-reference-ит текущую ветку с Linear issue ID (Linear ID типа `ENG-123` видны в branch names).
- Bidirectional `/sync` пока нет — запроси через [forgeplan-orchestra issues](https://github.com/ForgePlan/marketplace/issues) если полезно.

---

## Jira

### Prerequisites

- Jira API token: `export JIRA_API_TOKEN=...` и `JIRA_EMAIL=...` и `JIRA_BASE_URL=https://yourorg.atlassian.net`.
- Jira MCP сервер (есть community-варианты; см. `mcpservers.org`).

### `docs/agents/issue-tracker.md`

```markdown
# Issue tracker

**Type**: Jira
**Project**: `<your-jira-project-key>`  (например PROJ)
**Base URL**: `https://yourorg.atlassian.net`
**Auth**: `JIRA_API_TOKEN` + `JIRA_EMAIL` в env (или через MCP server config)

## How to list

```bash
# JQL через curl:
curl -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_BASE_URL/rest/api/3/search?jql=assignee=currentUser()+AND+status!=Done&maxResults=20"

# Или через MCP server:
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

## Конвенции полей

- Priority: `Highest` / `High` / `Medium` / `Low` / `Lowest` (default Jira)
- Type: `Story` / `Bug` / `Task` / `Epic`
- Custom поле для forgeplan artifact ID (рекомендовано): `Artifact-ID`
```

### Что работает

- `/briefing` запускает JQL через MCP, группирует по status/priority.
- Status mapping (аналогично Orchestra): `To Do → Shape`, `In Progress → Code`, `In Review → Evidence`, `Done → Done`.
- Bidirectional sync пока нет — manual или через собственную автоматизацию Atlassian.

---

## Локальный `TODO.md` (без MCP, без SaaS)

Лучше всего когда работаешь соло, на ноуте без интернета, или как fallback.

### `docs/agents/issue-tracker.md`

```markdown
# Issue tracker

**Type**: Local
**File**: `TODO.md` в корне репо (или `docs/TODO.md`)

## Формат

```markdown
# TODO

## P0 (сегодня)
- [ ] [PRD-NNN] description
- [x] completed task

## P1 (на этой неделе)
- [ ] [RFC-MMM] description

## Backlog
- [ ] идея заслуживающая сохранения
```

## Как `/briefing` читает

Парсит `TODO.md` ища:
- Unchecked items в `## P0` и `## P1` секциях
- `[ARTIFACT-ID]` паттерны для cross-reference с forgeplan
- Items modified за последние 7 дней (`git log -p TODO.md`)

## Как создавать

Просто редактируй `TODO.md` — `/briefing` подхватит изменения при следующем запуске.
```

### Что работает

- `/briefing` парсит файл и выдаёт grouped tasks.
- Ноль зависимостей — работает офлайн.
- Нет статусов (только checked/unchecked), нет assignees, нет due dates. Для них — реальный трекер.

### Комбинирование local + remote

Можешь держать `TODO.md` для личных черновиков + GitHub Issues для отслеживаемой работы. `/briefing` проверит оба если `docs/agents/issue-tracker.md` указывает оба как fallback:

```markdown
**Type**: GitHub Issues + Local
**Primary**: GitHub Issues (gh CLI)
**Fallback**: TODO.md (когда офлайн или для личных задач)
```

---

## Re-run `/setup` чтобы переключить трекер

Если стартовал с одним трекером и хочешь переключиться:

```
/setup
```

`/setup` re-prompt-ит секцию трекера (Section A). Пробит доступные опции в priority order:

1. Orchestra MCP (`mcp__orch__get_current_context`)
2. GitHub Issues (`gh repo view`)
3. Linear (`linear-cli` или Linear MCP)
4. Локальный `TODO*.md` существует

Подтверди или переопредели автодетект. Wizard перезапишет `docs/agents/issue-tracker.md` с новым трекером.

---

## Troubleshooting

### «`/briefing` ничего не возвращает»

Проверь что `docs/agents/issue-tracker.md` существует и в нём задан `**Type**:`. Если пусто или `Type: None` — re-run `/setup`.

### «MCP server недоступен»

```
mcp__hindsight__memory_status   # generic MCP probe
```

Если MCP трекера возвращает disconnected, briefing fall-back-ит на локальный `TODO.md` (если настроен) или возвращает «tracker offline; no signals collected».

### «GitHub Issues briefing медленный»

`gh issue list` может быть медленным на больших репо. Добавь фильтр в `docs/agents/issue-tracker.md`:

```markdown
## How to list (optimised)

```bash
gh issue list --assignee @me --state open --limit 10
```
```

`/briefing` использует оптимизированный query.

### «Linear/Jira: API key не подхватывается»

Убедись что env var экспортирована в shell который запустил Claude Code, не просто в `.env` (Claude Code читает process env, не произвольные `.env` файлы). Используй `direnv` или `set -a && source .env && set +a` перед запуском `claude`.

---

## Multi-tracker setups

Некоторые команды используют Orchestra для engineering и GitHub Issues для OSS-контрибьюторов. `docs/agents/issue-tracker.md` поддерживает primary/fallback схему:

```markdown
# Issue tracker

**Type**: Multi
**Primary**: Orchestra (`mcp__orch__*`)
**Fallback**: GitHub Issues (`gh` CLI для внешних контрибьюторов)

## Routing rules

- Внутренняя командная работа → Orchestra
- Issues от внешних контрибьюторов → GitHub Issues, зеркалятся в Orchestra еженедельно вручную
```

`/briefing` читает оба и группирует по источнику.

---

## См. также

- [DEVELOPER-JOURNEY-RU.md § Команда с Orchestra](DEVELOPER-JOURNEY-RU.md#-команда-с-orchestra) — narrative walkthrough Orchestra setup.
- [USAGE-GUIDE-RU.md § Daily workflow](USAGE-GUIDE-RU.md#daily-workflow) — где `/briefing` и `/session` в дне.
- [`plugins/forgeplan-orchestra/README-RU.md`](../plugins/forgeplan-orchestra/README-RU.md) — специфика Orchestra плагина.
- [`plugins/fpl-skills/skills/setup/SKILL.md`](../plugins/fpl-skills/skills/setup/SKILL.md) — внутренности `/setup` wizard.
