# Affected Files Discipline

## Цель

Declaring `affected_files` in PRD/RFC frontmatter enables
`forgeplan_dispatch` to bucket sub-agents into parallel, file-isolated
work units. Without it, dispatch falls back to serial execution — even
when depth warrants 4 parallel agents.

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
and returns one bucket per group. Each coder sub-agent receives one
bucket and a "DO NOT TOUCH other paths" constraint.

## Команда

```bash
# With affected_files declared (parallel bucketing):
forgeplan_dispatch(agents=4, status="active")
# Returns: 4 file-isolated buckets
# → Agent A: rust/src/auth/** + rust/Cargo.toml
# → Agent B: go/internal/auth/** + go/go.mod
# → Agent C: ts/src/components/Login/** + ts/package.json
# → Agent D: remaining files

# Without affected_files (serial fallback):
forgeplan_dispatch(agents=4, status="active")
# Returns: 1 bucket with all files → 1 agent runs at a time
```

## Пример

Sprint L measurement: **26 of 37 active PRDs** lacked `affected_files`.
Those 26 fell back to serial dispatch even at Critical depth.

PRD-043 correct declaration (polyglot, 5 buckets):

```yaml
---
affected_files:
  - plugins/fp-cookbook/skills/fp-cookbook/sections/polyglot/**
  - plugins/agentic-rag/skills/agentic-rag/sections/distribution/**
  - plugins/agents-core/agents/**
  - plugins/agents-pro/agents/**
  - plugins/agents-sparc/agents/**
---
```

Result: 5 parallel coder agents, each touching only their section
directory. Zero merge conflicts.

## Path-prefix rules

| Rule | Rationale |
|------|-----------|
| Prefix with language directory (`rust/`, `go/`, `ts/`, `python/`) | Bucketing key is directory prefix; missing prefix merges all into one |
| Use `**` for subdirectory recursion | Single-file paths create too-small buckets |
| Keep lock files in the same bucket as their source | `Cargo.toml`/`go.mod`/`package.json` changes travel with code |
| Never declare `**` at repo root | Covers everything → one bucket → serial fallback |

## Common errors

| Error | Fix |
|-------|-----|
| Paths missing language dir: `src/auth/**` → single bucket | Use `rust/src/auth/**` to signal Rust bucket |
| `affected_files` in body, not frontmatter | Must be YAML frontmatter (between `---`); body tables ignored (Anomaly #18) |
| Adding affected_files after dispatch already ran | Declare before first dispatch; re-dispatch reads updated frontmatter |
| `**` glob unsupported by dispatch version | Fallback: list top-level directories explicitly |

## Refs

- Sprint L EVID-064 — ML-10: 26/37 PRDs lack affected_files; serial fallback measured
- `wave-based-dispatch.md` (recipes-workflow/) — parallel dispatch runtime pattern
- forgeplan#293 (open) — drift parser fails on markdown-table affected_files format
- PRD-043 FR-005 (active) — affected_files gap this recipe closes
