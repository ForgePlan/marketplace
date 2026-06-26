[English](README.md) | [Русский](README-RU.md)

# CANVAS -- плагин методологии «дизайн-система -> код»

Проведи **дизайн-систему из Pencil** до **фреймворк-агностичного кода на Web Components** с независимым
гейтом качества на каждой передаче. CANVAS -- инстанс контракта суб-цикла AD/AID-PDLC (ADR-010 /
RFC-021): мастер (`canvas-coordinator`) ведёт шестифазную прогулку -- **C**apture, **A**udit,
**N**orm-check, **V**ectorize, **A**ssemble, **S**pread -- диспатча **каждую фазу и каждого верификатора
через `Task`**, так что генератор никогда не является верификатором, а fail-closed PreToolUse-хук
блокирует исходники дизайн-системы, пока не активирован токен-контракт (**hook-gate = Yes**).

CANVAS **агностичен к бренду/стилю**: визуальный стиль -- это вход, который даёт проект, читаемый из
forgeplan scope-артефакта (активного PRD/Brief, ADR с design-direction или зафиксированного решения по
design-токенам); если стиль ещё не зафиксирован, Designer сначала помогает выбрать его и фиксирует, прежде
чем начинать проектирование.

> `agents-canvas` -- агенты `canvas-*` -- входной скилл `/canvas`. Топология: фреймворк-агностичные
> **Web Components** (канонический слой на Lit) + тонкие обёртки React/Vue/Svelte/Angular/Solid. Токены:
> **Style-Dictionary -> CSS custom properties** из единого `tokens.json`, никогда не форкается.

## Быстрый старт

```bash
/plugin install agents-canvas@ForgePlan-marketplace   # нужен pencil MCP + плагин laws-of-ux
/canvas-init                                           # вооружить токен-гейт на этой ветке (один раз)
/canvas                                                # запустить прогулку C-A-N-V-A-S по срезу DS
```

`/canvas` отказывается стартовать без **источника дизайна** (путь к каноническому `.pen`-файлу + доступный
Pencil MCP) и списка целевых фреймворков. Нет дизайн-намерения? Greenfield -> `/bmad`, фича -> SPARC,
баг -> RIPER.

## Конвейер CANVAS

```
[C1 intake: задача «дизайн-система Pencil -> код»; координатор отказывается без источника дизайна + Pencil]
  |
  v  Capture     canvas-designer          Pencil DS -> снапшот DS + Design NOTE (non-freezable)   [Task sub]
       --[C4 Audit:      canvas-guardian  -- конвенции DS PASS -> EVID + C6-пин снапшота]-->
       --[C4 Norm-check: canvas-tester    -- трассируемость vs PRD/ADR/EVID -> EVID]-->
  v  Vectorize   canvas-porter-storybook  DS -> токен-контракт (RFC) + story-спеки + визуальный оракул + port-манифест
       --[Gate V (C4):   agents-core:tester + agents-pro:architect-reviewer -- СЕРТИФИЦИРУЮТ токен-RFC ->
                          координатор активирует токен-RFC + ставит tokens_active=true -> гейт разблокирует код]-->
  v  Assemble    canvas-coder             код Web Components + stories + визуальные регресс-тесты
       --[Gate Storybook (C4): canvas-storybook-validator -> EVID PASS/FAIL против Pencil-оракула]-->
       --[Gate Code (C4):      agents-core:code-reviewer + agents-core:tester + /laws-of-ux:ux-review -> EVID]-->
  v  Spread      canvas-porter-framework  (x5 ПАРАЛЛЕЛЬНЫЙ fan-out -- по одному пакету на агента,
                                           непересекающиеся файлы, изоляция git-worktree)
                                          обёртки React/Vue/Svelte/Angular/Solid + parity-тесты
       --[Gate Parity (C4):    agents-core:code-reviewer + agents-core:tester -> EVID]-->
  v  Retro       agents-pro:evidence-recorder -> терминальный C6 EVIDENCE + Hindsight
```

`canvas-coordinator` диспатчит всю прогулку через `Task` -- никакой привязки к главной сессии (Pencil MCP
работает в диспатченных саб-агентах). Блокирующий гейт на каждой стрелке. При FAIL координатор
возвращается к фазе-производителю (3 страйка -> `<<NEED_USER_INPUT>>`). При PASS он эмитит
`NEEDS_ACTIVATION` -- активирует оркестратор (ты); мастер никогда не активирует. **Активация токен-RFC --
это разблокировка C5**: только тогда хук пропускает записи в исходники дизайн-системы. **Фаза Spread --
единственный параллельный fan-out**: по одному агенту на пакет фреймворка, строгое владение файлами,
изоляция git-worktree, каждый `blockedBy` PASS код-гейта (FR-9).

## Ростер из 8 агентов (мастер + 7 ролей)

| Агент | Фаза | Профиль | Роль |
|---|---|---|---|
| `canvas-coordinator` | дирижёр | B-orchestrator (opus) | Владеет машиной состояний гейтов; диспатчит каждую фазу + верификатора через `Task`; пишет переходы phase + `tokens_active` через `canvas-lib.sh`; ничего из продукта не пишет, не активирует. |
| `canvas-designer` | **C** Capture | creator-contract | Проектирует/расширяет Pencil DS (атомарный дизайн + законы UX); экспортирует снапшот DS + Design NOTE. Обычный `Task`-саб-агент. |
| `canvas-guardian` | **A** Audit | C read-only reviewer | Аудит того, *как построена DS* -- refs/slots/токены/нейминг/атомарные слои/без clipping. Эмитит C4 EVID + C6-пин снапшота. |
| `canvas-tester` | **N** Norm-check | C reviewer + EVID | Валидирует DS против истины ForgePlan PRD/ADR/EVID -- покрытие + provenance. C4 EVID. |
| `canvas-porter-storybook` | **V** Vectorize | creator-contract | Переносит утверждённую DS в токен-контракт Style-Dictionary (RFC) + story-спеки + референс-скриншоты + port-манифест. Обычный `Task`-саб-агент. |
| `canvas-coder` | **A** Assemble | C-coder | Строит Storybook (Web Components + `*.stories.ts` + визуальные регресс-тесты + токен-тема). |
| `canvas-storybook-validator` | Gate **Storybook** | C reviewer + EVID | Валидирует **собранный Storybook** против источника Pencil (генератор != верификатор vs `canvas-coder`): покрытие story, визуальный паритет, play/интеракции, структурная a11y (axe), верность токенов, пороги покрытия. Владеет скиллом `canvas-storybook-test`. C4 EVID. |
| `canvas-porter-framework` | **S** Spread | C-coder | Портирует компоненты на React/Vue/Svelte/Angular/Solid против общего токен- и story-контракта; parity-тесты. По одному агенту на пакет в параллельном fan-out. |

C4-гейты также диспатчат **переиспользуемых** независимых ревьюеров (`laws-of-ux:ux-reviewer`,
`agents-core:code-reviewer` / `architect-reviewer`, `agents-core:tester`) -- генератор != верификатор.

## Интеграция с /smith

CANVAS зарегистрирован в мастер-оркестраторе **`/smith`** как **stage-master «дизайн-система -> код»**.
Когда `/smith` видит контекст «из Pencil в код» / дизайн-система (утверждённый `.pen` + запрос на
токены/Storybook/фреймворк-компоненты), он направляет работу в `canvas-coordinator` и даёт `/canvas`
провести прогулку. `/smith` никогда не смешивает методологии -- дизайн-систему в CANVAS, фич-логику в
SPARC, greenfield в BMAD, баги в RIPER. `canvas-coordinator` -- это L2 stage-master в этой карте; `/smith`
-- мастер-над-мастерами над ним.

## Что внутри

| Компонент | Описание |
|---|---|
| `/canvas` | Мастер-плейбук -- прогулка C-A-N-V-A-S, таблица ADR-010 C1-C6, обязательные C4-гейты, дисциплина диспатча FR-9, таблица «когда vs соседи». |
| `/canvas-init` | Однократная настройка на ветку -- вооружает токен-гейт (пишет `.forgeplan/canvas/state-<branch>.json`). |
| `/canvas-audit` | Одношаговый аудит конвенций DS (Guardian-как-команда). |
| `/canvas-review` | Пост-экспортный гейт код + UX (обёртка над `/laws-of-ux:ux-review`). |
| `/canvas-rule [name]` | Поиск конвенции DS или закона UX. |
| 8 агентов `canvas-*` | Ростер выше -- 1 мастер + 7 ролевых агентов. |
| `PreToolUse`-хук | `canvas-gate.sh` -- fail-closed; блокирует записи в дизайн-систему + пакеты фреймворков, пока токен-RFC не активен. |
| KB-скиллы | `canvas-design` (Pencil-дизайнер), `canvas-conventions` (правила Guardian), `canvas-port` (Pencil->Storybook->фреймворк), `canvas-truth-map` (DS<->ForgePlan), `canvas-storybook-test` (набор проверок Storybook-валидатора). Agentic-RAG, грузятся через входной скилл `/canvas`. |

## Дизайн-референсы, которые используют агенты

- **getdesign.md** -- `canvas-designer` обращается к [`https://getdesign.md/`](https://getdesign.md/)
  через WebFetch: кураторский каталог проанализированных продакшн-систем DESIGN.md (паттерны цвета/
  типографики/компонентов/токенов, машиночитаемо для AI-агентов). **Только референс** -- адаптируй под
  выбранный бренд твоего проекта (тот, что зафиксирован в scope-артефакте), никогда не копируй 1:1.
- **context7** -- агенты, касающиеся кода (`canvas-coder`, `canvas-porter-storybook`,
  `canvas-porter-framework`, `canvas-storybook-validator`, и `canvas-design` там, где он трогает
  Storybook/Style-Dictionary), **обязаны** использовать **context7 MCP** (`resolve-library-id` ->
  `query-docs`) для доков Storybook / Lit / Style-Dictionary / React / Vue / Svelte / Angular / Solid
  **до написания кода** и предлагать пользователю использовать context7 на любой вопрос о
  библиотеке/версии.

## Требования

- **MCP:** `pencil` (редактор `.pen` -- без него методология не работает).
- **Плагины:** `laws-of-ux` (KB законов UX, на которую опираются Designer + Gate Code; load-bearing --
  код-гейт запускает `/laws-of-ux:ux-review`).
- Опционально: `context7` MCP для живых доков библиотек (настоятельно рекомендуется для код-фаз).

## Статус

`beta` -- v0.1.0. Мастер `canvas-coordinator` + 7 ролевых агентов + пять KB-скиллов + команды + хук
`canvas-gate.sh` написаны по phased build из RFC-021 (на dogfooding против реальных экранов продукта).

## Лицензия

MIT
