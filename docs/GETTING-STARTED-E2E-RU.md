# Getting Started — пошаговый E2E прогон

> **Аудитория**: новый пользователь, только что обнаруживший ForgePlan и желающий убедиться, что всё работает с нуля на своей машине.
>
> **Бюджет времени**: ~30 минут на полный hands-on прогон. Если нужно только доказательство что работает — листайте в самый низ к секции "Smoke-результаты".
>
> **Тестовое окружение этого гайда**: macOS Darwin 25.1.0, Claude Code 2.1.143, forgeplan CLI v0.31.0, catalog v1.43.0, сессия 2026-05-19.
>
> **Verified state**: 68 marketplace-агентов 0 errors 0 warns, 100 forgeplan-артефактов в тестовом workspace, `forgeplan_health` verdict=`healthy`.

---

## TL;DR — что у вас будет в конце

После этого прогона у вас будет:

1. Workspace `.forgeplan/` в директории вашего проекта (LanceDB + markdown-проекции)
2. Первый PRD, прошедший полный lifecycle (draft → validate → evidence → activate, R_eff=1.0 grade A)
3. Подключённая память (Hindsight) — факты сохраняются между сессиями Claude Code
4. 13 плагинов маркетплейса установлены и проверены — 0 lint-ошибок, 0 lint-предупреждений
5. Уверенность, что пайплайн вас не обманывает

---

## Prerequisites

```bash
# 1. forgeplan CLI установлен
brew install forgeplan        # или скачать с releases
forgeplan --version            # должно вывести 0.31.0+

# 2. Claude Code установлен
# Скачать с https://claude.ai/download

# 3. (Опционально) gh CLI для интеграции с GitHub Projects
brew install gh && gh auth login
```

---

## Шаг 1 — Установка плагинов маркетплейса

В Claude Code:

```
/plugin marketplace add ForgePlan/marketplace
```

Затем установите флагманские плагины:

```
/plugin install fpl-skills@ForgePlan-marketplace
/plugin install fpl-hsmem@ForgePlan-marketplace
/plugin install forgeplan-workflow@ForgePlan-marketplace
/plugin install agents-core@ForgePlan-marketplace
/plugin install agents-pro@ForgePlan-marketplace
/plugin install agents-sparc@ForgePlan-marketplace
```

**Проверка** (в Claude Code, быстрый чек):
- Введите `/help` — должны увидеть в списке `/fpl-init`, `/forge-cycle`, `/forge-audit`
- Или посмотрите файл `~/.claude/plugins/marketplaces/ForgePlan-marketplace/.claude-plugin/marketplace.json` — должна быть catalog v1.43.0

> ⚠️ **Подводный камень с кешем плагинов**: если `/plugin install` говорит "already installed", но новой версии нет — сначала запустите `/plugin marketplace update ForgePlan-marketplace`. Версия в catalog metadata управляет тем, когда обновления подтягиваются.

---

## Шаг 2 — Bootstrap нового проекта

```bash
mkdir -p ~/my-project && cd ~/my-project
```

В Claude Code, находясь в этой директории:

```
/fpl-init
```

Это в один присест:

| Этап | Что происходит |
|------|---------------|
| Probe | Проверяет наличие forgeplan CLI на `$PATH` и состояние существующего проекта |
| `forgeplan init` | Создаёт `.forgeplan/` с LanceDB-индексом + 13 поддиректорий для kind'ов (prds/, rfcs/, adrs/, evidence/, notes/, problems/, solutions/, specs/, refresh/, discovery/, epics/, memory/, lance/) |
| `.mcp.json` | Прописывает MCP-сервер `forgeplan` (и `hindsight`, если установлен) |
| `.claude/settings.json` | Локальные настройки Claude Code |
| CLAUDE.md | Универсальный шаблон (через скилл `/bootstrap`) |
| **Operating contract v3** | Внедряет блок маркера v3 в CLAUDE.md — говорит будущим агентам использовать forgeplan MCP-first, диспатчить канонических B2-агентов и какие 16 из 22 fpl-skills являются MCP-first vs Tier B no-forgeplan |
| `docs/agents/` | Wizard настройки заполняет tracker / build / paths / glossary |
| Канонический слой (v2.0 step 8.5) | Scaffold'ит `project-agent-matrix.yaml` + `project-config.yaml` если согласитесь |

**Проверка**:

```bash
ls -la .forgeplan/
# должно показать: config.yaml, lance/, prds/, rfcs/, adrs/, evidence/, notes/, problems/, solutions/, specs/, refresh/, discovery/, epics/, memory/, .gitignore

grep -c "forgeplan-operating-contract:v3" CLAUDE.md
# должно вывести: 1
```

---

## Шаг 3 — Sanity-check сырого CLI

Вне Claude Code, проверьте что сырой CLI работает:

```bash
cd ~/my-project
forgeplan init -y      # не-интерактивный режим; -y пропускает prompts
forgeplan new prd "Моя первая фича"
forgeplan validate PRD-001
forgeplan list
```

Ожидаемый вывод:

```
ID       Kind  Status  Title
PRD-001  prd   draft   Моя первая фича

  1 artifact(s) total
```

Если видите это — CLI surface работает. **MCP-сервер использует ту же `.forgeplan/` LanceDB** когда запущен из этой директории, поэтому артефакты созданные через любой путь — в одном хранилище.

---

## Шаг 4 — Полный lifecycle через MCP (сессия Claude Code)

Перезапустите Claude Code в `~/my-project/` (чтобы MCP-сервер подхватил новую `.forgeplan/`).

В разговоре попросите Claude провести вас через полный пайплайн. Или сделайте это явно:

### 4a. Создать + наполнить PRD

Либо диспатчите агента `artifact-author` (Profile A generic):

```
Task({
  subagent_type: "agents-pro:artifact-author",
  prompt: "Создай PRD для фичи 'Добавить feed активности пользователя на dashboard'. Заполни все обязательные секции."
})
```

Либо используйте `specification` (SPARC Profile A specialist) для более строгих SMART-критериев.

Либо сделайте это inline:

```
mcp__forgeplan__forgeplan_new(kind="prd", title="Добавить feed активности")
mcp__forgeplan__forgeplan_update(id="PRD-002", body="<полное тело здесь>")
```

### 4b. Валидация

```
mcp__forgeplan__forgeplan_validate(id="PRD-002")
```

Ожидание: `passed: true`, `error_count: 0`, возможно несколько SHOULD/COULD предупреждений. Если видите hard errors (`MUST`) — исправьте body и провалидируйте снова.

### 4c. Создать evidence

После того, как что-то докажет утверждения PRD (smoke-тест, аудит, benchmark):

```
mcp__forgeplan__forgeplan_new(kind="evidence", title="Activity feed — результаты smoke-теста")
mcp__forgeplan__forgeplan_update(id="EVID-001", body="<verdict: PASS, congruence_level: 3, evidence_type: ..., observed: ...>")
```

### 4d. Linkнуть informs (ВАЖНО — НЕ based_on)

```
mcp__forgeplan__forgeplan_link(source="EVID-001", target="PRD-002", relation="informs")
```

> 🛑 **Подводный камень**: используйте `informs` для evidence-supports-PRD. **Не используйте `based_on`** если только PRD действительно НЕ ВЫВЕДЕН из evidence — `based_on` накладывает CL-penalty в R_eff-скоринге. (См. [forgeplan#286](https://github.com/ForgePlan/forgeplan/issues/286) для предложенного unlink-примитива для починки mis-typed links.)

### 4e. Score

```
mcp__forgeplan__forgeplan_score(id="PRD-002")
```

Ожидание для чистого evidence:
```json
{
  "r_eff": 1.0,
  "overall_grade": "A",
  "evidence": [{ "id": "EVID-001", "score": 1.0, "verdict": "Supports", "congruence_level": 3 }],
  "weakest_link": null
}
```

### 4f. Activate

```
mcp__forgeplan__forgeplan_activate(id="PRD-002")
```

Ожидание: `{ "artifact_id": "PRD-002", "message": "Activated PRD-002 (draft → active)" }`.

---

## Шаг 5 — Канонический диспатч агентов (тест всех 5 профилей)

Маркетплейс поставляется с 17 forgeplan-aware агентами, реализующими **B2 paradigm** (`disallowedTools` denylist + MCP propagation). Протестируйте каждый профиль:

| Profile | Какого агента вызывать | Что попросить |
|---|---|---|
| **A** Creator (generic) | `agents-pro:artifact-author` | "Создай NOTE: 'Уроки первого прогона'" |
| **A** Creator (kind-specialist) | `agents-pro:adr-architect` | "Создай ADR для выбора PostgreSQL вместо MySQL" |
| **B** Reviewer (generic) | `agents-pro:artifact-reviewer` | "Проведи аудит health PRD-002 — schema, links, свежесть" |
| **B** Reviewer (kind-specialist) | `agents-core:code-reviewer` | "Отревьюй последний diff на баги / стиль / архитектуру" |
| **B-gate** | `agents-pro:guardian` | "Должен ли PRD-002 быть активирован? Вынеси gate-вердикт из EVID-цепочки" |
| **C** Read-only | `agents-pro:research-analyst` | "Каково текущее состояние forgeplan? Используй forgeplan_health + forgeplan_list" |
| **C-coder** | `agents-core:coder` | "Прочитай AGENT-AUTHORING-GUIDE.md и расскажи про 5 профилей" |
| **D** Maintainer | `agents-pro:artifact-maintainer` | "Добавь link от EVID-001 к NOTE-XXX (informs)" |

Каждый должен:
1. Признать миссию
2. Использовать `mcp__forgeplan__*` инструменты (доказывает что B2 paradigm работает)
3. Оставаться в рамках профиля (e.g., research-analyst не может создавать артефакты; coder не может мутировать forgeplan)
4. Вернуть структурированный отчёт

---

## Шаг 5.5 — Новые скиллы из автономного фреймворка Sprint A-D

После Sprint A-D пять новых fpl-skills дополняют канонический пайплайн. Каждый закрывает конкретный gap автономии:

| Скилл | Что делает | Sprint | Закрытый gap |
|---|---|---|---|
| `/agent-advisor "<задача>"` | Рекомендует специализированного канонического агента для описанной задачи — консультирует mental model `mm-agent-selection` + встроенную CRUD-R-A карту | A | Gap E (правильный агент для задачи) |
| `/agent-fetcher "<задача>"` | Предлагает агентов из других установленных маркетплейсов (cc-marketplace, claude-plugins-official) — только SUGGEST-ONLY, НИКОГДА не авто-устанавливает | B | Gap G (cross-marketplace fetcher) |
| `/project-agent-scaffold` | Определяет tech stack проекта (package.json/Cargo.toml/и т.д.) → предлагает 1-3 агентов под проект → пользователь подтверждает каждый перед записью | B | Gap F (кастомный агент проекта) |
| `/forge-progress` | Live read-only снимок состояния оркестратора (sprint/phase/wave/agents-in-flight/files-modified/ETA) | B (Wave 3) | Gap D (progress dashboard) |
| `/forge-cleanup` | Просматривает черновики, классифицирует по 3 уровням (AUTO/ADI/USER) согласно фреймворку самовосстановления пайплайна | D | Anomaly #7 (застрявшие черновики) |

### Хук авторутинга (Sprint A)

UserPromptSubmit хук `prompt-router` (Sprint A) классифицирует ваш prompt на естественном языке и предлагает подходящий скилл в `additionalContext`. Можно просто описать что нужно — не обязательно запоминать имена команд. Попробуйте: "У меня идея для новой фичи" → хук предложит `/shape` или `/agent-fetcher`.

### Протокол ask-back (Sprint A-D)

Когда sub-агент сталкивается с информационным gap в середине потока, он emit'ит сентинел `<<NEED_USER_INPUT: вопрос>>`; оркестратор (`/forge-cycle`, `/autorun`) парсит + выводит через AskUserQuestion + переотправляет. Закрывает прежнее ограничение, когда sub-агенты не могли вызвать AskUserQuestion самостоятельно.

### Сентинел активации (Sprint D-E)

Когда Profile B reviewer-агент завершает EVIDENCE-артефакт, он emit'ит `<<NEEDS_ACTIVATION: EVID-XXX>>` — оркестратор активирует его без ручного вмешательства. Закрывает Anomaly #7 (EVID'ы застревали в draft, потому что Profile B запрещает activate).

### Возобновление `/autorun` (Sprint C)

`/autorun` записывает контрольную точку сессии в `.forgeplan/sessions/<id>.yaml` после каждой фазы. При блокере (timeout, ADI fail, red-line) завершается корректно с подсказкой для возобновления. `--resume <session-id>` восстанавливает состояние. `--list-sessions`/`--cleanup-sessions` управляют жизненным циклом сессий. Полная схема: `docs/SESSION-CHECKPOINT-SCHEMA.md`.

---

## Шаг 6 — Тест представительских fpl-skills

Запустите пару скиллов, проверяющих MCP-first диспатч + цепочки скиллов:

### `/briefing` — утренний standup

```
/briefing
```

Ожидание: агрегация просрочки / на сегодня / @упоминания / непрочитанные + blind-spots из forgeplan + stale-evidence. MCP-first per PRD-022.

### `/research` — multi-agent research

```
/research "Как устроена наша auth-цепочка?"
```

Ожидание: parallel scout-агенты по code / docs / RFCs / memory; emit'ит отчёт в `research/reports/auth-chain/REPORT.md`. Опционально создаёт forgeplan note через MCP.

### `/sprint` — wave-based выполнение

```
/sprint "Реализовать фичу feed активности пользователя"
```

Ожидание: research → wave-план (5-8 агентов в 2-5 волнах) → approval gate → диспатч по волнам через TeamCreate. На закрытии волны автоматически emit'ит EvidencePack через forgeplan MCP.

### `/audit` — multi-expert review

```
/audit
```

Ожидание: 4+ параллельных reviewer-агента (логика, архитектура, безопасность, тесты). Записывает EVIDENCE-артефакт через MCP при завершении.

---

## Шаг 7 — Подключение памяти Hindsight

Если установлен плагин `fpl-hsmem`, memory-инструменты доступны:

```
# Сохранить факт
mcp__plugin_fpl-hsmem_hindsight__memory_retain(
  content="Решили использовать Postgres для feed активности из-за LISTEN/NOTIFY семантики",
  context="2026-05-19 прогон",
  tags=["decision", "postgres", "activity-feed"]
)

# Позже, в другой сессии
mcp__plugin_fpl-hsmem_hindsight__memory_recall(
  query="выбор БД для feed активности"
)
# → вернёт сохранённый контент через semantic-поиск
```

Банки **per-project** — деривируются из текущей рабочей директории по умолчанию. См. `plugins/fpl-hsmem/CONFIGURATION.md` для трёх режимов активации.

---

## Шаг 8 — Финальный health + lint check

В репозитории маркетплейса (если вы контрибьютор):

```bash
./scripts/validate-all-plugins.sh
# Ожидаемый хвост:
#   Scanned: 68 agents (17 forgeplan-aware, 51 legacy)
#   Errors:  0
#   Warns:   0
#   ALL PASSED
```

В вашем проекте (в любое время):

```
mcp__forgeplan__forgeplan_health
# Ожидание: verdict "healthy"
# 0 orphans, 0 stale, 0 advisory mismatches
```

---

## Типичные подводные камни (verified во время этого прогона)

| Симптом | Причина | Фикс |
|---|---|---|
| `forgeplan init` возвращает "Error: not connected" | Дефолтный путь ожидает интерактивный TUI | Используйте `-y` для не-интерактивного режима |
| `/plugin install` говорит "already installed" но новой версии нет | Stickiness кеша плагинов (catalog version не изменился) | Сначала `/plugin marketplace update <name>`; bump'ите catalog metadata.version при релизе |
| MCP forgeplan tools отсутствуют в контексте subagent | Subagent использует `tools:` allowlist с wildcards → молча strip'ит MCP (Anthropic bug #53865) | Используйте B2 paradigm — `disallowedTools` denylist. См. `AGENT-AUTHORING-GUIDE.md` |
| Редактирование frontmatter в `.forgeplan/<kind>/*.md` не меняет R_eff | Markdown — это projection из LanceDB, не источник правды | Используйте `forgeplan_update`/`forgeplan_link` через MCP/CLI — LanceDB канонична |
| `R_eff = 0` несмотря на качественный evidence linked | Relation `based_on` вместо `informs` — накладывает CL penalty cascade | Используйте `informs` для evidence-supports-PRD. **Unlink-примитива пока нет** — см. [forgeplan#286](https://github.com/ForgePlan/forgeplan/issues/286) |
| Discover Agent работает только как standalone, не как plugin | Brownfield MCP tools (9 штук) ещё не в forgeplan core | Tracking: [forgeplan#287](https://github.com/ForgePlan/forgeplan/issues/287) |
| Sub-agent говорит что не может загрузить схему `forgeplan_new` | Profile C / Profile B-gate-style намеренно denies forgeplan-мутации | Работает как задумано — этот профиль не должен мутировать. Диспатчите правильный профиль (A для create, B для review, D для maintain) |

---

## Smoke-результаты (verification-прогон этого гайда)

Следующее было выполнено end-to-end при написании этого гайда (2026-05-19, marketplace workspace):

### CLI smoke (в `/tmp/forge-e2e-test-*`)

| Шаг | Команда | Результат |
|---|---|---|
| 1 | `forgeplan --version` | ✅ `0.31.0` |
| 2 | `forgeplan init -y` | ✅ `.forgeplan/` создан с 13 kind-директориями + LanceDB |
| 3 | `forgeplan new prd "E2E test — first PRD"` | ✅ PRD-001 создан |
| 4 | `forgeplan validate PRD-001` | ✅ PASS (0 errors, 3 SHOULD/COULD warnings по template stub) |
| 5 | `forgeplan list` | ✅ Корректно рендерит PRD-001 |

### MCP pipeline smoke (marketplace workspace)

| Шаг | MCP tool | Результат |
|---|---|---|
| 1 | `forgeplan_new(kind=prd)` | ✅ PRD-028 создан |
| 2 | `forgeplan_update(body=...)` | ✅ Body заполнен с MUST-секциями |
| 3 | `forgeplan_validate` | ✅ PASS, 0 errors, 2 SHOULD warnings (orphan FRs/goals — приемлемо для smoke fixture) |
| 4 | `forgeplan_new(kind=evidence)` + `forgeplan_update` | ✅ EVID-055 создан с verdict=PASS, CL=3 |
| 5 | `forgeplan_link(EVID-055, PRD-028, informs)` | ✅ Linked |
| 6 | `forgeplan_score(PRD-028)` | ✅ **R_eff=1.0, grade A, weakest_link=null** |
| 7 | `forgeplan_activate(PRD-028)` | ✅ `draft → active`, без force |

### Agent dispatch smoke (live, в той же сессии)

| Profile | Agent | Tools verified | Status |
|---|---|---|---|
| B-gate | `guardian` | `mcp__forgeplan__forgeplan_get`, `forgeplan_list` | ✅ Dry-run gate-вердикт вынесен, 0 tool errors |
| C read-only | `research-analyst` | `mcp__forgeplan__forgeplan_list`, `forgeplan_health` | ✅ Read-доступ работает, мутация корректно блокируется на уровне протокола |
| C-coder | `coder` | `Read` + `mcp__forgeplan__forgeplan_get` | ✅ Source-read работает; `forgeplan_new` заблокирован на уровне deferred-tool list (физический denylist) |

Статический B2-аудит всех 17 forgeplan-aware агентов (allowlist отсутствует ✅, denylist present ✅, валидная модель ✅, hex-цвет ✅, denies `forgeplan_activate` ✅): **17/17 PASS**.

### Memory plugin

```
mcp__plugin_fpl-hsmem_hindsight__memory_retain(...)
→ Saved to bank "forge-marketplace". Tokens: n/a
```

✅ Retain работает. Recall + reflect инструменты доступны, банк per-project.

### Финальное состояние

```
./scripts/validate-all-plugins.sh
→ Scanned: 68 agents (17 forgeplan-aware, 51 legacy)
  Errors: 0, Warns: 0, ALL PASSED

mcp__forgeplan__forgeplan_health
→ verdict: "healthy", 100 artifacts total
  79 active, 13 draft, 5 deprecated, 3 superseded
  0 orphans, 0 stale, 0 advisory mismatches
```

---

## Куда двигаться дальше

| Если хочется... | Читайте |
|---|---|
| Написать своего агента | `plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md` |
| Настроить память | `plugins/fpl-hsmem/CONFIGURATION.md` + `GETTING-STARTED.md` |
| Понять SDLC pipeline | `forgeplan_get PRD-024` (foundation), `PRD-025` (multi-agent), `PRD-026` (canonical agent layer) |
| Кастомизировать матрицу диспатча | `plugins/fpl-skills/templates/project-agent-matrix.yaml` |
| Трекать работу в GitHub Projects | `forgeplan-marketplace/CLAUDE.md` § "GitHub Projects integration" |
| Запустить brownfield extraction (существующий кодбейз) | `plugins/forgeplan-brownfield-pack/README.md` (сейчас standalone agent — см. [forgeplan#287](https://github.com/ForgePlan/forgeplan/issues/287) для tracking миграции в plugin) |

---

## Известные limitations (по состоянию на v2.3.0)

1. **Нет `forgeplan_unlink` primitive** — mis-typed link relations остаются навсегда. Workaround: используйте `informs` для evidence; дважды проверяйте до link'ания. Tracking: [forgeplan#286](https://github.com/ForgePlan/forgeplan/issues/286).
2. **Brownfield Discover Agent v3.2 — standalone**, не `/plugin install`able plugin. Blocked на 9 новых MCP-инструментов в forgeplan core. Tracking: [forgeplan#287](https://github.com/ForgePlan/forgeplan/issues/287).
3. **MCP server cwd binding** — forgeplan MCP-сервер привязан к workspace где запущен Claude Code. Тест в другой директории через MCP пишет в `.forgeplan/` запущенного workspace, не в новую дир. Перезапустите Claude Code в целевой директории. У CLI этого ограничения нет.
4. **Subagent MCP propagation** — использует `disallowedTools` denylist, не `tools:` allowlist. Wildcards в `tools:` молча strip'ят MCP-сервер. Уже обойдено во всех 17 forgeplan-aware агентах.
5. **Сентинел `<<NEEDS_ACTIVATION>>` из Sprint D** — Profile B агенты теперь emit'ят его органически (Sprint E патчит body); оркестратор парсит + активирует. Больше нет ручной очистки в конце циклов.

---

## Acknowledgements

Этот гайд был написан во время v2.2.0 GA acceptance-теста (2026-05-19). Прогон зеркалит реальную smoke-верификацию, не гипотетический сценарий.

- Архитектурный фундамент: PRD-024 (full SDLC pipeline), PRD-025 (multi-agent + cross-CLI), PRD-026 (canonical agent layer)
- Evidence trail: EVID-049..055 (закрытие PRD-026 + закрытие PRD-022 + этот прогон)
- Tracking issues: [forgeplan#286](https://github.com/ForgePlan/forgeplan/issues/286), [forgeplan#287](https://github.com/ForgePlan/forgeplan/issues/287)
- Release: [v2.2.0](https://github.com/ForgePlan/marketplace/releases/tag/v2.2.0)

---

**English version**: [`docs/GETTING-STARTED-E2E.md`](GETTING-STARTED-E2E.md)
