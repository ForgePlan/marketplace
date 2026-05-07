# `## 🔄 Что можно откатить если передумаешь` — Required section

Tell the reader: **what can be undone, what cannot, and how**.

## Why this matters

Trust = predictability. If user knows "I can revert this in 30 seconds", they take more risks. If they don't know — they freeze.

Especially important after:
- File creates / modifications
- Git operations (commits, merges, branches)
- External system effects (PR, deploy, secret added, ticket created)
- Long-running migrations / data transformations

## Card format

```markdown
## 🔄 Что можно откатить если передумаешь

  Действие: <What to undo>
  Команда:  <copy-paste command>
  Время:    <how long the undo takes>
  Риски:    <what might go wrong, or "Никаких">
  ───────────────────────────────────────────────────────────────
  Действие: <Another rollback>
  ...
```

## Concrete examples

```markdown
## 🔄 Что можно откатить если передумаешь

  Действие: Удалить весь skill forge-report
  Команда:  rm -rf plugins/dev-toolkit/skills/forge-report
  Время:    Мгновенно
  Риски:    /report команда станет бесполезной (но не сломается)
  ───────────────────────────────────────────────────────────────
  Действие: Откатить PR #25 целиком
  Команда:  gh pr revert 25 --repo ForgePlan/marketplace
  Время:    1 минута
  Риски:    Никаких — единый коммит
  ───────────────────────────────────────────────────────────────
  Действие: Откатить bump версии
  Команда:  Восстановить plugin.json и marketplace.json вручную
  Время:    2 минуты
  Риски:    Если кто-то уже установил v1.5.0 — у него будут несовпадения
```

## Time windows

Some "reversible" things have a window. Add explicit `Окно:` field:

```markdown
  Действие: Откатить миграцию схемы БД
  Команда:  flyway undo
  Окно:     До запуска следующей миграции (планируется 2026-05-15)
  Риски:    После запуска новой — undo невозможен
```

## When reversibility is obvious

Skip this section only if **all** of:
- Pure read-only operations
- No file changes
- No external system effects

In all other cases — include it, even if 1 card with "Действие: Никаких изменений делать не нужно".
