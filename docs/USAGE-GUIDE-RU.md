[English](USAGE-GUIDE.md) | [Русский](USAGE-GUIDE-RU.md)

# ForgePlan Marketplace — Руководство

Reference manual для маркетплейса. **Если ты новенький — стартуй с [DEVELOPER-JOURNEY-RU.md](DEVELOPER-JOURNEY-RU.md)** — 30-минутный walkthrough от нуля до первой зашипованной фичи. Этот гайд для lookup-а, не для онбординга.

## Содержание

- [Установка](#установка)
- [Рекомендуемые стеки (по персонам)](#рекомендуемые-стеки-по-персонам)
- [Quick reference (все команды)](#quick-reference-все-команды)
- [Daily workflow](#daily-workflow)
- [Правила активации агентов](#правила-активации-агентов)
- [Поведение хуков](#поведение-хуков)
- [Справка по плагинам](#справка-по-плагинам)
- [Troubleshooting](#troubleshooting)

---

## Установка

### Шаг 1 — Подключить маркетплейс (один раз на машину)

```
/plugin marketplace add ForgePlan/marketplace
```

> [!NOTE]
> Имя маркетплейса case-sensitive в командах install: `ForgePlan-marketplace` (заглавные F и P).

### Шаг 2 — Выбрать стек и установить

См. [Рекомендуемые стеки](#рекомендуемые-стеки-по-персонам) ниже. Большинству нужен:

```
/plugin install fpl-skills@ForgePlan-marketplace   # флагман — 15 команд, /fpl-init
/reload-plugins
```

### Шаг 3 — Развернуть проект

В корне проекта:

```
/fpl-init
```

End-to-end развёртка: `forgeplan init`, MCP wiring, CLAUDE.md, docs/agents/. Walkthrough — [DEVELOPER-JOURNEY-RU.md](DEVELOPER-JOURNEY-RU.md).

### Обновление

```
/plugin marketplace update ForgePlan-marketplace
/plugin install <plugin>@ForgePlan-marketplace   # переустановить чтобы подтянуть новую версию
/reload-plugins
```

---

## Рекомендуемые стеки (по персонам)

Зеркало матрицы «Where to Start?» из root [README-RU.md](../README-RU.md), с cross-link на per-persona Day 0 walkthroughs в [DEVELOPER-JOURNEY-RU.md](DEVELOPER-JOURNEY-RU.md).

| Персона | Стек | Day 0 walkthrough |
|---|---|---|
| 🟢 Forgeplan user / соло-dev | `fpl-skills` | [Соло-разработчик](DEVELOPER-JOURNEY-RU.md#-соло-разработчик) |
| 🎨 Frontend dev | `fpl-skills` + `laws-of-ux` + `agents-domain` | [Frontend-разработчик](DEVELOPER-JOURNEY-RU.md#-frontend-разработчик) |
| 🏛 Архитектор / тех-лид | `fpl-skills` + `fpf` + `agents-sparc` + `agents-pro` | [Архитектор / тех-лид](DEVELOPER-JOURNEY-RU.md#-архитектор--тех-лид) |
| 👥 Multi-session / команда | `fpl-skills` + `forgeplan-orchestra` | [Команда с Orchestra](DEVELOPER-JOURNEY-RU.md#-команда-с-orchestra) |
| 🏚 Brownfield миграция | `fpl-skills` + `forgeplan-brownfield-pack` | (См. README brownfield-pack — playbook recipes) |
| 🔧 Любой разработчик (без forgeplan) | `dev-toolkit` + `agents-core` | (Legacy стек — `dev-toolkit` soft-deprecated; предпочитай `fpl-skills` если можешь поставить forgeplan CLI) |

> [!IMPORTANT]
> `fpl-skills` требует CLI [`forgeplan`](https://github.com/ForgePlan/forgeplan) в `$PATH`. Если поставить не можешь — используй `dev-toolkit` (soft-deprecated, но поддерживается для обратной совместимости).

---

## Quick reference (все команды)

15 команд в 5 плагинах. `fpl-skills` даёт основу; companion-плагины добавляют специализированные команды.

### Из `fpl-skills` (флагман)

| Команда | Что делает |
|---|---|
| `/fpl-init` | One-shot развёртка проекта — forgeplan init + MCP wiring + CLAUDE.md + docs/agents/. Idempotent. |
| `/restore` | Восстановление контекста сессии: ветка, dirty state, recent commits, stash, снипеты памяти. |
| `/briefing` | Обзор трекера — Orchestra/GitHub Issues/Linear/Jira или локальные TODO. |
| `/research <тема>` | Глубокое многоагентное исследование (5 параллельно: code · docs · status · references · memory) → `research/reports/`. |
| `/refine <план>` | Интервью-driven уточнение — терминология, противоречия, lazy-creates ADR. |
| `/rfc <action>` | Create/read/update RFC и ADR (каноничная структура, фазы). |
| `/sprint <фича>` | Wave-based execution со строгим file ownership; auto-detect Tactical/Standard/Deep. |
| `/audit` | Multi-expert ревью (≥4 ревьюера — logic, architecture, types, security; +ux-reviewer если установлен). |
| `/diagnose <баг>` | Дисциплинированный 6-фазный debug loop. Фаза 1 («построй feedback loop») — это весь скилл. |
| `/autorun <задача>` | Автопилот-оркестратор — research → sprint → audit → report end-to-end, без пауз на approval. |
| `/do <задача>` | Интерактивная версия `/autorun` (пауза на каждом шаге). |
| `/build` | Исполнение готового IMPLEMENTATION-PLAN.md из research-отчёта (wave-by-wave). |
| `/setup` | Интерактивный wizard — пишет `docs/agents/{issue-tracker,build-config,paths,domain}.md`. |
| `/bootstrap` | Универсальный CLAUDE.md template (stack-detected) в текущий проект. |
| `/team` | Фундамент multi-agent команд — TeamCreate vs sub-agents, file ownership, recipes. |

### Из companion-плагинов

| Команда | Плагин | Что делает |
|---|---|---|
| `/fpf` | fpf | Универсальный роутер: `/fpf decompose`, `/fpf evaluate`, `/fpf reason`, `/fpf lookup`. |
| `/fpf-decompose` | fpf | Bounded contexts, роли, интерфейсы. |
| `/fpf-evaluate` | fpf | F-G-R скоринг + ADI рассуждение. |
| `/fpf-reason` | fpf | 3+ гипотезы → проверка → вывод. |
| `/ux-review` | laws-of-ux | UX-аудит по 30 законам. |
| `/ux-law <name>` | laws-of-ux | Поиск конкретного UX-закона. |
| `/forge-cycle` | forgeplan-workflow | Узкий forgeplan-only цикл (альтернатива `/sprint` для forgeplan power-юзеров). |
| `/forge-audit` | forgeplan-workflow | 6-агентный forgeplan-aware аудит. |
| `/sync` | forgeplan-orchestra | Двунаправленная синхронизация Forgeplan ↔ Orchestra. |
| `/session` | forgeplan-orchestra | Session Start Protocol с Inbox Pattern. |

### Legacy команды (dev-toolkit, deprecated)

| Команда | Что делает |
|---|---|
| `/recall` | Заменена на `/restore` в fpl-skills. |
| `/audit`, `/sprint` | Те же имена что в fpl-skills — не ставь оба плагина одновременно. |
| `/report` | Card-based структурный отчёт (всё ещё полезен; ещё не портирован в fpl-skills). |

---

## Daily workflow

Полный lifecycle, прошитый сквозь команды `fpl-skills`:

```
Утро         → /restore (или /session если установлен Orchestra)
             → /briefing
Выбор задачи → forgeplan route "task"  (решение Tactical/Standard/Deep)
Discovery    → /research <тема>        (gap analysis, prior art)
             → /refine <план>          (уточнение)
             → /rfc create             (если Standard+, формализуем)
Execute      → /sprint <фича>          (интерактивно)
             → /do <задача>            (интерактивно с checkpoints)
             → /autorun <задача>       (ночной, без approval)
Verify       → /audit                  (multi-expert ревью)
             → /diagnose <баг>         (когда что-то сломалось)
Ship         → forgeplan new evidence "..." && forgeplan link && forgeplan score
             → forgeplan activate <id>
             → gh pr create
Конец дня    → memory_retain (если используешь Hindsight)
```

Worked example (`добавить аутентификацию` end-to-end) — см. [DEVELOPER-JOURNEY-RU.md § Day 1](DEVELOPER-JOURNEY-RU.md#day-1--первая-фича-добавить-auth).

---

## Правила активации агентов

Большинство агентов активируются по контексту — вручную звать не нужно.

| Триггер | Агент | Плагин |
|---|---|---|
| Файлы изменены без тестов | `dev-advisor` (предлагает тесты) | dev-toolkit / fpl-skills |
| `/sprint` детектит Deep задачу **и** установлен agents-sparc | `sparc-orchestrator` + `specification` + `pseudocode` + `architecture` + `refinement` | agents-sparc |
| `/audit` запущен **и** frontend-файлы в changeset **и** установлен laws-of-ux | `ux-reviewer` | laws-of-ux |
| Детектятся ключевые слова architecture/decision (например «decompose», «evaluate alternatives») | `fpf-advisor` (предлагает `/fpf`) | fpf |
| `forgeplan new` или `forgeplan activate` запущен **и** установлен forgeplan-orchestra | `orchestra-advisor` (предлагает `/sync`) | forgeplan-orchestra |
| Правка `.html`/`.css`/`.jsx`/`.tsx`/`.vue` | UX hint hook | laws-of-ux |
| Детектятся ключевые слова routing/evidence | `forge-advisor` | forgeplan-workflow |

Можешь и явно позвать конкретного агента:

> «Используй security-expert агента для review этого auth-кода»
> «Спавни typescript-pro для этого рефакторинга»
> «Запусти debugger агента на этот stack trace»

Подробности SPARC методологии (когда `agents-sparc` активируется внутри `/sprint`) — см. [ARCHITECTURE-RU.md § SPARC](ARCHITECTURE-RU.md#layer-4-sparc-structured-coding).

### Как `/audit` композит агентов

```
/audit
├─ logic            (встроенный)
├─ architecture     (встроенный)
├─ types            (встроенный)
├─ security         (встроенный)
├─ security-expert  (если установлен agents-pro)
├─ ux-reviewer      (если установлен laws-of-ux И changeset frontend)
└─ architect-review (если установлен agents-pro И изменения трогают архитектуру)
```

Базовые 4 ревьюера всегда работают. Дополнительные подключаются по установленным плагинам и содержимому changeset. Findings агрегируются, дедуплицируются и репортятся как CRITICAL / HIGH / MEDIUM / LOW с file:line ссылками.

---

## Поведение хуков

При установке нескольких плагинов их хуки стэкаются — каждый срабатывает независимо.

### Что когда срабатывает

| Event | Плагин | Хук | Что делает |
|---|---|---|---|
| `SessionStart` | fpl-skills | `session-start.sh` | Проверяет `.forgeplan/`, `docs/agents/`, `CLAUDE.md`; печатает context-aware подсказку (например «Run /fpl-init» для новых репо). |
| `PreToolUse:Bash` | dev-toolkit | `safety-hook.sh` | Блокирует `git push --force`, `git reset --hard`, `rm -rf /`, `DROP TABLE`. |
| `PreToolUse:Bash` | forgeplan-workflow | `forge-safety-hook.sh` | Делегирует в dev-toolkit hook если установлен; иначе запускает свои проверки. |
| `PreToolUse:Write\|Edit` | forgeplan-workflow | `pre-code-check.sh` | Предупреждает если нет активного PRD (cached, 5-min TTL). |
| `PostToolUse:Write\|Edit` | dev-toolkit | `test-hint.sh` | Предлагает тесты при добавлении новых публичных функций. |
| `PostToolUse:Write\|Edit` | laws-of-ux | `ux-hint.sh` | Предлагает UX-ревью при правке frontend-файлов. |
| `PostToolUse:Bash` | forgeplan-orchestra | `forge-sync-hint.sh` | Предлагает Orchestra sync после `forgeplan activate`/`new`. |

### Временное отключение хука

Хуки нельзя отключить per-session. Чтобы остановить — uninstall плагин:

```
/plugin uninstall <plugin-name>@ForgePlan-marketplace
```

---

## Справка по плагинам

Краткий обзор. Полные README — `plugins/<name>/README-RU.md`.

### `fpl-skills` — Флагманский workflow-плагин

15 инженерных скиллов поверх forgeplan lifecycle. **Заменяет `dev-toolkit` для пользователей forgeplan.** См. [plugins/fpl-skills/README-RU.md](../plugins/fpl-skills/README-RU.md).

**Требует**: CLI forgeplan в `$PATH`.

### `fpf` — First Principles Framework

Структурное мышление для decompose / evaluate / reason / lookup. 224 секции FPF спеки + 4 applied patterns. Пара к `/refine` и `/diagnose`. См. [plugins/fpf/README-RU.md](../plugins/fpf/README-RU.md).

**Требует**: ничего.

### `laws-of-ux` — Frontend UX-ревью

`/ux-review` по 30 законам UX. `ux-reviewer` агент авто-спавнится из `/audit` для frontend changeset. Auto-hint hook на правки `.html`/`.css`/`.jsx`/`.tsx`/`.vue`. См. [plugins/laws-of-ux/README-RU.md](../plugins/laws-of-ux/README-RU.md).

**Требует**: ничего.

### `forgeplan-workflow` — Forgeplan-only цикл

`/forge-cycle` и `/forge-audit` — узкий forgeplan-only loop. Альтернативный entry point если broader bundle fpl-skills не нужен. См. [plugins/forgeplan-workflow/README-RU.md](../plugins/forgeplan-workflow/README-RU.md).

**Требует**: CLI forgeplan.

### `forgeplan-orchestra` — Multi-session координация

`/sync` (Forgeplan ↔ Orchestra) и `/session` (Inbox Pattern). Для team / multi-session работы. См. [plugins/forgeplan-orchestra/README-RU.md](../plugins/forgeplan-orchestra/README-RU.md).

**Требует**: CLI forgeplan + Orchestra MCP сервер.

### `forgeplan-brownfield-pack` — Legacy ингест

Mappings + playbooks для brownfield миграции (Obsidian, MADR, ad-hoc markdown → forgeplan граф). Композит `c4-architecture`, `autoresearch`, `ddd-expert`, `feature-dev`. См. [plugins/forgeplan-brownfield-pack/README-RU.md](../plugins/forgeplan-brownfield-pack/README-RU.md).

**Требует**: CLI forgeplan v0.25+.

### `dev-toolkit` — Универсальный тулкит (deprecated)

> [!CAUTION]
> Soft-deprecated, superseded by `fpl-skills`. Существующие установки продолжают работать; новые лучше на `fpl-skills` если есть CLI forgeplan.

`/audit`, `/sprint`, `/recall`, `/report`, `dev-advisor` агент, safety hook, test reminder. См. [plugins/dev-toolkit/README-RU.md](../plugins/dev-toolkit/README-RU.md).

**Требует**: ничего.

### Agent packs (5 плагинов, 55 агентов)

Специализированные сабагенты, которые `/audit`, `/sprint` и другие команды композят при необходимости.

| Пак | Агентов | Фокус |
|---|:---:|---|
| `agents-core` | 11 | Debugger, code-reviewer, planner, tester, TDD, production-validator |
| `agents-domain` | 11 | TypeScript, Go, React, Next.js, Electron, mobile, WebSocket |
| `agents-pro` | 21 | Security, architecture, DDD, creative, research, infrastructure |
| `agents-github` | 7 | PR, issues, releases, multi-repo, project boards, workflows |
| `agents-sparc` | 5 | SPARC методология — orchestrator + 4 phase specialists |

Ставь только то что используешь. `/audit` и `/sprint` автоматически подхватывают любые установленные паки.

---

## Troubleshooting

### Плагины не подгружаются после install

```
/reload-plugins
/doctor          # проверить ошибки
```

### Marketplace «not found» в CLI

Точный регистр: `ForgePlan-marketplace` (заглавные F и P). CLI case-sensitive.

```bash
# Неверно:
claude plugin marketplace update forgeplan-marketplace

# Верно:
claude plugin marketplace update ForgePlan-marketplace
```

### `/fpl-init` отказывается с «forgeplan CLI is required»

Поставь CLI:

```bash
brew install ForgePlan/tap/forgeplan
# Или:
cargo install --git https://github.com/ForgePlan/forgeplan forgeplan-cli

# Проверь:
forgeplan --version
```

После установки — снова `/fpl-init`.

### `/fpl-init` пишет «this is a plugin source — refuse»

Ты внутри marketplace-репо или директории плагина. `/fpl-init` для проектных репо, не для plugin-authoring. Перейди в реальный проект и повтори.

### `/fpl-init` already-initialized но хочу пере-сделать CLAUDE.md

Удали `CLAUDE.md` (остальные baseline файлы оставь) и снова `/fpl-init`. Он детектит только отсутствующее и запускает только нужные шаги.

### Установлены оба `dev-toolkit` и `fpl-skills` — дубль `/audit` и т.д.

Плагины пересекаются на `/audit` и `/sprint`. Удали один:

```
/plugin uninstall dev-toolkit@ForgePlan-marketplace
```

Существующие пользователи dev-toolkit могут продолжать им пользоваться — но для новых проектов предпочитай `fpl-skills`.

### `forgeplan health` показывает stubs / orphans / duplicates

Это pre-existing артефакты в твоём `.forgeplan/`, требующие внимания. См. `forgeplan deprecate <id>` и `forgeplan supersede <id> --by <new-id>`. Не auto-fix-и без явной задачи.

### Хуки слишком шумные

Если вывод хука раздувает сессию:

1. Обнови плагины до последней версии (`marketplace update` + reinstall).
2. Если конкретный hook нежелателен — uninstall его plugin-родителя.

Хуки не конфигурируются per-session — отключение = uninstall.

### Нужно обновиться после bump каталога

```
/plugin marketplace update ForgePlan-marketplace
/plugin install fpl-skills@ForgePlan-marketplace   # переустановить чтобы получить новую версию
/reload-plugins
```

Для конкретных плагинов — замени `fpl-skills` на имя плагина.

---

## См. также

- [DEVELOPER-JOURNEY-RU.md](DEVELOPER-JOURNEY-RU.md) — narrative-онбординг (стартуй здесь если новенький).
- [ARCHITECTURE-RU.md](ARCHITECTURE-RU.md) — 4-layer ментальная модель (Orchestra, Forgeplan, FPF, SPARC).
- [CONTRIBUTING.md](../CONTRIBUTING.md) — добавление нового плагина в маркетплейс.
- [CHANGELOG.md](../CHANGELOG.md) — история релизов.
- README плагинов в `plugins/<name>/README-RU.md`.
- `plugins/fpl-skills/skills/bootstrap/resources/guides/CLAUDE-MD-GUIDE.ru.md` — CLAUDE.md best practices.
- `plugins/fpl-skills/skills/bootstrap/resources/guides/FORGEPLAN-SETUP.md` — `.forgeplan/` setup contract.
