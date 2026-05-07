[English](MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS.md) | [Русский](MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS-RU.md)

# Миграция: `dev-toolkit` → `fpl-skills`

15-минутный гайд с минимальным риском. Прочитай один раз, прими решение, потом выполни. **Никакие forgeplan-артефакты не трогаются, код не меняется** — только локальный набор Claude Code плагинов и упоминания в `CLAUDE.md`.

> [!IMPORTANT]
> Не говори Claude «переедь меня с dev-toolkit на fpl-skills» не прочитав этот гайд. Claude может выполнить большинство шагов, но **скоп изменений** — это то что важно понять. После понимания само исполнение механическое.

> [!TIP]
> **Предпочитай автоматический скилл.** Начиная с `fpl-skills` v1.1.1, скилл [`/migrate-from-dev-toolkit`](../plugins/fpl-skills/skills/migrate-from-dev-toolkit/SKILL.md) проводит тебя через шаги этого гайда интерактивно: probe state, скан `CLAUDE.md` за `/dev-toolkit:*` ссылками, спрашивает Mode A или Mode B один раз, исполняет file-level изменения с backup-ами. Скилл сам не вызывает `/plugin install` — говорит какие команды набрать. Используй скилл если такой flow удобен; этот гайд остаётся каноничной ручной процедурой для всего что делает скилл.

---

## TL;DR

- `fpl-skills` — это надмножество `dev-toolkit`: те же `/audit` и `/sprint`, плюс ещё 13 скиллов, плюс `/fpl-init`.
- Миграция **side-by-side совместима**: ставишь `fpl-skills`, проверяешь, потом удаляешь `dev-toolkit` (или держишь оба в переходный период).
- Имена slash-команд пересекаются (`/audit`, `/sprint`). Claude Code разрешает конфликт через namespacing: `/dev-toolkit:audit` vs `/fpl-skills:audit`. Если в твоём проектном `CLAUDE.md` есть namespaced ссылки — их надо обновить.
- Папка `.forgeplan/` и любой forgeplan-артефакт **не трогаются**.
- Откат = `/plugin install dev-toolkit@ForgePlan-marketplace`. Плагин остаётся в каталоге (soft-deprecated, не удалён).

---

## Что остаётся как было

Начиная с `fpl-skills` **v1.1.0** — полный feature parity:

| | dev-toolkit | fpl-skills |
|---|---|---|
| `/audit` (multi-expert ревью) | ✅ | ✅ та же команда |
| `/sprint` (wave-based execution) | ✅ | ✅ та же команда |
| `/recall` (восстановление сессии) | ✅ `/recall` | ✅ переименована в `/restore` (см. ниже) |
| `forge-report` skill (шаблоны структурных отчётов) | ✅ | ✅ портирован в v1.1.0 |
| Safety hooks (блокировка деструктивных git/bash) | ✅ | ✅ портирован в v1.1.0 |
| Test reminder hook | ✅ | ✅ портирован в v1.1.0 |
| `dev-advisor` агент | ✅ | ✅ портирован в v1.1.0 |
| `forge-report` auto-trigger hooks (SessionStart counter, PostToolUse counter) | ✅ | ✅ портирован в v1.1.0 |

## Что меняется

| | dev-toolkit | fpl-skills |
|---|---|---|
| Всего команд | 4 | **15** |
| `/fpl-init` (развёртка проекта) | — | ✅ NEW |
| `/research` (5-агентное исследование) | — | ✅ NEW |
| `/refine` (interview-driven уточнение плана) | — | ✅ NEW |
| `/diagnose` (6-фазный debug loop) | — | ✅ NEW |
| `/autorun` (ночной автопилот) | — | ✅ NEW |
| `/do` (интерактивный автопилот) | — | ✅ NEW |
| `/build` (исполнение IMPLEMENTATION-PLAN.md) | — | ✅ NEW |
| `/rfc` (создание/чтение/обновление RFC) | — | ✅ NEW |
| `/briefing` (обзор трекера) | — | ✅ NEW |
| `/setup` (docs/agents wizard) | — | ✅ NEW |
| `/bootstrap` (CLAUDE.md template) | — | ✅ NEW |
| `/team` (фундамент multi-agent) | — | ✅ NEW |
| Требует CLI forgeplan | НЕТ | **ДА** |

`fpl-skills` требует CLI [`forgeplan`](https://github.com/ForgePlan/forgeplan) в `$PATH`. Если поставить не можешь — **оставайся на `dev-toolkit`**: deprecation мягкий, плагин поддерживается для обратной совместимости.

---

## Оценка риска — что может пойти не так?

Честный список failure-mode-ов, все легко обратимы:

| Риск | Вероятность | Impact | Mitigation |
|---|---|---|---|
| Ссылка на `/audit` или `/sprint` в `CLAUDE.md` указывает на не тот namespace после миграции | Высокая | Низкий — команда всё равно резолвится; может быть ambiguous | Обновить ссылки `sed`-ом. См. [шаг 4](#шаг-4--обновить-ссылки-в-claudemd). |
| Привычка набирать `/recall` (dev-toolkit) вместо `/restore` (fpl-skills) | Высокая | Низкий — Claude понимает intent | Либо держать dev-toolkit как backup, либо запомнить ренейм. Оба могут coexist. |
| Порядок установки имеет значение для хуков (PreToolUse:Bash collision) | Низкая | Низкий — хуки безопасно chain-ятся per [USAGE-GUIDE-RU.md](USAGE-GUIDE-RU.md#поведение-хуков) | Если оставляешь оба, dev-toolkit hook идёт первым; fpl-skills детектит и пропускает. |
| `.forgeplan/` артефакты затронуты | **Ноль** | — | Миграция не запускает `forgeplan` команды. |
| Изменения в коде | **Ноль** | — | Миграция только plugin-уровень. |
| `/fpl-init` случайно перезапустится в инициализированном проекте | Низкая | Ноль — idempotent, выходит с «already initialized» | Mitigation не нужен. |

Единственный по-настоящему «рискованный» сценарий — **установка fpl-skills без CLI forgeplan**. `/fpl-init` откажется с install-инструкциями, но `/audit` и `/sprint` работают и без forgeplan. Так что даже это safe-fail.

---

## Шаги миграции

### Шаг 1 — Выбери режим миграции

Один из:

**Mode A — Side-by-side (нулевой риск).** Ставишь `fpl-skills`, держишь `dev-toolkit`. Используешь `fpl-skills` команды; если что-то пошло не так, `dev-toolkit` ещё там. Через неделю-другую uninstall `dev-toolkit`. Рекомендуется для первой миграции.

**Mode B — Чистый переход.** Ставишь `fpl-skills`, сразу удаляешь `dev-toolkit`. Быстрее, но без fallback если упрёшься в блокер. Рекомендуется когда уже использовал `fpl-skills` хотя бы на одном другом проекте.

> [!TIP]
> Если в проектных `CLAUDE.md` есть ссылки на `/dev-toolkit:audit` и т.п. — **предпочитай Mode A**: даёт время обновить ссылки без поломки workflow.

### Шаг 2 — Установить `fpl-skills`

В любой Claude Code сессии:

```
/plugin marketplace update ForgePlan-marketplace   # подтянуть свежий каталог
/plugin install fpl-skills@ForgePlan-marketplace
/reload-plugins
```

Проверка: `/fpl-skills:audit` (namespaced форма чтобы не путать с dev-toolkit `/audit`). Если запустился audit — установка успешна.

> [!NOTE]
> Если CLI forgeplan не установлен, поставь:
> `brew install ForgePlan/tap/forgeplan` или `cargo install --git https://github.com/ForgePlan/forgeplan forgeplan-cli`. Без него `/fpl-init` откажется (остальные команды работают).

### Шаг 3 — Тест на одном проекте

Возьми реальный, но не-критичный проект. В Claude Code в его директории:

```
/fpl-skills:audit          # audit на твоей кодовой базе
/fpl-skills:restore        # session restore (замена /recall)
/research <какая-то тема>  # одна из новых fpl-skills фич
```

Если все три выдают разумный output — миграция безопасна. Если что-то ошибается, см. [Troubleshooting](#troubleshooting) ниже.

### Шаг 4 — Обновить ссылки в `CLAUDE.md`

Если в проектном `CLAUDE.md` есть namespaced dev-toolkit команды (типичная практика):

```markdown
- `/dev-toolkit:sprint` — adaptive sprint
- `/dev-toolkit:audit` — multi-expert parallel review
- `/dev-toolkit:recall` — session-context restore
- `/dev-toolkit:report` — card-based reports
```

Перепиши на fpl-skills форму:

```markdown
- `/fpl-skills:sprint` — wave-based execution (Tactical/Standard/Deep)
- `/fpl-skills:audit` — multi-expert ревью (≥4 ревьюера)
- `/fpl-skills:restore` — session-context restore (был `/recall` в dev-toolkit)
- `forge-report` skill (вызывай явно по имени или через auto-trigger хуки; раньше был `/dev-toolkit:report` command)
```

Быстрый `sed` для типичных замен:

```bash
# В корне проекта, dry-run:
grep -rn '/dev-toolkit:' --include='*.md' .

# Применить:
sed -i.bak 's|/dev-toolkit:sprint|/fpl-skills:sprint|g; s|/dev-toolkit:audit|/fpl-skills:audit|g; s|/dev-toolkit:recall|/fpl-skills:restore|g' \
  CLAUDE.md docs/**/*.md  # подкорректируй пути под свой проект

# Проверить git diff, потом:
rm CLAUDE.md.bak docs/**/*.md.bak
git add -p && git commit -m "chore: migrate dev-toolkit slash command refs to fpl-skills"
```

После fpl-skills v1.1.0 `forge-report` skill — часть fpl-skills. Вызывай напрямую по имени (без `/report` command-обёртки) или полагайся на auto-trigger hooks которые срабатывают на SessionStart и PostToolUse.

### Шаг 5 — (только Mode B) Удалить `dev-toolkit`

После 1-2 сессий комфортного использования `fpl-skills`:

```
/plugin uninstall dev-toolkit@ForgePlan-marketplace
/reload-plugins
```

Или — если выбрал Mode A и теперь хочешь cleanup — те же команды, просто с задержкой.

### Шаг 6 — (Опционально) Запустить `/fpl-init` на проекте

Если в проекте ещё нет `.forgeplan/` и `docs/agents/` (т.е. использовал только dev-toolkit без forgeplan):

```
/fpl-init
```

Это **единственный шаг который трогает файлы** — создаёт `.forgeplan/`, `CLAUDE.md`, `docs/agents/`, `.mcp.json`. Можно пропустить если не адоптишь forgeplan.

---

## Откат

Обратная миграция в одну команду:

```
/plugin install dev-toolkit@ForgePlan-marketplace
/reload-plugins
```

Если хочешь и `fpl-skills` снести:

```
/plugin uninstall fpl-skills@ForgePlan-marketplace
```

Файлы созданные `/fpl-init` (`.forgeplan/`, `docs/agents/`, отрендеренный `CLAUDE.md`) **остаются** — они полезны независимо от установленного плагина. Их удаление — отдельное решение (`rm -rf .forgeplan/` и т.д.) и **не часть отката**.

---

## Troubleshooting

### «Вижу `/audit` в palette дважды»

Оба плагина шипят `/audit`. Claude Code namespace-ит их как `/dev-toolkit:audit` и `/fpl-skills:audit`. Используй namespaced форму или удали один из плагинов.

### «Вывод хука удваивается»

Если оба плагина установлены, оба safety hook-а срабатывают на `PreToolUse:Bash`. Fpl-skills hook детектит dev-toolkit и short-circuit-ит, но кратко можешь увидеть два hook-print-а. Удали dev-toolkit чтобы заглушить.

### «`/fpl-init` отказывается с 'forgeplan CLI not found'»

Поставь CLI:

```bash
brew install ForgePlan/tap/forgeplan
# или
cargo install --git https://github.com/ForgePlan/forgeplan forgeplan-cli
```

Потом снова `/fpl-init`.

### «После uninstall `/recall` возвращает 'unknown command'»

`/recall` есть только в dev-toolkit — fpl-skills называет это `/restore`. Обнови привычку и ссылки в `CLAUDE.md`.

### «Хочу и `/recall` и `/restore` для мышечной памяти»

Можно держать `dev-toolkit` установленным сколько угодно. Deprecation информационный (флаг в plugin.json), не принудительный. Каталог v2.0 в итоге его удалит, но это минимум через minor-цикл (~6 месяцев).

### «У меня CI скрипты ссылаются на `/audit`»

CI не запускает slash-команды. Slash-команды работают внутри интерактивной Claude Code сессии. Если CI запускает `claude` headlessly — он бы вызывал namespaced форму, которая всё равно работает.

### «В Hindsight памяти упоминаются dev-toolkit решения — обновить?»

Нет. Hindsight записывает *что было верно в момент времени*. Старые решения ссылавшиеся на dev-toolkit остаются валидными как исторический контекст. Обновляй память только если *текущая* рекомендация изменилась.

---

## Что эта миграция НЕ меняет

Чтобы expectations были чёткими:

- **Папка `.forgeplan/`** — не тронута.
- **Проектные `CHANGELOG.md`, `package.json`, исходный код** — не тронуты.
- **Существующие forgeplan-артефакты (PRD, ADR, и т.д.)** — не тронуты.
- **Другие Claude Code плагины** (laws-of-ux, fpf, agent packs) — не тронуты.
- **MCP серверы** — не модифицированы (forgeplan MCP wired только если запустишь `/fpl-init`).

Миграция только про **какой плагин предоставляет `/audit`/`/sprint`/и т.д.** в Claude Code сессиях, плюс опциональный bonus развёртки forgeplan workflow если хочешь.

---

## Зачем мигрировать вообще?

Если `dev-toolkit` тебя устраивает и не нужны 11 дополнительных команд `fpl-skills` или forgeplan-интеграция — **не мигрируй**. Soft-deprecation значит плагин продолжает работать.

Мигрируй когда хотя бы одно из:

- Начал (или хочешь начать) использовать `forgeplan` для lifecycle артефактов.
- Хочешь `/research`, `/refine`, `/diagnose` или `/autorun`.
- Стартуешь новый проект и хочешь `/fpl-init` для развёртки одной командой.
- Новый член команды спрашивает «какой у нас setup?» — `fpl-skills` это документированный стандарт going forward.

---

## См. также

- [DEVELOPER-JOURNEY-RU.md](DEVELOPER-JOURNEY-RU.md) — narrative-онбординг «От нуля до релиза» (то куда ведёт миграция).
- [USAGE-GUIDE-RU.md](USAGE-GUIDE-RU.md) — reference manual для 15 команд fpl-skills.
- [`plugins/fpl-skills/README-RU.md`](../plugins/fpl-skills/README-RU.md) — полный README плагина.
- [`plugins/dev-toolkit/README-RU.md`](../plugins/dev-toolkit/README-RU.md) — текущее состояние dev-toolkit (deprecated, но сохранён).
- [ARCHITECTURE-RU.md § Карта плагинов](ARCHITECTURE-RU.md#карта-плагинов) — где какой плагин в 4-system mental model.
