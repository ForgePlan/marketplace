[English](SMITH.md) | [Русский](SMITH-RU.md)

# Smith — мастер-оркестратор

> Эквивалент BMAD Master в экосистеме ForgePlan — агент Profile B-orchestrator, который читает состояние проекта, выбирает подходящую методологию под задачу и предлагает последовательность специалистов для dispatch. Smith никогда не пишет код и не активирует артефакты — он маршрутизирует и рекомендует.

Smith живёт в `plugins/agents-pro/agents/smith.md` (сам агент) плюс `plugins/fpl-skills/skills/smith/` (мозг с 12 контекстами) и доступен из любого CLI, поддерживающего стандарт AGENTS.md.


> **Полный контекст**: для эталона процесса от идеи до реализации (5 ролей агентов, 10 типов артефактов, 4-слойный пайплайн, как smith вписывается в цикл) - см. [Process Reference (RU)](process-from-idea-to-delivery-RU.md) / [(EN)](process-from-idea-to-delivery-EN.md).

---

## Быстрый старт

```bash
# Установка
/plugin marketplace add ForgePlan/marketplace
/plugin install fpl-skills@ForgePlan-marketplace
/plugin install agents-pro@ForgePlan-marketplace
/reload-plugins

# Стартовое состояние — что у нас на руках
/smith                          # status + рекомендация

# Greenfield-онбординг чистого репо
/smith-bootstrap

# План под конкретную задачу
/smith-plan "добавь экспорт PDF в отчёты"

# Образовательный обход 12 строк маршрутизации
/smith-routing
```

`/smith` — стратегическая точка входа. Smith читает состояние (forgeplan_health, hindsight memory, git tree), классифицирует контекст и возвращает структурированный Plan: какие специалисты вызывать, в каком порядке, по какой методологии.

---

## Когда звать smith

- В начале сессии, когда непонятно «что дальше» — smith читает `forgeplan_health` и журнал, предлагает следующий шаг.
- На **свежем репозитории** без артефактов — `/smith-bootstrap` запускает greenfield-сценарий: Brief → PRD → первый ADR через строку greenfield routing-карты.
- Под **конкретную задачу любой глубины** — `/smith-plan <описание>`: smith подбирает строку из 12 контекстов, называет методологию и перечисляет последовательность диспатча.
- Чтобы **понять поверхность методологий** — `/smith-routing` показывает 12 контекстов + 27 карточек методологий без обязательства привязки к задаче.
- Когда штатные точки входа (`/forge-cycle`, `/autorun`) **не подходят** — кросс-контекстная работа, неясная глубина, нестыковка методологий. Smith сначала disambiguate-ит.
- Перед запуском **многоспринтового epic** — когда команде нужно договориться о primary-методологии и порядке диспатча до того, как написана первая строчка кода.
- **Триггерные фразы** (EN / RU): `smith`, `/smith`, `кузнец`, `что дальше`, `куда идём`, `возьми управление`, `scrum master`, `master orchestrator`, `captain mode`, `оркеструй`, `take charge`, `what's next`, `which methodology`, `какую методологию`.

> [!TIP]
> Smith — это «think before code» layer. Никаких изменений в исходниках, никаких `forgeplan_activate`. Только чтение и Plan.

**Когда smith НЕ нужен:**

- Тактический фикс в одну строку (typo, переименование ссылки) — делай сразу; smith избыточен для sub-Standard глубины. Строка 5 routing-карты явно обходит smith для тривиальных хотфиксов.
- Известный диспатч — если ты уже знаешь, какого агента вызывать (`adr-architect`, `specification`, `coder`), вызывай напрямую. Smith выбирает **какого**, а не заменяет.
- Активация артефакта — это работа оркестратора + `guardian`. Smith **никогда** не зовёт `forgeplan_activate`.

---

## 12 контекстов, которые smith маршрутизирует

Полная таблица с основной методологией, последовательностью диспатча и требованиями к evidence — в `plugins/fpl-skills/skills/smith/routing-map.md`. Краткая сводка:

| # | Контекст | Однострочник |
|---|---|---|
| 1 | Greenfield | Старт чистого проекта — BMAD-METHOD + Spec Kit |
| 2 | Brownfield | Модернизация legacy — Strangler Fig + DDD + ACL |
| 3 | Новая фича | Добавление возможности в существующий сервис — SPARC + Hexagonal |
| 4 | Прод-баг (нетривиальный) | Дисциплинированный RCA — RIPER-5 + 5 Whys |
| 5 | Тривиальный хотфикс | Тактический fast-path — typo, off-by-one, битая ссылка |
| 6 | Рефакторинг | Безопасная реструктуризация — Branch-by-Abstraction + Mikado |
| 7 | Архитектурное решение | Необратимый выбор — FPF ADI + ADR/MADR + C4 |
| 8 | Аудит безопасности | Покрытие угроз — OWASP Top 10 2025 + STRIDE/ASTRIDE |
| 9 | Аудит производительности | Falsifiable baseline — DORA + SRE + perf-budget |
| 10 | Продуктовый discovery (PDLC) | Что строить — JTBD + Lean + Double Diamond |
| 11 | Уборка техдолга | Sprint списания — A3 + Fishbone + ADR-supersede |
| 12 | Реакция на инцидент | Outage handling — Incident Command + blameless post-mortem |

Smith **выбирает ровно одну строку** на задачу — коктейли методологий запрещены. Если ситуация между двумя строками, smith эмитит сентинел `<<NEED_USER_INPUT>>` с ≥3 гипотезами на выбор строки (дисциплина FPF ADI по Sprint Z7 / PRD-059). Только в автономном incident-режиме, когда неоднозначность блокирует live-ответ, smith выбирает строку повыше по риску (brownfield > greenfield, audit > feature) и фиксирует отклонение в выходном Plan.

Правило одной строки спасает от классической ошибки — «смешаем BMAD + SPARC + Spec Kit чтобы покрыть всё» и получим артефакты, которые ни одно из трёх сообществ не признаёт своими.

---

## Методологии, которые smith знает

Двадцать семь методологий каталогизированы в `routing-map.md` карточками — определение в одно предложение, когда работает, когда НЕ использовать, ссылка на источник. Группы:

- **AI-coding workflows**: BMAD-METHOD, SPARC, RIPER-5, GitHub Spec Kit, FPF ADI (Abduction → Deduction → Induction).
- **Architecture lenses**: C4 Model, Domain-Driven Design, Event Storming, Clean Architecture, Hexagonal Architecture (Ports & Adapters), ADR / MADR.
- **Brownfield patterns**: Strangler Fig, Branch-by-Abstraction, Anti-Corruption Layer.
- **Root-cause / bug-fix**: 5 Whys, Fishbone (Ishikawa), A3 Problem Solving, Blameless post-mortem.
- **Security**: OWASP Top 10 2025, STRIDE, ASTRIDE (AI-specific threats).
- **Lifecycle / ops**: DORA metrics, SRE error-budgets, Incident Command System.
- **PDLC / product**: Jobs-To-Be-Done (JTBD), Lean Startup, Double Diamond.

Каждая строка routing-карты ссылается на одну основную методологию + 1–2 вторичных. Smith **никогда** не выдумывает комбинации, которых нет в таблице.

---

## Как smith работает внутри

1. **Intake** — читает намерение пользователя (свободный текст из `/smith-plan` или старт сессии), вызывает `forgeplan_health` + `forgeplan_session` для текущего состояния, выводит теги контекста (greenfield vs brownfield, глубина, срочность).
2. **Route** — сравнивает intake с 12 строками `routing-map.md`. При неоднозначности диспатчит FPF ADI (`forgeplan_reason`), чтобы предъявить ≥3 кандидатских строк + рекомендацию.
3. **Recommend** — эмитит структурированный Plan: выбранная строка, основная + вторичная методология, последовательность диспатча (имена агентов в порядке), требования к evidence по слоям S10–S13.
4. **Hand off** — оркестратор (сессия Claude Code, `/forge-cycle`, `/autorun` или живой человек) исполняет Plan. Smith **сам не диспатчит** агентов, если только его не попросили явно: роль Profile B-orchestrator — рекомендовать, а не мутировать state.

Пример выхода (сокращённо):

```text
Row chosen: 3 — New feature in existing service
Primary methodology: SPARC (Specification → Pseudocode → Architecture → Refinement → Completion)
Secondary: Hexagonal Architecture + JTBD framing
Dispatch sequence:
  1. brief-intake (Profile A) → Brief NOTE
  2. specification (Profile A) → PRD
  3. architecture (Profile A) → RFC
  4. goal-planner (Profile A) → task DAG
  5. coder (Profile C-coder) → source files
  6. code-reviewer (Profile B) → EVID with >=1 finding
  7. tester (Profile B) → tester EVID
  8. guardian (Profile B-gate) → activation verdict
Evidence required: PRD + ADI EVID (>=3 hypotheses) + BMAD EVID with >=1 finding + tester EVID
```

---

## Четыре пользовательских скила

`smith` поставляется как агент (`plugins/agents-pro/agents/smith.md`) плюс четыре скила в `fpl-skills`:

| Скил | Режим | Когда вызывать |
|---|---|---|
| `/smith` | default — status + recommend | старт сессии; «что дальше»; неясно куда |
| `/smith-bootstrap` | greenfield | свежий репо — Spec Kit + BMAD-онбординг |
| `/smith-plan <task>` | per-task plan | конкретная задача любой глубины — smith подбирает строку и эмитит Plan |
| `/smith-routing` | educational walkthrough | «по какой методологии делать X?» — обход routing-карты без коммитмента |

`/smith` принимает арги: `status` (только чтение), `bootstrap` (делегирует в `/smith-bootstrap`), `plan <task>` (делегирует в `/smith-plan`), `routing` (делегирует в `/smith-routing`), `handoff` (end-of-session summary).

> [!WARNING]
> Требует CLI [`forgeplan`](https://github.com/ForgePlan/forgeplan) в `$PATH` плюс плагины `fpl-skills` + `agents-pro` установленными.

---

## Дисциплина evidence

Smith рекомендует, но не активирует. Каждая строка routing-карты несёт собственный список требований к evidence, который оркестратор должен выполнить **до** вызова `forgeplan_activate`:

| Слой | Что требует | Где enforce |
|---|---|---|
| S10 — FPF design | ≥1 EVID с ≥3 гипотезами (ADI cycle) | `/forge-cycle` Step 4.5 + guardian Step 5 |
| S11 — BMAD quality gate | ≥1 Profile B EVID c непустой секцией `## Findings` | `/forge-cycle` Step 6.5 + guardian Step 5 |
| S12 — OpenSpec structure | DAG-связи + delta-spec (ADDED / MODIFIED / REMOVED / UNCHANGED) при supersede | adr-supersede template + `/supersede` + `/decay-watch` Step 2e |
| S13 — Forgeplan automation | hooks + agents + skills + MCP — wire-up через validate + score + activate | базовые гейты `validate-all-plugins.sh` |

Для архитектурных решений ≥3 модулей дополнительно auto-recommended C4-диаграммы (L1+L2) через `adr-architect` Step 5b.1 — это **ортогональное** расширение, не часть pipeline S10–S13.

Smith явно укажет в Plan, какие из этих evidence ещё не собраны. Если запустить `/methodology-check <ARTIFACT-ID>` после Plan, получишь per-слой отчёт с точечными action items.

---

## Кросс-CLI совместимость

Манифест smith описан в `AGENTS.md` корня репозитория — non-Claude-Code CLI (Codex, Gemini, Goose, Cursor) обнаруживают его через стандарт [agents.md](https://agents.md). Каждый CLI диспатчит smith через свой примитив:

- **Claude Code**: `Task(subagent_type="agents-pro:smith", ...)` через Agent-инструмент.
- **Gemini CLI**: эквивалентный диспатч через Gemini agent SDK; routing-карта подгружается через interop-директорию `.agents/skills/smith/`.
- **Codex CLI**: диспатч через примитив агента Codex; AGENTS.md читается нативно (`codex-rs/core/src/agents_md.rs`).
- **Goose / Cursor**: диспатч через их слой агентов; routing-карта — портативный Markdown.

Таблица 12 контекстов **CLI-agnostic** — она называет методологии и роли Profile-A/B/C/D, а не Claude-специфичные примитивы. Каждый CLI мапит названия профилей на свою модель диспатча.

---

## Связанная документация

- [Методологии](METHODOLOGIES-RU.md) — что встроено в forgeplan vs что внешнее
- [Архитектура](ARCHITECTURE-RU.md) — четырёхслойная ментальная модель экосистемы
- [Playbook](PLAYBOOK-RU.md) — какую команду под какую задачу
- [Developer Journey](DEVELOPER-JOURNEY-RU.md) — 30-минутный walkthrough от нуля до фичи
- [Usage Guide](USAGE-GUIDE-RU.md) — справочник команд, хуки, troubleshooting
- [AGENTS.md](../AGENTS.md) — cross-CLI root context (источник правды для конвенций)

И технические артефакты:

- `plugins/agents-pro/agents/smith.md` — сам агент (370 строк, Profile B-orchestrator).
- `plugins/fpl-skills/skills/smith/routing-map.md` — таблица 12 контекстов + 27 карточек + индекс агентов.
- `plugins/fpl-skills/skills/smith/SKILL.md` — основной скил-входная точка.
- `plugins/fpl-skills/skills/smith-bootstrap/SKILL.md` — путь greenfield-онбординга.
- `plugins/fpl-skills/skills/smith-plan/SKILL.md` — per-task planning.
- `plugins/fpl-skills/skills/smith-routing/SKILL.md` — инспекция routing-таблицы.
- `plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md` — канонические определения Profile A / B / B-orchestrator / C / C-coder / D.

---

## Благодарности и лицензия

Концепция мастер-персоны заимствована из [bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) — open-source AI-coding workflow от Brian Madison. Smith адаптирует паттерн под словарь артефактов ForgePlan (PRD / RFC / ADR / EVID) и под поверхность диспатча (именованные субагенты вместо персон).

Cross-CLI манифест следует стандарту [agents.md](https://agents.md) — спецификация Linux Foundation (декабрь 2025) для контекстных файлов AI-агентов, единообразно читаемых Claude Code, Gemini CLI, OpenAI Codex CLI, Goose и Cursor.

Лицензия: MIT (см. [LICENSE](../LICENSE) в корне репозитория).
