[English](README.md) | [Русский](README-RU.md)

# agents-sparc

SPARC методология разработки: оркестратор с quality gates + 4 фазовых специалиста.

## Установка

```
/plugin install agents-sparc@ForgePlan-marketplace
```

## SPARC Методология

```
S → Specification  — требования, критерии приёмки
P → Pseudocode     — алгоритмы, структуры данных
A → Architecture   — дизайн системы, компоненты
R → Refinement     — TDD, рефакторинг, оптимизация
C → Completion     — интеграция, документация
```

## Агенты

| Агент | Фаза | Описание |
|-------|------|----------|
| **sparc-orchestrator** | Координатор | Управляет фазами, quality gates, делегирование |
| **specification** | S | Анализ требований, constraints, acceptance criteria |
| **pseudocode** | P | Дизайн алгоритмов, выбор структур данных, complexity |
| **architecture** | A | Системный дизайн, компоненты, Mermaid диаграммы |
| **refinement** | R | TDD red-green-refactor, оптимизация, error handling |

## Интеграция

`/sprint` Deep автоматически использует SPARC когда этот плагин установлен.

## Лицензия

MIT
