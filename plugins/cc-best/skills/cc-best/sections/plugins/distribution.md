# Distribution — the two channels

A plugin can reach users two ways. They deliver different payloads; pick by what the user needs.

## Channel 1 — Marketplace plugin (full payload)

Ships everything: commands + agents + skills + hooks. This is the default channel.

```
# one-time: register the marketplace
/plugin marketplace add ForgePlan/marketplace

# install a plugin from it
/plugin install cc-best@ForgePlan-marketplace
```

The `@ForgePlan-marketplace` suffix is the marketplace `name` field from `marketplace.json` (`"name": "ForgePlan-marketplace"`) — not the org, not the repo. Get it wrong and the install can't resolve.

Update path for users:

```
/plugin marketplace update ForgePlan-marketplace
```

## Channel 2 — Standalone skill via `npx skills add` (skill-only payload)

Ships *only* the skill — `SKILL.md` + `sections/`. No commands, agents, or hooks. For users who want the knowledge base without the full plugin.

```
npx skills add ForgePlan/loux -g
```

This points at a separate standalone repo (e.g. `ForgePlan/loux`) whose root *is* the skill — `SKILL.md` at the repo root, not nested under `plugins/`.

## Which channel — decision

| User wants | Channel |
|------------|---------|
| The whole plugin (slash commands, agents, hooks) | Marketplace plugin |
| Just the knowledge / skill content, in any project | Standalone `npx skills add` |
| Both | Ship both; keep them in sync via CI |

**Default rule (ForgePlan / NOTE-003)**: start marketplace-only. Promote a skill to a standalone repo only when ≥3 users actually request `npx skills add`. Maintaining two copies has a cost — don't pay it speculatively.

## Keeping both in sync

When a skill ships both ways, a CI workflow (`sync-standalone-skills.yml`) copies `SKILL.md` + `sections/` from the marketplace plugin to the standalone repo on push to `main`. Author in the marketplace; let CI mirror. Hand-editing the standalone copy creates drift.

## Trap — the catalog bump gates the update

Publishing a new plugin version to the marketplace repo is necessary but **not sufficient** for users to receive it. `/plugin marketplace update` only refreshes when the catalog `metadata.version` in `marketplace.json` was bumped. Ship a new `plugin.json` version without bumping the catalog → zero users get the update. See `versioning.md`.

## Related

- `versioning.md` — the dual + catalog bump rule that makes an update actually ship
- `validation.md` — run before any publish PR
- `manifest.md` — the `name` field that forms the `@marketplace` install string
