[English](README.md) | [Русский](README-RU.md)

# forgeplan-orchestra

> Три системы как единый организм. Каждая делает то, что умеет лучше всех.

## Идея

| Система | Владеет | Роль |
|---------|---------|------|
| **Forgeplan** | Артефакты, валидация, R_eff, доказательства, quality gates | **Что** делать и зачем |
| **Orchestra** | Задачи, статусы, исполнители, дедлайны, сообщения | **Кто** делает что и когда |
| **Claude Code** | Скиллы, хуки, агенты, память, git workflow | **Как** делать |

Каждая система делает то, что у неё получается лучше всего. Мы не дублируем -- мы связываем. Artifact ID в Orchestra указывает на содержимое в Forgeplan. Статус в Orchestra маппится на Phase в Forge pipeline автоматически.

> **Примечание:** Требуется **forgeplan CLI** (приватное приложение ForgePlan, доступ через администратора проекта) + **Orchestra MCP server** настроен (доступны инструменты `mcp__orch__*`). Продукт: [orchestra.pm](https://www.orchestra.pm/)

## Быстрый старт

```bash
/plugin install forgeplan-orchestra@forgeplan-marketplace
```

## Использование

### `/session` -- Протокол начала сессии

```
> /session

Step 1: Context restored from Hindsight + CLAUDE.md
Step 2: Inbox collection...
  2 new messages in Orchestra
  3 commits since last session
  forgeplan health: 1 blind spot (RFC-003)

Step 3: Project health
  Active tasks: [PRD-021] Doing, [PROB-021] Review
  Overdue: none

Step 4: Inbox triage
  Inbox (3 signals):
  1. @alice on PROB-021: "Should we add caching?" -> New idea (PRD?)
  2. 3 commits without artifact -> Probably tactical
  3. RFC-003 stale 60 days -> Renew or deprecate?
  
  What to do? [1->PRD, 2->skip, 3->deprecate]

Step 5: Synthesis
  Continue: [PRD-021] ADI Quality (Doing)
  Then: fix RFC-003 blind spot
```

### `/sync` -- Двунаправленная синхронизация

```
> /sync

Comparing Forgeplan <-> Orchestra...

| Status | Artifact | In Forge | In Orch | Action |
|--------|----------|----------|---------|--------|
| MISSING | PRD-025 | active | -- | Create task? |
| MISMATCH | PRD-021 | active | Doing | Update to Done? |
| OK | PROB-021 | draft | Review | In sync |

Apply changes? [y/n]
```

## Маппинг Status <-> Phase

| Статус Orchestra | Фаза Forge | Что происходит |
|------------------|------------|----------------|
| Backlog | Shape | Артефакт заполняется |
| To Do | Validate | Артефакт валидирован, готов к работе |
| Doing | Code | Код пишется |
| Review | Evidence | Аудит + создание доказательств |
| Done | Done | Артефакт активирован |

## Custom Fields (6 полей, уровень workspace)

| Поле | Тип | Пример |
|------|-----|--------|
| Artifact | text | `PRD-021` |
| Type | option | PRD / RFC / ADR / Epic / Spec / Problem / Evidence / Note |
| Depth | option | Tactical / Standard / Deep / Critical |
| Phase | option | Shape / Validate / Code / Evidence / Done |
| Sprint | text | `Sprint 10` |
| Branch | text | `feat/pdf-export` |

## Правила безопасности

- **НИКОГДА** `mcp__orch__send_message` без явного запроса пользователя
- **НИКОГДА** `mcp__orch__delete_entity` без подтверждения
- **ВСЕГДА** `mcp__orch__search_entities` перед `create_entity` (без дубликатов)

## Благодарности

- **[Orchestra](https://www.orchestra.pm/)** -- трекинг задач и командная работа
- **[Forgeplan](https://github.com/ForgePlan)** -- методология артефактов и фреймворк качества
- Архитектура: [UNIFIED-WORKFLOW.md](https://github.com/ForgePlan/forgeplan/blob/dev/docs/guides/UNIFIED-WORKFLOW.md)

## Лицензия

MIT
