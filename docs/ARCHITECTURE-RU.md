[English](ARCHITECTURE.md) | [Русский](ARCHITECTURE-RU.md)

# Архитектура ForgePlan: 4 системы, 4 уровня

## Обзор

Экосистема ForgePlan состоит из 4 взаимодополняющих систем, каждая из которых работает на своём уровне:

```
Orchestra    — ГДЕ задача?         (tracking, sync, inbox)
Forgeplan    — ЧТО делать?         (PRD, evidence, lifecycle)
FPF          — КАК думать?         (decompose, evaluate, reason)
SPARC        — КАК кодить?         (spec -> pseudo -> arch -> refine -> complete)
```

Никаких пересечений. Каждая система делает одно дело хорошо.

---

## Уровень 1: Orchestra (Отслеживание задач)

**Назначение**: Отслеживать ГДЕ задачи находятся в pipeline.

| Поле | Значения |
|------|----------|
| Status | Backlog -> To Do -> Doing -> Review -> Done |
| Phase | Shape -> Validate -> Code -> Evidence -> Done |

**Инструменты**: `/sync`, `/session`, Orchestra MCP server

---

## Уровень 2: Forgeplan (Жизненный цикл проекта)

**Назначение**: Определить ЧТО строить и отслеживать прогресс через методологию.

**Цикл**: Route -> Shape -> Build -> Audit -> Evidence -> Activate

| Этап | Что происходит | Артефакт |
|------|---------------|----------|
| Route | Определить глубину задачи (Tactical/Standard/Deep) | - |
| Shape | Описать что строим | PRD |
| Build | Реализовать код | Code |
| Audit | Проверить качество | Findings |
| Evidence | Задокументировать что построено/проверено | Evidence |
| Activate | Отметить PRD как завершённый | - |

**Инструменты**: `forgeplan health`, `forgeplan route`, `forgeplan new prd`, `/forge-cycle`, `/forge-audit`

---

## Уровень 3: FPF (Структурированное мышление)

**Назначение**: КАК думать над сложными проблемами.

| Режим | Когда использовать | Результат |
|-------|--------------------|-----------|
| `/fpf decompose` | Разбить систему на ограниченные части | Context table + Mermaid diagram |
| `/fpf evaluate` | Сравнить альтернативы с доказательствами | F-G-R scores + decision matrix |
| `/fpf reason` | Отладить или проанализировать проблему | 3+ гипотезы -> проверка -> заключение |
| `/fpf lookup` | Найти концепцию FPF | Определение + примеры |

**База знаний**: 224 секции спецификации FPF + 4 applied patterns

---

## Уровень 4: SPARC (Структурированное кодирование)

**Назначение**: КАК кодить фичу через 5 последовательных фаз.

### Фазы SPARC

```
S — Specification    -> Что строить? Требования, ограничения, критерии приёмки
P — Pseudocode       -> Как строить? Алгоритмы, структуры данных, сложность
A — Architecture     -> Где строить? Дизайн системы, компоненты, Mermaid диаграммы
R — Refinement       -> Как улучшить? TDD red-green-refactor, оптимизация
C — Completion       -> Готово? Интеграция, деплой, документация
```

### Quality Gates

| Фаза | Агент | Quality Gate |
|------|-------|-------------|
| S | specification | Требования полные, критерии приёмки определены |
| P | pseudocode | Алгоритм выбран, сложность оценена |
| A | architecture | Компоненты определены, границы чёткие |
| R | refinement | Тесты зелёные, покрытие > 80% |
| C | (orchestrator) | Всё интегрировано, документация готова |

### Агенты

Плагин `agents-sparc` предоставляет 5 агентов:
- `sparc-orchestrator` — координирует все фазы, обеспечивает quality gates
- `specification` — специалист по анализу требований
- `pseudocode` — специалист по проектированию алгоритмов
- `architecture` — специалист по дизайну систем
- `refinement` — специалист по TDD и оптимизации кода

---

## Как они работают вместе

### SPARC vs Forgeplan

Нет конфликтов. Разные уровни:

| | Forgeplan | SPARC |
|--|----------|-------|
| Уровень | Управление проектом (ЧТО) | Разработка кода (КАК) |
| Цикл | Route->Shape->Build->Audit->Evidence | Spec->Pseudo->Arch->Refine->Complete |
| Артефакты | PRD, RFC, ADR, Evidence | Code, tests, diagrams |
| Скоуп | Весь жизненный цикл проекта | Один спринт/фича |

### Поток интеграции

```
Forgeplan:  Route -> Shape (PRD) -> BUILD <- SPARC живёт здесь -> Audit -> Evidence
                                      |
SPARC:                    Spec -> Pseudo -> Arch -> Refine -> Complete
                                      |
Agents:              specification  pseudocode  architecture  refinement
                       agent         agent        agent        agent
```

### Конкретный пример

```
1. forgeplan route "add OAuth"           -> Standard depth
2. forgeplan new prd "OAuth Integration" -> PRD-010
3. /sprint "implement OAuth"
     | Sprint запускает цикл SPARC (Deep scale):
     Wave 1: specification agent -> требования, потоки, edge cases
     Wave 2: pseudocode agent    -> алгоритм валидации токенов
             architecture agent  -> компоненты, Mermaid диаграмма
     Wave 3: refinement agent    -> TDD, тесты, рефакторинг
4. /audit -> ревьюеры проверяют результат
5. forgeplan new evidence "OAuth implemented, tests pass"
6. Commit -> PR -> Merge
```

### SPARC + Orchestra

Orchestra отслеживает задачи. SPARC — это КАК задача выполняется:

```
Orchestra: Task "OAuth" Status=Doing, Phase=Code
                |
Forgeplan: PRD-010 active, Build phase
                |
SPARC:     Specification -> Pseudocode -> Architecture -> Refinement
                |
Orchestra: Task "OAuth" Status=Review, Phase=Evidence
```

---

## Карта плагинов

| Система | Плагин(ы) | Заметки |
|---------|----------|---------|
| **Связующий слой** | **fpl-skills** | **Флагман**: 15 команд, композящих Forgeplan + FPF + SPARC + (опционально) UX. Включает `/fpl-init` для one-shot развёртки проекта. Заменяет dev-toolkit для пользователей forgeplan. |
| Orchestra | forgeplan-orchestra | `/sync` и `/session` для multi-session координации. |
| Forgeplan | forgeplan-workflow | `/forge-cycle` и `/forge-audit` — узкий forgeplan-only loop (альтернатива broader bundle fpl-skills). |
| FPF | fpf | Структурное мышление: decompose / evaluate / reason / lookup. Пара к `/refine` и `/diagnose` из fpl-skills. |
| SPARC | agents-sparc | 5 фазных агентов — `/sprint` активирует их при детекции Deep задачи. |
| UX | laws-of-ux | `ux-reviewer` агент + `/ux-review` + auto-hint hook при правке frontend-файлов. |
| Агенты | agents-core / agents-domain / agents-pro / agents-github | Специализированные сабагенты, которые `/audit`, `/sprint` и др. композят при необходимости. |
| Универсальный тулкит (legacy) | dev-toolkit | Soft-deprecated, superseded by fpl-skills. Используй только если CLI forgeplan недоступен. |
| Brownfield ингест | forgeplan-brownfield-pack | 5 карт соответствия (c4, ddd, madr, obsidian, autoresearch) + 12 скиллов извлечения + 2 playbooks для миграции legacy-кода и доков в forgeplan-граф. |

Команда установки: `/plugin install <plugin-name>@ForgePlan-marketplace`.

---

## Рекомендуемые стеки

| Роль | Плагины |
|------|---------|
| 🟢 Forgeplan user / соло-dev | `fpl-skills` |
| 🎨 Frontend | `fpl-skills` + `laws-of-ux` + `agents-domain` |
| 🏛 Архитектор / тех-лид | `fpl-skills` + `fpf` + `agents-sparc` + `agents-pro` |
| 👥 Multi-session / команда | `fpl-skills` + `forgeplan-orchestra` |
| 🏚 Brownfield миграция | `fpl-skills` + `forgeplan-brownfield-pack` |
| 🔧 Любой разработчик (без forgeplan) | `dev-toolkit` + `agents-core` (legacy) |
| Полный стек (все системы) | все 12 плагинов |

Per-persona Day 0 walkthroughs — см. [DEVELOPER-JOURNEY-RU.md](DEVELOPER-JOURNEY-RU.md).
