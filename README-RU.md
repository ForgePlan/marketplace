[English](README.md) | [Русский](README-RU.md)

# ForgePlan Marketplace

Официальный маркетплейс плагинов Claude Code от [ForgePlan](https://github.com/ForgePlan) — UX, воркфлоу, инженерные и dev-инструменты.

**10 плагинов** | **60+ агентов** | **13 команд** | **4 базы знаний** | [Руководство](docs/USAGE-GUIDE-RU.md)

## Быстрый старт

```bash
# 1. Подключить маркетплейс ForgePlan
/plugin marketplace add ForgePlan/marketplace

# 2. Установить первый плагин (работает с любым проектом, без зависимостей)
/plugin install dev-toolkit@ForgePlan-marketplace

# 3. Перезагрузить плагины
/reload-plugins

# 4. Попробовать — запустить аудит кода
/audit
```

## С чего начать?

> **Впервые здесь?** Выберите строку, которая подходит вам. Каждая строка — готовый набор, не нужно читать весь каталог.

| Ваша роль | Установить | Зачем |
|-----------|-----------|-------|
| Любой разработчик | dev-toolkit + agents-core | Универсальные инструменты |
| Фронтенд | + laws-of-ux + agents-domain | UX + агенты фреймворков |
| Архитектор | + fpf + agents-pro + agents-sparc | Мышление + SPARC |
| Пользователь Forgeplan | + forgeplan-workflow + forgeplan-orchestra | Полный цикл |
| Всё сразу | Все 10 плагинов | Полная экосистема |

## Доступные плагины

### [dev-toolkit](plugins/dev-toolkit/)

> [!TIP]
> **Рекомендуется первым** — работает с любым проектом и языком, без зависимостей.

Универсальный инженерный тулкит — аудит, спринт-планирование и восстановление контекста сессии.

| Компонент | Что получаете |
|-----------|-------------|
| `/audit` | Мульти-экспертный обзор кода (4 агента: логика, архитектура, безопасность, тесты) |
| `/sprint` | Волновой спринт: разбивка на фазы, параллельные агенты |
| `/recall` | Восстановление контекста из git + CLAUDE.md + память (Hindsight/mem0/forgeplan) |
| **Dev Advisor** | Предлагает аудит после изменений, напоминает о тестах |
| **Safety hook** | Блокирует `git push --force`, `rm -rf /`, `DROP TABLE` |
| **Test reminder** | Обнаруживает новые публичные функции без тестов |

**Поддерживает:** JavaScript/TypeScript, Python, Rust, Go, Java, Ruby, PHP, C#

```bash
/plugin install dev-toolkit@ForgePlan-marketplace
```

---

### [laws-of-ux](plugins/laws-of-ux/)

> 30 законов UX для код-ревью фронтенда с практическими рекомендациями.

Проверка HTML/CSS/JS/React/Vue кода по психологическим принципам из [lawsofux.com](https://lawsofux.com/) Джона Яблонски.

| Компонент | Что получаете |
|-----------|-------------|
| `/ux-review` | Полный UX-аудит всех frontend файлов |
| `/ux-law [имя]` | Поиск любого из 30 законов |
| **UX Reviewer** | Автоактивация для frontend задач |
| **Auto-hints** | UX-подсказки при редактировании .html/.css/.jsx/.tsx/.vue |
| **База знаний** | 30 законов + 9 файлов code patterns (agentic RAG) |

| Категория | Законов | Примеры |
|-----------|:-------:|---------|
| Эвристики | 4 | Закон Фиттса (44px цели), Закон Хика (макс 7 пунктов навигации) |
| Когнитивные | 10 | Закон Миллера (7±2 чанка), Когнитивная нагрузка, Эффект Ресторфф |
| Гештальт | 6 | Близость (пропорции отступов), Сходство (единообразие токенов) |
| Принципы | 10 | Порог Доэрти (400мс), Закон Якоба, Закон Постеля |

```bash
/plugin install laws-of-ux@ForgePlan-marketplace
```

---

### [fpf](plugins/fpf/)

> [First Principles Framework](https://github.com/ailev/FPF) — усилитель мышления для структурированного рассуждения. Анатолий Левенчук, доработано ForgePlan.

Одна команда `/fpf` направляет к нужному режиму — декомпозиция, оценка, рассуждение или справка.

| Компонент | Что получаете |
|-----------|-------------|
| `/fpf` | Роутер: `/fpf decompose`, `/fpf evaluate`, `/fpf reason`, `/fpf lookup` |
| `/fpf-decompose` | Разбивка систем на bounded contexts, роли, интерфейсы |
| `/fpf-evaluate` | Сравнение альтернатив с F-G-R скорингом и Trust Calculus |
| `/fpf-reason` | ADI цикл: 3+ гипотезы → проверка → вывод |
| **FPF Advisor** | Предлагает FPF при задачах архитектуры/решений |
| **База знаний** | 224 секции FPF спецификации + 4 гайда (agentic RAG) |

```bash
/plugin install fpf@ForgePlan-marketplace
```

---

### [forgeplan-workflow](plugins/forgeplan-workflow/)

> Структурированный инженерный воркфлоу для пользователей [forgeplan](https://github.com/ForgePlan/forgeplan).

Автоматизация полного dev-цикла: маршрутизация → PRD → сборка → аудит → evidence → активация.

| Компонент | Что получаете |
|-----------|-------------|
| `/forge-cycle` | Полный цикл: health → route → shape → build → evidence → activate |
| `/forge-audit` | Мульти-экспертный обзор (6 параллельных агентов) |
| **Forge Advisor** | Предлагает маршрутизацию до кода, evidence после реализации |
| **Quality hooks** | Safety hook + проверка PRD перед редактированием кода |
| **База знаний** | Agentic RAG: воркфлоу, артефакты, глубина, R_eff, quality gates |

> [!WARNING]
> Требуется `forgeplan` CLI — приватное приложение, доступ через администратора проекта.

```bash
/plugin install forgeplan-workflow@ForgePlan-marketplace
```

---

### [forgeplan-orchestra](plugins/forgeplan-orchestra/)

> Объединённый воркфлоу: артефакты Forgeplan + [Orchestra](https://orch.so) трекинг задач + Claude Code AI.

Двунаправленная синхронизация, Session Start Protocol с Inbox Pattern, база знаний методологии.

| Компонент | Что получаете |
|-----------|-------------|
| `/sync` | Двунаправленная синхронизация: артефакты Forgeplan ↔ задачи Orchestra |
| `/session` | Session Start Protocol: health + inbox + задачи + синтез + следующее действие |
| **Orchestra Advisor** | Предлагает синхронизацию при создании/активации артефактов |
| **Unified Workflow KB** | Agentic RAG: архитектура, настройка, плейбук, конфиги (Solo/Team/Medium) |

> [!WARNING]
> Требуется `forgeplan` CLI + Orchestra MCP сервер (`orch`).

```bash
/plugin install forgeplan-orchestra@ForgePlan-marketplace
```

---

## Пакеты агентов

Пять специализированных пакетов с 55 готовыми агентами для Claude Code.

Установка любого пакета: `/plugin install <имя-пакета>@ForgePlan-marketplace`

| Пакет | Агентов | Специализация | Install |
|-------|:-------:|--------------|---------|
| [agents-core](plugins/agents-core/) | 11 | debugger, code-reviewer, planner, tester, TDD, production-validator | `agents-core` |
| [agents-domain](plugins/agents-domain/) | 11 | TypeScript, Go, React, Next.js, Electron, mobile, WebSocket | `agents-domain` |
| [agents-pro](plugins/agents-pro/) | 21 | security, architecture, creative, research, infrastructure | `agents-pro` |
| [agents-github](plugins/agents-github/) | 7 | PR, issues, releases, multi-repo, workflows | `agents-github` |
| [agents-sparc](plugins/agents-sparc/) | 5 | SPARC: spec → pseudo → architecture → refinement | `agents-sparc` |

---

## Standalone агенты

### [discover](agents/discover/)

> Онбординг brownfield-проектов — структурированный анализ с multi-pass discovery и приоритетом источников. Код первым, документация последней.

| Режим | Для | Что происходит |
|-------|-----|----------------|
| `default` | <100K LOC | Один агент, 4 слоя последовательно (~15-30 мин) |
| `--deep` | 100K-2M LOC | Команда агентов, параллельные модули + углубление (~1-2 часа) |
| `--full` | 2M+ LOC | Deep + синтез: анализ пробелов, карта влияния (~2-4 часа) |

**3 прохода**: Discovery → Deepening → Synthesis
**3 уровня доверия**: Код (T1) > Тесты (T2) > Документация (T3)

Подробнее: [agents/discover/README.md](agents/discover/README.md)

---

## Как это работает

Каждый плагин использует **agentic RAG** — агент навигирует по иерархии секций, подгружая только нужный контент (~300 строк за раз), а не загружая всю базу целиком.

```
SKILL.md (роутер)
  → sections/01-heuristics/_index.md → specific-law.md
  → sections/02-cognitive/_index.md  → specific-law.md
  → sections/05-code-patterns/       → конкретные CSS/HTML/JS правила
```

## Альтернатива: только Skill (через skills.sh)

Если нужна только база знаний без команд, агентов и хуков:

```bash
npx skills add ForgePlan/laws-of-ux-standalone -g
```

| | Плагин (маркетплейс) | Skill (npx) |
|---|:---:|:---:|
| 30 UX-законов | Да | Да |
| 9 файлов code patterns | Да | Да |
| Команда `/ux-review` | Да | Нет |
| Команда `/ux-law` | Да | Нет |
| UX Reviewer агент | Да | Нет |
| Auto-hint хуки | Да | Нет |

## Обновление

Получить последние версии плагинов:

```bash
/plugin marketplace update forgeplan-marketplace
```

## Участие в разработке

Хотите добавить плагин? См. **[CONTRIBUTING.md](CONTRIBUTING.md)** — структура плагина, CI/CD валидация и процесс подачи.

## Лицензия

MIT

---

Создано [ForgePlan](https://github.com/ForgePlan)
