[English](README.md) | [Русский](README-RU.md)

# fpl-hsmem

> Долговременная межсессионная память для Claude Code. Обёртка над [Hindsight](https://github.com/vectorize-io/hindsight): 13 MCP инструментов, 3 авто-хука и 5 вспомогательных skills — Claude помнит контекст между сессиями, проектами и неделями работы.

Поставил один раз — каждый проект получает свой приватный bank памяти. Auto-recall вставляет релевантную историю перед каждым твоим сообщением; auto-retain сохраняет разговор после каждого ответа. Ручные MCP-инструменты покрывают синтез (`memory_reflect`), живые страницы знаний (`mental_model_*`) и заливку документов.

> [!WARNING]
> Требует запущенный сервер [Hindsight](https://github.com/vectorize-io/hindsight). Простейший путь — Docker с провайдером `claude-code` (внешние LLM-ключи не нужны, для извлечения фактов используется твоя подписка Claude). См. [Быстрый старт](#быстрый-старт).

## Быстрый старт

```bash
# 1. Запустить Hindsight в Docker (без API-ключей)
docker run -d --name hindsight -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_PROVIDER=claude-code \
  ghcr.io/vectorize-io/hindsight:latest

# 2. Установить плагин
/plugin install fpl-hsmem@ForgePlan-marketplace

# 3. Проверить в любом проекте
/fpl-hsmem:status
```

Полная настройка с нуля — Docker, установка плагина, первый bootstrap, первая mental model — см. [`GETTING-STARTED.md`](./GETTING-STARTED.md).

## Примеры использования

### Auto-recall в разговоре

```
> Что мы решили про авторизацию на прошлой неделе?

[скрытый контекст вставлен хуком recall.js]
  - JWT RS256 вместо симметричного HS256 — security review NOTE-003
  - Ротация refresh-token раз в 7 дней (Orchestra ADR-012)
  - Service-to-service через mTLS, не через JWT

Мы остановились на JWT RS256 с ротацией refresh-token раз в 7 дней,
зафиксировано в ADR-012. Трафик между сервисами остаётся на mTLS —
JWT используется только для пользовательских сессий.
```

Пользователь никогда не видит блок `<hindsight_memories>` — но Claude его видит, и отвечает с полным контекстом.

### `/fpl-hsmem:bootstrap` — подключить память к новому проекту

```
> /fpl-hsmem:bootstrap

Bootstrap plan для bank "my-project":
  • set mission         "TypeScript API биллинга — фокус на технические
                         решения, изменения модели данных, deprecations."
  • ingest 4 documents  forge/prds/PRD-001-billing.md
                        forge/rfcs/RFC-002-stripe.md
                        forge/adrs/ADR-003-currency.md
                        docs/architecture.md
  • create 2 pages      "decisions-log" — синтезирует архитектурные решения
                        "tech-debt" — открытые пункты технического долга

Proceed? [y/n]
```

Однократная настройка нового bank — миссия, существующие артефакты, стартовые mental models.

### `/fpl-hsmem:mental-model` — управляемое создание страницы знаний

```
> /fpl-hsmem:mental-model

Существующие страницы в bank "my-project":
  decisions-log    | "Какие архитектурные решения и почему?"
  tech-debt        | "Какой технический долг мы обозначили?"

Предлагаемая новая страница:
  id:           billing-edge-cases
  source_query: "Какие необычные edge-кейсы биллинга мы обсуждали —
                 частичные возвраты, валютные несовпадения, диспуты?"

Живая страница — Hindsight автоматически перестраивает содержимое
после каждой консолидации. Контент появится через несколько циклов retain.

Создать? [y/n]
```

Валидирует source query, ловит дубли, объясняет жизненный цикл.

## Что внутри

### 13 MCP инструментов

| Группа | Инструменты |
|--------|-------------|
| **Базовая память** | `memory_retain`, `memory_recall`, `memory_reflect`, `memory_status`, `memory_get_current_bank`, `memory_set_mission` |
| **Mental models** (живые страницы) | `mental_model_list`, `mental_model_get`, `mental_model_create`, `mental_model_update`, `mental_model_delete` |
| **Документы** | `document_ingest`, `document_ingest_file` |

### 3 авто-хука

| Хук | Триггер | Поведение |
|-----|---------|-----------|
| `recall.mjs` | UserPromptSubmit | Семантический recall перед каждым prompt; результаты вставляются как `additionalContext`. Опционально multi-turn компоновка запроса. |
| `retain.mjs` | Stop | Сохраняет transcript после каждого ответа. Throttling через `retainEveryNTurns` (по умолчанию 10). **Compaction detection** — сохраняет старый длинный документ когда Claude Code сжимает сессию. |
| `session-end.mjs` | SessionEnd | Принудительный retain при закрытии. Страховка для коротких сессий (< `retainEveryNTurns`). |

### 5 skills

| Skill | Назначение |
|-------|-----------|
| `/fpl-hsmem:status` | Быстрая проверка здоровья + статистика bank + активные mental models. |
| `/fpl-hsmem:bootstrap` | Однократная настройка нового bank — миссия, ingest существующих артефактов, создание стартовых mental models. |
| `/fpl-hsmem:mental-model` | Управляемое создание mental model с валидацией source query. |
| `/fpl-hsmem:diagnose` | 6-шаговая диагностика (server, bank, content, hooks, config, opt-out). |
| `/fpl-hsmem:export-bank` | Markdown-снимок bank для бэкапа или аудита. |

### 3 режима активации

| Режим | Как | Хуки? | Skills? | Лучше всего для |
|-------|-----|-------|---------|-----------------|
| **Установка плагина** | `/plugin install fpl-hsmem` | ✅ авто | ✅ авто | Default-on на всех проектах |
| **Setup CLI** | `node dist/setup.mjs` per project | ✅ создаёт CLI | ❌ | Явный per-project контроль, committed `.mcp.json` |
| **Direct MCP** | Вручную `dist/index.mjs` в `.mcp.json` | ❌ | ❌ | Разовое использование, MCP-инструменты без фоновой автоматики |

Все три режима сосуществуют — project-level `.mcp.json` перекрывает plugin-level конфиг. **Opt-out** в любом проекте: `touch .hindsight-disabled` или `HINDSIGHT_DISABLED=true`. Детали — в [`CONFIGURATION.md`](./CONFIGURATION.md).

## Сопутствующие плагины

| Плагин | Когда подключать |
|---|---|
| [`fpl-skills`](../fpl-skills/) | Workflow-skills — `/restore`, `/briefing`, `/research`. Auto-recall **дополняет** `/restore` для межсессионного контекста. |
| [`forgeplan-orchestra`](../forgeplan-orchestra/) | Multi-session координация — `/sync` артефактов в память через `document_ingest_file`. |
| [`forgeplan-workflow`](../forgeplan-workflow/) | `/forge-cycle` Step 0 вызывает `mental_model_get` чтобы заправить инженерные циклы синтезированным контекстом. |

## Документация

- [`GETTING-STARTED.md`](./GETTING-STARTED.md) — 10-минутный walkthrough с нуля
- [`USAGE.md`](./USAGE.md) — реальные use cases + интеграция с `fpl-skills` и артефактами forgeplan
- [`CONFIGURATION.md`](./CONFIGURATION.md) — полный справочник env-переменных, рецепты настройки для 3 режимов
- [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) — диагностические рецепты для типичных проблем
- [`CHANGELOG.md`](./CHANGELOG.md) — история версий

## Авторство

Построено поверх [Hindsight](https://github.com/vectorize-io/hindsight) от vectorize-io. Реализует [Ruflo](https://ruflo.com/)-style outcome-feedback паттерн (NOTE-004). Структура плагина следует конвенциям флагмана [`fpl-skills`](../fpl-skills/).

## Лицензия

MIT
