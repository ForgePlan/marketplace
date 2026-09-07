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
> **Имена инструментов в плагине написаны без префикса** — `query_entities`, никогда не форма с префиксом. Префикс ненадёжен вдвойне: написание зависит от рантайма (Claude Code ставит два подчёркивания между сервером и инструментом, OMP — одно), а **само имя сервера — это то, что записано в `.mcp.json` проекта**: в одном проекте `orch`, в другом `orchestra-elirum`, и проект может законно держать несколько серверов Orchestra сразу (разные пространства, разные личности и права — сессия человека рядом с ограниченным ботом). Поэтому сервер выбирается на уровне проекта, а не плагина — и детерминированно, а не рассуждением: запусти `scripts/orch-verify.sh` (идёт со скиллом `orchestra-task-cycle`). Он находит пин-файл проекта — сначала `.agents/orchestra.json` (нейтральный к рантайму: один файл обслуживает и Codex, и OMP, и Gemini), затем `.claude/orchestra.json` как запасной путь — разрешает роль в сервер (`url` + карта `names` «рантайм → зарегистрированное имя» + `tokenEnv`, никогда не сырой токен), делает рукопожатие и сверяет живой `get_current_context` с закреплённым пространством и пользователем. Выход 0 — писать можно; 65 — расхождение, стоп; 66 — пин-файла нет (тогда допустим ровно один подключённый сервер с сигнатурой Orchestra, несколько — спроси, по имени не угадывай).
>
> **Orchestra к тому же поставляет два *варианта* сервера** — с разным набором инструментов и разной личностью. Собственный endpoint приложения (без авторизации) действует от лица залогиненного человека и несёт `navigate_to`/`get_ui_context`. Агентный endpoint за Bearer-токеном действует от лица **развёрнутого бота с собственным uid** — каждая запись ложится под его именем, не под твоим — и несёт `add_relation`/`remove_relation`/`approve_action`/`switch_workspace`/`list_workspaces`/`add_members`/`get_agent_prompt`. Сборка `0.141-beta-0906` закрыла прежние дыры агентного endpoint'а (создание сущностей, слой документов, чтение сообщений, `move_entity`); на более старых агентных сборках они ещё есть. Запусти `scripts/orch-verify.sh`, чтобы увидеть вариант, версию и чью личность ты держишь; карта различий и всё, что воспроизводится до сих пор, — в `skills/orchestra-task-cycle/references/failure-modes.md`.

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

## Скиллы

### `unified-workflow` — архитектура

Как задачи Orchestra и артефакты forgeplan отображаются друг на друга.

### `orchestra-task-cycle` — рабочий цикл

Одна задача от начала до конца: **сориентироваться → прочитать → взять → работать → доказать →
отчитаться → закрыть**. Семь стадий, у каждой гейт — и гейт, на который нечего ответить, значит
предыдущая стадия не закончена. Каждый дорогой сбой в этом цикле — это старт стадии N+1 на
незаконченной стадии N.

Подхватывается сам на фразах «что дальше», «возьми задачу», «закрой задачу», «что заблокировано»,
"what should I do next", "take this task" — или при упоминании доски, задачи, статуса, фазы,
чеклиста.

Прогрессивное раскрытие — `SKILL.md` укладывается в порог 2000 слов, глубина лежит рядом:

| Файл | Что внутри |
|---|---|
| `references/field-model.md` | одиннадцать полей, доктрина тегов, типы-ловушки |
| `references/query-recipes.md` | обратный поиск зависимостей, обходы, аудиты |
| `references/failure-modes.md` | как Orchestra отказывает **молча** — читать до отладки |
| `examples/` | полный проход семи стадий, вариант `Blocked`, заведение задачи |
| `assets/` | скелеты описания задачи и итогового отчёта |
| `scripts/orch-verify.sh` | детерминированная резолюция сервера + рукопожатие перед записью по `orchestra.json` |
| `scripts/field-map.sh` | выгружает карту UID полей и опций |

Собран по аудиту исходников Orchestra и сверен с живой доской — поведение в `failure-modes.md` и
`query-recipes.md` наблюдалось на работающем сервере, а не выведено из документации.

#### Адрес сервера не зашит

`scripts/field-map.sh` по умолчанию идёт на `http://localhost:28173/mcp` — приложение Orchestra на
этой машине. Это запасной вариант, а не фиксированный адрес:

```bash
ORCH_MCP_URL=https://orchestra.example.com/mcp ./scripts/field-map.sh
ORCH_MCP_TOKEN=<bearer> ORCH_MCP_URL=http://localhost:28174/mcp ./scripts/field-map.sh
```

`ORCH_MCP_URL` направляет скрипт на любой сервер; `ORCH_MCP_TOKEN` нужен, когда цель — агентный
endpoint за Bearer-токеном. Оба значения бери из `.mcp.json` проекта, а не угадывай порты.

## Благодарности

- **[Orchestra](https://orch.so)** -- трекинг задач и командная работа
- **[Forgeplan](https://github.com/ForgePlan)** -- методология артефактов и фреймворк качества
- Архитектура: [UNIFIED-WORKFLOW.md](https://github.com/ForgePlan/forgeplan/blob/dev/docs/guides/UNIFIED-WORKFLOW.md)

## Лицензия

MIT
