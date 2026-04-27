# `## ➡️ Что делать дальше` — Required section

Tell the reader: **what should happen next, in what order, by whom**.

## Why this matters

The end of one task is rarely the end of the work. Without explicit next-steps:
- User has to re-derive context to figure out what to do
- Future-you (in next session) doesn't know where to pick up
- Hand-offs break at agent/team boundaries

This section is the **pickup pointer** for resumption.

## Format

Numbered list with explicit addressee:

```markdown
## ➡️ Что делать дальше

  Шаг 1: <АДРЕСАТ> — <imperative action with context>
  Шаг 2: <АДРЕСАТ> — <imperative action>
  Шаг 3: <АДРЕСАТ> — <imperative action>
```

## Addressee values

| Addressee | When |
|---|---|
| `ТЕБЕ` | User must do this — typically verification, manual step, decision |
| `МНЕ` | Claude/AI does this in the next message — typically continuation |
| `ПОТОМ` | Conditional — when X happens, do Y |
| `АВТОМАТУ` | CI / cron / hook will do this — no human action needed |

## Concrete examples

```markdown
## ➡️ Что делать дальше

  Шаг 1: ТЕБЕ — открой новую сессию Claude (любой проект)
                и дай задачу с 3+ файлами или 5+ действиями.
                Если выйдет structured-отчёт — правило работает.

  Шаг 2: ТЕБЕ — через неделю реального использования оцени:
                • Не раздражает ли отчёт на средних задачах?
                • Не пропускает ли важные?

  Шаг 3: ПОТОМ — когда возьмёмся за PRD-014 (agentic-rag),
                добавить туда ссылку на forge-report как живой пример.
```

## When OK to skip this section

If task is **fully self-contained and final** AND nothing requires follow-up:
- Standalone Q&A
- Simple lookup
- Confirmation-only response

Then skip. But check honestly — most tasks have at least "verify it worked".

## Pickup pointer for future sessions

If the report will outlive the conversation, the last step should be a session-pickup line:

```markdown
  Шаг N: ПОТОМ — в новой сессии открой NOTE-003 → see roadmap → pick PRD-014
```

A single line that lets a fresh Claude restart effectively.
