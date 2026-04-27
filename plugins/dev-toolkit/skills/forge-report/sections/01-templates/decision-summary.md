# decision-summary — When you made and recorded a product/architecture decision

Use after: choosing between alternatives, recording an ADR, fixing a roadmap, prioritising backlog.

## Skeleton

```markdown
> _<TL;DR — decision in one sentence, why now, when to revisit.
> 1-3 italic sentences.>_

## 🎯 Решение

  Выбрали:    <chosen option>
  Альтернативы: <what was rejected and why — 1-2 lines per option>
  Триггер:    <what forced this decision>

## 📊 Почему выбрали именно это

  Опция: <chosen>
  Плюсы: <list>
  Минусы: <list>
  Оценка: Выбрана
  ───────────────────────────────────────────────────────────────
  Опция: <alternative>
  Плюсы: <list>
  Минусы: <list>
  Оценка: Отклонена — <reason>

## ✅ Где зафиксировано

  Что:    <ADR-NNN / NOTE-NNN / PRD-NNN>
  Где:    <file path>
  Связи:  <linked to PRD-X / blocks PRD-Y>

## ⚪ Что не решено — отложили

  Открытый вопрос: <Question>
  Когда вернёмся:  <Trigger or date>

## 🔄 Что можно откатить

  Действие: Отменить решение через новый ADR/PRD с supersedes
  Команда:  forgeplan new adr "<reverse decision>"
  Время:    ~15 минут
  Риски:    Если уже сделали что-то по этому решению — нужен rollback кода

## ⚠️ Что может поломаться со временем

  Риск:   Если изменится X
  Когда:  При условии Y
  Что:    Решение теряет силу
  Защита: Пересмотреть decision

## ➡️ Что делать дальше

  Решение зафиксировано, но действие пока не запущено. Запускать когда:
  - <triggering condition 1>
  - <triggering condition 2>

  Или, если действие нужно сразу:
  Шаг 1: ТЕБЕ — <imperative action>
  Шаг 2: МНЕ — <imperative action>

## 💰 Сколько это стоило

  Время:        <how long>
  Артефактов:   <created count>
  Обсуждений:   <turns>
```

## Required minimums

- ✅ Blockquote TL;DR with decision + revisit trigger
- ✅ At least 2 alternatives in trade-off cards (if only 1 considered → reframe as "no real choice")
- ✅ "Где зафиксировано" — link to durable artefact (ADR/NOTE/PRD), not just chat
- ⚪ Drift risks — what would invalidate this decision?

## Real-world example

This very report (the conversation about saving 3 PRD drafts as roadmap) is a `decision-summary`:

```markdown
> _Зафиксировал три PRD-черновика (013/014/015) и NOTE-003 с roadmap.
> Активировать по триггерам, не вслепую. Главный риск: PRD-015 (cc-best)
> станет неактуальным к Q3 2026 если откладывать._

## 🎯 Решение
  Выбрали:    Делать все 3 standalone skills, в порядке 014→013→015
  Альтернативы: Делать только 1 / Не делать
  Триггер:    User explicit: "буду делать всё, но сперва зафиксировать"

## ✅ Где зафиксировано
  Что:    PRD-013, PRD-014, PRD-015 — drafts
  Что:    NOTE-003 — strategic roadmap (active)
```

## When NOT to use

- Decided alone, no alternatives existed → announce inline
- Decision affects only this turn → context evaporates anyway
- Already recorded by tool — link, don't duplicate
