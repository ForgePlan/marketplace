[English](METHODOLOGIES.md) | [Русский](METHODOLOGIES-RU.md)

# Методологии — что встроено, а что внешнее

Справка для тех кто спрашивает: «А BMAD поддерживается? А OpenSpec? А RIPER?». Короткий ответ: **большинство известных методологий уже встроены в CLI forgeplan** — отдельные плагины не нужны. Этот документ показывает где живёт каждая.

---

## Встроено в CLI `forgeplan` (работает прямо сейчас)

Эти методологии — часть ядра forgeplan. Отдельно ставить не нужно: они срабатывают когда ты вызываешь `forgeplan validate`, `forgeplan reason`, `forgeplan score` и подобные.

### BMAD — проверка PRD по правилам

**Что это**: рабочий процесс из 13 шагов для написания PRD со встроенными правилами проверки и состязательным ревью (ревьюер ОБЯЗАН найти хотя бы одну проблему; ноль найденного — значит ревью не было достаточно тщательным).

**Где в forgeplan**:
- `forgeplan validate <id>` — проверяет полноту артефакта по правилам BMAD для каждого вида
- Quick Flow vs Full Path — глубина проверки подстраивается под сложность
- Специализация ревьюеров — разные роли (безопасность, архитектура и т.д.)

**Видишь это когда**: запускаешь `/forge-cycle` (на шаге 4 — Shape — встроена BMAD-проверка), или явно вызываешь `forgeplan validate PRD-NNN`.

### OpenSpec — конвейер артефактов

**Что это**: способ организовать артефакты как направленный граф без циклов (Proposal → Specs → Design → Tasks) с **delta-спеками** (только изменения: ADDED / MODIFIED / REMOVED) вместо полного переписывания на каждой итерации. Унаследовано от исходного проекта OpenSpec.

**Где в forgeplan**:
- Граф артефактов — у каждого артефакта известны родители и дети
- Delta-спеки — `forgeplan supersede` / `forgeplan deprecate` работают через эту модель
- Свои схемы для каждого вида артефакта

**Видишь это когда**: вызываешь `forgeplan graph` (mermaid-граф на выходе), или когда supersede-ишь старый артефакт новым.

### FPF — Framework первых принципов (First Principles Framework)

**Что это**: фреймворк структурного мышления авторства Анатолия Левенчука. 224 раздела спецификации: декомпозиция, оценка, рассуждение. Включает **F-G-R Trust Calculus** (Formality / Granularity / Reliability) и **цикл ADI** (Abduction → Deduction → Induction).

**Где в forgeplan**:
- `forgeplan reason <id>` — оборачивает ADI для любого артефакта (для глубины Deep+ обязательно перед активацией)
- Отдельный плагин `fpf` в этом маркетплейсе — интерактивные `/fpf-decompose`, `/fpf-evaluate`, `/fpf-reason`, `/fpf-lookup`

**Видишь это когда**: route определил глубину Deep → `/forge-cycle` вызывает `forgeplan reason` → 3+ гипотезы, для каждой — предсказания, потом проверка фактами.

### ADI — Abduction → Deduction → Induction

**Что это**: цикл порождения гипотез из FPF. Дано наблюдение — порождаем минимум 3 объяснения (абдукция), выводим проверяемые предсказания (дедукция), сверяем с фактами (индукция). Защищает от тоннельного зрения.

**Где в forgeplan**:
- Встроено в `forgeplan reason` (обязательно для активации Deep+)
- `/fpf-reason` для разовых вызовов
- Используется `/diagnose` для порождения гипотез о причине бага

### DDR — Detailed Decision Record

**Что это**: расширенный ADR с инвариантами, планом отката, сроком действия (`valid_until`), пред- и пост-условиями. Из методологии Quint-code. Структура из четырёх компонент: Постановка → Решение → Обоснование → Последствия.

**Где в forgeplan**:
- ADR создаваемые через `forgeplan new adr` для глубины Deep+ используют шаблон DDR
- Verification Gate (5-точечная проверка) — часть закрытия DDR

**Видишь это когда**: в ADR есть секции «Инварианты» и «План отката» — это и есть DDR-стиль.

### R_eff — расчёт надёжности

**Что это**: доверие-к-решению = **min(оценок_evidence)** с поправками на CL. Слабейшее звено, никогда не среднее. Самое слабое доказательство определяет надёжность всего артефакта.

**Формула**: `R_eff = min(evidence_score - CL_penalty)`, где CL — уровень соответствия контексту (CL3 = 0.0, CL2 = 0.1, CL1 = 0.4, CL0 = 0.9).

**Где в forgeplan**:
- `forgeplan score <id>` считает R_eff
- Активационный шлюз: требует R_eff > 0 (иначе останов)
- Видно в отчётах `forgeplan health`

### Угасание evidence (Evidence Decay)

**Что это**: у каждого Evidence есть срок жизни (`valid_until`). Истёкший Evidence получает оценку 0.1 — слабый, но не нулевой. Постепенный эпистемический долг: чем дольше истёк, тем меньше доверия.

**Где в forgeplan**:
- Срок задаётся при создании evidence
- `forgeplan health` подсвечивает артефакты с устаревшим evidence
- `forgeplan renew <id> --until <дата>` продлевает с указанием причины

### Verification Gate — пятиточечная проверка

**Что это**: пять вопросов перед закрытием решения:

1. **Дедуктивные следствия** — что вытекает из этого решения?
2. **Контраргумент** — какое самое сильное возражение?
3. **Самоочевидность** — это не тавтология?
4. **Хвостовые сбои** — какие маловероятные но катастрофические сценарии возможны?
5. **Слабейшее звено (WLNK)** — где самое уязвимое место?

**Где в forgeplan**:
- Обязательно перед активацией ADR глубины Deep+
- `forgeplan reason <id>` включает вопрос про слабейшее звено

### Pareto Front и Stepping Stone

**Что это** (из FPF):
- **Pareto Front**: набор недоминированных вариантов — ни один не хуже всех остальных одновременно по всем измерениям. Используется в SolutionPortfolio (`forgeplan new solution`).
- **Stepping Stone**: пометка для варианта который открывает будущие возможности, даже если не оптимален сейчас. Учитывается наряду с R_eff при выборе из набора.

**Где в forgeplan**:
- У вида артефакта `solution` есть поля Pareto Front + Stepping Stone в frontmatter
- `forgeplan score <solution-id>` учитывает их

### Двухуровневое извлечение (Factum vs Intent) — для brownfield

**Что это** (из `docs/brownfield-extraction-package/02-METHODOLOGY.md`):
- **Уровень 1 — Factum**: что код делает, доказуемо чтением. Уверенность 100%, проверяется повторным `grep`. Примеры: значения ENUM, ветки условий, форма возвращаемого значения.
- **Уровень 2 — Intent**: почему бизнес выбрал такую реализацию. Уверенность переменная — каждое утверждение помечено: `подтверждено` ✅ / `уверенно выведено` 🟢 / `выведено` 🟡 / `предположение` 🟠 / `неизвестно` ⬜.

**Где в forgeplan**:
- Встроено в `forgeplan-brownfield-pack` (после переноса полного пакета — см. roadmap)
- Теги уверенности обеспечиваются скиллами извлечения (`03-intent-inferrer.md`)

---

## Доступно отдельными плагинами (ставится при необходимости)

Это расширения над ядром, упакованные в плагины маркетплейса.

### SPARC — Specification → Pseudocode → Architecture → Refinement → Completion

**Плагин**: `agents-sparc` (5 агентов — оркестратор + 4 специалиста по фазам).

**Когда срабатывает**: `/sprint` детектирует задачу глубины Deep И установлен `agents-sparc` → оркестратор SPARC координирует 4 фазы. У каждой фазы свой контроль качества; следующая фаза получает полный выход предыдущей.

**Когда нужен**: реализация сложной функциональности когда хочется принудительной фазировки вместо ad-hoc кодинга.

### FPF — интерактивные команды

**Плагин**: `fpf` (1 агент + база знаний из 224 разделов).

Даёт команды `/fpf`, `/fpf-decompose`, `/fpf-evaluate`, `/fpf-reason`, `/fpf-lookup` для интерактивного структурного мышления. Не зависит от жизненного цикла — полезен в любой момент когда нужно явное рассуждение.

### Laws of UX

**Плагин**: `laws-of-ux` (UX-ревьюер + хук-подсказки + база из 30 законов).

Подключает агента `ux-reviewer` автоматически внутри `/audit` когда в изменениях есть фронтенд-файлы. Не зависит от forgeplan — у плагина своя база знаний.

---

## Рекомендуемый companion (отдельный маркетплейс, хорошо сочетается с нашим)

### Autoresearch — итеративный цикл под мерой

**Что это**: плагин-скилл для Claude Code (и OpenCode, Codex) от Udit Goenka, на основе [autoresearch Карпатого](https://github.com/karpathy/autoresearch). Превращает любую задачу с измеримой метрикой в целенаправленный цикл: **Modify → Verify → Keep/Discard → Repeat**. Пять команд в v2.0.03: `plan`, `debug`, `security`, `predict`, `reason`.

**Источник**: [github.com/uditgoenka/autoresearch](https://github.com/uditgoenka/autoresearch) — отдельный маркетплейс, лицензия MIT.

**Как сочетается с нами**:
- Фаза Build в `/forge-cycle` может передавать управление в `/autoresearch:plan` когда у задачи чёткая механическая метрика (производительность, доля тестов, размер сборки, security findings)
- Результаты autoresearch фиксируются через `forgeplan new evidence` с `congruence_level: 3` и `evidence_type: measurement` — качественный CL3 вход для R_eff
- Скиллы извлечения brownfield (intent-inferrer, hypothesis-triangulator, canonical-reproducer) используют примитивы autoresearch как движок цикла

**Гайд по интеграции**: [`docs/AUTORESEARCH-INTEGRATION-RU.md`](AUTORESEARCH-INTEGRATION-RU.md) — три способа интеграции, матрица решений, чего не делать, установка.

**Установка**:
```
/plugin marketplace add uditgoenka/autoresearch
/plugin install autoresearch@uditgoenka-autoresearch
```

---

## Внешние (упоминается, но не реализовано в этой экосистеме)

### DDD — Domain-Driven Design

**Что это**: методология проектирования сложных предметных областей. Bounded contexts, aggregates, ubiquitous language.

**Статус**: как методологический движок — не реализовано. Что есть:
- Агент `ddd-domain-expert` в `agents-pro` — для консультаций
- Карта соответствия `ddd-to-forge.yaml` в `forgeplan-brownfield-pack` — превращает DDD-контекстную карту в Epic + PRD + Spec в forgeplan
- Ссылки на DDD в скиллах извлечения brownfield

Если нужно полноценное DDD-моделирование — комбинируй агент + brownfield-pack + собственную дисциплину.

### C4 — Context / Container / Component / Code

**Что это**: методология архитектурных диаграмм Саймона Брауна.

**Статус**: как у DDD — есть только карта `c4-to-forge.yaml` в `forgeplan-brownfield-pack` (переводит C4-документы в артефакты forgeplan). Своего C4-агента или скилла моделирования нет.

---

## Не в этой экосистеме (упоминается, но не в forgeplan и не в маркетплейсе)

### RIPER — Research / Innovate / Plan / Execute / Review

**Статус**: не в ядре forgeplan, не в маркетплейсе.

**Ближайший аналог**: жизненный цикл forgeplan — **Route → Shape → Build → Evidence → Activate**. Фазы по сути отличаются: RIPER акцентирует итеративную идеацию; forgeplan — отслеживаемые артефакты и evidence по слабейшему звену.

Если очень хочется именно RIPER-терминологию — можно собрать вручную:
- Research → `/research`
- Innovate → `/refine` или `/fpf-decompose`
- Plan → `/rfc create`
- Execute → `/sprint` или `/forge-cycle`
- Review → `/audit`

Но единой команды `/riper` нет.

### AI-SDLC

**Статус**: не названо так у нас. Ближайшее что есть — `/autorun` (автопилот-оркестратор) который примерно покрывает end-to-end цикл AI-разработки, но не брендирован как AI-SDLC.

### Исходный репозиторий BMAD-METHOD

**Что это**: апстрим BMAD с полной документацией метода. Forgeplan включает правила проверки и 13-шаговый процесс (см. «Встроено в CLI forgeplan» выше), но в исходном репозитории есть дополнительный контекст и шаблоны не доступные через `forgeplan`.

Если хочется почитать оригинал → см. `sources/BMAD-METHOD/` в репозитории forgeplan.

---

## Быстрая таблица соответствия

| Методология | Где живёт | Как использовать |
|---|---|---|
| BMAD | CLI forgeplan | `forgeplan validate <id>` |
| OpenSpec | CLI forgeplan | `forgeplan graph`, `forgeplan supersede`, delta-спеки |
| FPF (полный) | Плагин `fpf` | `/fpf-decompose`, `/fpf-evaluate`, `/fpf-reason`, `/fpf-lookup` |
| Цикл ADI | CLI forgeplan + плагин fpf | `forgeplan reason <id>` (обязателен для Deep+); `/fpf-reason` (интерактивно) |
| DDR | CLI forgeplan | `forgeplan new adr` (Deep+ использует шаблон DDR) |
| R_eff | CLI forgeplan | `forgeplan score <id>` |
| Угасание Evidence | CLI forgeplan | `forgeplan health` подсвечивает истёкшие; `forgeplan renew <id>` |
| Verification Gate | CLI forgeplan + вручную | Обязателен для закрытия ADR глубины Deep+ |
| Pareto Front + Stepping Stone | CLI forgeplan | Внутри артефактов вида `solution` |
| SPARC | Плагин `agents-sparc` | Подключается в `/sprint` для Deep задач |
| Двухуровневое извлечение (Factum/Intent) | `forgeplan-brownfield-pack` (после переноса) | `/extract intent --confidence-tagged` |
| Laws of UX | Плагин `laws-of-ux` | `/ux-review`, `/ux-law <имя>` |
| DDD | `agents-pro` + brownfield-pack | Только консультации — движка нет |
| C4 | Карта в brownfield-pack | Только YAML-преобразование |
| Autoresearch | Внешний companion (`uditgoenka/autoresearch`) | Ставится отдельно; см. [AUTORESEARCH-INTEGRATION-RU.md](AUTORESEARCH-INTEGRATION-RU.md) для способов интеграции |
| RIPER | НЕТ в экосистеме | Вручную — связка `/research` → `/refine` → `/rfc` → `/sprint` → `/audit` |
| AI-SDLC | НЕ названо так, приближение через `/autorun` | `/autorun "<задача>"` |

---

## См. также

- [DEVELOPER-JOURNEY-RU.md](DEVELOPER-JOURNEY-RU.md) — повествовательное знакомство с 4 персонами
- [PLAYBOOK-RU.md](PLAYBOOK-RU.md) — какая команда для какой задачи
- [USAGE-GUIDE-RU.md](USAGE-GUIDE-RU.md) — справочник по маркетплейсу
- [ARCHITECTURE-RU.md](ARCHITECTURE-RU.md) — четырёхслойная ментальная модель
- [Плагин `fpf`](../plugins/fpf/README-RU.md) — интерактивные команды FPF
- [Плагин `agents-sparc`](../plugins/agents-sparc/README-RU.md) — фазовые агенты SPARC
- [`forgeplan-brownfield-pack`](../plugins/forgeplan-brownfield-pack/README-RU.md) — извлечение знаний из унаследованного кода
- Репозиторий ForgePlan: [`docs/methodology/GLOSSARY.ru.md`](https://github.com/ForgePlan/forgeplan/blob/dev/docs/methodology/GLOSSARY.ru.md) — полный словарь терминов
