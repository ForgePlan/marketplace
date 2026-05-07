# GIT-FLOW-GUIDE — полный гайд по Git Flow и безопасной работе с репозиторием

Гайд описывает **классический Git Flow** (Vincent Driessen, 2010) как основу, дополненный
правилами Conventional Commits, SemVer, GitHub PR-процессом и **safety-правилами против
разрушительных действий AI-агентов**.

Целевая аудитория: этот проект (учебный, `W1-D3-git`) + любые будущие проекты, где
работает Claude Code или другой AI-агент.

---

## TL;DR

- **Модель ветвления:** Git Flow (Vincent Driessen) — `main` + `develop` + `feature/*` + `release/*` + `hotfix/*`
- **Коммиты:** Conventional Commits (`type(scope): description`)
- **Релизы:** SemVer (`vMAJOR.MINOR.PATCH`) с тегами на `main`
- **PR:** обязателен для всех merge в `main` и `develop`; title по Conventional Commits
- **Safety:** AI **никогда** не делает деструктивные операции без явного подтверждения (см. §7)

---

## Оглавление

1. [Почему именно Git Flow](#1-почему-именно-git-flow)
2. [Модель ветвления](#2-модель-ветвления)
3. [Именование веток](#3-именование-веток)
4. [Conventional Commits](#4-conventional-commits)
5. [Pull Request workflow](#5-pull-request-workflow)
6. [Теги и релизы (SemVer)](#6-теги-и-релизы-semver)
7. [🔴 Safety: защита от разрушительных действий AI](#7--safety-защита-от-разрушительных-действий-ai)
8. [GitHub Branch Protection](#8-github-branch-protection)
9. [Git hooks](#9-git-hooks)
10. [Быстрые рецепты](#10-быстрые-рецепты)
11. [Что делать если что-то пошло не так (recovery)](#11-что-делать-если-что-то-пошло-не-так-recovery)
12. [Ссылки](#12-ссылки)

---

## 1. Почему именно Git Flow

В 2026 году существуют три основные модели:

| Модель | Главная идея | Когда применять |
|---|---|---|
| **Git Flow** (Driessen) | Много долгоживущих веток, явные release/hotfix | Versioned releases, regulated / mobile / desktop / embedded |
| **GitHub Flow** | Одна main + короткоживущие feature-ветки | SaaS, CI/CD, web-приложения |
| **Trunk-Based** | Все пишут почти прямо в `main` за feature-flag'ами | Зрелый CI/CD, крупные команды |

Этот проект выбирает **Git Flow**, потому что:

1. Учебная цель — увидеть все концепции: feature, release, hotfix, merge vs rebase, теги.
2. Явный release-процесс полезен для дисциплины (stage → tag → prod).
3. Конвенция префиксов (`feature/`, `release/`, …) уже зафиксирована в `CLAUDE.md`.

---

## 2. Модель ветвления

### 2.1. Постоянные ветки

| Ветка | Роль | Кто пушит напрямую |
|---|---|---|
| `main` (или `master`) | Всегда релизное, каждый коммит тегирован | **Никто.** Только merge из `release/*` или `hotfix/*` |
| `develop` | Интеграционная — все фичи стекаются сюда | Никто. Только merge из `feature/*` |

> В текущем проекте основной веткой исторически стал `master` — допустимо, но при
> новых проектах лучше сразу называть её `main` (GitHub default с 2020).

### 2.2. Временные ветки

| Префикс | От чего | Куда мержим | Когда создаётся |
|---|---|---|---|
| `feature/*` | `develop` | `develop` | Новая функциональность |
| `release/*` | `develop` | `main` **и** `develop` | Подготовка релиза (freeze + bug-fixes) |
| `hotfix/*` | `main` | `main` **и** `develop` | Срочная правка продакшена |
| `fix/*` (он же `bugfix/*`) | `develop` | `develop` | Обычная правка бага, не продакшен |
| `docs/*`, `chore/*`, `refactor/*` | `develop` | `develop` | Не-feature работа |

### 2.3. Диаграмма жизненного цикла

```
main     ──●────────────●───────●────────●─────▶
            \          /         \      /
             \        /           \    /   (hotfix)
release/*     \──●──●                \  /
              /                       \/
develop  ──●─●──●─────●────●──●──────●──────●──▶
              \      /      \/              ^
               \    /       merge           │
   feature/*    \──●                        │
                                    tag v1.0.1
```

### 2.4. Типовой цикл фичи

```bash
# 1. Обновить локальный develop
git checkout develop
git pull origin develop

# 2. Создать feature-ветку
git checkout -b feature/user-auth

# 3. Работать, коммитить (см. §4)
git add src/auth.ts
git commit -m "feat(auth): add jwt token refresh"

# 4. Запушить и открыть PR в develop (см. §5)
git push -u origin feature/user-auth
gh pr create --base develop --title "feat(auth): add jwt token refresh" --fill
```

### 2.5. Типовой цикл релиза

```bash
# 1. Отрезать release-ветку от develop (фичи заморожены)
git checkout develop && git pull
git checkout -b release/v0.2.0

# 2. Только правки багов + bump версии в файлах
git commit -m "chore(release): bump version to 0.2.0"

# 3. PR release/v0.2.0 → main; после merge тегнуть
git checkout main && git pull
git tag -a v0.2.0 -m "release v0.2.0"
git push origin v0.2.0

# 4. Мерж обратно в develop (чтобы не потерять bug-fixes с release)
git checkout develop && git pull
git merge --no-ff release/v0.2.0
git push origin develop
```

### 2.6. Типовой цикл hotfix

```bash
# 1. От main (продакшен сломан!)
git checkout main && git pull
git checkout -b hotfix/v0.2.1-login-crash

# 2. Минимальная правка
git commit -m "fix(auth): prevent null pointer on empty session"

# 3. PR → main; тег патча
git tag -a v0.2.1 -m "hotfix v0.2.1"

# 4. Обязательно мерж в develop тоже
git checkout develop && git merge --no-ff hotfix/v0.2.1-login-crash
```

---

## 3. Именование веток

**Формат:** `<тип>/<короткое-описание>` либо гибрид `<тип>/TASK-XXX-описание`.

- Разделитель — **дефис** (kebab-case), не underscore, не CamelCase.
- Только **латиница**, нижний регистр, цифры. Без пробелов, без эмодзи.
- Длина — до ~50 символов, осмысленно.

**Хорошо:**
```
feature/add-login-form
feature/TASK-017-user-profile
fix/avatar-upload-timeout
release/v1.3.0
hotfix/v1.3.1-csrf-token
docs/update-readme
chore/bump-node-20
```

**Плохо:**
```
my-stuff           # без префикса
feature/Новая_фича  # кириллица + underscore + CamelCase
feature/fix         # слово fix как описание — неинформативно
update              # нет ни типа, ни сути
```

---

## 4. Conventional Commits

Стандарт: [conventionalcommits.org](https://www.conventionalcommits.org/).

### 4.1. Формат заголовка

```
<тип>(<область>): <описание>
```

- **тип** — один из: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- **область** (scope) — модуль/компонент, опционально: `auth`, `ui`, `api`, `db`.
- **описание** — повелительное наклонение, строчные буквы, **без точки в конце**, ≤72 символа.

### 4.2. Типы коммитов

| Тип | Когда | Затрагивает SemVer |
|---|---|---|
| `feat` | Новая функциональность | **MINOR** |
| `fix` | Исправление бага | **PATCH** |
| `docs` | Только документация | — |
| `style` | Форматирование, пробелы | — |
| `refactor` | Переработка без изменения поведения | — |
| `perf` | Оптимизация производительности | PATCH |
| `test` | Добавление / правка тестов | — |
| `build` | Сборка, зависимости | — |
| `ci` | CI/CD конфигурация | — |
| `chore` | Рутина (bump версии, служебное) | — |
| `revert` | Откат предыдущего коммита | зависит |

### 4.3. Breaking changes

Перекомпилированный API, миграции БД, несовместимое поведение — **MAJOR bump**.
Обозначается двумя способами (можно оба сразу):

1. `!` после типа: `feat(api)!: remove v1 endpoints`
2. Футер `BREAKING CHANGE: …`

```
feat(api)!: switch auth to oauth2

BREAKING CHANGE: /login endpoint removed, clients must migrate to /oauth/token
```

### 4.4. Примеры (хорошие)

```
feat(auth): add password reset flow
fix(ui): prevent double-submit on slow network
docs(readme): clarify install steps for windows
refactor(db): extract query builder to separate module
chore(deps): bump typescript to 5.4
feat(api)!: change response shape for /users

BREAKING CHANGE: response now returns { data, meta } instead of bare array
```

### 4.5. Примеры (плохие)

```
update stuff              # нет типа, нет сути
Fix Bug.                  # CamelCase + точка + нет scope
feat: и короткое описание # смешение языков в одном заголовке
WIP                       # коммит-мусор — не должен попадать в develop
```

### 4.6. Тело коммита

- Одна пустая строка между заголовком и телом.
- Объясняем **почему** (мотивация), а не **что** (это видно в diff).
- Перенос строк ≤72 символов.

```
feat(cache): add lru eviction to session store

Sessions grew unbounded on long-running workers, causing ~200MB leak per
day. LRU with cap=10k keeps memory under 20MB and matches the hit-rate
we measured on staging (94%).

Refs: TASK-042
```

---

## 5. Pull Request workflow

### 5.1. Жизненный цикл PR

1. Pushed ветку `feature/*` → открыть PR в `develop`.
2. Title PR = заголовок по Conventional Commits (не "Update files").
3. Описание PR содержит:
   - **Что** сделано (bullet list).
   - **Почему** (мотивация, ссылка на задачу / issue).
   - **Как проверить** (test plan).
4. CI должен быть зелёный.
5. Минимум 1 approving review (см. §8 — branch protection).
6. Merge: по умолчанию **`--no-ff`** (merge-commit), чтобы история фичи не терялась.

### 5.2. gh CLI — команды

```bash
# Создать PR из текущей ветки
gh pr create --base develop --title "feat(auth): add jwt refresh" \
  --body "$(cat <<'EOF'
## Summary
- добавлен endpoint POST /auth/refresh
- токен ротируется каждые 15 минут

## Test plan
- [ ] unit: src/auth/refresh.test.ts зелёные
- [ ] e2e: логин → ожидание 16 мин → запрос → 200
EOF
)"

# Посмотреть свои PR
gh pr list --author @me

# Открыть в браузере
gh pr view --web

# Посмотреть комментарии reviewer'а
gh pr view 42 --comments

# Смержить (после approve + зелёного CI)
gh pr merge 42 --merge       # merge commit (дефолт Git Flow)
gh pr merge 42 --squash      # объединить в 1 коммит
gh pr merge 42 --rebase      # линейная история
```

### 5.3. Стратегии merge

| Стратегия | Когда применять | Результат в истории |
|---|---|---|
| **Merge commit (`--no-ff`)** | По умолчанию в Git Flow | Сохраняет всю ветку фичи + merge-commit |
| **Squash** | Если в ветке много WIP-коммитов ("fix typo", "wip") | 1 коммит в target; исходная ветка теряется |
| **Rebase** | Хотим линейную историю, ветка короткая | Нет merge-commit'а; переписывается SHA |

> ⚠️ Для этого проекта — **по умолчанию merge commit**. Squash — только если PR
> явно содержит мусорные коммиты. Rebase **только на своей ещё не запушенной ветке**.

### 5.4. Защита merge-коммитов

Merge-коммит создаётся git'ом автоматически: `Merge branch 'feature/x' into develop`.
Это допустимая форма — её **не нужно** переписывать в Conventional Commits.

---

## 6. Теги и релизы (SemVer)

**Формат тега:** `vMAJOR.MINOR.PATCH` ([semver.org](https://semver.org)).

| Часть | Когда увеличивать |
|---|---|
| **MAJOR** | Несовместимые изменения API (см. §4.3) |
| **MINOR** | Новая функциональность, обратно совместимая |
| **PATCH** | Только bug-fixes |

**Пред-релизы:** `v1.0.0-rc.1`, `v1.0.0-beta.2`, `v1.0.0-alpha`.

### 6.1. Создание тега

```bash
# Аннотированный тег (предпочтительно) — с автором, датой, сообщением
git tag -a v0.2.0 -m "release v0.2.0"

# Отправить тег на origin
git push origin v0.2.0

# Отправить ВСЕ локальные теги (осторожно)
git push origin --tags
```

### 6.2. GitHub Release

```bash
gh release create v0.2.0 --title "v0.2.0" --notes-from-tag
# или с кастомным текстом
gh release create v0.2.0 --title "v0.2.0" --notes "См. CHANGELOG.md"
```

### 6.3. Никогда не перезаписывать опубликованные теги

Если тег уже запушен и его кто-то склонировал — **не** удалять и не двигать.
Вместо этого — выпустить `v0.2.1` с фиксом.

---

## 7. 🔴 Safety: защита от разрушительных действий AI

Этот раздел — главный. Git позволяет легко **потерять работу**, особенно когда
команды выполняет автономный агент. Ниже — список запрещённых действий и безопасных
альтернатив.

### 7.1. Красные линии (команды, которые AI НЕ выполняет без явного подтверждения)

| Команда | Почему опасна | Безопасная альтернатива |
|---|---|---|
| `git reset --hard` | Уничтожает uncommitted работу + двигает HEAD | Сначала `git stash` или `git branch backup/...` |
| `git push --force` / `-f` | Переписывает историю на remote, ломает чужие клоны | `git push --force-with-lease` + только на своей ветке |
| `git push --force origin main` | Катастрофа для команды | **Никогда.** Хотфиксом через PR |
| `git branch -D <name>` | Удаляет ветку даже если не смержена | `git branch -d` (отказывается если не смержено) |
| `git checkout .` / `git restore .` | Стирает все unstaged изменения | `git diff` → точечно `git restore <file>` |
| `git clean -fd` | Удаляет untracked файлы и каталоги без корзины | `git clean -n` (dry-run) → осмотреть → только нужное |
| `git commit --amend` после push | Переписывает опубликованный коммит | Новый коммит `fix: …` |
| `git rebase -i` на опубликованной ветке | Переписывает историю | Rebase только на локальных / неопубликованных |
| `rm -rf .git` | Полное уничтожение истории | Никогда. Если нужно "начать заново" — новый каталог |
| `--no-verify` при commit/push | Обход pre-commit hooks | Исправить причину, по которой hook падает |
| `git update-ref -d`, `git reflog expire --expire=now` | Стирает safety-net | Никогда без прямой инструкции |
| Удаление `main` / `master` / `develop` | Уничтожение истории | Защитить через branch protection (§8) |

### 7.2. Правила для AI-агента (для включения в CLAUDE.md)

1. **Любая команда из §7.1** — только после явного "да" от пользователя в текущей сессии.
   Одноразовое разрешение **не расширяется** на будущие вызовы той же команды.
2. **Перед любым `merge`, `rebase`, `reset`** — показать пользователю `git status`
   и `git log --oneline -5` текущей ветки.
3. **Uncommitted изменения** — если `git status` не чистый, сначала `git stash push -u -m "auto: <reason>"`,
   а не `reset`/`checkout .`.
4. **Удаление ветки** — только если она смержена (проверка: `git branch --merged`).
   Для неслитых — спросить пользователя.
5. **`git push`** без `--force*` — допустимо на feature-ветку. На `main`/`master`/`develop`/`release/*` —
   **только через PR**, никогда напрямую.
6. **Обнаружение незнакомых локальных изменений / веток** — **не трогать**, спросить. Это может
   быть работа пользователя, о которой агент не знает.
7. **Hooks** — если `pre-commit` / `pre-push` падает, не обходить через `--no-verify`.
   Диагностировать причину и починить.

### 7.3. Процедура если что-то пошло не так

См. §11 — восстановление через `reflog`, `fsck`, `stash list`.

---

## 8. GitHub Branch Protection

GitHub позволяет настроить правила, при которых **технически невозможно**
сделать force-push или удалить защищённую ветку.

### 8.1. Рекомендуемая конфигурация для `main` и `develop`

Settings → Branches → Add branch protection rule:

- **Branch name pattern:** `main` (потом отдельное правило для `develop`).
- ✅ **Require a pull request before merging** — минимум 1 approving review.
  - ✅ Dismiss stale pull request approvals when new commits are pushed.
  - ✅ Require review from Code Owners (если есть `CODEOWNERS`).
- ✅ **Require status checks to pass before merging** (CI зелёный).
  - ✅ Require branches to be up to date before merging.
- ✅ **Require conversation resolution before merging** (все комменты разрешены).
- ✅ **Require signed commits** (опционально, если команда использует GPG).
- ✅ **Require linear history** — если выбрана rebase-стратегия merge.
- ❌ **Allow force pushes** — оставить **выключенным**.
- ❌ **Allow deletions** — оставить **выключенным**.
- ✅ **Do not allow bypassing the above settings** — чтобы даже admin'ы не обходили.

### 8.2. Для `release/*` и тегов

- Шаблон `release/*` с тем же набором защит.
- **Tag protection rules** (Settings → Tags): шаблон `v*.*.*`, кто может пушить теги.

### 8.3. CLI — проверить / создать через gh

```bash
# Посмотреть текущие protections для main
gh api repos/:owner/:repo/branches/main/protection

# Применить конфигурацию из файла
gh api --method PUT repos/:owner/:repo/branches/main/protection --input protection.json
```

---

## 9. Git hooks

`.git/hooks/` — локально, `.githooks/` + `git config core.hooksPath .githooks` — в репо.

### 9.1. Полезные hooks

| Hook | Назначение |
|---|---|
| `pre-commit` | Линтер, форматтер, secrets-scan перед созданием коммита |
| `commit-msg` | Проверка формата сообщения (Conventional Commits) |
| `pre-push` | Тесты, проверка что push не на защищённую ветку |

### 9.2. Пример `commit-msg` для Conventional Commits

```bash
#!/usr/bin/env bash
# .githooks/commit-msg
msg_file="$1"
pattern='^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9\-]+\))?!?: .{1,72}$'
if ! grep -qE "$pattern" "$msg_file"; then
  echo "ERROR: commit message must follow Conventional Commits" >&2
  echo "  <type>(<scope>): <description>" >&2
  exit 1
fi
```

### 9.3. Подключение

```bash
mkdir -p .githooks
# положить скрипты, chmod +x
git config core.hooksPath .githooks
```

---

## 10. Быстрые рецепты

### 10.1. Начать новую фичу

```bash
git checkout develop && git pull
git checkout -b feature/TASK-XXX-short-name
# …работа…
git commit -m "feat(scope): …"
git push -u origin feature/TASK-XXX-short-name
gh pr create --base develop --fill
```

### 10.2. Обновить свою feature-ветку от свежего develop

```bash
git checkout develop && git pull
git checkout feature/my-branch
git merge develop          # предпочтительно
# или, если ветка ещё НЕ пушена:
git rebase develop
```

### 10.3. Отменить последний локальный коммит (НЕ запушенный)

```bash
# Сохранить изменения как unstaged
git reset --soft HEAD~1

# Или полностью выкинуть (опасно — см. §7.1)
# git reset --hard HEAD~1   ← только после "да" от пользователя
```

### 10.4. Отменить коммит, который уже в remote

```bash
git revert <sha>            # создаёт новый обратный коммит — безопасно
git push
```

### 10.5. Найти, кто что сделал

```bash
git log --oneline --graph --all -20
git blame path/to/file
git log -p path/to/file       # все правки файла с diff'ами
```

---

## 11. Что делать если что-то пошло не так (recovery)

### 11.1. "Я сделал `reset --hard` и потерял коммиты"

```bash
git reflog                    # все движения HEAD, TTL ~90 дней
# найти нужный SHA, например abc1234
git checkout -b recover/my-stuff abc1234
```

### 11.2. "Я удалил ветку, которая не была смержена"

```bash
git reflog                    # искать запись "checkout: moving from <branch>"
git branch <branch> <sha>     # пересоздать из найденного SHA
```

### 11.3. "Я сделал stash и забыл"

```bash
git stash list
git stash show -p stash@{0}
git stash apply stash@{0}     # вернуть без удаления
git stash pop stash@{0}       # вернуть и удалить из списка
```

### 11.4. "Я запушил secret / токен"

1. **Сразу** отозвать / ротировать сам секрет у провайдера.
2. Удалить из истории (`git filter-repo` или BFG) — это переписывает историю,
   нужно координироваться с командой.
3. Форс-пуш в координации (нарушение §7.1 — но здесь это обязательная мера).

### 11.5. "Я случайно запушил в `main`"

```bash
# Если protection включена (см. §8) — push был отклонён, проблемы нет.
# Если прошёл — ревертнуть:
git revert <плохой-sha>
git push origin main
```

---

## 12. Ссылки

- Vincent Driessen — [A successful Git branching model (2010)](https://nvie.com/posts/a-successful-git-branching-model/)
- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
- [Semantic Versioning 2.0.0](https://semver.org/)
- Atlassian — [Gitflow Workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow)
- GitHub Docs — [About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- GitHub Docs — [Managing a branch protection rule](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule)
- [codewithmukesh — GitFlow vs GitHub Flow vs Trunk-Based (2026)](https://codewithmukesh.com/blog/git-workflows-gitflow-vs-github-flow-vs-trunk-based-development/)
- [cloudcusp — Choose Branching Strategy 2026](https://cloudcusp.com/blogs/git-workflow-how-to-choose-branching-strategy/)

---

## Приложение A — Почему именно эти safety-правила

AI-агенты удобны тем, что автономно выполняют команды. Это же делает их опасными:
агент может выполнить `git reset --hard` или `git push --force` так же быстро,
как `ls`. Потеря работы, которая у человека заняла бы 15 минут паники,
для агента — один tool-call.

Правила §7 построены по принципам:
1. **Необратимость = повод остановиться.** Если команда ломает что-то, что нельзя
   восстановить через `git reflog` за 5 минут, — требовать подтверждения.
2. **Shared state = повод остановиться.** Всё, что меняет общий remote
   (`push --force`, удаление веток на origin, перезапись тегов) — требует явного "да".
3. **Обход safety-mechanism = красная линия.** `--no-verify`, удаление reflog,
   отключение branch protection — никогда без прямой инструкции.
4. **Незнакомое состояние = спросить, не чинить.** Если агент видит файлы /
   ветки / stash'и, о которых не знает, — это работа пользователя. Не чистить "на всякий случай".
