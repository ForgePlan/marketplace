# Cross-Plugin Supersedes: Retiring One Plugin in Favour of Another

## Цель

Cleanly deprecate an old plugin when a new one replaces its functionality,
following the dev-toolkit → fpl-skills migration pattern (ADR-003).

## The pattern

```
1. New plugin ships and is stable
2. Old plugin marked soft-deprecated in plugin.json
3. Forgeplan artifact: new ADR supersedes old ADR (if applicable)
4. README of old plugin points to new plugin
5. Old plugin stays in marketplace for backward compat (do NOT delete)
```

## Команда

```bash
# Step 1 — mark old plugin deprecated in its plugin.json
# plugins/dev-toolkit/.claude-plugin/plugin.json:
{
  "name": "dev-toolkit",
  "deprecated": true,
  "deprecation_notice": "Superseded by fpl-skills. Migrate: /plugin install fpl-skills@ForgePlan-marketplace"
}

# Step 2 — bump version (patch) to ship the deprecation notice
# plugins/dev-toolkit/.claude-plugin/plugin.json → version: 1.6.4
# .claude-plugin/marketplace.json → dev-toolkit version: 1.6.4

# Step 3 — update old plugin README
# Add: "## ⚠️ Deprecated — use fpl-skills instead"

# Step 4 — forgeplan artifact: new ADR supersedes old
forgeplan link ADR-003 ADR-002 --relation supersedes
```

## Пример (dev-toolkit → fpl-skills, ADR-003)

```
plugins/dev-toolkit/  →  deprecated=true in plugin.json
plugins/fpl-skills/   →  active replacement

ADR-003 (active): "fpl-skills supersedes dev-toolkit"
ADR-003 → ADR-002 (supersedes link)

Users see deprecation notice on next /plugin marketplace update.
Migration path in README: /plugin install fpl-skills@ForgePlan-marketplace
```

## What NOT to do

- Do NOT delete the old plugin directory from the marketplace
- Do NOT remove the old plugin from marketplace.json (breaks existing installs)
- Do NOT set `supersedes` in plugin.json without README guidance for users

## Common errors

| Error | Fix |
|-------|-----|
| Users still load old plugin after deprecation | They need to run `/plugin marketplace update` and reinstall |
| `deprecated: true` not shown to users | Depends on Claude Code version — also update README prominently |
| Forgeplan ADR link direction wrong | New ADR supersedes old: `forgeplan link ADR-NEW ADR-OLD --relation supersedes` |

## Refs

- ADR-003 (active) — fpl-skills supersedes dev-toolkit decision
- `link-direction-rules.md` — direction semantics for supersedes
- `version-bump-policy.md` — patch bump for deprecation notice
