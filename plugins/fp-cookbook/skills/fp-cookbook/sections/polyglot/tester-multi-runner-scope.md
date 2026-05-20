# Tester Multi-Runner Scope

## Цель

The `tester` agent Step 4 probes all known runners by default:
`cargo test`, `go test`, `pytest`, `vitest`. In a polyglot repo this
wastes context and produces false CONCERNS ("no pytest files found")
for Rust-only RFCs. Scope the probe to the RFC's `language_stack` field.

## The pattern

```
RFC declares:   language_stack: [rust]
Dispatch adds:  "Scope to language_stack: [rust]"
Tester runs:    cargo test --workspace
Tester skips:   go test, pytest, vitest → marks "out-of-scope, not CONCERNS"
```

## Команда

Dispatch prompt fragment to inject before tester (add to orchestrator):

```python
language_stack = rfc.frontmatter.get("language_stack", ["all"])

tester_prompt = f"""
You are tester (Profile B). RFC {rfc_id} language_stack: {language_stack}.

Step 4 — scope to declared stack only:
- Run ONLY runners matching language_stack
- For runners NOT in language_stack: write "out-of-scope (not in language_stack)"
- Do NOT report CONCERNS for absent test files in out-of-scope languages
"""
```

Runner lookup table (tester uses this):

```
rust    → cargo test --workspace
          cargo test --doc (if doc-examples in AC)
go      → go test -race ./...
          go vet ./...
ts      → pnpm test (or npx vitest run)
          tsc --noEmit
python  → pytest -x --strict-markers
          ruff check .
```

## Пример

RFC declares `language_stack: [rust]` — correct tester output:

```
rust   (in scope): cargo test --workspace → EXIT 0, 47 tests PASS ✓
go     (out-of-scope): skipped — not in language_stack [rust]
ts     (out-of-scope): skipped — not in language_stack [rust]
python (out-of-scope): skipped — not in language_stack [rust]

Verdict: PASS
```

Without scoping (false positive output):
```
python: CONCERNS — no pytest files found
ts:     CONCERNS — no vitest config found
```
These false positives block activation and require manual review override.

## Scoping levels

| Scope | When | Runners |
|-------|------|---------|
| `[rust]` | RFC touches one Rust service | 1 runner |
| `[rust, go]` | Cross-service RFC | 2 runners |
| `[rust, go, ts, python]` | Repo-wide change (CI config) | All 4 |
| Missing `language_stack` | Old RFC without field | All 4 (warn in EVID) |

## Common errors

| Error | Fix |
|-------|-----|
| Tester reports CONCERNS for "no pytest" on Rust RFC | Add `language_stack: [rust]` to RFC frontmatter |
| Dispatch missing language_stack injection | Orchestrator reads RFC frontmatter before building tester prompt |
| `language_stack: [typescript]` but runner is `jest` | Override in AC: `AC-1 (TypeScript): jest --runInBand returns 0` |
| Tester skips language that IS in scope | Check `language_stack` key spelling (case-sensitive) |

## Refs

- agents-core/agents/tester.md Step 4 — base procedure (scope injection overrides)
- `per-language-ac-gates.md` — per-language AC declarations tester reads
- PRD-026 (active) — Profile B tester contract; reads language_stack literally
- PRD-043 FR-005 (active) — polyglot guidance gap this recipe closes
