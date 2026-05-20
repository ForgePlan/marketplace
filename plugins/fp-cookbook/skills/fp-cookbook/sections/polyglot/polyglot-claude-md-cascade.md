# Polyglot CLAUDE.md Cascade

## Цель

Organize CLAUDE.md files in a Rust + Go + TypeScript + Python monorepo so
each language sub-agent receives only its relevant conventions — no
cross-language noise, no redundant context.

## The pattern

```
project/
├── CLAUDE.md              ← root: stack list + cross-cutting rules (200-300 lines max)
├── rust/CLAUDE.md         ← Rust: thiserror, cargo conventions, deny-lints
├── go/CLAUDE.md           ← Go: table-driven tests, gofmt, module path
├── ts/CLAUDE.md           ← TypeScript: strict mode, ESM imports, pnpm
└── python/CLAUDE.md       ← Python: pytest, ruff, pyproject.toml
```

When Claude Code enters `rust/`, it reads root CLAUDE.md first, then
`rust/CLAUDE.md`. The cascade appends, not overwrites.

## Команда

Root CLAUDE.md template (cross-cutting only):

```markdown
# Project

**Stack**: Rust (auth service) · Go (API gateway) · TypeScript (UI) · Python (ML pipeline)
**CI**: GitHub Actions (`.github/workflows/`)
**Secrets**: never commit; use `vault kv get secret/project`

## Cross-cutting conventions
- Conventional commits: `feat(module): description`
- All services expose `/healthz` endpoint
- No direct database access from non-`*-service` packages
```

Per-language example (`rust/CLAUDE.md`):

```markdown
# Rust conventions

**Toolchain**: stable (see `rust-toolchain.toml`)
**Error handling**: `thiserror` for library errors, `anyhow` in binaries
**Lints**: `#![deny(warnings, clippy::all)]` in every crate root
**Tests**: `cargo test --workspace` before PR; unit tests in same file as source
```

## Пример

A `coder` sub-agent dispatched to `rust/src/auth/` reads:
1. root CLAUDE.md → stack context, cross-cutting rules
2. `rust/CLAUDE.md` → thiserror, deny-lints, workspace deps

It does NOT load `python/CLAUDE.md` — zero context wasted on pytest
conventions when building Rust auth.

## Common errors

| Error | Fix |
|-------|-----|
| Everything in root CLAUDE.md (500+ lines) | Split: cross-cutting → root; lang-specific → per-dir |
| Per-lang file conflicts with root | Root declares ONLY cross-cutting rules; lang files own formatting |
| Sub-agent writes Python-style code in Rust | Verify `rust/CLAUDE.md` exists with explicit anti-patterns section |
| Root CLAUDE.md missing stack list | Always declare `**Stack**:` in first 10 lines — dispatch bucketing uses it |

## Refs

- ASM.md §5 Layer 1 — CLAUDE.md cascade loading order
- [Claude Code nested CLAUDE.md docs](https://docs.anthropic.com/en/docs/claude-code/projects#nested-claudemd-files)
- `affected-files-discipline.md` — path-prefix bucketing complement
- PRD-043 FR-005 (active) — polyglot guidance gap this recipe closes
