# Plugin vs Standalone — Distribution Decision

Two distribution channels exist in the ForgePlan ecosystem:

## Channel comparison

| | Plugin (marketplace) | Standalone (npx skills) |
|---|---|---|
| **Install command** | `/plugin install X@ForgePlan-marketplace` | `npx skills add ForgePlan/X` |
| **What ships** | Full plugin: commands + agents + hooks + skills | Skills only: SKILL.md + sections |
| **Maintenance** | One repo (marketplace) | Two repos (marketplace + standalone) |
| **Discovery** | Via marketplace catalog | Via agentskills.io + npx |
| **Best for** | New skills, single-author, ForgePlan ecosystem | High-demand skills, cross-ecosystem users |

## Decision criteria

Use **plugin only** (default) when:
- The skill is new and user demand is unproven
- The skill is tightly coupled to ForgePlan commands or agents
- You want a single repo to maintain

Use **both** (plugin + standalone) when:
- ≥ 3 users have requested `npx skills add` install
- The skill is useful outside the ForgePlan ecosystem
- The skill is stable and unlikely to change frequently

## Trigger-driven promotion pattern (NOTE-003)

ForgePlan uses trigger-driven design for standalone repos:
- Ship as marketplace plugin first
- Track demand signals (GitHub issues, Discord requests, direct asks)
- At ≥ 3 signals: create `ForgePlan/<skill-name>-standalone` repo
- Wire the CI sync workflow (see `ci-sync.md`)

This avoids maintaining unused repos. The `agentic-rag` skill itself
follows this pattern — shipped as plugin, standalone deferred.
