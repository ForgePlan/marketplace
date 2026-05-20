# recipes-multiplugin

Recipes for maintaining plugin versions, catalog discipline, and
cross-plugin dependency management in the ForgePlan marketplace.

## Contents

| File | Description | Lines |
|------|-------------|-------|
| [version-bump-policy.md](version-bump-policy.md) | Semantic versioning per change type; sync plugin.json + marketplace.json | 52 |
| [catalog-discipline.md](catalog-discipline.md) | Why catalog metadata.version must be bumped on EVERY plugin update | 46 |
| [cross-plugin-supersedes.md](cross-plugin-supersedes.md) | When one plugin replaces another (dev-toolkit → fpl-skills pattern, ADR-003) | 50 |

## Rule of thumb

Whenever you touch ANY file under `plugins/<name>/`:
1. Bump `plugins/<name>/.claude-plugin/plugin.json` → `version`
2. Bump `.claude-plugin/marketplace.json` → same plugin's `version`
3. Bump `.claude-plugin/marketplace.json` → `metadata.version` (catalog-level)
