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

## Поведение хуков

При установке нескольких плагинов их хуки накапливаются — каждый срабатывает независимо.

### Что и когда срабатывает

| Событие | Плагин | Хук | Что делает |
|---------|--------|-----|-----------|
| `PreToolUse:Bash` | dev-toolkit | safety-hook.sh | Блокирует опасные команды (force push, rm -rf /, DROP TABLE) |
| `PreToolUse:Bash` | forgeplan-workflow | forge-safety-hook.sh | Делегирует dev-toolkit если установлен, иначе свои проверки |
| `PreToolUse:Write` | forgeplan-workflow | pre-code-check.sh | Предупреждает, если нет активного PRD (кэш, TTL 5 мин) |
| `PostToolUse:Write\|Edit` | dev-toolkit | test-hint.sh | Предлагает тесты при добавлении публичных функций |
| `PostToolUse:Write\|Edit` | laws-of-ux | ux-hint.sh | Предлагает UX-ревью при изменении фронтенд-файлов |
| `PostToolUse:Bash` | forgeplan-orchestra | forge-sync-hint.sh | Предлагает sync с Orchestra после forgeplan activate/new |

### Если установлены и dev-toolkit, и forgeplan-workflow

У обоих есть safety hook на `PreToolUse:Bash`. Хук dev-toolkit срабатывает первым. Хук forgeplan-workflow обнаруживает, что dev-toolkit установлен, и пропускает проверку (exit 0), чтобы избежать дублирования.

### Временное отключение хука

Хуки нельзя отключить на одну сессию. Чтобы отключить хуки плагина, удалите его:
```
/plugin uninstall <имя-плагина>@ForgePlan-marketplace
```

---

## Рекомендуемые стеки

| Стек | Плагины | Подходит для |
|------|---------|-------------|
| **Минимальный** | dev-toolkit | Любой проект, без зависимостей |
| **Фронтенд** | dev-toolkit + laws-of-ux | Фронтенд/UI разработка |
| **FPF Мыслитель** | dev-toolkit + fpf | Архитектура, решения, reasoning |
| **Пользователь Forgeplan** | forgeplan-workflow + fpf | Пользователи forgeplan CLI |
| **Полный стек** | все 5 плагинов | Power users ForgePlan с Orchestra |

---

## Требования к зависимостям

| Плагин | Обязательно | Опционально |
|--------|-------------|-------------|
| laws-of-ux | Нет | — |
| dev-toolkit | Нет | Hindsight MCP (для /recall памяти), forgeplan CLI (для /sprint определения масштаба) |
| fpf | Нет | forgeplan CLI (для предложений артефактов) |
| forgeplan-workflow | forgeplan CLI | dev-toolkit (общие safety hooks) |
| forgeplan-orchestra | forgeplan CLI + Orchestra MCP | Hindsight MCP (для /session recall памяти) |

---

## Агенты-советники

Каждый из 5 основных плагинов включает фонового агента-советника, который активируется автоматически:

| Плагин | Советник | Что делает |
|--------|----------|-----------|
| dev-toolkit | `dev-advisor` | Предлагает `/audit` после изменений, напоминает о тестах, предупреждает о безопасности, рекомендует SPARC |
| forgeplan-workflow | `forge-advisor` | Предлагает `forgeplan route` перед кодингом, evidence после реализации, SPARC для Deep задач |
| fpf | `fpf-advisor` | Предлагает `/fpf decompose`, `evaluate`, `reason` для сложных решений |
| laws-of-ux | `ux-reviewer` | Проверяет фронтенд-код по 30 законам UX при изменении UI-файлов |
| forgeplan-orchestra | `orchestra-advisor` | Предлагает синхронизацию с Orchestra после `forgeplan activate/new` |

Советников не нужно вызывать — они наблюдают за работой и предлагают действия когда это уместно.

---

## Пакеты агентов

5 плагинов с агентами предоставляют 55 специализированных агентов:

| Пакет | Установка | Агентов | Назначение |
|-------|-----------|:-------:|-----------|
| **agents-core** | `/plugin install agents-core@ForgePlan-marketplace` | 11 | Ядро: debugger, code-reviewer, planner, tester, coder, researcher, reviewer |
| **agents-domain** | `/plugin install agents-domain@ForgePlan-marketplace` | 11 | Языки: TypeScript, Go, React, Next.js, Electron, mobile |
| **agents-pro** | `/plugin install agents-pro@ForgePlan-marketplace` | 21 | Security, архитектура, DDD, creative, research, инфраструктура |
| **agents-github** | `/plugin install agents-github@ForgePlan-marketplace` | 7 | GitHub: PR, issues, релизы, multi-repo, project boards, workflows |
| **agents-sparc** | `/plugin install agents-sparc@ForgePlan-marketplace` | 5 | SPARC методология: оркестратор + 4 фазовых специалиста |

---

## Как работают агенты

Claude вызывает агентов автоматически когда задача соответствует их экспертизе. Можно также запросить конкретного агента:

```
"Используй security-expert для проверки этого кода"
"Запусти typescript-pro для рефакторинга TypeScript"
"Используй debugger для этой ошибки"
```

### SPARC Методология

Когда `/sprint` определяет задачу как **Deep** и установлен `agents-sparc`, используются фазы SPARC:

1. **Specification** — требования и критерии приёмки
2. **Pseudocode** — алгоритмы и структуры данных
3. **Architecture** — дизайн системы и файловая структура
4. **Refinement** — TDD и реализация
5. **Completion** — интеграция и PR

Каждая фаза имеет **quality gate**. Следующая фаза получает полный вывод всех предыдущих — это предотвращает несогласованности.

Три режима исполнения (определяются автоматически):
- **Mode A** (Sequential): agents-sparc установлен → фазы по очереди
- **Mode B** (Team-up): TeamCreate доступен → фазы как команда с зависимостями
- **Mode C** (Inline): нет плагинов → Claude выполняет фазы сам

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
