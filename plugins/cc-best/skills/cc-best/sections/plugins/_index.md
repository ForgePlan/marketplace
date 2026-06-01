# plugins — router

Five content files. Each is self-contained — load one based on the user's intent, do not pre-load the rest. All examples come from the ForgePlan marketplace (18 plugins, real `plugin.json` + `marketplace.json`).

## Intent to file

| User asks about | Load |
|---|---|
| "plugin.json fields", "what's required", "manifest", "components block" | `manifest.md` |
| "directory layout", "where do commands/agents/skills/hooks live", "structure" | `structure.md` |
| "how do users install", "marketplace vs npx skills", "two channels", "publish" | `distribution.md` |
| "what version do I bump", "semver", "catalog metadata.version", "nobody got my update" | `versioning.md` |
| "validation", "CI lint", "validate-all-plugins", "LR rules", "cache not refreshing" | `validation.md` |

## Cross-references

- `manifest.md` declares components; `structure.md` shows where those component files actually sit on disk. Load both for "build a plugin from scratch".
- `versioning.md` and `validation.md` overlap on one trap: the catalog `metadata.version` bump. Versioning explains *which* number; validation explains *why the update silently never ships* without it.
- `distribution.md` references the dual-bump rule from `versioning.md` — a release that skips the bump is invisible to `/plugin marketplace update`.

## When the user's question spans multiple files

Pick the file with the most direct answer first. Cite the others by relative path (`see versioning.md`) — do not concatenate them into one response.

## When in doubt

Default to `manifest.md` for "I'm building a plugin, where do I start". Default to `validation.md` for "my plugin / update isn't behaving".
