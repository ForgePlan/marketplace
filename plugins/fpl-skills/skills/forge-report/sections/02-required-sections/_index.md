# 02-required-sections — Mandatory blocks for every report

These sections appear in **every** template under their canonical headings.
Their job is to surface what's normally invisible: boundaries, risks, future state.

## The 6 required sections

| # | Section heading (Russian) | What it answers | File |
|---|---|---|---|
| 1 | TL;DR (italic blockquote at top) | "What changed and what do I need to do?" | `tldr.md` |
| 2 | `## ⚪ Что не сделано — намеренно` | "Did you stay in scope?" | `not-done.md` |
| 3 | `## 🔄 Что можно откатить если передумаешь` | "Can I undo this safely?" | `reversibility.md` |
| 4 | `## ⚠️ Что может поломаться со временем` | "What watches do I need on this?" | `drift-risks.md` |
| 5 | `## ➡️ Что делать дальше` | "What's next, and who does it?" | `next-steps.md` |
| 6 | `## 💰 Сколько это стоило` | "How much effort did this take?" | (in template skeleton) |

Plus the type-specific body (Что создано / Что обновлено / Корневая причина / etc.) per template.

## Why "required" matters

Optional sections get skipped, then forgotten. **Mandatory sections force the author to think about them**, even if the answer is "Не сделано: —".

A 3-line "Не сделано: ничего намеренно не пропущено" is more useful than silence — it confirms the author *thought* about boundaries.

## Compactness rule

Required sections should be compact:
- TL;DR: 1-3 sentences
- Не сделано: 1-3 cards
- Откатить: 1-2 cards
- Поломается: 1-3 cards
- Что дальше: 2-5 numbered steps with addressee
- Стоимость: 4-5 lines

If a required section needs more — split into the type-specific body.
