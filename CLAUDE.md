# ForgePlan Marketplace — Claude Code Configuration

**Repo**: [ForgePlan/marketplace](https://github.com/ForgePlan/marketplace)
**Catalog version**: 1.6.0
**Plugins**: 10 (5 core + 5 agent packs)

---

## Git Workflow

**CRITICAL: Только feature branches + PR. Прямой push в `main` и `dev` запрещён.**

```
feature-branch → push → PR → CI pass → merge
```

### Ветки

| Ветка | Назначение | Protection |
|-------|-----------|------------|
| `main` | Production. Стабильный релиз | PR + 1 review + CI strict |
| `dev` | Интеграция. Следующий релиз | PR + CI |
| `feat/*`, `fix/*`, `chore/*`, `docs/*` | Рабочие ветки | Нет ограничений |

### Формат коммитов

```
тип(модуль): что сделал

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

Типы: `feat`, `fix`, `docs`, `audit`, `chore`

### Формат веток

```
тип/описание        # feat/new-plugin, fix/hook-regex, docs/readme-update
```

---

## Branch Protection (GitHub Rulesets)

### Main

- PR required, `required_approving_review_count: 1`
- CI check `validate` must pass
- `strict: true` — PR должен быть up-to-date с main
- No deletion, no force-push
- Merge methods: merge, squash
- Bypass: admin only (`--admin` flag)

### Dev

- PR required, `required_approving_review_count: 0`
- CI check `validate` must pass
- `strict: false`
- No deletion, no force-push
- Merge methods: merge, squash, rebase

### Tags

- Только admin может создавать/обновлять/удалять tags

---

## CI (GitHub Actions)

**Workflow**: `.github/workflows/validate-plugins.yml`
**Job name**: `validate`
**Triggers**: push to `main`/`dev`, PR to `main`/`dev`

### Что проверяет

1. `marketplace.json` — валидный JSON
2. `plugin.json` — name, version, description обязательны
3. v2 optional fields — category, components (info)
4. Command collisions — уникальность имён команд
5. Marketplace completeness — все плагины на диске есть в каталоге
6. `hooks.json` — валидный JSON
7. `SKILL.md` — наличие YAML frontmatter

### Path filters

CI запускается только при изменениях в:
- `plugins/**`
- `.claude-plugin/marketplace.json`
- `.github/workflows/**`

---

## Security

- **Secret scanning**: enabled — GitHub сканирует код на токены/ключи
- **Push protection**: enabled — push с секретами блокируется
- **Dependabot**: enabled — алерты о CVE в зависимостях

---

## Local Hooks

**Файл**: `.claude/hooks/safety-hook.sh`
**Config**: `.claude/settings.json`

### Что блокирует (PreToolUse → Bash)

- `git push --force` / `git push -f`
- `git push origin main` / `git push origin dev`
- `git reset --hard`
- `git clean -fd`
- `rm -rf /` / `rm -rf ~` / `rm -rf .`
- `DROP TABLE` / `DROP DATABASE`
- `git branch -D main` / `git branch -D dev`

### Как обойти (если нужно)

Admin bypass для rulesets: `gh pr merge --admin`
Hook bypass: временно убрать из `.claude/settings.json` (не рекомендуется)

---

## Запрещено

- `git push --force` — НИКОГДА
- `git push origin main` / `git push origin dev` — только через PR
- `git add .` / `git add -A` — только конкретные файлы
- `--no-verify` — не пропускать hooks
- Merge без зелёного CI
- Файлы с секретами (.env, credentials, tokens)

---

## Version Bumping

При изменении плагина — bump version в двух местах:

1. `plugins/X/.claude-plugin/plugin.json` → `version`
2. `.claude-plugin/marketplace.json` → соответствующий плагин `version`

| Изменение | Bump |
|-----------|------|
| Typo, README | patch (1.2.0 → 1.2.1) |
| Bug fix, hook fix | minor (1.2.0 → 1.3.0) |
| Новый command/agent, breaking change | major (1.2.0 → 2.0.0) |

---

## Validation

Перед PR всегда:

```bash
./scripts/validate-all-plugins.sh          # Все плагины
./scripts/validate-all-plugins.sh plugin-name  # Один плагин
```

---

## Standalone Agents

### Discover Agent (agents/discover/)

Brownfield codebase onboarding — protocol v3.2.0.

| Файл | Назначение |
|------|-----------|
| `agent.md` | Claude Code agent config — 3 modes, 3 passes, progress tracking |
| `protocol.json` | Machine-readable protocol — layers, phases, rules, state schema |
| `README.md` | Документация + примеры + manual workflow |

**Не плагин** — standalone agent. Станет плагином после добавления MCP tools в ForgePlan CLI.

---

## Quick Reference

```bash
# Workflow
git checkout -b feat/my-feature        # Создать ветку
git push -u origin feat/my-feature     # Push ветку
gh pr create                           # Создать PR
gh pr merge --merge --admin            # Merge (admin bypass review)

# Проверки
gh pr checks <N>                       # Статус CI
gh api repos/ForgePlan/marketplace/rulesets --jq '.[] | .name'  # Rulesets

# Валидация
./scripts/validate-all-plugins.sh      # Перед PR
```
