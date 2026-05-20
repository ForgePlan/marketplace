# Per-Language AC Gates in RFC

## Цель

Declare language-scoped Acceptance Criteria in every RFC so the `tester`
agent probes only the correct runners. No pytest run on a pure-Rust RFC,
no vitest run on a Go service change.

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

AC-1 (TypeScript): `tsc --noEmit` returns 0, zero type errors
AC-2 (TypeScript): `pnpm test` PASS, 0 failures
AC-3 (Python): `pytest -x --strict-markers` PASS, no warnings
AC-4 (Python): `ruff check .` returns 0 findings
```

## Пример

Full RFC frontmatter (Rust + Go auth service):

```markdown
---
id: RFC-010
title: Polyglot Auth Service
language_stack: [rust, go]
affected_files:
  - rust/src/auth/**
  - go/internal/auth/**
---

AC-1 (Rust): `cargo test --workspace -p auth-lib` PASS
AC-2 (Rust): `cargo test --doc -p auth-lib` PASS (doc examples compile)
AC-3 (Go): `go test -race ./internal/auth/...` PASS
AC-4 (Go): JWT roundtrip test in `go/internal/auth/jwt_test.go` PASS
```

Tester dispatch prompt:
```
Scope to language_stack: [rust, go]
Run: cargo test, go test -race
Skip: pytest, vitest (not in language_stack)
```

## Common errors

| Error | Fix |
|-------|-----|
| Missing `language_stack` → tester probes all 4 runners | Add frontmatter field; full sweep costs ~2× context |
| AC tags omitted (no `(Rust):` prefix) | Tag every AC — tester maps AC to runner via tag |
| `language_stack: [typescript]` but AC says `npm test` | Match runner to actual tooling (`pnpm test`, `vitest`, `jest`) |
| Single AC covers both langs: "all tests pass" | Split per language — reviewers verify against specific commands |

## Refs

- PRD-026 (active) — tester is Profile B; reads RFC ACs literally
- `tester-multi-runner-scope.md` — dispatch-side scoping complement
- `affected-files-discipline.md` — path-prefix bucketing uses same frontmatter
- PRD-043 FR-005 (active) — polyglot guidance gap this recipe closes
