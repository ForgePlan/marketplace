[English](README.md) | [Русский](README-RU.md)

# forgeplan-workflow

> От идеи до продакшена через структурированные артефакты. Route -> Shape -> Build -> Evidence -> Activate.

Плагин для Claude Code, обеспечивающий структурированную автоматизацию инженерного рабочего процесса для пользователей [forgeplan](https://github.com/ForgePlan/forgeplan).

> **Примечание:** Требуется **forgeplan CLI** -- приватное приложение ForgePlan, доступ через администратора проекта. После получения бинарника: поместите в PATH и выполните `forgeplan init -y` в проекте.
>
> **Совет:** Отлично работает вместе с глобальным скиллом `/forge` для быстрого доступа к методологии. Этот плагин добавляет автоматизацию (команды, хуки, агент) поверх него.

## Быстрый старт

```bash
/plugin install forgeplan-workflow@ForgePlan-marketplace
```

## Использование

### `/forge-cycle` -- Полный инженерный цикл

```
> /forge-cycle

Step 1: Health check
  Active: 5, Draft: 12, Blind spots: 1 (RFC-003 no evidence)
  -> Fix blind spot first? [skip/fix]

Step 2: Task
  > "Add PDF export for artifacts"

Step 3: Route
  forgeplan route -> Depth: Standard, Pipeline: PRD -> RFC

Step 4: Shape
  forgeplan new prd "PDF Export" -> PRD-025
  Filling: Problem, Goals, FR...
  forgeplan validate PRD-025 -> PASS

Step 5: Build
  Implementing FR-001..FR-003...
  Tests: 12 new, all passing

Step 6: Evidence
  forgeplan new evidence "12 tests, audit clean" -> EVID-008
  forgeplan link EVID-008 PRD-025
  R_eff: 0.00 -> 1.00

Step 7: Activate
  forgeplan activate PRD-025 -> active

Step 8: Commit
  feat(export): add PDF export for artifacts
  Refs: PRD-025, FR-001..003
```

## Что входит

| Тип | Название | Описание |
|-----|----------|----------|
| Команда | `/forge-cycle` | Полный инженерный цикл: проверка здоровья, маршрутизация, формирование, сборка, доказательства, активация, коммит |
| Команда | `/forge-audit` | Мультиэкспертный аудит кода: логика, архитектура, безопасность, тесты, производительность, документация |
| Агент | `forge-advisor` | Фоновый советник: предлагает маршрутизацию, доказательства, проверки здоровья (неблокирующий) |
| Хук | Safety hook | Блокирует опасные Bash-команды (force push, hard reset, rm -rf /, DROP TABLE) |
| Хук | PRD check | Предупреждает при редактировании кода без активного PRD |
| БЗ | `forgeplan-methodology` | Agentic RAG скилл, покрывающий полную методологию forgeplan |

## Разделы базы знаний методологии

| Раздел | Содержимое |
|--------|------------|
| Workflow | Пайплайн Route -> Shape -> Build -> Evidence -> Activate |
| Artifacts | PRD, RFC, ADR, Evidence -- типы и шаблоны |
| Depth | Калибровка Tactical / Standard / Deep / Critical |
| R_eff | Скоринг доказательств и quality gates |
| Memory | Кросс-сессионная память через CLAUDE.md и Hindsight |

### Hint Contract — контракт подсказок (v1.5.0+, требует Forgeplan v0.25.0+)

Forgeplan v0.25.0 ввёл **hint contract из 5 правил** — каждый CLI/MCP вывод выдаёт один из маркеров:
- `Next: <command>` — основное действие
- `Or: <command>` — резервный вариант
- `Wait: <condition>` — асинхронный retry
- `Done.` — workflow завершён
- `Fix: <command>` — восстановление после ошибки

Этот плагин теперь учит агентов автоматически читать эти маркеры. Покрытие в Forgeplan v0.25.0: **100%** (70/70 CLI команд). См. секцию `06-output-hints/agent-protocol.md` в методологии для полного протокола чтения.

## Лицензия

MIT
