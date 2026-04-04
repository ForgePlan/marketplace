[English](USAGE-GUIDE.md) | [Русский](USAGE-GUIDE-RU.md)

# ForgePlan Marketplace — Руководство

## Установка

### Шаг 1: Подключить маркетплейс (один раз)

```
/plugin marketplace add ForgePlan/marketplace
```

### Шаг 2: Установить нужные плагины

```bash
# Универсальные (любой проект)
/plugin install dev-toolkit@ForgePlan-marketplace    # /audit, /sprint, /recall
/plugin install fpf@ForgePlan-marketplace             # /fpf (structured reasoning)

# Фронтенд
/plugin install laws-of-ux@ForgePlan-marketplace      # /ux-review, /ux-law

# Для пользователей Forgeplan
/plugin install forgeplan-workflow@ForgePlan-marketplace  # /forge-cycle, /forge-audit
/plugin install forgeplan-orchestra@ForgePlan-marketplace  # /sync, /session
```

```
/reload-plugins
```

### Обновление

```
/plugin marketplace update ForgePlan-marketplace
/plugin install <имя-плагина>@ForgePlan-marketplace   # переустановить каждый
/reload-plugins
```

---

## Шпаргалка

| Команда | Плагин | Что делает |
|---------|--------|-----------|
| `/recall` | dev-toolkit | Восстановить контекст (git + CLAUDE.md + память) |
| `/sprint <задача>` | dev-toolkit | Адаптивный спринт: Tactical→Standard→Deep |
| `/audit` | dev-toolkit | Мульти-экспертный код-ревью (4 агента) |
| `/fpf <вопрос>` | fpf | Structured reasoning: decompose, evaluate, reason, lookup |
| `/ux-review` | laws-of-ux | UX-аудит по 30 законам UX |
| `/ux-law <имя>` | laws-of-ux | Справка по конкретному UX-закону |
| `/forge-cycle` | forgeplan-workflow | Полный цикл (route→shape→build→evidence→activate) |
| `/forge-audit` | forgeplan-workflow | Мульти-экспертный аудит (6 агентов) |
| `/sync` | forgeplan-orchestra | Bidirectional sync Forgeplan ↔ Orchestra |
| `/session` | forgeplan-orchestra | Session Start Protocol с Inbox Pattern |

---

## Ежедневный воркфлоу

### Утро — восстановить контекст

```
/recall
```

Покажет: текущую ветку, незакоммиченные изменения, последние коммиты, здоровье проекта.

### Перед задачей — подумать

```
/fpf decompose наша платёжная система    # разбить на части
/fpf evaluate Redis vs Memcached         # сравнить варианты
/fpf reason почему тесты нестабильны     # structured debugging
```

### Реализация — адаптивный спринт

```
/sprint добавить аутентификацию
```

Спринт сам определяет масштаб:

| Масштаб | Что происходит |
|---------|---------------|
| **Tactical** (typo, config) | 1 агент, быстрые волны, тест |
| **Standard** (фича, 1-3 дня) | ADI checkpoint, 2 агента, lint + types + test |
| **Deep** (модуль, архитектура) | Обязательный ADI, 3-4 агента, полный pipeline + release |

### После кода — проверить

```
/audit
```

4 агента параллельно: логика, архитектура, безопасность, тесты. Отчёт: CRITICAL/HIGH/MEDIUM/LOW с file:line.

### Фронтенд — UX-проверка

```
/ux-review                    # сканирует все фронтенд-файлы
/ux-law fitts                 # справка по закону Фиттса (44px цели)
/ux-law hick                  # справка по закону Хика (макс 7 пунктов навигации)
```

---

## Что добавить в CLAUDE.md проекта

```markdown
## Команды

| Команда | Когда |
|---------|-------|
| `/recall` | Начало сессии — восстановить контекст |
| `/sprint <задача>` | Реализация фичи (авто-масштабирование) |
| `/audit` | После кода — мульти-экспертный ревью |
| `/fpf <вопрос>` | Архитектурные решения, сравнения, отладка |
| `/ux-review` | После вёрстки — UX-аудит |
```

Если используете Forgeplan:

```markdown
## Forgeplan Workflow

- `forgeplan route "задача"` перед кодом → определить depth
- `/forge-cycle` → полный цикл (health→route→shape→build→evidence→activate)
- `/sync` → sync артефактов Forgeplan ↔ задач Orchestra
- `/session` → Session Start Protocol с Inbox triage
```

---

## Детали плагинов

### dev-toolkit — Универсальный тулкит

**Без зависимостей.** Работает с любым проектом и языком.

- `/audit` — 4 ревьюера: логика, архитектура, безопасность, тесты
- `/sprint` — Разбивает задачи на волны, адаптируется по сложности
- `/recall` — Читает CLAUDE.md, git status, память (Hindsight/mem0 если есть)
- Safety hook блокирует: `git push --force`, `git reset --hard`, `rm -rf /`
- Напоминание о тестах при добавлении публичных функций

### fpf — First Principles Framework

**Без зависимостей.** На основе FPF Анатолия Левенчука.

- `/fpf` — Универсальный роутер (decompose/evaluate/reason/lookup)
- `/fpf decompose <система>` — Bounded contexts, роли, интерфейсы
- `/fpf evaluate <A vs B>` — F-G-R scoring, ADI reasoning cycle
- `/fpf reason <проблема>` — 3+ гипотезы → проверка → заключение
- 224 секции FPF спецификации + 4 applied pattern гайда

### laws-of-ux — UX-ревью фронтенда

**Без зависимостей.** На основе lawsofux.com (Jon Yablonski).

- `/ux-review` — Сканирует HTML/CSS/JS/React/Vue по 30 UX-законам
- `/ux-law <имя>` — Справка по закону с frontend implications
- 30 законов в 4 категориях: Эвристики, Когнитивные, Гештальт, Принципы
- 9 файлов code patterns с примерами VIOLATION/CORRECT
- Авто-подсказки при редактировании фронтенд-файлов

### forgeplan-workflow — Структурированный цикл разработки

**Требуется:** forgeplan CLI (приватное приложение, доступ через администратора).

- `/forge-cycle` — 8 шагов: health→route→shape→build→test→evidence→activate→commit
- `/forge-audit` — 6 параллельных ревьюеров
- KB методологии: workflow, артефакты, глубина, R_eff scoring, quality gates
- Safety hook + проверка PRD перед редактированием кода

### forgeplan-orchestra — Unified Workflow

**Требуется:** forgeplan CLI + Orchestra MCP server.

- `/sync` — Bidirectional diff: артефакты Forgeplan ↔ задачи Orchestra
- `/session` — Session Start Protocol: context→inbox→health→triage→synthesis
- KB unified workflow: архитектура, setup, поля, playbook, конфигурации
- Status↔Phase: Backlog=Shape, To Do=Validate, Doing=Code, Review=Evidence, Done=Done

---

## Решение проблем

### Плагины не загружаются

```
/reload-plugins
/doctor          # проверить ошибки
```

### Хуки шумят (сообщения на каждый edit)

Обновите до v1.1.1+: хуки используют `type: "command"` (тихие скрипты).

```
/plugin marketplace update ForgePlan-marketplace
/plugin install <плагин>@ForgePlan-marketplace
/reload-plugins
```

### Ошибка имени маркетплейса на macOS

Используйте точный регистр: `ForgePlan/marketplace` (заглавные F и P). macOS APFS case-insensitive + Node.js fs.rename требует совпадения регистра.
