# Confidence Levels — Inline, Sparingly

**Most bugs from Claude come from confidently stating assumptions.** Confidence labels separate verified facts from inference. But — used sparingly, inline in card values, never as visual decoration.

## Three levels

| Label | When to use | Example |
|-------|-------------|---------|
| 🟢 **High** | Verified by tool output (Read/Bash/test result) | `Готов и проверен (🟢 high — gh pr view confirmed merged)` |
| 🟡 **Medium** | Inferred from context, not directly tested | `Скорее всего работает (🟡 medium — last 3 similar PRs were green)` |
| 🔴 **Assumed** | Estimate, opinion, or unverified prediction | `Займёт ~4 часа (🔴 assumed — оценка по похожим задачам)` |

**Important**: confidence labels (🟢🟡🔴) are a **separate namespace** from section icons (✅📈⚪🔄⚠️➡️💰). Never use 🟢 as a section icon, never use ✅ as a confidence label.

## How to write inline

In card values:
```
  Статус: Готов и проверен на CI (🟢 high — gh pr view returned MERGED)
  Время:  ~4 часа (🔴 assumed — оценка по похожим задачам)
```

In prose:
```
> _Workflow вероятно зелёный (🟡 medium — последние 3 запуска green, но
> этот ещё не проверял)._
```

## When to label vs not

**Label when**:
- Stating time estimates (`5 минут`, `2 часа`)
- Making predictions (`будет работать`, `сломается`)
- Reporting status of things you didn't directly check
- Claiming causation (`X произошло потому что Y`)

**Don't label when**:
- Direct quote from tool output (already verified by reader)
- Self-evident facts (`файл существует` — Read returned its content)
- Obvious inferences from immediately-prior tool calls

## Anti-pattern: hedging language

❌ Don't sprinkle "I think" / "probably" / "maybe" everywhere — that's noise:
```
  Статус: Думаю наверное всё хорошо. Скорее всего pass. Возможно медленно.
```

✅ One explicit confidence label > five hedged sentences:
```
  Статус: Pass на CI (🟢 high). Производительность — ~200ms (🟡 medium,
          измерение из 3 запусков, не статистически значимо).
```

## Why this matters

Without labels, the reader can't tell:
- "Работает" = проверено или предположено?
- "Займёт 5 минут" = измерено или оценено?
- "Безопасно деплоить" = протестировано в staging или dry-run?

A 5-line report with confidence labels is more useful than a 50-line report without.
