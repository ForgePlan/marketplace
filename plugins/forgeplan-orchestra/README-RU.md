[English](README.md) | [Русский](README-RU.md)

# forgeplan-orchestra

> Три системы как единый организм. Каждая делает то, что умеет лучше всех. Данные живут в одном месте, ссылки — везде.

Плагин единого рабочего процесса, связывающий **Forgeplan** (методология + артефакты), **[Orchestra](https://www.orchestra.pm/)** (трекинг задач + командная работа) и **Claude Code** (AI-исполнение + память) в согласованную систему.

## Идея

| Система | Владеет | Источник истины |
|--------|------|-----------------|
| **Forgeplan** | Артефакты, валидация, R_eff, доказательства, quality gates | Что делать и зачем |
| **Orchestra** | Задачи, статусы, исполнители, дедлайны, чеклисты, сообщения | Кто делает что и когда |
| **Claude Code** | Скиллы, хуки, агенты, память, git workflow | Как делать |

Каждая система делает то, что у неё получается лучше всего. Мы не дублируем — мы связываем. Artifact ID в Orchestra → Forgeplan хранит содержимое. Статус в Orchestra → Phase в Forge pipeline маппится автоматически.

## Установка

```bash
/plugin install forgeplan-orchestra@forgeplan-marketplace
```

## Требования

- **Forgeplan CLI** — приватное приложение ForgePlan, доступ через администратора проекта
- **Orchestra MCP server** настроен (доступны инструменты `mcp__orch__*`). Продукт: https://www.orchestra.pm/
- Рабочее пространство Orchestra с 6 созданными пользовательскими полями (см. базу знаний → Setup)
- **Рекомендуется:** плагин `dev-toolkit` для команд `/sprint` и `/audit`

## Команды

### `/sync` — Двунаправленная синхронизация

Показывает diff между артефактами Forgeplan и задачами Orchestra, предлагает действия, ждёт вашего подтверждения. **Никогда не синхронизирует автоматически.**

```
📊 Sync Diff:
  IN FORGE NOT IN ORCH:  PRD-025 "PDF Export" — Create task?
  STATUS MISMATCH:       PRD-021 Forge=active, Orch=Doing — Update to Done?
  IN ORCH NOT IN FORGE:  "CI Pipeline" (no artifact) — OK (tactical)

What to do? [create PRD-025, update PRD-021, skip CI]
```

### `/session-start` — Протокол начала сессии

5-шаговый протокол с Inbox Pattern:

1. **Восстановление контекста** — CLAUDE.md + Hindsight memory
2. **Сбор входящих** (только чтение) — чаты Orchestra, git log, forgeplan health
3. **Здоровье проекта** — слепые зоны, сироты, просроченные задачи
4. **Триаж входящих** — приоритизированные сигналы (🔴 действие / 🟡 информация / ⚪ фон)
5. **Синтез** — что в работе, что дальше

## Маппинг Status ↔ Phase

| Статус Orchestra | Фаза Forge | Что происходит |
|---|---|---|
| Backlog | Shape | Артефакт заполняется |
| To Do | Validate | Артефакт валидирован, готов к работе |
| Doing | Code | Код пишется |
| Review | Evidence | Аудит + создание доказательств |
| Done | Done | Артефакт активирован |

## Custom Fields (6 полей, уровень workspace)

| Поле | Тип | Пример |
|---|---|---|
| Artifact | text | `PRD-021` |
| Type | option | PRD / RFC / ADR / Epic / Spec / Problem / Evidence / Note |
| Depth | option | Tactical / Standard / Deep / Critical |
| Phase | option | Shape / Validate / Code / Evidence / Done |
| Sprint | text | `Sprint 10` |
| Branch | text | `feat/pdf-export` |

## Агент: orchestra-advisor

Неблокирующий фоновый советник:
- После `forgeplan new` → «Создать соответствующую задачу в Orchestra?»
- После `forgeplan activate` → «Отметить задачу как Done?»
- При старте сессии → предлагает `/session-start`

## База знаний

Agentic RAG с 5 разделами из [UNIFIED-WORKFLOW.md](https://github.com/ForgePlan/forgeplan/blob/dev/docs/guides/UNIFIED-WORKFLOW.md):

| Раздел | Содержимое |
|---|---|
| Architecture | 3 bounded contexts, что НЕ дублировать |
| Setup | Greenfield (3 конфигурации) + brownfield миграция |
| Fields | 6 custom fields, маппинг Status↔Phase |
| Playbook | 10 ежедневных сценариев + Inbox Pattern + запреты |
| Configs | Solo Dev, Small Team (2-5), Medium Team (5-15) |

## Правила безопасности

- **НИКОГДА** `mcp__orch__send_message` без явного запроса пользователя
- **НИКОГДА** `mcp__orch__delete_entity` без подтверждения
- **ВСЕГДА** `mcp__orch__search_entities` перед `create_entity` (без дубликатов)

## Благодарности

- **[Orchestra](https://www.orchestra.pm/)** — трекинг задач и командная работа
- **[Forgeplan](https://github.com/ForgePlan)** — методология артефактов и фреймворк качества
- Архитектура: [UNIFIED-WORKFLOW.md](https://github.com/ForgePlan/forgeplan/blob/dev/docs/guides/UNIFIED-WORKFLOW.md) (1400 строк, v1.2)

## Лицензия

MIT
