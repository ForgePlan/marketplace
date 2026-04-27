# TL;DR Format

**TL;DR is the first thing the reader sees. It decides whether they read further.**

## Rules

1. **Position**: very top, before any heading.
2. **Length**: 1-3 lines, ≤80 characters per line. Exception: `incident-summary` may extend to 4 lines.
3. **Content**: what changed + what user must do (if anything) + 1 risk if any.
4. **Tense**: past for completed, present for state, imperative for actions.

## Format

```
TL;DR: <what changed in 1 line>. <action user needs OR "no action needed">.
       <one risk if applicable, omit otherwise>.
```

## Good examples

```
TL;DR: 3 PRD draft + NOTE-003 + Hindsight bank сохранены. Никаких действий не
       требуется. Готово к активации по триггеру (см. NOTE-003).
```

```
TL;DR: PR #24 merged, sync workflow зелёный. Установка ForgePlan/fpf и /loux
       работает через npx. Дрейф: NOTE-002 — обновить actions/checkout до сент.
```

```
TL;DR: Auth middleware добавлен, 12 тестов pass. Требуется secret JWT_SECRET
       в .env перед деплоем.
```

## Bad examples

```
❌ TL;DR: Я выполнил задачу, всё хорошо.
   (no specifics, no action, no risk)

❌ TL;DR: Создал файл src/auth/middleware.ts с функцией authenticate(),
   которая принимает токен из заголовка Authorization и проверяет его
   через jwt.verify используя секрет из process.env.JWT_SECRET, после
   успешной проверки устанавливает req.user и вызывает next(), а при
   ошибке возвращает 401.
   (это не TL;DR, это уже описание реализации)

❌ TL;DR: 🎉 Готово!
   (декорация без информации)
```

## When NOT to write TL;DR

- Простая Q&A («что такое X?»)
- Один tool call
- Уже короткий ответ (<10 строк)

В этих случаях TL;DR — оверхэд.
