[English](FORGEPLAN-WEB.md) | [Русский](FORGEPLAN-WEB-RU.md)

# `@forgeplan/web` — визуальный companion для маркетплейса

`@forgeplan/web` — отдельный продукт в экосистеме ForgePlan: браузерный viewer для `.forgeplan/` артефактов. **Третий sibling** рядом с CLI `forgeplan` и плагинами этого маркетплейса. Маркетплейс его не шипит, но большинству пользователей маркетплейса полезно поднять локально на проектах которые им важны.

> Source: [github.com/ForgePlan/forgeplan-web](https://github.com/ForgePlan/forgeplan-web)

---

## TL;DR

- **Что**: SvelteKit-приложение которое читает `.forgeplan/` твоего проекта (markdown + lance index) и рендерит как интерактивный граф + time-travel слайдер.
- **Когда ставить**: после накопления 10+ артефактов в `.forgeplan/`. До этого `forgeplan list/graph/health` из CLI достаточно.
- **Стоимость**: Free, OSS. Работает на `localhost`. Данные не покидают машину.
- **Пара к**: `fpl-skills` (флагман маркетплейса). Плагин производит артефакты; web viewer делает их читаемыми.

---

## Когда устанавливать

Поставь `@forgeplan/web` когда хотя бы одно:

- В `.forgeplan/` 10+ артефактов и текстовый CLI output трудно сканировать.
- Хочешь **time-travel** — посмотреть как граф артефактов выглядел в любом прошлом коммите.
- К команде присоединяется коллега и нужно понять решения за последние полгода без чтения 50 markdown-файлов.
- Презентуешь forgeplan-driven работу stakeholder-у который предпочтёт граф а не CLI.
- Дебажишь lifecycle артефакта (например «почему PRD-042 всё ещё draft?») — graph view показывает связи и состояние сразу.

Можно отложить когда:

- Меньше 10 артефактов. CLI быстрее.
- Работаешь полностью соло и графы никому не показываешь.
- Проект слишком чувствительный для любого localhost web-app (редко; viewer read-only и не делает outbound вызовов).

---

## Установка

По README `forgeplan-web`. Общая форма:

```bash
git clone https://github.com/ForgePlan/forgeplan-web.git
cd forgeplan-web
pnpm install
pnpm dev
# Потом указать на `.forgeplan/` твоего проекта через env var или UI.
```

Сверься с `forgeplan-web/README.md` про текущую процедуру install/run — она могла измениться с момента написания этого гайда.

---

## Ключевые фичи

### 1. Граф артефактов

Визуализация `.forgeplan/` как типизированный граф нод-рёбер:

| Тип ноды | Цвет / форма | Что представляет |
|---|---|---|
| Epic | Самая большая, light blue | Группа PRD/RFC |
| PRD | Средняя, blue | Product requirement |
| RFC | Средняя, green | Architecture proposal |
| ADR | Средняя, purple | Decision record |
| Spec | Средняя, orange | API/data контракт |
| Evidence | Маленькая, yellow | Verification linked to PRD/ADR |
| Note | Маленькая, grey | Micro-decision |
| Problem | Маленькая, red | Problem card |
| Solution | Маленькая, gold | Solution portfolio |

Рёбра показывают связи `informs` / `based_on` / `supersedes` / `implements` / `refines`.

### 2. Time-travel slider

Тащишь слайдер по истории коммитов репо чтобы увидеть граф в любом прошлом коммите.

- Работает на `git worktree` ephemeral checkouts.
- Требует чтобы `config.yaml` был **tracked** в git (иначе reconstruction падает — см. [FORGEPLAN-SETUP.md § config.yaml в gitignore](../plugins/fpl-skills/skills/bootstrap/resources/guides/FORGEPLAN-SETUP.md#1-configyaml-in-gitignore-most-common-mistake)).
- Полезно для «когда мы решили X?» — слайдишь до и после решения.

### 3. PR-Diff overlays (planned)

В будущем: визуализация `git diff .forgeplan/` как графовая дельта. Показывает добавленные/изменённые/удалённые артефакты в PR. Полезно для ревьюеров которые хотят видеть decision-изменения рядом с code-изменениями.

### 4. Health dashboard

Те же данные что `forgeplan health` (orphans, stubs, duplicates, blind spots) но как визуальные карточки, sortable, с clickable ссылками на артефакты.

---

## Setup checklist для полной функциональности

Чтобы `@forgeplan/web` корректно работал на проекте:

- [ ] **`.forgeplan/config.yaml` tracked в git** (не gitignored). Без него time-travel ломается. См. [FORGEPLAN-SETUP.md](../plugins/fpl-skills/skills/bootstrap/resources/guides/FORGEPLAN-SETUP.md).
- [ ] **`notes/`, `memory/`, `state/` tracked**. Graph viewer ожидает их как artifact source-of-truth.
- [ ] **`lance/` и `.fastembed_cache/` gitignored**. Time-travel пересобирает индекс из markdown.
- [ ] **`config.yaml` не содержит literal API ключи** (используй `api_key_env`). Иначе утечка в git history.
- [ ] **`session.yaml` gitignored**. Иначе time-travel слайдер видит runtime focus state вместо canonical artifact state.

Это те же правила что в [FORGEPLAN-SETUP.md](../plugins/fpl-skills/skills/bootstrap/resources/guides/FORGEPLAN-SETUP.md) — `@forgeplan/web` просто усиливает цену ошибки.

---

## Как интегрируется с маркетплейсом

| Marketplace плагин | Что производит | Что `@forgeplan/web` с этим делает |
|---|---|---|
| `fpl-skills` `/research` | `research/reports/*` (вне `.forgeplan/`) | Не показывает — research живёт вне графа артефактов by design. |
| `fpl-skills` `/refine` → `/rfc create` | RFC в `.forgeplan/rfcs/` | Рендерит как RFC-ноду, рёбра к related PRD/ADR. |
| `fpl-skills` `/sprint` → evidence + activate | PRD с linked evidence | Рендерит evidence-ноду прикреплённую к PRD; PRD становится «active» на графе. |
| `fpl-skills` `/audit` | Нет артефакта если evidence не залогирован | Если `forgeplan new evidence "audit results"` — evidence появляется. |
| `fpf` `/fpf decompose` | Таблица bounded contexts (нет артефакта если не сохранил) | Сохрани как ADR через `/rfc create` чтобы граф подхватил. |
| `forgeplan-orchestra` `/sync` | Mapping между артефактами и Orchestra-задачами | Не показывает Orchestra-сторону, но задачи через mapping имеют `Artifact-ID` для cross-reference. |
| `forgeplan-brownfield-pack` ingest | Bulk-импорт PRD/ADR из legacy-доков | Так же как нативные артефакты — полностью видны. |

---

## Workflow integration tips

### Ежедневно

- Держи `forgeplan-web` запущенным локально в табе. Когда CLI выводит интересное (после `/sprint`, `/audit`, `/forge-cycle`) — refresh таба чтобы увидеть граф update.
- Time-travel **дорогой** (запускает `git worktree` + reindex). Используй экономно.

### Code review

- Открой `forgeplan-web` time-travel side-by-side с PR diff.
- Слайдни на «до этого PR» чтобы увидеть граф который был при открытии PR.
- Помогает ревьюерам понять — соответствует ли PR-claim «implements PRD-042» состоянию PRD-042 на момент его написания.

### Онбординг нового коллеги

```
1. Клонирует репо.
2. forgeplan init -y && forgeplan scan-import   (rebuild local index)
3. cd ../forgeplan-web && pnpm dev               (старт viewer)
4. Открой localhost:5173, укажи новый clone.
5. Видит полный граф + может time-travel сквозь ключевые решения.
```

Заменяет 30-минутный «давай объясню архитектуру» — self-serve exploration.

---

## Что `@forgeplan/web` НЕ делает

Чтобы expectations были чёткими:

- **Не замена CLI.** CLI `forgeplan` это source of truth для создания/мутации артефактов. Web app read-only.
- **Не multi-user collaboration tool.** Это локальный viewer; несколько человек запускающих его на одном проекте видят независимое состояние.
- **Не замена Orchestra.** Orchestra трекает задачи (assignees, statuses, сообщения); `@forgeplan/web` показывает decision-артефакты. Разные слои.
- **Не hosted SaaS.** Работает на `localhost`. Если нужен hosted viewer для команды — хости SvelteKit-app сам.

---

## Troubleshooting

### «Time-travel слайдер возвращает 502»

Причина: в ephemeral worktree отсутствует `.forgeplan/config.yaml`. Значит `config.yaml` gitignored. Фикс по [FORGEPLAN-SETUP.md migration steps](../plugins/fpl-skills/skills/bootstrap/resources/guides/FORGEPLAN-SETUP.md#migration-from-a-misaligned-state).

### «Количество нод в графе отличается от `forgeplan list`»

Вероятная причина: `notes/` или `memory/` gitignored — web viewer читает из git, CLI читает с диска, поэтому расходятся. Трекни эти директории.

### «Web app не видит мой проект»

Укажи абсолютный путь содержащий `.forgeplan/`, не на `.forgeplan/` напрямую. Viewer ожидает навигировать с корня проекта.

### «Производительность медленная на больших проектах»

Lance index может вырасти на проектах с 100+ артефактами. Варианты:
- Запусти `forgeplan reindex` если подозреваешь что индекс фрагментирован.
- Viewer paginate-ит граф; используй search/filter вместо рендера всех нод сразу.

---

## Будущие направления

Per `forgeplan-web` README, planned:

- **PR-Diff overlays** (упомянуто выше) — визуализация артефактных дельт в PR.
- **Hosted viewer** — опциональный SaaS для команд которые хотят shared visualisation без self-host.
- **Plugin-aware аннотации** — показывать какой marketplace-плагин произвёл каждый артефакт (например «это evidence создан через `/audit` из fpl-skills»).

Следи за разработкой на [github.com/ForgePlan/forgeplan-web](https://github.com/ForgePlan/forgeplan-web).

---

## См. также

- [github.com/ForgePlan/forgeplan-web](https://github.com/ForgePlan/forgeplan-web) — install + run + contribute.
- [DEVELOPER-JOURNEY-RU.md](DEVELOPER-JOURNEY-RU.md) — narrative-онбординг маркетплейса; упоминает `@forgeplan/web` как рекомендуемый add-on когда у тебя есть артефакты.
- [FORGEPLAN-SETUP.md](../plugins/fpl-skills/skills/bootstrap/resources/guides/FORGEPLAN-SETUP.md) — `.gitignore` контракт; полная функциональность `@forgeplan/web` зависит от его корректности.
- [ARCHITECTURE-RU.md](ARCHITECTURE-RU.md) — 4-layer ментальная модель; `@forgeplan/web` визуализирует Layer 2 (Forgeplan).
