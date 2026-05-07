# Wall of text — Anti-pattern

Long flowing prose with no anchors, no cards, no structure.

## Why it's bad

Reader can't scan. Has to read every word to find the answer to "what changed" or "what should I do". Defeats the purpose of a report.

## Bad

```
В ходе работы над задачей я создал новый skill forge-report в плагине
dev-toolkit, который содержит SKILL.md как роутер и четыре секции:
00-anchors с тремя файлами status-icons, tldr-format и confidence-levels,
01-templates с пятью шаблонами для разных типов задач, 02-required-sections
с пятью обязательными блоками для всех отчётов и 03-anti-patterns с пятью
антипаттернами. Также добавил slash command /report и обновил версию
плагина до 1.5.0. Все файлы прошли валидацию. Следующий шаг — отправить
PR в маркетплейс и дождаться merge.
```

## Good

```markdown
> _Создал skill `forge-report` в `dev-toolkit`. Версия плагина 1.5.0.
> Готово к PR в marketplace._

## ✅ Что сделано

  Что:    Skill «forge-report»
  Где:    plugins/dev-toolkit/skills/forge-report/
  Размер: 21 файл (1 router + 4 индекса + 16 страниц)
  Зачем:  Шаблоны структурированных отчётов
  Статус: Готов, валидация прошла

  Что:    /report slash command
  Где:    plugins/dev-toolkit/commands/report.md
  Зачем:  Явный вызов отчёта когда автотриггер не сработал
  Статус: Готов

## ➡️ Что делать дальше

  Шаг 1: МНЕ — открыть PR в marketplace
```

## How to fix

1. Identify the **3-5 facts** the user actually needs.
2. Put them in **cards** (not tables, not paragraphs).
3. Cut everything else.
4. If you still have prose, ask: "would I want to read this if I weren't required to?"

## Border case — explanations belong in prose

Some content is genuinely paragraphs of reasoning (architectural decisions, post-mortem analysis). For those, prose is correct — but **break it up** with subheadings every 3-5 sentences.
