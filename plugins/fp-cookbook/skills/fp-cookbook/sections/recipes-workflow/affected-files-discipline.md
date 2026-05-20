# Affected Files Discipline

## Цель

Declaring `affected_files` in PRD/RFC frontmatter is what enables
`forgeplan_dispatch` to bucket sub-agents into parallel, file-isolated
work units. Without it, dispatch falls back to serial execution.

## The pattern

```yaml
---
affected_files:
  - rust/src/auth/**
  - rust/Cargo.toml
  - go/internal/auth/**
  - go/go.mod
  - ts/src/components/Login/**
  - ts/package.json
---
```

`forgeplan_dispatch` reads `affected_files`, groups by directory prefix,
and returns one bucket per group. Each coder sub-agent receives one bucket
and a "DO NOT TOUCH other paths" constraint — zero merge conflicts.

## Команда

```bash
# With affected_files declared (parallel bucketing):
forgeplan_dispatch(agents=4, status="active")
# Returns: 4 file-isolated buckets matching the path prefixes
# → Agent A: rust/src/auth/** + rust/Cargo.toml
# → Agent B: go/internal/auth/** + go/go.mod
# → Agent C: ts/src/components/Login/** + ts/package.json
# → Agent D: (remaining files, if any)

# Without affected_files (serial fallback):
forgeplan_dispatch(agents=4, status="active")
# Returns: 1 bucket with all files → only 1 agent runs at a time
```

## Пример

Sprint L EVID-064 measurement: **26 of 37 active PRDs** lacked `affected_files`.
Those 26 fell back to serial dispatch even when PRD depth warranted 3-4 agents.

PRD-043 affected_files (correct declaration):

```yaml
---
affected_files:
  - plugins/fp-cookbook/skills/fp-cookbook/sections/recipes-workflow/**
  - plugins/agentic-rag/skills/agentic-rag/sections/distribution/**
  - plugins/agents-core/agents/**
  - plugins/agents-pro/agents/**
  - plugins/agents-sparc/agents/**
---
```

Result: dispatch created 5 buckets → 5 parallel coder agents, each
touching only their section directory. Zero conflicts.

## Path-prefix rules

| Rule | Rationale |
|------|-----------|
| Always prefix with language directory (`rust/`, `go/`, `ts/`, `python/`) | Bucketing key is directory prefix; missing prefix merges all into one bucket |
| Use `**` for subdirectory recursion | Single file paths create too-small buckets; one per directory is ideal |
| Keep `Cargo.toml` / `go.mod` / `package.json` in the same bucket as their source | Lock file changes travel with the code that changes them |
| Never declare `**` at repo root | Covers everything → one bucket → serial fallback |

## Common errors

| Error | Fix |
|-------|-----|
| Paths missing language dir prefix: `src/auth/**` → all in one bucket | Use `rust/src/auth/**` to signal Rust bucket |
| `**` glob unsupported by dispatch version | Check forgeplan CLI version; fallback: list top-level directories explicitly |
| `affected_files` in body, not frontmatter | Must be YAML frontmatter (between `---` delimiters); body tables ignored (Anomaly #18) |
| Adding affected_files after dispatch already run | Declare before dispatch; re-dispatch reads updated frontmatter |

## Refs

- Sprint L EVID-064 (active) — ML-10: 26/37 PRDs lack affected_files; serial fallback measured
- AGENT-AUTHORING-GUIDE.md Step 11 — affected_files declaration in new PRDs
- `wave-based-dispatch.md` — parallel dispatch runtime pattern (uses this as prerequisite)
- forgeplan#293 (open) — drift parser fails on markdown-table affected_files format
