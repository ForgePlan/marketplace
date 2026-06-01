# Validation — the lint script, CI rules, and the cache gotcha

## Run before every PR

```bash
./scripts/validate-all-plugins.sh              # all plugins
./scripts/validate-all-plugins.sh your-plugin  # one plugin
```

The same script runs in CI as the `validate` job (workflow `validate-plugins.yml`), gating merge to `main`/`dev`. Green locally = green in CI. The target is the literal final line `ALL PASSED`.

## What it checks — structural (hard FAIL)

| Check | Failure condition |
|-------|-------------------|
| `marketplace.json` valid JSON | parse error → abort |
| `plugin.json` present | missing `.claude-plugin/plugin.json` |
| `plugin.json` valid JSON | parse error |
| Required fields | empty `name`, `version`, or `description` |
| `hooks.json` valid JSON | parse error (only if file exists) |
| Command collisions | two plugins declare the same command `name` |

WARN-only (not fatal): a command/agent `.md` missing its `---` frontmatter, a skill dir missing `SKILL.md`, no `category` field.

## What it checks — agent canon (LR-1..LR-8)

A second pass lints every agent. For **forgeplan-aware** agents (whitelist or denylist mentions `mcp__forgeplan__*`) violations are ERRORS; for legacy agents they are WARNINGs (a `--strict-agents` flag promotes those to errors).

| Rule | Enforces |
|------|----------|
| LR-1 | `model` is `opus`/`sonnet`/`haiku`, never `inherit` |
| LR-2 | `color` is hex `#RRGGBB` |
| LR-3 | `description` is bilingual (`EN:` + `RU:` + `Triggers:`) |
| LR-4 | no profile mixing (not both `Write/Edit` and forgeplan mutators) |
| LR-5 | no `forgeplan_activate` in any allowlist |
| LR-6 | Profile B agents lack `forgeplan_reason`/`claims`/`memory_retain` |
| LR-7 | HARD RULES items use plain bold, no emoji-prefix bullets |
| LR-8 | Profile A/B/D denylists include `Write`+`Edit`+`NotebookEdit` |

If your plugin has no agents, this pass is a no-op — but the rules are why agent-pack PRs sometimes fail when a manifest PR wouldn't.

## The `"type": "prompt"` hook ban

A separate CI check (`Ban prompt-type hooks`) fails any `hooks.json` containing `"type": "prompt"`. Only `"type": "command"` is allowed. Prompt hooks inject a non-deterministic LLM round-trip on every tool call — they cause false blocks and pay token cost for silence. See `../hooks/_index.md`.

## The cache gotcha — validation green ≠ users updated

A passing `validate` is the publish gate, not the delivery gate. After merge, users still report stale behaviour. Most common causes:

| Symptom | Root cause | Workaround |
|---------|-----------|------------|
| New version in `marketplace.json` not picked up | catalog `metadata.version` not bumped | bump it — required for `/plugin marketplace update` to refresh |
| `/plugin install` says "already installed" but new version present | stale plugin cache | `/plugin uninstall` then `/plugin install` to force re-resolve |
| Agent loaded but new config not active | stale subagent cache in session | `/reload-plugins` |

The first row is the one validation cannot catch: the script verifies the files are correct, but a forgotten `metadata.version` bump means a correct file nobody fetches. Pair this section with `versioning.md`.

## Related

- `versioning.md` — the three-number bump rule, especially `metadata.version`
- `../hooks/_index.md` — why prompt-type hooks are banned
- `manifest.md` / `structure.md` — what the structural checks expect
