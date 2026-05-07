---
name: forge-report
description: "Structured report formats for Claude — card-based, human-readable, no ASCII frame noise. Use when finishing a multi-step task (≥5 tool calls, ≥3 files modified, multi-task TaskList, or cross-system effects like git push/PR/deploy). Triggers on: report, summary, summarise, отчёт, итоги, завершение задачи, build complete, audit complete, deployment complete, decision recorded, incident resolved, migration done. Provides 5 templates (build/audit/decision/incident/migration), anchor conventions (section icons, plain-prose TL;DR, confidence labels), required sections (not-done, reversibility, drift-risks, next-steps), and 5 anti-patterns. Not for simple Q&A or single-file edits."
license: MIT
---

# forge-report — Card-based Structured Reports

A library of templates and conventions for finishing reports after multi-step tasks. **Designed to be readable by a human in 30 seconds**, not impressive to look at.

## Core philosophy

> **Cards over tables. Full sentences over labels. Plain prose TL;DR over one-liner.**

Reports are for the **reader**, not the author. If a reader has to decode `🟢 Pass` or `5/5 PASS` — the report failed.

## When to use this skill

Use when you finish a task that meets **≥2 of 4** criteria:

1. ≥5 tool calls in this turn
2. ≥3 files created or modified
3. TaskList with ≥3 items
4. Cross-system effect (git push, PR, deploy, external API call, secret added)

For smaller tasks → use plain prose. Don't over-report.

## How to use this skill (agentic RAG)

### Step 1 — Pick the right template

| Task type | Template file |
|---|---|
| Built/created something new | `01-templates/build-summary.md` |
| Reviewed/audited code | `01-templates/audit-summary.md` |
| Made a product/architecture decision | `01-templates/decision-summary.md` |
| Debugged / resolved incident | `01-templates/incident-summary.md` |
| Refactored / migrated something | `01-templates/migration-summary.md` |

### Step 2 — Read anchor conventions (once per session)

- `00-anchors/status-icons.md` — section icons only (✅ 📈 ⚪ 🔄 ⚠️ ➡️ 💰), not row decorations
- `00-anchors/tldr-format.md` — TL;DR as a plain sentence-or-paragraph in italics, not a code block
- `00-anchors/confidence-levels.md` — when to mark High/Medium/Assumed (used inline, sparingly)

### Step 3 — Required sections (always present)

| Section | Heading | Why |
|---|---|---|
| TL;DR | (no heading, italic prose at top) | Reader scans first 2-3 sentences |
| What's done | `## ✅ Что сделано` | Card per artefact |
| What's NOT done | `## ⚪ Что не сделано — намеренно` | Confirms boundaries |
| Reversibility | `## 🔄 Что можно откатить` | Trust + safety |
| Drift risks | `## ⚠️ Что может поломаться со временем` | Future maintenance |
| Next steps | `## ➡️ Что делать дальше` | Pickup pointer with addressee |
| Cycle metadata | `## 💰 Сколько это стоило` | Cost/effort transparency |

### Step 4 — Card format (the key change)

Every "thing" in a report is a **card**, not a table row. A card has explicit field labels:

```
  Что:    <human-readable name of the artefact>
  Где:    <path or URL>
  Зачем:  <1-2 sentences explaining purpose for someone who didn't follow the work>
  Статус: <full sentence — "Готов и работает", not "🟢 Pass">
```

Cards are separated by a thin horizontal line:
```
  ───────────────────────────────────────────────────────────────
```

**Why cards beat tables**: tables force every row into the same columns. Some artefacts need 4 fields, some need 6. Cards adapt. Plus reader's eye doesn't get lost in column 3 of row 7.

### Step 5 — Avoid anti-patterns

Before sending, scan against `03-anti-patterns/`:

- `wall-of-text.md` — break prose into cards
- `over-reporting.md` — small tasks don't need full reports
- `duplicate-info.md` — say it once
- `ascii-frames.md` — no `═══ Section ═══` rectangles, use clean `##` headings + thin lines
- `label-less-data.md` — never columns of numbers without explicit labels

## Quick template skeleton

```markdown
> _<TL;DR as plain italic sentence — what changed, what user needs to do,
> one risk if any. 1-3 sentences, natural English. No code block.>_

## ✅ Что сделано

  Что:    <Artefact name>
  Где:    <path>
  Зачем:  <Purpose for someone who didn't follow the work>
  Статус: <Full sentence with context>
  ───────────────────────────────────────────────────────────────
  Что:    <Next artefact>
  Где:    <path>
  ...

## 📈 Что обновлено

  Файл:  <path>
  Было:  <old value>
  Стало: <new value + brief explanation>
  ───────────────────────────────────────────────────────────────
  ...

## ⚪ Что не сделано — намеренно

  Не сделано: <Item>
  Почему:     <Reason — if "out of scope" then say so explicitly>
  ───────────────────────────────────────────────────────────────
  ...

## 🔄 Что можно откатить если передумаешь

  Действие: <What to undo>
  Команда:  <copy-paste command>
  Время:    <how long the undo takes>
  Риски:    <what might go wrong, or "Никаких">
  ───────────────────────────────────────────────────────────────
  ...

## ⚠️ Что может поломаться со временем

  Риск:   <Specific drift risk, not theoretical>
  Когда:  <Trigger condition — date, event, action>
  Что:    <What breaks if trigger fires>
  Защита: <How to prevent or recover>
  ───────────────────────────────────────────────────────────────
  ...

## ➡️ Что делать дальше

  Шаг 1: <АДРЕСАТ> — <imperative action with context>
  Шаг 2: <АДРЕСАТ> — <imperative action>
  Шаг 3: <АДРЕСАТ> — <imperative action>

  (АДРЕСАТ ∈ ТЕБЕ / МНЕ / ПОТОМ / АВТОМАТУ)

## 💰 Сколько это стоило

  Время:        <wall clock>
  Действий:     <tool call count + brief category>
  Файлов:       <new + modified counts>
  Стоимость:    <retries / rollbacks / surprises if any>
```

## Cross-references

- Inside dev-toolkit: `/audit`, `/sprint`, `/recall` — sister utilities
- Marketplace: `forge-report` is the format other dev-toolkit commands should output to

## Versioning

This skill ships with `dev-toolkit`. Version moves together.
