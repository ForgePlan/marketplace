[English](README.md) | [Русский](README-RU.md)

# fpl-skills

> Флагманский workflow-плагин экосистемы [ForgePlan](https://github.com/ForgePlan/forgeplan). Одна установка — 15 инженерных скиллов, построенных поверх forgeplan-артефактов.

Поставь `fpl-skills` + CLI `forgeplan` — и у тебя весь цикл **route → shape → build → audit → activate** в одном плагине. Заменяет старый `dev-toolkit` (мягко-deprecated).

> [!WARNING]
> Требуется CLI [`forgeplan`](https://github.com/ForgePlan/forgeplan) в `$PATH`. Установка: `brew install ForgePlan/tap/forgeplan` или `cargo install --git https://github.com/ForgePlan/forgeplan forgeplan-cli`.

## Quick Start

```bash
/plugin install fpl-skills@ForgePlan-marketplace   # установить
/fpl-init                                          # развернуть проект (одной командой)
/restore                                           # в любой следующей сессии
```

Полный walkthrough пустого репо → готового проекта см. [`GETTING-STARTED.md`](./GETTING-STARTED.md).

## Примеры использования

### `/fpl-init` — развёртка проекта одной командой

```
> /fpl-init

fpl-init plan for my-new-project:
  • forgeplan init                    ← .forgeplan/ отсутствует
  • wire .mcp.json                    ← добавить forgeplan MCP server
  • wire .claude/settings.json        ← добавить forgeplan PreToolUse safety hook
  • /bootstrap                        ← создать CLAUDE.md из шаблона (stack-detected)
  • /setup                            ← интерактивный wizard для docs/agents/

Companion plugins to consider after (NOT installed by this command):
  fpf, agents-core, forgeplan-workflow, forgeplan-orchestra
  laws-of-ux (only if this repo has frontend)

Proceed? [y/n]
```

End-to-end с одним подтверждением. Завершается верификацией через `forgeplan health` и блоком «Next steps».

### `/research` — глубокое многоагентное исследование

```
> /research streaming uploads vs presigned URLs

Spawning 5 parallel agents...

Code         ████████████  4 findings   (existing upload paths in src/api/)
Docs         ██████░░░░░░  2 findings   (no ADR yet — design space open)
Status       ████████░░░░  3 findings   (issue #87, RFC-014 in flight)
References   ████████████  6 findings   (S3, GCS, Cloudflare R2 patterns)
Memory       ██████░░░░░░  2 findings   (prior decision in PRD-024)

Synthesis written to research/reports/uploads/REPORT.md
Next: /refine to lock terminology, then /rfc create
```

### `/audit` — многоэкспертный code review

```
> /audit

Launching reviewers (4 base + ux-reviewer because this PR touches frontend)...

Logic           ████████░░  3 findings
Architecture    ████████████  0 findings
Types           ██████████  2 findings (1 HIGH)
Security        ████████░░  4 findings
UX              ██████░░░░  2 findings (Hick's Law on the new menu)

11 findings: 1 HIGH, 5 MEDIUM, 5 LOW
Fix HIGH issues now? [y/n]
```

## Что в комплекте

| Компонент | Описание |
|-----------|----------|
| `/fpl-init` | Развёртка одной командой: forgeplan init, MCP wiring, CLAUDE.md, docs/agents/. Стартуй с этого. |
| `/research` | 5 параллельных агентов (code · docs · status · references · memory) → `research/reports/`. |
| `/refine` | Интервью-driven уточнение планов/RFC — терминология, противоречия, ADR/CONTEXT.md по ходу. |
| `/rfc` | Создание / чтение / обновление RFC и ADR (каноничная структура, фазы, формат). |
| `/sprint` | Wave-based execution фичи со строгим file ownership и зависимостями между волнами. |
| `/audit` | Multi-expert code review (≥4 ревьюера — logic, architecture, types, security; +ux-reviewer если установлен). |
| `/diagnose` | Дисциплинированный 6-фазный debug loop. Фаза 1 («построй feedback loop») — это весь скилл. |
| `/autorun` | Автопилот-оркестратор — research → sprint → audit → report end-to-end. Для ночных прогонов. |
| `/do` | Интерактивная версия `/autorun` (пауза-подтверждение на каждом шаге). |
| `/build` | Исполнение готового IMPLEMENTATION-PLAN.md из research-отчёта (wave-by-wave). |
| `/restore` | Восстановление контекста сессии из git + working copy + (опционально) долгосрочной памяти. |
| `/briefing` | Утренний briefing задач/сообщений из трекера (Orchestra/Linear/Jira/GitHub) или локальных TODO. |
| `/setup` | Интерактивный wizard конфигурации проекта (пишет `docs/agents/*.md`). |
| `/bootstrap` | Универсальный CLAUDE.md template в новый или существующий проект (stack-aware). |
| `/team` | Фундамент multi-agent команд — TeamCreate vs sub-agents, file ownership, recipes, cleanup. |
| **SessionStart hook** | Проверяет `.forgeplan/`, `docs/agents/`, `CLAUDE.md`, печатает context-aware подсказку следующего шага. |

## Интеграция с lifecycle

Все скиллы делегируют lifecycle артефактов в `forgeplan`:

| Фаза | Скилл | Что производит |
|------|-------|----------------|
| Observe | `/restore`, `/briefing`, SessionStart hook | Снапшот ветки/PR, обзор трекера, blind-spot dashboard |
| Route | `/fpl-init`, `/setup` | Решение о глубине (Tactical/Standard/Deep/Critical) |
| Shape | `/refine`, `/rfc`, `/research` | Драфты PRD, RFC, ADR, Evidence |
| Build | `/sprint`, `/build`, `/do`, `/autorun`, `/team` | Реализация с file-ownership и волнами |
| Prove | `/audit`, `/diagnose` | Multi-expert ревью, 6-фазный debug evidence |
| Ship | (forgeplan CLI напрямую) | `forgeplan activate <id>`, `gh pr create` |

## Сопутствующие плагины

`/fpl-init` печатает install-команды, **не запускает** — пользователь решает сам:

| Плагин | Когда ставить |
|---|---|
| [`fpf`](../fpf/) | First Principles Framework — пара к `/refine` и `/diagnose` для генерации гипотез. |
| [`agents-core`](../agents-core/) | 11 базовых сабагентов — `/audit` и `/sprint` подхватывают их если установлены. |
| [`forgeplan-workflow`](../forgeplan-workflow/) | Узкий forgeplan-only цикл через `/forge-cycle` и `/forge-audit`. Совместим с fpl-skills. |
| [`forgeplan-orchestra`](../forgeplan-orchestra/) | Координация мульти-сессионной работы через `/sync` и `/session`. |
| [`laws-of-ux`](../laws-of-ux/) | Frontend-ревьюер — `/audit` спавнит `ux-reviewer` если PR трогает UI. |
| [`dev-toolkit`](../dev-toolkit/) | **Deprecated**, superseded by `fpl-skills`. Не ставь оба. |

## Resource гайды

Два reference-документа в плагине (`skills/bootstrap/resources/guides/`):

- [`CLAUDE-MD-GUIDE.ru.md`](skills/bootstrap/resources/guides/CLAUDE-MD-GUIDE.ru.md) — почему `CLAUDE.md` структурирован именно так (U-curve attention, ≤7 red lines, primacy/reference/recency зоны).
- [`FORGEPLAN-SETUP.md`](skills/bootstrap/resources/guides/FORGEPLAN-SETUP.md) — каноничный `.forgeplan/` setup-contract: gitignore, секреты (12-factor pattern с `api_key_env`), env var overrides, anti-patterns.

## Credits

Построен поверх [`forgeplan`](https://github.com/ForgePlan/forgeplan) и [Claude Code](https://claude.com/claude-code) plugin v2 schema. Скиллы частично адаптированы из [mattpocock/skills](https://github.com/mattpocock/skills) (engineering/diagnose, engineering/grill-with-docs).

## License

MIT
