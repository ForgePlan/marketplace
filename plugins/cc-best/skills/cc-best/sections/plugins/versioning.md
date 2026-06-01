# Versioning — the dual + catalog bump rule

## The rule: every plugin change bumps three numbers

A plugin's version lives in two files, and the marketplace itself has a third. On any change to a plugin, bump **all three**:

| # | What | Where |
|---|------|-------|
| 1 | The plugin's own version | `plugins/X/.claude-plugin/plugin.json` → `version` |
| 2 | The catalog's copy of that plugin's version | `.claude-plugin/marketplace.json` → that plugin's `version` |
| 3 | The catalog release version | `.claude-plugin/marketplace.json` → `metadata.version` |

(1) and (2) must match — they are the same plugin's version in two places. (3) is the marketplace's own release counter, bumped on every release regardless of which plugin changed.

## Semver — which level

```
patch (1.2.0 → 1.2.1)   typo, README, doc-only change
minor (1.2.0 → 1.3.0)   bug fix, hook fix, additive change
major (1.2.0 → 2.0.0)   new command/agent, breaking change
```

The catalog `metadata.version` follows its own minor cadence per release (e.g. `1.85.1 → 1.87.0`) — it does not have to mirror the per-plugin bump level.

## Why catalog `metadata.version` is the load-bearing one

`/plugin marketplace update ForgePlan-marketplace` decides whether to re-pull the catalog by comparing `metadata.version`. If you bump (1) and (2) but leave (3) untouched, the user's client sees no catalog change and never fetches the new plugin version.

> **Rule of thumb when shipping**: always bump both the per-plugin `version` AND the catalog `metadata.version`. Without the catalog bump, no user gets the update via `/plugin marketplace update`.

This is the most expensive omission in the whole release flow — silent, no error, "I shipped it but nobody has it". The cache-troubleshooting table in `validation.md` lists it as a distinct root cause.

## Worked example — the canonical commit shape

Adding a skill to `fpl-skills` (additive → minor):

```
plugins/fpl-skills/.claude-plugin/plugin.json   version 1.45.0 → 1.46.0
.claude-plugin/marketplace.json   fpl-skills    version 1.45.0 → 1.46.0
.claude-plugin/marketplace.json   metadata.version  1.85.1 → 1.87.0
```

Three edits, one PR. If multiple plugins change in one PR, bump every changed plugin in both places, then bump `metadata.version` once.

## Trap — deprecation is a field, not a deletion

To retire a plugin, do not remove it from the catalog (that breaks installed users). Mark it in `marketplace.json`:

```json
"deprecated": true,
"supersededBy": "fpl-skills"
```

The description should also lead with `[DEPRECATED — superseded by X]`. `dev-toolkit` is the live example.

## Related

- `distribution.md` — why the catalog bump gates `/plugin marketplace update`
- `validation.md` — the cache table; the "catalog not bumped" symptom row
- `manifest.md` — the per-plugin `version` field
