[English](README.md) | [Русский](README-RU.md)

# dev-toolkit

> **⚠️ Deprecated — superseded by [`fpl-skills`](../fpl-skills/README-RU.md).**
>
> `dev-toolkit` в soft-sunset. Существующие пользователи продолжают работать на текущей версии;
> новые проекты — ставь `fpl-skills`. Он включает всё что есть в dev-toolkit (`/audit`, `/sprint`,
> session-context recall, structured reports) плюс `/research`, `/refine`, `/diagnose`, `/autorun`,
> `/fpl-init` и ещё 8 скиллов поверх forgeplan lifecycle.
>
> ```bash
> /plugin install fpl-skills@ForgePlan-marketplace
> ```
>
> См. [`plugins/fpl-skills/README-RU.md`](../fpl-skills/README-RU.md), [`GETTING-STARTED.md`](../fpl-skills/GETTING-STARTED.md)
> и [гайд миграции](../../docs/MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS-RU.md). Если текущий dev-toolkit
> тебя устраивает — ничего делать не нужно.

Универсальный инженерный инструментарий -- работает с любым проектом. Без зависимостей.

Четыре параллельных ревьюера кода, волновое выполнение задач и мгновенное восстановление сессии. Установите в Claude Code и работайте.

## Быстрый старт

```bash
/plugin install dev-toolkit@ForgePlan-marketplace    # установка
/audit                           # ревью кода прямо сейчас
/sprint fix login bug            # разбить задачу на параллельные волны
```

## Примеры использования

### `/audit` -- Мультиэкспертное ревью кода

```
> /audit

Launching 4 parallel reviewers...

Logic       ████████░░  3 findings
Architecture████████████  0 findings
Security    ██████░░░░  2 findings (1 HIGH)
Tests       ████░░░░░░  4 findings

| # | Severity | Reviewer | File | Issue |
|---|----------|----------|------|-------|
| 1 | HIGH | Security | auth.ts:23 | JWT secret from env not validated |
| 2 | MEDIUM | Logic | utils.ts:45 | Unchecked null return from DB query |
| 3 | MEDIUM | Tests | user.test.ts | Missing edge case: empty email |
...

9 findings: 1 high, 4 medium, 4 low
Fix HIGH issues? [y/n]
```

### `/sprint` -- Волновое выполнение задач

```
> /sprint implement user authentication

Researching context... reading CLAUDE.md, git log, project structure

Sprint Plan (3 waves):
  Wave 1: [Auth service] + [User model] — 2 agents parallel
  Wave 2: [API routes] + [Middleware] — 2 agents parallel
  Wave 3: [Tests] + [Docs] — 2 agents parallel

Approve plan? [y/n]
```

### `/recall` -- Мгновенное восстановление сессии

```
> /recall

Session Briefing:
  Branch: feat/auth-system
  Status: 3 uncommitted files
  Last commit: "feat: add user model" (2h ago)
  Recent: 5 commits on feat/auth-system
  Open items: TODO.md has 2 unchecked P0

Ready to continue feat/auth-system.
```

## Что включено

| Тип | Имя | Описание |
|-----|-----|----------|
| Команда | `/audit` | 4 параллельных эксперта-ревьюера с отчётом по серьёзности и автоисправлением |
| Команда | `/sprint` | Волновое параллельное выполнение задач с утверждением плана |
| Команда | `/recall` | Восстановление контекста сессии из git, CLAUDE.md и инструментов памяти |
| Агент | `dev-advisor` | Фоновый советник: предлагает аудит, отмечает проблемы безопасности, рекомендует спринты |
| Хук | Safety | Блокирует `git push --force`, `rm -rf /`, `DROP TABLE` до выполнения |
| Хук | Test reminder | Напоминает, когда новая публичная функция не имеет теста |

## Поддерживаемые языки

JavaScript/TypeScript, Python, Rust, Go, Java, Kotlin, Ruby, PHP, C#/.NET, C/C++, Swift и любой язык со стандартными конвенциями проекта.

## Лицензия

MIT
