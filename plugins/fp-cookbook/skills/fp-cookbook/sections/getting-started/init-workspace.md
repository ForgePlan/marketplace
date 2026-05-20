# Initialise a Forgeplan Workspace

## Цель

Set up `.forgeplan/` in an existing git repository so that `forgeplan list`,
`forgeplan new`, and MCP tools all work correctly from that directory.

## Команда

```bash
cd /path/to/your/repo

# Initialise
forgeplan init

# Confirm
forgeplan health
forgeplan list
```

## Пример

```
$ forgeplan init
✅ Initialised forgeplan workspace at /path/to/your/repo/.forgeplan/
   Created: .forgeplan/config.yaml
   Created: .forgeplan/state/

$ forgeplan health
✅ .forgeplan/ found
✅ config.yaml valid
✅ MCP server reachable (if claude-code session active)
   Artifacts: 0

$ forgeplan list
(empty — no artifacts yet)
```

## What gets created

```
.forgeplan/
├── config.yaml          # workspace config (title, owner)
└── state/               # one YAML per artifact (auto-managed)
```

## .gitignore patterns

Add to `.gitignore` if you do NOT want to commit forgeplan state:
```
# forgeplan local state (optional — most teams commit it)
# .forgeplan/
```

Most teams **commit** `.forgeplan/` so all contributors share the same artifact graph.
Add to `.gitignore` only if the workspace is personal / scratch.

## Common errors

| Error | Fix |
|-------|-----|
| `forgeplan health` shows "config.yaml invalid" | Re-run `forgeplan init` — it overwrites config safely |
| `permission denied` writing `.forgeplan/` | Confirm write access: `ls -la .` |
| `forgeplan list` hangs | MCP server timeout; restart Claude Code session |
| Running in wrong directory | Always `cd` to repo root before `forgeplan` commands |

## Refs

- PRD-024 (active) — Full SDLC Pipeline with Quality Gates (foundation doc)
