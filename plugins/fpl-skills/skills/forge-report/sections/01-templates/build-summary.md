# build-summary — When you created something new

Use after building: a feature, a plugin, a workflow, a set of files, a new repo.

## Skeleton

```markdown
> _<TL;DR — what was built, current state, what user needs to do.
> 1-3 italic sentences in a blockquote.>_

## ✅ Что создано

  Что:    <Artefact name in human language>
  Где:    <path or URL>
  Размер: <e.g. "21 файл (1 router + 4 индекса + 16 страниц)">
  Зачем:  <Purpose for someone who didn't follow the work>
  Статус: <Full sentence — "Готов. Прошёл проверку.">
  ───────────────────────────────────────────────────────────────
  Что:    <Next artefact>
  Где:    <path>
  Зачем:  <Purpose>
  Статус: <Status>

## 📈 Что обновлено

  Файл:  <path>
  Было:  <old value>
  Стало: <new value + brief reason>
  ───────────────────────────────────────────────────────────────
  PR:    <PR number / URL>
  Что:   <one-line summary>
  CI:    <result + duration>
  Merge: <yes/no, who did it>

## ⚪ Что не сделано — намеренно

  Не сделано: <Item>
  Почему:     <Reason — out of scope / deferred / user's job>
  ───────────────────────────────────────────────────────────────
  ...

## 🔄 Что можно откатить если передумаешь

  Действие: <What to undo>
  Команда:  <copy-paste command>
  Время:    <how long undo takes>
  Риски:    <what might go wrong, or "Никаких">
  ───────────────────────────────────────────────────────────────
  ...

## ⚠️ Что может поломаться со временем

  Риск:   <Specific drift, not theoretical>
  Когда:  <Trigger condition>
  Что:    <What breaks>
  Защита: <Prevention or recovery>

## ➡️ Что делать дальше

  Шаг 1: ТЕБЕ — <imperative action with context>
  Шаг 2: ТЕБЕ — <imperative action>
  Шаг 3: ПОТОМ — <when X happens, do Y>

## 💰 Сколько это стоило

  Время:        ~<wall clock>
  Действий:     ~<tool call count>
  Файлов:       <new + modified counts>
  Стоимость:    <retries / rollbacks / surprises if any, or "Без откатов">
```

## Required minimums

- ✅ Blockquote TL;DR at top, italic prose, 1-3 sentences
- ✅ At least one card in **Что создано** OR **Что обновлено**
- ✅ All 5 mandatory sections present (use one card with `Не сделано: —` if none apply)
- ✅ Card fields use **full sentences**, not codes like `🟢 Pass`

## Real-world example

```markdown
> _Сделал новый skill `forge-report` для структурированных отчётов в плагине
> `dev-toolkit`. Плюс slash command `/report` и правило в `~/.claude/CLAUDE.md`.
> Всё работает, готово к использованию. Главное что нужно тебе — попробовать
> на реальной задаче._

## ✅ Что создано

  Что:    Skill «forge-report» — шаблоны структурированных отчётов
  Где:    plugins/dev-toolkit/skills/forge-report/
  Размер: 21 файл (1 главный SKILL.md + 4 индекса + 16 страниц)
  Зачем:  Чтобы Claude по завершении больших задач писал отчёты
          в едином формате — TL;DR, что сделано, что не сделано,
          что можно откатить, что в риске.
  Статус: Готов. Прошёл два раунда проверки (5 проблем найдено и исправлено).
  ───────────────────────────────────────────────────────────────
  Что:    Slash-команда /report
  Где:    plugins/dev-toolkit/commands/report.md
  Зачем:  Если автотриггер не сработал — пишешь /report
          и получаешь отчёт по последним действиям вручную.
  Статус: Готов.

## 📈 Что обновлено

  Файл:  plugins/dev-toolkit/.claude-plugin/plugin.json
  Было:  версия 1.4.0
  Стало: версия 1.5.0 (+1 команда, +1 skill)

## ➡️ Что делать дальше

  Шаг 1: ТЕБЕ — открой новую сессию и дай задачу с 3+ файлами.
                Если выйдет structured-отчёт — правило работает.
  Шаг 2: ТЕБЕ — через неделю оцени навязчивость, поправим триггер.
  Шаг 3: ПОТОМ — при активации PRD-014 добавить ссылку на forge-report.
```

## When NOT to use this template

- Modified single file → describe inline, no template
- Built something but didn't verify → use `incident-summary` (something went wrong)
- Built + decided architecture → use `decision-summary` (decision is bigger)
