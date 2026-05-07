[English](AI-SDLC-MAPPING.md) | [Русский](AI-SDLC-MAPPING-RU.md)

# AI-SDLC соответствие — типичные фазы ↔ команды ForgePlan

Справочная таблица для тех кто пришёл из терминологии AI-SDLC (AI Software Development Lifecycle). AI-SDLC — не одна каноничная методология; разные источники по-разному организуют фазы. Этот документ сопоставляет **наиболее распространённый** набор фаз с командами нашего маркетплейса — чтобы знать что вызывать на каждой фазе.

> **Суть**: ForgePlan и маркетплейс fpl-skills покрывают полный цикл AI-SDLC. Имена фаз разные; работа та же самая. Используй эту таблицу когда нужна именно AI-SDLC терминология (требования команды, контракты, комплаенс).

---

## Соответствие по фазам

| Фаза AI-SDLC | Что происходит | Команды ForgePlan | Артефакты forgeplan |
|---|---|---|---|
| **Concept / Idea** | Выявление потребности, грубые требования | [`/shape <idea>`](../plugins/fpl-skills/skills/shape/SKILL.md) | Черновик PRD |
| **Research / Discovery** | Существующие практики, альтернативы, разбор пробелов | [`/research <topic>`](../plugins/fpl-skills/skills/research/SKILL.md) | `research/reports/<topic>/REPORT.md`, опционально Note |
| **Design / Architecture** | Доменное моделирование, архитектура, решения | [`/refine <plan>`](../plugins/fpl-skills/skills/refine/SKILL.md), [`/ddd-decompose`](../plugins/fpl-skills/skills/ddd-decompose/SKILL.md), [`/c4-diagram`](../plugins/fpl-skills/skills/c4-diagram/SKILL.md), [`/fpf-decompose`](../plugins/fpf/) | PRD, RFC, ADR, Spec, Mermaid-диаграммы |
| **Specification** | Формальные API-контракты, схемы, спецификации поведения | [`/rfc create`](../plugins/fpl-skills/skills/rfc/SKILL.md), `forgeplan new spec` | RFC, Spec |
| **Build / Implementation** | Код, тесты, рабочее ПО | [`/sprint`](../plugins/fpl-skills/skills/sprint/SKILL.md), [`/forge-cycle`](../plugins/forgeplan-workflow/), [`/autorun`](../plugins/fpl-skills/skills/autorun/SKILL.md), [`/do`](../plugins/fpl-skills/skills/do/SKILL.md), [`/build`](../plugins/fpl-skills/skills/build/SKILL.md) | Код + тесты; Evidence по завершении |
| **Test / Verification** | Мульти-экспертный обзор, отладка, контроль качества | [`/audit`](../plugins/fpl-skills/skills/audit/SKILL.md), [`/diagnose <bug>`](../plugins/fpl-skills/skills/diagnose/SKILL.md), [autoresearch](AUTORESEARCH-INTEGRATION-RU.md) | Evidence (verdict + congruence_level + evidence_type) |
| **Release / Deploy** | Активация артефакта, подготовка коммита, выпуск | `forgeplan activate <id>`, `gh pr create` | Активированный PRD, conventional commit с `Refs:` |
| **Operate / Monitor** | Здоровье продакшена, слепые пятна, устаревшие решения | [`/restore`](../plugins/fpl-skills/skills/restore/SKILL.md), [`/briefing`](../plugins/fpl-skills/skills/briefing/SKILL.md), `forgeplan health`, `forgeplan stale` | Дневные сигналы, оповещения о слепых пятнах, триггеры по `valid_until` |
| **Maintain / Evolve** | Обновление существующих решений, замена артефактов | `forgeplan supersede <id> --by <new>`, `forgeplan deprecate <id>`, [`/refine`](../plugins/fpl-skills/skills/refine/SKILL.md) над существующим PRD/RFC | Переходы lifecycle, refresh-заметки |

---

## Карта покрытия

| Фаза AI-SDLC | Покрытие |
|---|---|
| Concept / Idea | ✅ `/shape` (интервью с нуля) |
| Research / Discovery | ✅ `/research` (5 параллельных агентов) |
| Design / Architecture | ✅ `/refine` + `/ddd-decompose` + `/c4-diagram` + `/fpf-decompose` (четыре интерактивных дизайн-скилла) |
| Specification | ✅ `/rfc create` + `forgeplan new spec` |
| Build / Implementation | ✅ `/sprint` (интерактивно), `/forge-cycle` (с оркестрацией), `/autorun` (без участия), `/do` (с контрольными точками), `/build` (из готового плана) |
| Test / Verification | ✅ `/audit` (4-6 ревьюеров), `/diagnose` (6-фазная отладка), [autoresearch](AUTORESEARCH-INTEGRATION-RU.md) (цикл под мерой) |
| Release / Deploy | ✅ `forgeplan activate` (lifecycle артефактов); 🟡 `gh pr create` (мы не катим в прод — это CI/CD) |
| Operate / Monitor | ✅ `/restore`, `/briefing`, `forgeplan health` со стороны forgeplan; 🟡 продакшен-наблюдаемость вне нашей зоны |
| Maintain / Evolve | ✅ Lifecycle-команды (`supersede`, `deprecate`, `renew`); уточнение существующих артефактов |

---

## Сквозной пример по фазам AI-SDLC

Рабочий пример для «**добавить magic-link аутентификацию в нашу SaaS**»:

```
Фаза 1 — Concept
  /shape "magic-link auth для нашей SaaS"
  → черновик PRD-NNN (проблема, целевые пользователи, объём MVP, риски)

Фаза 2 — Research
  /research "паттерны magic-link auth React + Express"
  → research/reports/auth/REPORT.md (исследование 5 агентов)

Фаза 3 — Design
  /refine PRD-NNN
  → доработанный PRD; ADR на «почему magic-link, а не OAuth»
  /ddd-decompose
  → ограниченные контексты: Identity, Session, Notification
  /c4-diagram
  → L1 Context + L2 Container диаграммы (Mermaid)

Фаза 4 — Specification
  /rfc create
  → RFC-NNN с фазами реализации, API-контрактами
  forgeplan new spec "формат magic-link токена + эндпоинты"

Фаза 5 — Build
  /forge-cycle "реализовать magic-link auth из RFC-NNN"
  → wave-based исполнение; SPARC если Deep; тесты добавляются
  → /sprint выдаёт 18 файлов изменено, 47 тестов добавлено

Фаза 6 — Test
  /audit
  → 4 ревьюера; 2 HIGH findings → разрешены
  → forgeplan new evidence с verdict: supports, congruence_level: 3

Фаза 7 — Release
  forgeplan score PRD-NNN  → R_eff = 0.85
  forgeplan activate PRD-NNN
  gh pr create --base main

Фаза 8 — Operate
  Ежедневно: /briefing (есть слепые пятна?) + /restore (состояние ветки)

Фаза 9 — Maintain
  Через 6 месяцев когда истекает valid_until у ADR:
  forgeplan renew ADR-NNN --reason "<переоценка>" --until <дата>
  ИЛИ
  forgeplan supersede ADR-NNN --by ADR-MMM (принят новый подход)
```

Весь цикл использует **один общий граф артефактов**. Выход каждой фазы попадает в граф; ничего не выбрасывается.

---

## Как пометить запуск как «AI-SDLC compliant»

Если команда или комплаенс-фреймворк требуют явной маркировки фаз AI-SDLC:

1. Используй `/forge-cycle` (или `/autorun`) для исполнения — он производит артефакты forgeplan на каждой фазе
2. В коммитах и заголовках PR ставь префикс с фазой AI-SDLC: `[Phase 5: Build] feat(auth): add magic-link flow`
3. Добавляй frontmatter поле `ai_sdlc_phase: build` в PRD/RFC если конвенции команды этого требуют (forgeplan принимает пользовательские поля frontmatter без отказа в validation)
4. В Evidence ставь `evidence_type` соответственно: `code_review` для фазы 6, `measurement` для autoresearch-циклов, `manual_verification` для человеческой приёмки

Граф артефактов остаётся каноническим (в нативной терминологии forgeplan); метки AI-SDLC — overlay.

---

## Что мы не покрываем

- **Развёртывание в продакшен на конкретные платформы** (AWS, GCP, Kubernetes) — это слой CI/CD, вне маркетплейса
- **Живые observability-дашборды** (Grafana, Datadog, Sentry) — мы подсвечиваем слепые пятна со стороны forgeplan; здоровье продакшена — для твоего APM
- **Комплаенс-аудиты** (SOC2, ISO 27001) — мы производим прослеживаемые артефакты которые **поддерживают** комплаенс-аудиты, но не выполняют их

Это типично что AI-SDLC-фреймворк добавляет поверх dev-работы; маркетплейс покрывает dev-сторону.

---

## См. также

- [DEVELOPER-JOURNEY-RU.md](DEVELOPER-JOURNEY-RU.md) — повествовательное знакомство (4 персоны, включая «Архитектор / тех-лид» которая близка к AI-SDLC ролям)
- [PLAYBOOK-RU.md](PLAYBOOK-RU.md) — карта сценариев; AI-SDLC сценарии ложатся на «полная автоматика» и «ночной прогон»
- [METHODOLOGIES-RU.md](METHODOLOGIES-RU.md) — что встроено в forgeplan и что внешнее (AI-SDLC — это **vocabulary overlay**, не отдельный движок)
- [UPSTREAM-METHODOLOGIES-RU.md](UPSTREAM-METHODOLOGIES-RU.md) — указатели на upstream-методологии которые интегрирует forgeplan (BMAD, OpenSpec, FPF, Quint-code)
