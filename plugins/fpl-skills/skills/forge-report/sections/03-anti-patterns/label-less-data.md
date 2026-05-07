# Label-less data — Anti-pattern

Showing columns of numbers, results, or values without explicit labels — forcing the reader to decode them.

## Why it's bad

- Reader has to **guess** what each column/value means
- Same data point may mean different things in different contexts (`5` could be tasks, files, errors, minutes)
- Codes like `🟢 Pass / 🟡 Medium / 🔴 Assumed` look terse but require legend lookup
- Numbers without units (`200`) require context (200 ms? 200 lines? 200 USD?)

## Bad

```markdown
## Verification
  CI                pass (8s)               🟢 High
  Smoke             pending                  🔴 Assumed
  Lint              pass                     🟢 High
```

Reader thinks: "What's `🟢 High`? Confidence in what? In CI passing? In my judgment of CI? Are pending and Assumed related?"

## Good

```markdown
## ✅ Как проверили

  Проверка: CI на PR #26
  Результат: Прошёл за 8 секунд
  Уверенность: Высокая (gh pr view вернул "all checks passed")
  ───────────────────────────────────────────────────────────────
  Проверка: Smoke test /report на реальной задаче
  Результат: Не выполнено
  Уверенность: Не применимо — это шаг для пользователя
  ───────────────────────────────────────────────────────────────
  Проверка: Linting (ESLint, Prettier)
  Результат: Прошёл без warnings
  Уверенность: Высокая (стандартный CI шаг)
```

Each row stands alone. Reader knows what's measured, how, and how confident we are.

## When labels are unnecessary

Single-column tables where heading is the label, like:

```markdown
**Tests pass**: 98/98 (auth module, 2026-04-27)
```

The bold prefix is the label.

## When you have many similar rows

If 5+ rows have the same shape — a Markdown table is appropriate, but each column **must** have a header:

```markdown
| Проверка | Результат | Когда |
|---|---|---|
| CI | Прошёл за 8s | После push |
| Lint | Прошёл | Локально |
| Tests | 98/98 | В CI |
```

Tables work for **comparable** rows. Cards work for **different** items.

## How to fix

1. Find every value, status, or number in your report.
2. Ask: "would a reader who didn't follow this work understand this?"
3. If no — add explicit label or full sentence.
