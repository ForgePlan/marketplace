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

> **Примечание:** Требуется **forgeplan CLI** (приватное приложение ForgePlan, доступ через администратора проекта) + настроенный **Orchestra MCP server**. Продукт: [orch.so](https://orch.so)
>
> **Имена инструментов в плагине написаны без префикса** — `query_entities`, а не `mcp__orch__query_entities`. Префикс различается по рантаймам (Claude Code ставит два подчёркивания между сервером и инструментом, OMP — одно), поэтому имя с префиксом окажется неверным в одном из них. Если ищешь в своём списке инструментов `mcp__orch__*` и ничего не находишь — скорее всего с сервером всё в порядке: посмотри листинг `/mcp` своего хоста, прежде чем решать, что он не работает.

## Быстрый старт

```bash
/plugin install forgeplan-orchestra@ForgePlan-marketplace
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

- **ВСЕГДА** читай чат задачи перед тем, как что-то с ней делать — чтение никого не уведомляет и не отключается
- **НИКОГДА** `send_message`, пока запись в чат не включена для этого пространства явно; после включения — только в чат самой задачи, без `@`-упоминаний, одно помеченное сообщение на событие
- **НИКОГДА** `delete_entity` — сироты отчитываются, а не удаляются
- **НИКОГДА** не определяй целевое пространство через `get_current_context` — он следует за интерфейсом; бери UID из конфига и сообщай о расхождении
- **НИКОГДА** не назначай исполнителя автоматически — это шлёт человеку пуш
- **НИКОГДА** не пиши фазу вместе со статусом `Blocked` — задача сохраняет ту фазу, что была
- **ВСЕГДА** `search_entities` перед `create_entity` (без дубликатов)
- **ВСЕГДА** читай `failedFields` перед тем, как сообщить, что поле проставлено — он приходит внутри *успешного* ответа

## Благодарности

- **[Orchestra](https://orch.so)** -- трекинг задач и командная работа
- **[Forgeplan](https://github.com/ForgePlan)** -- методология артефактов и фреймворк качества
- Архитектура: [UNIFIED-WORKFLOW.md](https://github.com/ForgePlan/forgeplan/blob/dev/docs/guides/UNIFIED-WORKFLOW.md)

## Лицензия

MIT
