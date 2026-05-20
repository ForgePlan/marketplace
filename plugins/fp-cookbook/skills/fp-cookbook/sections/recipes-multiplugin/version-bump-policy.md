# Plugin Version Bump Policy

## Цель

Update plugin versions in the two required places whenever a plugin changes,
so users receive updates via `/plugin marketplace update`.

## Semantic versioning rules

| Change type | Bump | Example |
|-------------|------|---------|
| Typo fix, README only | patch | 1.2.0 → 1.2.1 |
| Bug fix, hook fix, content update | minor | 1.2.0 → 1.3.0 |
| New command / agent / breaking change | major | 1.2.0 → 2.0.0 |
| New plugin (initial release) | 1.0.0 | — |

## Команда

```bash
# 1. Edit plugin-level version
#    plugins/<name>/.claude-plugin/plugin.json  →  "version": "1.x.y"

# 2. Edit catalog entry for the same plugin
#    .claude-plugin/marketplace.json
#    → plugins array → find entry with "name": "<name>" → bump "version"

# 3. Bump catalog metadata.version (ALWAYS, even for patch bumps)
#    .claude-plugin/marketplace.json  →  "metadata": { "version": "1.56.0" }
```

## Пример (Sprint O agentic-rag v1.0.0 ship)

```json
// plugins/agentic-rag/.claude-plugin/plugin.json
{ "name": "agentic-rag", "version": "1.0.0" }

// .claude-plugin/marketplace.json
{
  "metadata": { "version": "1.55.0" },  // bumped from 1.54.x
  "plugins": [
    { "name": "agentic-rag", "version": "1.0.0" }
  ]
}
```

## Two-file sync requirement

Both files MUST be in sync. If they differ, CI validation fails:
```
ERROR: plugin.json version "1.1.0" != marketplace.json entry "1.0.0"
```

## Common errors

| Error | Fix |
|-------|-----|
| CI: version mismatch between plugin.json and marketplace.json | Sync both to the same value |
| Users don't get update after push | Catalog `metadata.version` not bumped — required for `/plugin marketplace update` |
| `plugin.json` bumped but marketplace.json entry not found | Plugin is not yet in catalog — add entry to plugins array |

## Refs

- `.claude-plugin/marketplace.json` — source of truth for catalog versions
- `catalog-discipline.md` — why the catalog metadata.version bump is mandatory
