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

| Система | Плагин(ы) | Установка |
|---------|----------|-----------|
| Orchestra | forgeplan-orchestra | `/plugin install forgeplan-orchestra@ForgePlan-marketplace` |
| Forgeplan | forgeplan-workflow | `/plugin install forgeplan-workflow@ForgePlan-marketplace` |
| FPF | fpf | `/plugin install fpf@ForgePlan-marketplace` |
| SPARC | agents-sparc | `/plugin install agents-sparc@ForgePlan-marketplace` |
| Универсальные инструменты | dev-toolkit | `/plugin install dev-toolkit@ForgePlan-marketplace` |
| UX | laws-of-ux | `/plugin install laws-of-ux@ForgePlan-marketplace` |
| Агенты | agents-core, agents-domain, agents-pro, agents-github | `/plugin install agents-core@ForgePlan-marketplace` |

---

## Рекомендуемые стеки

| Роль | Плагины |
|------|---------|
| Любой разработчик | dev-toolkit + agents-core |
| Фронтенд | dev-toolkit + laws-of-ux + agents-domain |
| Архитектор | fpf + agents-pro + agents-sparc |
| Пользователь Forgeplan | forgeplan-workflow + fpf + agents-core + agents-sparc |
| Полный стек (все системы) | все 10 плагинов |
