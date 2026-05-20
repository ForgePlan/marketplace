# Declare affected_files to Enable Parallel Dispatch

## Цель

Add `affected_files` to a PRD so `forgeplan_dispatch` can bucket work
by file-isolated parallel sub-agents. Without it, dispatch falls back to serial.

## Команда

Add an `## Affected Files` section to the PRD body (markdown list format):

```markdown
## Affected Files

- `plugins/fp-cookbook/.claude-plugin/plugin.json` (NEW)
- `plugins/fp-cookbook/skills/fp-cookbook/SKILL.md` (NEW ~80 LOC)
- `plugins/fp-cookbook/skills/fp-cookbook/sections/getting-started/_index.md` (NEW)
- `.claude-plugin/marketplace.json` (entry add + catalog bump)
```

Then dispatch via MCP:

```
forgeplan_dispatch(agents=4, status="active")
```

## Why this matters

`forgeplan_dispatch` reads `affected_files` from each active PRD to build
non-overlapping file buckets. Each bucket → one sub-agent. Zero merge conflicts
because each agent touches disjoint files.

Sprint O shipped PRD-041 with full affected_files — used this exact pattern
to dispatch 4 parallel agents for link-footgun detection.

## Format rules

| Rule | Example |
|------|---------|
| Use backtick-quoted paths | `plugins/fp-cookbook/README.md` |
| Mark NEW/MODIFIED | `(NEW)` or `(MODIFIED +30/-5 LOC)` |
| One file per line | — |
| List ALL files the PRD touches | Including scripts, CI, docs |

## Common errors

| Error | Fix |
|-------|-----|
| `forgeplan_dispatch` returns serial fallback | PRD is missing `## Affected Files` section |
| Anomaly #16: inverted link silently set | See `link-direction-rules.md` — unrelated but commonly confused |
| `forgeplan_drift` returns `changed_files: []` | Known Anomaly #18 — markdown-table format breaks parser; use list format |
| Files overlap across two PRDs | Refactor: each file belongs to exactly one active PRD |

## Refs

- PRD-041 (active) — canonical example of affected_files declaration (Sprint O)
- EVID-068 (active) — verifies Sprint O dispatch worked with affected_files
- Anomaly #15/#16 — link direction footguns (separate but related)
- Anomaly #18 — `forgeplan_drift` false-negative on table-format affected_files
