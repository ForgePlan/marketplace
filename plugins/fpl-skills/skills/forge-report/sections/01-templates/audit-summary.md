# audit-summary — When you reviewed/audited

Use after: code review, security audit, architecture review, dependency check, performance audit.

## Skeleton

```markdown
> _<TL;DR — what was audited, severity breakdown, top action.
> 1-3 italic sentences.>_

## 📊 Что и как проверено

  Что проверял:  <files / modules / services>
  Метод:         <static analysis / manual review / tool used>
  Время:         <how long>
  Уверенность:   <High / Medium / Assumed — based on coverage>

## ❌ Критичные проблемы

  Проблема: <What's wrong>
  Где:      <file:line>
  Эффект:   <What breaks if not fixed>
  Что делать: <action>
  ───────────────────────────────────────────────────────────────
  ...

## ⚠️ Серьёзные (high-priority)

  Проблема: <What's wrong>
  Где:      <file:line>
  Эффект:   <Impact>
  Что делать: <action>

## 📈 Средние и низкие

  <count by severity, link to detailed findings file if many>

## ✅ Что сделано хорошо

  <Aspect 1 — what's well-done, not just problems>
  <Aspect 2>

## ⚪ Что не проверял — намеренно

  Не проверял: <Item>
  Почему:      <Out of scope / separate review needed>

## 🔄 Что можно откатить

  Действие: Удалить этот аудит-отчёт
  Команда:  rm <path>
  Время:    Мгновенно
  Риски:    Никаких — аудит read-only, ничего в коде не менялось

## ⚠️ Что может поломаться со временем

  Риск:   Findings устаревают по мере изменения кода
  Когда:  Через 1-2 спринта
  Что:    Этот отчёт станет неактуальным
  Защита: Перепрогнать аудит при следующем major release
  ───────────────────────────────────────────────────────────────
  Риск:   Области не покрыты этим аудитом могут регрессировать
  Когда:  Постоянно
  Что:    Возможно скрытые проблемы в untouched зонах
  Защита: Расширить scope в следующий раз — см. секцию «не проверял»

## ➡️ Что делать дальше

  Сейчас (P0):    <fix критичных>
  Этот спринт (P1): <fix серьёзных>
  В беклог (P2+): <medium/low в тикеты>

## 💰 Сколько это стоило

  Время:    <how long>
  Файлов:   <reviewed count>
  Findings: <total count>
```

## Required minimums

- ✅ Blockquote TL;DR with severity breakdown (e.g. "5 критичных, 17 серьёзных")
- ✅ At least one item in **Что сделано хорошо** — pure-negative audits feel hostile
- ✅ Confidence label on overall audit (small sample = lower confidence)
- ⚪ "Что не проверял" is mandatory — defines audit boundary

## Anti-patterns

- ❌ Listing only problems — appears hostile, misses what to preserve
- ❌ No severity → reader can't prioritise
- ❌ "Audited everything" — usually false; declare scope explicitly
