[English](README.md) | [Русский](README-RU.md)

# forgeplan-brownfield-pack

> Migrate existing brownfield documentation (MADR, ADR-tools, log4brains, Obsidian, ad-hoc markdown) and C4/DDD/autoresearch analysis output into a structured forgeplan graph — without data loss.

A Claude Code marketplace pack implementing the **orchestrator model** from Forgeplan ADR-009: forgeplan does not re-implement extraction logic. Instead, this pack ships **playbooks**, **skills**, **agents**, and **mappings** that compose existing marketplace plugins (`c4-architecture`, `autoresearch`, `ddd-expert`, `feature-dev`) with forgeplan's ingest engine.

> **Status**: alpha. Mapping layer (c4-to-forge) is validated on the Forgeplan repo itself (CL3 spike, 2026-04-20). Playbook runtime in active development (Forgeplan EPIC-007 / PRD-065).

## Quick Start

```bash
/plugin install forgeplan-brownfield-pack@ForgePlan-marketplace
```

Then from within a brownfield project:

```
/forge-migrate                     # interactive wizard
# or
/forge-migrate --from c4-context   # specific source
```

## What it provides

### Mappings (idempotent translation rules)

| Mapping | Source format | Target forge artifacts |
|---|---|---|
| `c4-to-forge.yaml` | C4 Context / Container / Component markdown | Epic, PRDs, Notes |
| `autoresearch-to-forge.yaml` | autoresearch 8-phase pipeline output | PRDs, Problems, Evidence |
| `ddd-to-forge.yaml` | DDD bounded-context map | Epic, PRDs, Spec |
| `madr-to-forge.yaml` | MADR-formatted ADR files | ADR (1:1) |
| `adr-tools-to-forge.yaml` | adr-tools format | ADR (1:1) |
| `log4brains-to-forge.yaml` | log4brains format | ADR (1:1) |
| `obsidian-to-forge.yaml` | Obsidian vault with wikilinks | any kind + resolved `references` links |

All mappings enforce **universal rules**:
- **Idempotency**: re-runs dedupe by title slug, version-bump on change, never destructive
- **Scope**: writes only to `.forgeplan/`, never `.git/` or source directories
- **Safety**: dry-run by default, backup before apply

### Playbooks

| Playbook | Orchestrates |
|---|---|
| `migrate-c4.yaml` | c4-architecture agent → c4-to-forge mapping → review |
| `migrate-ddd.yaml` | ddd-expert agent → ddd-to-forge mapping → review |
| `migrate-autoresearch.yaml` | autoresearch:learn → autoresearch-to-forge mapping → review |
| `migrate-obsidian.yaml` | detect vault → per-file classify → obsidian-to-forge → resolve wikilinks |
| `migrate-madr.yaml` | scan ADR directory → madr-to-forge → review |

### Skills

| Skill | Purpose |
|---|---|
| `forge-classify` | Classify brownfield document into forge kind (PRD/ADR/KB/...) |
| `forge-dialogue` | Ask user clarifying questions when confidence is low |
| `madr-to-forge` | Apply MADR mapping with domain-specific reasoning |

### Agents

| Agent | Purpose |
|---|---|
| `forge-migrator` | Autonomous agent that runs full migration playbook and reports diff |

## Relationship to forgeplan core

This pack **consumes** the forgeplan playbook runtime (EPIC-007 PRD-065) and ingest engine (PRD-066). It does not re-implement them. The pack produces forge artifacts via public `forgeplan_*` MCP tools and the `forgeplan ingest` command.

When the playbook runtime ships (v0.25), install order is:

```bash
# 1. forgeplan CLI >= v0.25 with ingest engine
forgeplan --version

# 2. this pack
/plugin install forgeplan-brownfield-pack@ForgePlan-marketplace

# 3. recommended companions (actual extraction agents)
/plugin install c4-architecture@anthropic-marketplace
/plugin install autoresearch@anthropic-marketplace
/plugin install ddd-expert@anthropic-marketplace
```

## Contributing a new mapping

1. Fork this plugin
2. Add `mappings/<source>-to-forge.yaml`
3. Add fixture in `fixtures/<source>/` (small, anonymized)
4. Add playbook that wires the agent → your mapping
5. PR with E2E test demonstrating no data loss on the fixture

See [forgeplan ADR-009](https://github.com/ForgePlan/forgeplan/blob/main/.forgeplan/adrs/ADR-009-forgeplan-as-orchestrator-playbook-skill-agent-mapping-pack-marketplace-model.md) for architecture rationale.

## License

MIT — same as forgeplan-marketplace.
