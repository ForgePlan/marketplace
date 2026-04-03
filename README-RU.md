[English](README.md) | [Русский](README-RU.md)

# ForgePlan Marketplace

Официальный маркетплейс плагинов Claude Code от [ForgePlan](https://github.com/ForgePlan) — UX, воркфлоу, инженерные и dev-инструменты.

**4 плагина** | **11 команд** | **4 агента** | **4 хука** | **3 базы знаний** | **318 файлов**

## Быстрый старт

```bash
# Подключить маркетплейс ForgePlan
/plugin marketplace add ForgePlan/marketplace

# Посмотреть доступные плагины
/plugin

# Установить конкретный плагин
/plugin install laws-of-ux@forgeplan-marketplace
```

## Доступные плагины

### laws-of-ux `v1.0.0`

> 30 UX-законов для ревью фронтенд-кода с конкретными рекомендациями.

Проверяет HTML/CSS/JS/React/Vue код на соответствие психологическим принципам из [lawsofux.com](https://lawsofux.com/) (Jon Yablonski).

| Компонент | Что получаете |
|-----------|-------------|
| `/ux-review` | Полный UX-аудит всех фронтенд-файлов |
| `/ux-law [имя]` | Справка по любому из 30 законов |
| **UX Reviewer** агент | Автоматически подключается при работе с фронтендом |
| **Auto-hints** хук | UX-подсказки при редактировании .html/.css/.jsx/.tsx/.vue |
| **База знаний** | 30 законов + 9 файлов code patterns (agentic RAG) |

**Категории:**

| Категория | Законов | Примеры |
|-----------|:-------:|---------|
| Эвристики | 4 | Закон Фиттса (44px цели), Закон Хика (макс. 7 пунктов навигации) |
| Когнитивные | 10 | Закон Миллера (7±2 чанка), Когнитивная нагрузка, Эффект Ресторфф |
| Гештальт | 6 | Близость (пропорции отступов), Подобие (единые токены) |
| Принципы | 10 | Порог Доэрти (400мс), Закон Якоба, Закон Постела |

```bash
/plugin install laws-of-ux@forgeplan-marketplace
```

---

### forgeplan-workflow `v1.0.0`

> Структурированный инженерный воркфлоу для пользователей [forgeplan](https://github.com/ForgePlan/forgeplan).

Автоматизация полного цикла разработки: маршрутизация задач, создание PRD, сборка, аудит, создание evidence, активация.

| Компонент | Что получаете |
|-----------|-------------|
| `/forge-cycle` | Полный цикл: health → route → shape → build → evidence → activate |
| `/forge-audit` | Мульти-экспертное ревью (6 параллельных агентов) со структурированным отчётом |
| **Forge Advisor** агент | Предлагает маршрутизацию перед кодингом, evidence после реализации |
| **Quality hooks** | Safety hook + проверка PRD перед редактированием кода |
| **KB методологии** | Agentic RAG: воркфлоу, артефакты, глубина, R_eff scoring, quality gates |

**Требуется:** `forgeplan` CLI (`cargo install forgeplan` или скачать бинарник)

```bash
/plugin install forgeplan-workflow@forgeplan-marketplace
```

---

### dev-toolkit `v1.0.0`

> Универсальный инженерный тулкит — работает с **любым проектом и языком**. Без зависимостей.

| Компонент | Что получаете |
|-----------|-------------|
| `/audit` | Мульти-экспертное ревью (4 агента: логика, архитектура, безопасность, тесты) |
| `/sprint` | Планировщик спринтов волнами: разбивка на фазы, параллельные агенты |
| `/recall` | Восстановление контекста сессии из git + CLAUDE.md + память (Hindsight/mem0) |
| **Dev Advisor** агент | Предлагает аудит после изменений, напоминает о тестах |
| **Safety hook** | Блокирует `git push --force`, `rm -rf /`, `DROP TABLE` |
| **Test reminder** | Находит новые публичные функции без тестов |

**Поддерживает:** JavaScript/TypeScript, Python, Rust, Go, Java, Ruby, PHP, C#

```bash
/plugin install dev-toolkit@forgeplan-marketplace
```

---

### fpf `v1.0.0`

> [First Principles Framework](https://github.com/ailev/FPF) — усилитель мышления для структурированного рассуждения. Автор: Анатолий Левенчук, расширен ForgePlan.

Одна команда `/fpf` маршрутизирует в нужный режим мышления.

| Компонент | Что получаете |
|-----------|-------------|
| `/fpf` | Универсальный роутер: `/fpf decompose`, `/fpf evaluate`, `/fpf reason`, `/fpf lookup` |
| `/fpf-decompose` | Разбить систему на bounded contexts, роли, интерфейсы |
| `/fpf-evaluate` | Сравнить альтернативы с F-G-R scoring и Trust Calculus |
| `/fpf-reason` | Цикл рассуждения ADI: 3+ гипотезы → проверка → заключение |
| **FPF Advisor** агент | Предлагает FPF при архитектурных и decision задачах |
| **База знаний** | 224 секции FPF спецификации + 4 applied pattern гайда (agentic RAG) |

```bash
/plugin install fpf@forgeplan-marketplace
```

---

## Как это работает

Каждый плагин использует **agentic RAG** — агент навигирует по иерархии секций, подгружая только нужные законы в контекст (~300 строк за раз), а не загружая всю базу целиком.

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

Хотите добавить плагин? См. **[CONTRIBUTING.md](CONTRIBUTING.md)**.

```bash
# Валидация перед отправкой
./scripts/validate-all-plugins.sh your-plugin-name
```

**Чеклист:**
1. Создать `plugins/your-plugin/` с `.claude-plugin/plugin.json`
2. Добавить запись в `.claude-plugin/marketplace.json`
3. Запустить скрипт валидации
4. Создать PR

## Структура плагина

```
plugins/your-plugin/
├── .claude-plugin/plugin.json    # Обязательно: name, version, description
├── commands/                     # Опционально: slash-команды
├── agents/                       # Опционально: специализированные агенты
├── skills/                       # Опционально: базы знаний (SKILL.md)
├── hooks/                        # Опционально: хуки автоматизации
└── README.md
```

## CI/CD

Каждый PR и push в `main` автоматически проверяется:
- Синтаксис и полнота `marketplace.json`
- Обязательные поля `plugin.json`
- Валидность `hooks.json`
- Frontmatter в `SKILL.md`

## Лицензия

MIT

---

Создано [ForgePlan](https://github.com/ForgePlan)
