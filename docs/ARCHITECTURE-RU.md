[English](ARCHITECTURE.md) | [Русский](ARCHITECTURE-RU.md)

# Архитектура ForgePlan: 4 системы, 4 уровня

## Обзор

Экосистема ForgePlan состоит из 4 систем, каждая на своём уровне:

```
Orchestra    — ГДЕ задача?      (трекинг, синхронизация, inbox)
Forgeplan    — ЧТО делать?      (PRD, evidence, lifecycle)
FPF          — КАК думать?      (decompose, evaluate, reason)
SPARC        — КАК кодить?      (spec → pseudo → arch → refine → complete)
```

Нет пересечений. Каждая система делает одно дело хорошо.

---

## Уровень 1: Orchestra (Трекинг задач)

**Назначение**: отслеживать ГДЕ задачи в пайплайне.

| Поле | Значения |
|------|----------|
| Status | Backlog → To Do → Doing → Review → Done |
| Phase | Shape → Validate → Code → Evidence → Done |

**Инструменты**: `/sync`, `/session`, Orchestra MCP server

---

## Уровень 2: Forgeplan (Жизненный цикл проекта)

**Назначение**: определить ЧТО строить и отслеживать прогресс.

**Цикл**: Route → Shape → Build → Audit → Evidence → Activate

| Этап | Что происходит | Артефакт |
|------|---------------|----------|
| Route | Определить глубину задачи | — |
| Shape | Описать что строим | PRD |
| Build | Реализовать код | Code |
| Audit | Проверить качество | Findings |
| Evidence | Задокументировать результат | Evidence |
| Activate | Отметить PRD как завершённый | — |

**Инструменты**: `forgeplan health`, `forgeplan route`, `forgeplan new prd`, `/forge-cycle`, `/forge-audit`

---

## Уровень 3: FPF (Структурное мышление)

**Назначение**: КАК думать над сложными проблемами.

| Режим | Когда использовать | Результат |
|-------|-------------------|-----------|
| `/fpf decompose` | Разбить систему на части | Таблица контекстов + Mermaid |
| `/fpf evaluate` | Сравнить альтернативы | F-G-R + матрица решений |
| `/fpf reason` | Отладить или проанализировать проблему | 3+ гипотезы → тест → вывод |
| `/fpf lookup` | Найти концепт FPF | Определение + примеры |

**База знаний**: 224 секции FPF + 4 прикладных паттерна

---

## Уровень 4: SPARC (Структурный кодинг)

**Назначение**: КАК кодить фичу через 5 последовательных фаз.

### Фазы SPARC

```
S — Specification    → Что строить? Требования, constraints, acceptance criteria
P — Pseudocode       → Как строить? Алгоритмы, структуры данных, complexity
A — Architecture     → Где строить? Дизайн системы, компоненты, Mermaid
R — Refinement       → Как улучшить? TDD red-green-refactor, оптимизация
C — Completion       → Готово? Интеграция, документация, деплой
```

### Quality Gates

| Фаза | Агент | Quality Gate |
|------|-------|-------------|
| S | specification | Требования полные, acceptance criteria определены |
| P | pseudocode | Алгоритм выбран, complexity оценена |
| A | architecture | Компоненты определены, boundaries чёткие |
| R | refinement | Тесты зелёные, coverage > 80% |
| C | (orchestrator) | Всё интегрировано, docs готовы |

### Агенты

Плагин `agents-sparc` предоставляет 5 агентов:
- `sparc-orchestrator` — координирует фазы, quality gates
- `specification` — анализ требований
- `pseudocode` — дизайн алгоритмов
- `architecture` — системный дизайн
- `refinement` — TDD и оптимизация

---

## Как работают вместе

### SPARC vs Forgeplan

Нет конфликта. Разные уровни:

| | Forgeplan | SPARC |
|--|----------|-------|
| Уровень | Управление проектом (ЧТО) | Разработка кода (КАК) |
| Цикл | Route→Shape→Build→Audit→Evidence | Spec→Pseudo→Arch→Refine→Complete |
| Артефакты | PRD, RFC, ADR, Evidence | Code, tests, diagrams |
| Scope | Весь lifecycle | Один sprint/feature |

### Поток интеграции

```
Forgeplan:  Route → Shape (PRD) → BUILD ← тут живёт SPARC → Audit → Evidence
                                    ↓
SPARC:                  Spec → Pseudo → Arch → Refine → Complete
                                    ↓
Агенты:          specification  pseudocode  architecture  refinement
```

### Конкретный пример

```
1. forgeplan route "добавить OAuth"   → Standard
2. forgeplan new prd "OAuth"          → PRD-010
3. /sprint "реализовать OAuth"
     ↓ Sprint запускает SPARC:
     Волна 1: specification agent → требования, edge cases
     Волна 2: pseudocode agent → алгоритм token validation
              architecture agent → компоненты, Mermaid
     Волна 3: refinement agent → TDD, тесты, рефакторинг
4. /audit → ревьюеры проверяют
5. forgeplan new evidence → документируем
6. Commit → PR → Merge
```

---

## Карта плагинов

| Система | Плагин | Установка |
|---------|--------|-----------|
| Orchestra | forgeplan-orchestra | `/plugin install forgeplan-orchestra@ForgePlan-marketplace` |
| Forgeplan | forgeplan-workflow | `/plugin install forgeplan-workflow@ForgePlan-marketplace` |
| FPF | fpf | `/plugin install fpf@ForgePlan-marketplace` |
| SPARC | agents-sparc | `/plugin install agents-sparc@ForgePlan-marketplace` |
| Инструменты | dev-toolkit | `/plugin install dev-toolkit@ForgePlan-marketplace` |
| UX | laws-of-ux | `/plugin install laws-of-ux@ForgePlan-marketplace` |
| Агенты | agents-core, agents-domain, agents-pro, agents-github | `/plugin install agents-core@ForgePlan-marketplace` |

---

## Рекомендуемые стеки

| Роль | Плагины |
|------|---------|
| Любой разработчик | dev-toolkit + agents-core |
| Фронтенд | dev-toolkit + laws-of-ux + agents-domain |
| Архитектор | fpf + agents-pro + agents-sparc |
| Forgeplan пользователь | forgeplan-workflow + fpf + agents-core + agents-sparc |
| Full stack (все системы) | все 10 плагинов |
