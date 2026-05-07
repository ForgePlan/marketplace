[English](PLAYBOOK.md) | [Русский](PLAYBOOK-RU.md)

# Памятка — какая команда для какой задачи

Практическая карта «у меня такая ситуация → вот что поставить, вот что запустить». Дополняет [DEVELOPER-JOURNEY-RU.md](DEVELOPER-JOURNEY-RU.md) (повествовательное знакомство) и [USAGE-GUIDE-RU.md](USAGE-GUIDE-RU.md) (справочник).

---

## Краткая таблица решений

| Ваша ситуация | Что нужно поставить | Какую команду запустить |
|---|---|---|
| Пустой проект, идеи ещё нет | `fpl-skills` | `/fpl-init` потом `/research <тема>` |
| Пустой проект, есть сырая идея | `fpl-skills` + `forgeplan-workflow` | `/fpl-init` → `/shape "<идея>"` → `/forge-cycle` |
| Готовый проект, нужна новая фича | `fpl-skills` + `forgeplan-workflow` | `/forge-cycle "<задача>"` (одна команда, весь цикл) |
| Готовый проект, хочу прогон на ночь | + `agents-sparc` + `agents-pro` | `/autorun "<задача>"` (вызывает `/forge-cycle`) |
| Унаследованный код плюс старая документация | + `forgeplan-brownfield-pack` | Discover Agent → playbooks → `/forge-cycle` |
| План есть, но сыроват | `fpl-skills` | `/refine <план>` |
| Нужно выбрать между вариантами | `fpf` | `/fpf-evaluate "А или Б"` |
| Сложный баг | `fpl-skills` | `/diagnose "<симптом>"` |
| Перед слиянием — проверить код | `fpl-skills` | `/audit` |
| Командная работа через несколько сессий | + `forgeplan-orchestra` | `/session` → `/sync` |

---

## Сценарий 1 — Пустой проект, сырая идея

**Что**: создал новый репозиторий, в голове идея, на выходе хочешь рабочую функциональность плюс артефакты forgeplan (PRD, ADR, evidence).

**Однократная настройка**:
```bash
brew install ForgePlan/tap/forgeplan
```

```
/plugin install fpl-skills@ForgePlan-marketplace
/plugin install forgeplan-workflow@ForgePlan-marketplace
/reload-plugins
```

**Порядок действий**:
```
/fpl-init                        # Шаг 1: первичная настройка проекта (.forgeplan/, CLAUDE.md, docs/agents/)
/shape "<твоя идея>"             # Шаг 2: интервью с нуля → черновик PRD
/refine PRD-NNN                  # Шаг 3: довести до ума, добавить ADR на ключевые решения
/forge-cycle "<уточнённая задача>"  # Шаг 4: автоматический цикл (route → build → evidence → activate)
```

Если хочешь без интервью и сразу на автомат:
```
/fpl-init
/autorun "<идея>"                # внутри вызовет /forge-cycle, тот сам всё оформит
```

---

## Сценарий 2 — Продумать фичу через интервью

**Что**: идея неоформленная, хочется получить структурированный артефакт, и при этом чтобы тебе **задавали правильные вопросы**, а не давали пустой шаблон для самостоятельного заполнения.

**Настройка**:
```
/plugin install fpl-skills@ForgePlan-marketplace
```

**Порядок**:
```
/shape "<черновое описание>"     # интервью, по одному вопросу за раз
                                 # на выходе: черновик PRD с проблемой, целями, пользователями, объёмом, рисками
```

`/shape` задаёт 8-12 направленных вопросов, проверяет тонкие ответы встречным сценарием, сразу подсвечивает противоречия и пишет черновик PRD в forgeplan (или markdown-файл, если CLI forgeplan не установлен). Это **передняя сторона** жизненного цикла: `/refine` шлифует то что уже написано, а `/shape` пишет план вместе с тобой.

После `/shape`:
```
/refine PRD-NNN                  # добавить ADR, уточнить функциональные требования
/research <вопрос на котором споткнулись>  # если в интервью всплыла неопределённость
/rfc create                      # если архитектура заслуживает RFC
```

---

## Сценарий 3 — Полный автомат с командой агентов

**Что**: хочется одной командой получить всё — оформление, план, разработку командой агентов, ревью, evidence, активацию. Без участия.

**Настройка**:
```
/plugin install fpl-skills@ForgePlan-marketplace
/plugin install forgeplan-workflow@ForgePlan-marketplace
/plugin install agents-sparc@ForgePlan-marketplace
/plugin install agents-core@ForgePlan-marketplace
/plugin install agents-pro@ForgePlan-marketplace
/reload-plugins
```

**Запуск (одна команда)**:
```
/autorun "implement <задача>"
```

**Что происходит под капотом**:
```
/autorun
  ├── находит установленный forgeplan-workflow
  └── передаёт управление в /forge-cycle
        ├── Шаг 1 — проверка состояния (forgeplan health)
        ├── Шаг 2 — подтверждение задачи
        ├── Шаг 3 — выбор глубины (route)
        ├── Шаг 4 — оформление (PRD, validate)
        │   └── для Deep: обязательное ADI (forgeplan reason → 3+ гипотезы)
        ├── Шаг 5 — сборка → /sprint
        │   ├── TeamCreate(координатор + 5-8 исполнителей в 2-5 волнах)
        │   ├── для Deep: фазы SPARC (Spec → Pseudocode → Architecture → Refinement)
        │   └── каждый исполнитель может вызвать вспомогательных агентов из agents-pro / agents-domain
        ├── Шаг 6 — ревью (4-6 ревьюеров параллельно)
        ├── Шаг 7 — evidence (вердикт + соответствие контексту + R_eff)
        └── Шаг 8 — активация и подготовка коммита
```

Красные линии (push в main, запись секретов, развёртывание в продакшен) **останавливают автопилот** и просят явное одобрение.

---

## Сценарий 4 — Унаследованный проект (brownfield)

**Что**: достался старый код плюс куча накопившейся документации (хранилище Obsidian, набор ADR в формате MADR, выгрузки из Confluence). Нужно перенести знания в граф артефактов forgeplan.

**Настройка**:
```
/plugin install fpl-skills@ForgePlan-marketplace
/plugin install forgeplan-workflow@ForgePlan-marketplace
/plugin install forgeplan-brownfield-pack@ForgePlan-marketplace
/reload-plugins
```

**Что входит** (после переноса skills из ForgePlan repo — следующий PR):
- 12 скиллов извлечения (язык предметной области, поиск сценариев использования, вывод намерений, детектор инвариантов, причинные связи, триангуляция гипотез, упаковка интервью, оформление сценариев, куратор графа знаний, воспроизведение, проверка воспроизводимости, упаковка для RAG)
- Оркестрационные плейбуки (extract-business-logic, phase-transitions)
- Способы интеграции (autoresearch-hooks, forgeplan-mcp-additions, rag-export-format)
- Двухуровневая методология (Factum / Intent) с разметкой степени уверенности
- Карты соответствий: C4 → forgeplan, DDD → forgeplan

**Двухуровневое извлечение**:
- **Уровень 1 — Факт**: что код реально делает, доказуемо чтением. Уверенность 100%, проверяется повторным `grep`.
- **Уровень 2 — Намерение**: почему бизнес выбрал именно такую реализацию. Уверенность переменная (подтверждено / уверенно выведено / выведено / предположение / неизвестно). Каждое утверждение помечается тегом.

**Порядок**:
```
/fpl-init                                     # если ещё не настроен
# Запускаем Discover Agent (отдельный, в agents/discover/) для карты кодовой базы
# Дальше связка скиллов извлечения:
/extract ubiquitous-language                  # построить словарь предметной области
/extract use-cases                            # найти пользовательские сценарии
/extract intent --confidence-tagged           # вывести бизнес-намерения с разметкой уверенности
/extract invariants                           # выявить правила которые должны выполняться всегда
/triangulate hypotheses                       # цикл ADI на спорных утверждениях
/interview <владелец предметной области>      # сверить намерения с реальностью
/forge-cycle "<воспроизвести ключевой поток>" # каноническое воспроизведение
```

На выходе — граф forgeplan с PRD, RFC, ADR, выведенными из старого кода и документации.

---

## Сценарий 5 — Ночной прогон с полной методологией

**Что**: запустить сложную задачу перед сном, проснуться к готовой функциональности с полной методологией (SPARC для кода, ADI для решений, evidence с R_eff).

**Полная настройка**:
```
/plugin install fpl-skills@ForgePlan-marketplace
/plugin install forgeplan-workflow@ForgePlan-marketplace
/plugin install fpf@ForgePlan-marketplace
/plugin install agents-sparc@ForgePlan-marketplace
/plugin install agents-core@ForgePlan-marketplace
/plugin install agents-pro@ForgePlan-marketplace
/reload-plugins
```

**Перед сном**:
```
/autorun "implement <сложная задача> with deep methodology"
```

**Что отрабатывает само**:
- `forgeplan health` первым делом — выявляет слепые пятна до старта
- Route → если глубина Deep, обязательный ADI (`forgeplan reason` → 3+ гипотезы с дедукцией → индукцией)
- Shape → PRD + RFC + ADR с проверками BMAD (встроены в `forgeplan validate`)
- Build → фазы SPARC через agents-sparc; каждая фаза подключает специализированных агентов из agents-pro
- Audit → 4-6 экспертов (логика, архитектура, безопасность, тесты; плюс ux-reviewer если фронтенд)
- Evidence → подсчёт R_eff с поправками на соответствие контексту (CL3 — тот же контекст, лучший случай; CL0 — противоположный, штраф 0.9)
- Activate → если R_eff > 0; иначе останов с указанием чего не хватает
- Коммит подготовлен с `Refs: PRD-NNN, ADR-MMM`

**Что останавливает автопилот** (красные линии):
- `git push --force` или push в main
- Запись секретов (значения вида `sk-*`, `AIza*`, `ant-*`)
- Деструктивные операции (`rm -rf`, `DROP TABLE`)
- Внешние эффекты (deploy, публикация пакета)
- Дорогие операции (массовые вызовы LLM сверх лимита)

Утром — `forgeplan health` и `git log` покажут что доехало, а что встало на красной линии.

---

## Сценарий 6 — Когда нужны `/fpf` и ADI

**Что**: не нужен полный жизненный цикл — нужно структурное мышление на конкретный вопрос.

| Форма вопроса | Команда |
|---|---|
| «Как разбить систему на части?» | `/fpf-decompose "<система>"` — таблица ограниченных контекстов + Mermaid |
| «Что выбрать — А или Б?» | `/fpf-evaluate "А или Б"` — F-G-R оценка + ADI 3+ гипотезы |
| «Почему это происходит?» (отладка) | `/fpf-reason "<симптом>"` — гипотеза → проверка → вывод |
| «Что значит <термин FPF>?» | `/fpf-lookup "<термин>"` — 224 раздела спецификации |

**ADI вызывается и автоматически**:
- В `/forge-cycle` на шаге 4 (Reason) для задач глубины Deep+
- В `/autorun` для разрешения тупиков (максимум 3 круга, потом подсветка)
- Обязательно через `forgeplan reason PRD-NNN` для активации Standard+

Так что не всегда нужно явно вызывать `/fpf-reason` — если используешь `/forge-cycle` или `/autorun`, ADI уже работает за кулисами.

---

## Сценарий 7 — Командная работа через несколько сессий

**Что**: вы работаете командой через разные сессии. Задачи в Orchestra. Каждое утро — разбор входящих сигналов.

**Настройка**:
```
/plugin install fpl-skills@ForgePlan-marketplace
/plugin install forgeplan-orchestra@ForgePlan-marketplace
/reload-plugins
```

**Утро каждый день**:
```
/session                         # Inbox Pattern: forgeplan health + сообщения Orchestra + изменения в git + разбор
/sync                            # двусторонняя синхронизация Forgeplan ↔ Orchestra (Статус ↔ Фаза)
# Берём задачу из синтеза inbox-а
/forge-cycle "<задача>"          # полный цикл как в сценарии 3
```

Соответствие статусов:
- Orchestra `Backlog` ↔ Forgeplan `Shape`
- Orchestra `To Do` ↔ Forgeplan `Validate`
- Orchestra `Doing` ↔ Forgeplan `Code`
- Orchestra `Review` ↔ Forgeplan `Evidence`
- Orchestra `Done` ↔ Forgeplan `Done`

---

## Рекомендуемые наборы (по ролям)

| Роль | Плагины |
|---|---|
| 🟢 Соло-разработчик | `fpl-skills` + `forgeplan-workflow` |
| 🎨 Фронтенд | + `laws-of-ux` + `agents-domain` |
| 🏛 Архитектор / тех-лид | + `fpf` + `agents-sparc` + `agents-pro` |
| 👥 Команда с Orchestra | + `forgeplan-orchestra` |
| 🏚 Унаследованный проект | + `forgeplan-brownfield-pack` + `agents-pro` |
| 🌙 Ночной прогон | Все перечисленные (полный стек) |

---

## См. также

- [DEVELOPER-JOURNEY-RU.md](DEVELOPER-JOURNEY-RU.md) — повествовательное знакомство с 4 персонами
- [USAGE-GUIDE-RU.md](USAGE-GUIDE-RU.md) — справочник: команды, хуки, troubleshooting
- [METHODOLOGIES-RU.md](METHODOLOGIES-RU.md) — что встроено в forgeplan (BMAD, OpenSpec, ADI, F-G-R, DDR и т.д.) и что внешнее
- [ARCHITECTURE-RU.md](ARCHITECTURE-RU.md) — четырёхслойная ментальная модель
- [MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS-RU.md](MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS-RU.md) — переход с устаревшего dev-toolkit
- [TRACKER-INTEGRATION-RU.md](TRACKER-INTEGRATION-RU.md) — рецепты для Orchestra / GitHub / Linear / Jira
- [FORGEPLAN-WEB-RU.md](FORGEPLAN-WEB-RU.md) — браузерный просмотрщик графа артефактов с time-travel
