# TL;DR — Plain Italic Sentence at the Top

**TL;DR is the first thing the reader sees. It must read like natural language, not like a status code.**

## Format

A blockquote with italic prose, 1-3 sentences. Position: very top, before any heading.

```markdown
> _<What changed in human language>. <What user needs to do or "no action needed">.
> <One risk or dependency if relevant.>_
```

That's it. No code block, no labels, no rigid template.

## Length

- **Most cases**: 1-2 sentences fit in 1-2 lines.
- **Long incidents** (`incident-summary`): up to 4 sentences allowed.
- **Word count**: aim for 30-60 words. Over 80 words → split or simplify.

## Good examples

```markdown
> _Сделал новый skill `forge-report` для структурированных отчётов в плагине
> `dev-toolkit`. Плюс slash command `/report` и правило в `~/.claude/CLAUDE.md`.
> Всё работает, готово к использованию. Главное что нужно тебе — попробовать
> на реальной задаче._
```

```markdown
> _PR #24 замержен, sync workflow зелёный. Установка `ForgePlan/fpf` и
> `ForgePlan/loux` через `npx skills add` теперь работает. Один риск:
> NOTE-002 напоминает обновить `actions/checkout` до сентября._
```

```markdown
> _Auth middleware добавлен, 12 тестов проходят. Перед деплоем нужен secret
> `JWT_SECRET` в `.env`._
```

## Bad examples

```markdown
> _Готово._
```
(no specifics, no action, no risk)

```markdown
> _Создал файл src/auth/middleware.ts с функцией authenticate(),
> которая принимает токен из заголовка Authorization и проверяет его
> через jwt.verify используя секрет JWT_SECRET..._
```
(too long — this is implementation detail, not summary)

```markdown
TL;DR: 21 files / 7 tasks / 1 PR / 0 errors
```
(no sentences — that's a status code, not a summary)

## When to skip TL;DR entirely

- Pure Q&A response (no actions taken)
- Single-file edit
- Response is already short (<10 lines)

In these cases, write the answer directly with no TL;DR overhead.
