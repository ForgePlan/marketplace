# Plugin manifest — plugin.json fields and components

## Where it lives

Every plugin has exactly one manifest at `.claude-plugin/plugin.json` inside the plugin directory. Note the dot-prefix: it is `plugins/your-plugin/.claude-plugin/plugin.json`, not `plugins/your-plugin/plugin.json`. The validator's first check is `if [ ! -f "$plugin_dir/.claude-plugin/plugin.json" ]` — wrong location = hard FAIL.

## Required fields — three, no more

CI fails the build if any of these is empty:

| Field | Type | Example |
|-------|------|---------|
| `name` | string | `"cc-best"` (kebab-case, matches the directory name) |
| `version` | string | `"1.0.0"` (semver — see `versioning.md`) |
| `description` | string | one sentence stating what the plugin does |

```json
{
  "name": "your-plugin-name",
  "version": "1.0.0",
  "description": "Brief description of what the plugin does"
}
```

That is a complete, valid manifest. Everything below is optional metadata.

## Optional metadata — recommended

```json
{
  "author":   { "name": "ForgePlan" },
  "homepage":  "https://github.com/ForgePlan/marketplace",
  "license":   "MIT",
  "category":  "developer-tools",
  "keywords":  ["forgeplan", "workflow"]
}
```

`category` is a v2-schema field — its absence emits `INFO: No 'category' field`, never a failure. ForgePlan uses `developer-tools`, `memory`, `knowledge`.

## The `components` block — a manifest of what's inside

`components` is optional but recommended. It is an inventory, not a wiring spec — Claude Code discovers components by directory convention regardless. Its value is documentation: it tells a reader (and the validator's "v2 components field present" check) what the plugin ships.

```json
"components": {
  "commands": [],
  "agents":   ["dev-advisor"],
  "skills":   ["audit", "research", "sprint"],
  "hooks":    ["SessionStart", "PreToolUse:Bash", "PostToolUse:.*"]
}
```

The `hooks` array lists event signatures, not file paths — they describe *when* hooks fire.

**Trap**: keeping `components` accurate is manual. If you add a skill and forget to list it here, nothing breaks at runtime — but the manifest now lies.

**What ForgePlan did with it**: removed it from all 23 plugin manifests (marketplace#246). The trap above is the reason — the inventory drifted every time a skill was added, and nothing read it: no gate, no loader, no installer. Claude Code discovers components by directory convention either way, so a hand-maintained copy of `ls` is a second source of truth that can only be wrong. The field remains valid upstream; this is a house rule, not a schema change.

## Related

- `structure.md` — where the component files declared here actually live on disk
- `versioning.md` — the `version` field's bump policy
- `validation.md` — the CI checks that read this file
