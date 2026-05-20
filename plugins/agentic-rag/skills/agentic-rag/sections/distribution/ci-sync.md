# CI Sync — Keeping Plugin and Standalone in Sync

When promoting a skill to standalone distribution, a CI workflow keeps both repos consistent.
ForgePlan uses `sync-standalone-skills.yml` in the marketplace repo.

## The sync pattern

```
marketplace/plugins/my-skill/skills/my-skill/
         ↕  (CI sync on push to main)
ForgePlan/my-skill-standalone/
  SKILL.md          ← copied from skills/my-skill/SKILL.md
  sections/         ← copied from skills/my-skill/sections/
  README.md
```

## Minimal workflow structure

```yaml
name: Sync standalone skills
on:
  push:
    branches: [main]
    paths: ['plugins/MY_SKILL/skills/MY_SKILL/**']
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Push skill to standalone repo
        run: |
          # Copy SKILL.md + sections/ to standalone repo via GITHUB_TOKEN
```

See `.github/workflows/sync-standalone-skills.yml` in the ForgePlan marketplace
for the live reference with matrix strategy for multiple skills.

## What NOT to sync

Do NOT sync `plugin.json`, `commands/`, `agents/`, or `hooks/` to the standalone repo.
Those are plugin-only. The standalone repo contains only: `SKILL.md` + `sections/`.

## Version discipline

When updating the skill, bump version in:
1. `plugins/my-skill/.claude-plugin/plugin.json`
2. `.claude-plugin/marketplace.json`

The CI sync handles the standalone repo commit automatically.
