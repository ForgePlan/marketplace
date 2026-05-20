# Catalog Discipline: Always Bump metadata.version

## Цель

Ensure users receive plugin updates via `/plugin marketplace update` by
always bumping the catalog-level `metadata.version` alongside the per-plugin version.

## Why it matters

Claude Code's plugin cache uses `metadata.version` to detect whether the
marketplace catalog has changed. If `metadata.version` is stale:
- `/plugin marketplace update` says "already up to date"
- Users never see the new plugin version
- The per-plugin `version` bump has no effect on end-users

## Команда

```bash
# Every time ANY plugin ships — bump both:

# 1. Per-plugin version in plugin.json
#    (see version-bump-policy.md)

# 2. Catalog metadata.version in marketplace.json
#    .claude-plugin/marketplace.json
{
  "metadata": {
    "version": "1.56.0",    ← bump this on EVERY plugin update
    "updated_at": "2026-05-20"
  },
  "plugins": [ ... ]
}
```

## Bump cadence

| Event | metadata.version bump |
|-------|----------------------|
| New plugin added | minor: 1.55.0 → 1.56.0 |
| Existing plugin minor/patch update | patch: 1.55.0 → 1.55.1 |
| Multiple plugins updated in one PR | single bump: 1.55.0 → 1.56.0 |

## Пример (Sprint P fp-cookbook addition)

```
Before: metadata.version = "1.55.0"  (Sprint O closed)
After:  metadata.version = "1.56.0"  (Sprint P adds fp-cookbook)
```

User runs `/plugin marketplace update` → detects 1.55 → 1.56 change → refreshes.

## Common errors

| Error | Fix |
|-------|-----|
| Users report "already installed" despite new version | metadata.version not bumped — bump it and push |
| Two PRs both bump to same version | Coordinate: second PR should bump to N+2 |
| `updated_at` date wrong | Set to today's date: `2026-05-20` |

## Refs

- `.claude-plugin/marketplace.json` — source of truth
- Plugin cache troubleshooting guide in `forgeplan-marketplace/CLAUDE.md`
- `version-bump-policy.md` — per-plugin version rules
