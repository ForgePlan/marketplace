# incident-summary — When you debugged or resolved an incident

Use after: production incident, failing test investigation, mysterious bug fix, broken pipeline.

## Skeleton

```markdown
> _<TL;DR — symptom, root cause, fix, prevention. Up to 4 italic sentences
> for incidents because all 4 facts usually need stating.>_

## 🔥 Что случилось

  Симптом:     <What user/system saw>
  Когда:       <timestamp / commit / version>
  Серьёзность: <P0 outage / P1 degraded / P2 cosmetic>
  Как нашли:   <alert / user report / spotted>

## 🔍 Корневая причина

  <One paragraph: what actually broke and why>

  Уверенность: High / Medium / Assumed
  Доказательство: <log line / commit / test that confirms>

## ✅ Что починено

  Что:  <change applied>
  Где:  <file:line>
  Как:  <what was changed>
  ───────────────────────────────────────────────────────────────
  ...

## ✅ Как проверили что работает

  Проверка: Failing test now passes
  Результат: ✅
  ───────────────────────────────────────────────────────────────
  Проверка: Симптом не воспроизводится
  Результат: ✅
  ───────────────────────────────────────────────────────────────
  Проверка: Соседние тесты всё ещё green
  Результат: ✅

## ⚪ Что не сделано — намеренно

  Не сделано: <related issue not addressed>
  Почему:     <deferred to separate task>

## 🔄 Что можно откатить

  Действие: Откатить fix
  Команда:  git revert <commit>
  Время:    ~1 минута
  Риски:    Симптом вернётся — нужен alternative fix наготове
  ───────────────────────────────────────────────────────────────
  Действие: Workaround активен до даты X
  Когда:    <when proper fix lands>
  Что:     После этой даты workaround нужно убрать

## ⚠️ Что может поломаться со временем

  Риск:   Похожий код может появиться в новых features
  Когда:  Постоянно
  Что:    Тот же баг вернётся
  Защита: Lint правило / тест / runbook — см. «Профилактика»

## 🛡️ Профилактика

  Что добавили: <test / lint rule / CI check / runbook update>
  Где:          <path>
  Зачем:        <prevents recurrence>

  Если ничего: <explain why prevention impractical>

## ➡️ Что делать дальше — post-mortem

  Шаг 1: <АДРЕСАТ> — <action>     <due date>
  Шаг 2: <АДРЕСАТ> — <action>     <due date>

## 💰 Сколько это стоило

  Время до обнаружения: <minutes/hours>
  Время до фикса:       <minutes/hours>
  Действий:             <tool calls>
```

## Required minimums

- ✅ Blockquote TL;DR — incidents may use up to 4 sentences (symptom + root cause + fix + prevention)
- ✅ Confidence label on root cause (often we *think* we know, but didn't fully verify)
- ✅ Verification ≠ "code compiles" — must reproduce + fail-then-pass
- ✅ Profilactica is **mandatory** — even if "no test possible, added runbook entry"
- ⚪ If incident is partially understood → say so explicitly, don't pretend full RCA

## Anti-patterns

- ❌ "Fixed it" without root cause — bug returns next sprint
- ❌ Verification = "deployed" — that's not verification
- ❌ No prevention → repeats
