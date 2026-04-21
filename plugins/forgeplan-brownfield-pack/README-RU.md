[English](README.md) | [Русский](README-RU.md)

# forgeplan-brownfield-pack

> Миграция существующей brownfield-документации (MADR, ADR-tools, log4brains, Obsidian, ad-hoc markdown) и вывода C4/DDD/autoresearch анализов в структурированный forgeplan-граф — без потери данных.

Marketplace-пакет для Claude Code, реализующий **orchestrator-модель** из Forgeplan ADR-009: forgeplan не переизобретает extraction-логику. Вместо этого пакет поставляет **playbooks**, **skills**, **agents** и **mappings**, которые композируют существующие marketplace-плагины (`c4-architecture`, `autoresearch`, `ddd-expert`, `feature-dev`) с forgeplan ingest-движком.

> **Статус**: alpha. Mapping-слой (c4-to-forge) провалидирован на самом Forgeplan repo (CL3 spike, 2026-04-20). Playbook runtime в активной разработке (Forgeplan EPIC-007 / PRD-065).

## Быстрый старт

```bash
/plugin install forgeplan-brownfield-pack@ForgePlan-marketplace
```

Из brownfield-проекта:

```
/forge-migrate                     # интерактивный мастер
# или
/forge-migrate --from c4-context   # конкретный источник
```

## Что входит

### Mappings (идемпотентные правила перевода)

| Mapping | Исходный формат | Целевые forge-артефакты |
|---|---|---|
| `c4-to-forge.yaml` | C4 Context / Container / Component markdown | Epic, PRDs, Notes |
| `autoresearch-to-forge.yaml` | autoresearch 8-phase pipeline output | PRDs, Problems, Evidence |
| `ddd-to-forge.yaml` | DDD bounded-context map | Epic, PRDs, Spec |
| `madr-to-forge.yaml` | MADR-форматированные ADR | ADR (1:1) |
| `adr-tools-to-forge.yaml` | adr-tools формат | ADR (1:1) |
| `log4brains-to-forge.yaml` | log4brains формат | ADR (1:1) |
| `obsidian-to-forge.yaml` | Obsidian vault с wikilinks | любой kind + resolved `references` links |

Все mappings обеспечивают **universal rules**:
- **Идемпотентность**: повторные запуски дедуплицируют по title slug, version-bump при изменениях, никогда не destructive
- **Scope**: пишет только в `.forgeplan/`, никогда в `.git/` или исходники
- **Безопасность**: dry-run по умолчанию, backup перед apply

### Playbooks

| Playbook | Оркестрирует |
|---|---|
| `migrate-c4.yaml` | c4-architecture agent → c4-to-forge mapping → review |
| `migrate-ddd.yaml` | ddd-expert agent → ddd-to-forge mapping → review |
| `migrate-autoresearch.yaml` | autoresearch:learn → autoresearch-to-forge mapping → review |
| `migrate-obsidian.yaml` | detect vault → per-file classify → obsidian-to-forge → resolve wikilinks |
| `migrate-madr.yaml` | scan ADR directory → madr-to-forge → review |

### Skills

| Skill | Назначение |
|---|---|
| `forge-classify` | Классификация brownfield-документа в forge-kind (PRD/ADR/KB/...) |
| `forge-dialogue` | Задаёт пользователю уточняющие вопросы при низкой уверенности |
| `madr-to-forge` | Применяет MADR mapping с domain-специфичным reasoning |

### Agents

| Agent | Назначение |
|---|---|
| `forge-migrator` | Autonomous agent запускает полный migration playbook и показывает diff |

## Связь с forgeplan core

Этот пакет **потребляет** forgeplan playbook runtime (EPIC-007 PRD-065) и ingest engine (PRD-066). Не переизобретает их. Пакет создаёт forge-артефакты через public `forgeplan_*` MCP tools и команду `forgeplan ingest`.

Когда playbook runtime выйдет (v0.25), порядок установки:

```bash
# 1. forgeplan CLI >= v0.25 с ingest engine
forgeplan --version

# 2. этот пакет
/plugin install forgeplan-brownfield-pack@ForgePlan-marketplace

# 3. рекомендуемые companion-плагины (реальные extraction-агенты)
/plugin install c4-architecture@anthropic-marketplace
/plugin install autoresearch@anthropic-marketplace
/plugin install ddd-expert@anthropic-marketplace
```

## Добавление нового mapping

1. Fork этого плагина
2. Добавьте `mappings/<source>-to-forge.yaml`
3. Добавьте fixture в `fixtures/<source>/` (small, anonymized)
4. Добавьте playbook который оркестрирует agent → ваш mapping
5. PR с E2E-тестом подтверждающим no data loss на fixture

См. [forgeplan ADR-009](https://github.com/ForgePlan/forgeplan/blob/main/.forgeplan/adrs/ADR-009-forgeplan-as-orchestrator-playbook-skill-agent-mapping-pack-marketplace-model.md) для архитектурного обоснования.

## Лицензия

MIT — как и весь forgeplan-marketplace.
