# fpl-hsmem — ForgePlan Hindsight memory plugin

Долгосрочная межсессионная память для Claude Code, упакованная для маркетплейса ForgePlan.

Обёртка над [Hindsight](https://github.com/vectorize-io/hindsight) с:

- **13 MCP-инструментов** — `memory_*`, `mental_model_*`, `document_*`
- **3 крючка (auto-hooks)** — auto-recall перед каждым промптом, auto-retain после каждого ответа, force-retain на закрытие сессии (с throttling и детекцией Claude Code compaction)
- **5 навыков (skills)** — `/status`, `/bootstrap`, `/mental-model`, `/diagnose`, `/export-bank`
- **Два режима активации** — установка как plugin (везде) или per-project setup CLI (явное opt-in)

## Два режима — что выбирать

| | Plugin install | Per-project setup |
|---|---|---|
| Активация | Один install — везде | Запустить `setup.js` в каждом проекте |
| Bank ID | Выводится из git/cwd | Зафиксирован в `.mcp.json` проекта |
| Opt-out | Маркер `.hindsight-disabled` | Не запускать setup |
| Источник правды | Plugin manifest + cwd | Project `.mcp.json` |
| Подходит для | Default-on на N проектах | Явный per-project контроль |

Оба режима могут сосуществовать — project-level `.mcp.json` переопределяет plugin-level конфигурацию.

## Режим 1 — Plugin install (рекомендуется)

```bash
# 1. Запустить Hindsight (LLM key не требуется — использует твою Claude subscription)
docker run -d --name hindsight -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_PROVIDER=claude-code \
  ghcr.io/vectorize-io/hindsight:latest

# 2. Установить плагин
claude plugin marketplace add ForgePlan/marketplace
claude plugin install fpl-hsmem

# 3. Проверить
claude  # restart
# В любом проекте спроси: "memory_status"
```

Плагин:
- Регистрирует `mcp__hindsight__*` tools в каждом проекте
- Запускает auto-recall перед каждым промптом
- Запускает auto-retain после каждого ответа
- Использует bank ID, выведенный из git remote или cwd-hash

## Режим 2 — Per-project setup

```bash
# В корне проекта
cd /path/to/your-project
npx fpl-hsmem-setup

# Создаст .mcp.json с pinned bank_id
# Чтобы отключить — просто удали запись из .mcp.json
```

Подходит когда хочешь:
- Зафиксировать `HINDSIGHT_BANK_ID` (не derived)
- Указать custom `HINDSIGHT_URL` (self-hosted)
- Использовать отдельный API key только для этого проекта

## 13 MCP-инструментов

### Memory tools (6)
- `memory_status` — health check + статистика bank
- `memory_get_current_bank` — какой bank активен
- `memory_recall(query)` — семантический поиск по memories
- `memory_reflect(query)` — LLM-синтезированный ответ
- `memory_retain(content)` — ручное сохранение знания
- `memory_set_mission(mission)` — задать "характер" bank (one-time)

### Mental models (5)
- `mental_model_list` — список живых страниц знаний
- `mental_model_get(id)` — взять страницу
- `mental_model_create(id, name, source_query)` — создать auto-обновляемую страницу
- `mental_model_update(id, ...)` — обновить
- `mental_model_delete(id)` — удалить

### Documents (2)
- `document_ingest(title, content)` — загрузить документ как single unit
- `document_ingest_file(path)` — загрузить файл с диска

## 5 навыков

- **`/status`** — quick bank health overview
- **`/bootstrap`** — one-time project memory setup (mission + baseline mental models)
- **`/mental-model`** — create/update/list mental models интерактивно
- **`/diagnose`** — диагностика проблем (auth, network, throttling)
- **`/export-bank`** — экспорт bank для backup или миграции

## Auto-hooks (включаются автоматически при plugin install)

| Hook | Когда срабатывает | Что делает |
|---|---|---|
| **UserPromptSubmit** | Перед каждым твоим промптом | `recall` релевантных memories, приклеивает к контексту незаметно (12s timeout) |
| **Stop** | После каждого ответа Claude | `retain` transcript каждые N turns (с throttling, 15s timeout) |
| **SessionEnd** | При выходе из сессии | Force `retain` финального transcript (15s timeout) |

**Следствие:** не вызывай `memory_recall` или `memory_retain` рефлекторно — это уже делается фоном.

## Связь с другими ForgePlan плагинами

- **fpl-skills** — workflow plugin. Pipeline skills (`/forge-cycle`, `/autorun`) могут использовать `mental_model_get` для context-aware orchestration (см. PRD-025, RFC-003)
- **forgeplan-workflow** — `/forge-cycle` v1.8.0+ Step 0 пробует Hindsight для project methodology context
- **fpf** — FPF reasoning может опираться на `memory_recall` для empirical evidence

## Принципы (см. `~/.claude/rules/hindsight.md` v2.0)

1. **Каждое знание — в одном слое.** Не дублируй ADR в `retain`; auto-retain поймает обсуждение, ADR остаётся источником.
2. **Mental models — для синтеза**, не для документации. Хорошая страница отвечает на вопрос, **которого нельзя получить через grep или Read**.
3. **Ingest — только для семантического поиска.** Активные документы читаются через Read.
4. **Per-project bank.** Bank одного проекта не виден из другого.
5. **Проверяй recall перед использованием.** Память — снимок прошлого, не источник правды настоящего.

## Setup verification

```bash
# В Claude Code сессии:
memory_status                    # Health check + statistics
memory_get_current_bank          # Bank ID confirmed?
mental_model_list                # Какие живые страницы есть
```

## Troubleshooting

| Проблема | Решение |
|---|---|
| Tools не загружаются после install | Restart Claude Code. Проверь `.mcp.json` пути |
| `memory_status` падает | Проверь `HINDSIGHT_URL` reachable, `HINDSIGHT_API_KEY` валидный |
| Auto-hooks не срабатывают | Проверь `.claude/settings.json` — plugin сам regnistrирует hooks |
| Bank растёт без границ | TTL/decay активны автоматически; manual prune через `/diagnose` |

## Адопция в ForgePlan ecosystem

Hindsight v2 — основной memory layer для pipeline:
- **NOTE-004**: identified Hindsight auto-hooks как Ruflo-style outcome-feedback
- **PRD-025 FR-021/022**: pipeline skills bootstrap mental_models на старте
- **RFC-003 Layer 3**: 5 baseline mental models для pipeline knowledge
- **EVID-035..038**: shape evidence (ingested как docs для semantic search)

## License

MIT

## Контрибьютинг

PR'ы welcome. Плагин — wrapper, основная разработка идёт в [vectorize-io/hindsight](https://github.com/vectorize-io/hindsight). Здесь — Claude Code integration слой.
