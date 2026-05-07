# Section Icons — One Per Heading, Not Per Row

**Icons live in section headings only.** Decoration of every row makes reports visually noisy and hard to scan.

## The 7 section icons

Use one of these **only as the second character of an `## h2` heading** (e.g. `## ✅ Что сделано`):

| Icon | Section meaning | Example heading |
|------|-----------------|-----------------|
| ✅ | Things you created / accomplished | `## ✅ Что сделано` |
| 📈 | Things you modified / updated | `## 📈 Что обновлено` |
| ⚪ | Things explicitly not done (boundaries) | `## ⚪ Что не сделано — намеренно` |
| 🔄 | Reversibility / rollback | `## 🔄 Что можно откатить если передумаешь` |
| ⚠️ | Drift risks / future warnings | `## ⚠️ Что может поломаться со временем` |
| ➡️ | Next steps for the reader | `## ➡️ Что делать дальше` |
| 💰 | Cycle cost / metadata | `## 💰 Сколько это стоило` |

## Rules

1. **Exactly one icon per heading.** No `## ✅⚠️ Done with risks`.
2. **Never inside cards.** The card body is plain text; icons are reserved for the heading above.
3. **No new icons.** If you want to invent ❌ or 🔥 — restructure into one of the 7 sections instead.
4. **Plain bullet lists never get icons.** Use `-` or numbered `1.` for items, never `✅` for "this item is done".

## Why row-level icons fail

❌ Bad — visual noise, eye loses anchors:
```
## Что сделано
  ✅ skill создан       
  ✅ command добавлен   
  ✅ PR замержен        
  ⚠️ smoke не пройден   
```

✅ Good — section icon labels the category, items inside are full sentences:
```
## ✅ Что сделано
  Что: forge-report skill (готов, проверен)
  Что: /report command (готов)
  Что: PR #26 (замержен)

## ⚠️ Что может поломаться
  Риск: smoke test не сделан — нужна реальная задача для проверки
```

## Confidence labels — separate system

Confidence (🟢 High / 🟡 Medium / 🔴 Assumed) is documented in `confidence-levels.md`. Use confidence labels **inline in card values**, never as section headings or row decorations:

```
  Статус: Готов и проверен на CI (🟢 high — gh pr view confirmed merged)
```

NOT:
```
  🟢 Статус: Готов
```
