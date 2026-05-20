# Per-Language AC Gates in RFC

## Цель

Declare language-scoped Acceptance Criteria in every RFC so the `tester` agent
probes only the correct runners — no pytest run on a pure-Rust RFC, no vitest
run on a Go service change.

## The pattern

Add `language_stack` to RFC frontmatter. Each AC carries a language tag.
Tester reads the tag and skips runners not in scope.

## Команда

RFC frontmatter + AC block structure:

```markdown
---
language_stack: [rust, go]
affected_files:
  - rust/src/auth/**
  - go/internal/gateway/**
---

## Acceptance Criteria

AC-1 (Rust): `cargo test --workspace` returns 0 exit code, all tests PASS
AC-2 (Rust): `cargo clippy --workspace -- -D warnings` returns 0
AC-3 (Go): `go test -race ./...` returns 0 exit code
AC-4 (Go): `go vet ./...` returns 0, no issues
```

For TypeScript + Python stacks:

```markdown
---
language_stack: [ts, python]
---

## Acceptance Criteria

AC-1 (TypeScript): `pnpm test && pnpm typecheck` PASS, 0 failures
AC-2 (TypeScript): `pnpm lint` returns 0 warnings or errors
AC-3 (Python): `pytest -x --strict-markers` PASS, no warnings
AC-4 (Python): `ruff check .` returns 0 findings
```

## Пример

Full RFC excerpt (Rust + Go auth service):

```markdown
---
id: RFC-010
title: Polyglot Auth Service
language_stack: [rust, go]
affected_files:
  - rust/src/auth/**
  - rust/Cargo.toml
  - go/internal/auth/**
  - go/go.mod
---

## Summary
Implement JWT validation in Rust auth lib + Go gateway middleware.

## Acceptance Criteria

AC-1 (Rust): `cargo test --workspace -p auth-lib` PASS
AC-2 (Rust): `cargo test --doc -p auth-lib` PASS (doc examples compile + run)
AC-3 (Go): `go test -race ./internal/auth/...` PASS
AC-4 (Go): JWT roundtrip integration test in `go/internal/auth/jwt_test.go` PASS
```

Tester dispatch prompt:
```
Scope to language_stack from RFC frontmatter: [rust, go]
Run: cargo test, go test -race
Skip: pytest, vitest
```

## Common errors

| Error | Fix |
|-------|-----|
| Missing `language_stack` → tester probes all 4 runners | Add frontmatter field; tester falls back to full-sweep costing ~2× context |
| AC tags omitted (no `(Rust):` prefix) | Tag every AC — tester uses tags to map AC to runner |
| `language_stack: [typescript]` but AC says `npm test` | Match runner to actual project tooling (`pnpm test`, `vitest`, `jest`) |
| Single AC covers both langs: "all tests pass" | Split: one AC per lang per runner — reviewers verify against specific commands |

## Refs

- PRD-026 (active) — CRUD-R-A matrix; tester is Profile B, reads RFC ACs literally
- `tester-multi-runner-probe.md` — dispatch-side scoping complement to this pattern
- `bold-pattern-body.md` (recipes-evidence/) — matching EVID body per-AC verification
- `affected-files-discipline.md` — path-prefix bucketing uses same frontmatter fields
