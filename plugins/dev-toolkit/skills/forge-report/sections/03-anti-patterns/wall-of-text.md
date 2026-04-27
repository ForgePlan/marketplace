# Wall of text — Anti-pattern

Long flowing prose with no anchors, no tables, no structure.

## Why it's bad

Reader can't scan. Has to read every word to find the answer to "what changed" or "what should I do". Defeats the purpose of a report.

## Bad

```
В ходе работы над задачей я создал новый skill forge-report в плагине
dev-toolkit, который содержит SKILL.md как роутер и четыре секции:
00-anchors с тремя файлами status-icons, tldr-format и confidence-levels,
01-templates с пятью шаблонами для разных типов задач, 02-required-sections
с пятью обязательными блоками для всех отчётов и 03-anti-patterns с тремя
антипаттернами. Также добавил slash command /report и обновил версию
плагина до 1.5.0. Все файлы прошли валидацию. Следующий шаг — отправить
PR в маркетплейс и дождаться merge.
```

## Good

```
TL;DR: forge-report skill добавлен в dev-toolkit, 19 файлов, /report
       command, плагин bumped до v1.5.0. CI green. Готово к PR.

═══ ✅ Created ═══════════════════════════════════════════════════
  SKILL.md            plugins/dev-toolkit/skills/forge-report/
  00-anchors/         3 files (status-icons, tldr-format, confidence)
  01-templates/       5 files (build/audit/decision/incident/migration)
  02-required/        5 files (tldr, not-done, reversibility, drift, next)
  03-anti-patterns/   3 files (wall-of-text, over-reporting, duplicate)
  /report command     commands/report.md

═══ ➡️ Next steps ══════════════════════════════════════════════
  1. Open PR to marketplace
```

## How to fix

1. Identify the **3-5 facts** the user actually needs.
2. Put them in a **scannable structure** (table, bullet list, code block).
3. Cut everything else.
4. If you still have prose, ask: "would I want to read this if I weren't required to?"
