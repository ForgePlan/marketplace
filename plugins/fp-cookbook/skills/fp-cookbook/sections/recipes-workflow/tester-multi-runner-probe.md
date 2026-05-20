# Tester Multi-Runner Probe Scoping

## Цель

The `tester` agent Step 4 probes all known test runners by default:
`cargo test`, `go test`, `pytest`, `vitest`. In a polyglot repo this wastes
context and produces false CONCERNS ("no pytest files found") for Rust-only
RFCs. Scope the probe to the RFC's declared `language_stack`.

## The pattern

```
RFC declares:  language_stack: [rust]
Dispatch adds: "Scope to language_stack from RFC frontmatter: [rust]"
Tester runs:   cargo test --workspace
Tester skips:  go test, pytest, vitest (marks as "out-of-scope, not CONCERNS")
```

## Команда

Dispatch prompt fragment to tester (add to orchestrator prompt):

```python
# Extract language_stack from RFC frontmatter before dispatching tester
language_stack = rfc.frontmatter.get("language_stack", ["all"])

tester_prompt = f"""
You are tester (Profile B). RFC {rfc_id} language_stack: {language_stack}.

Step 4 — scope to declared stack only:
- Run ONLY runners matching language_stack
- For runners NOT in language_stack: write "out-of-scope (not in language_stack)" — NOT a CONCERN
- Do not report CONCERNS for absent test files in out-of-scope languages
"""
```

Runner map (tester uses this lookup):

```
rust       → cargo test --workspace
           → cargo test --doc (if doc-examples in AC)
go         → go test -race ./...
           → go vet ./...
ts         → pnpm test (or npx vitest run)
           → pnpm typecheck
python     → pytest -x --strict-markers
           → ruff check .
```

## Пример

RFC declares `language_stack: [rust]`:

```markdown
Tester Step 4 probe results:
  rust  (in scope): cargo test --workspace → EXIT 0, 47 tests PASS ✓
  go    (out-of-scope): skipped — not in language_stack [rust]
  ts    (out-of-scope): skipped — not in language_stack [rust]
  python(out-of-scope): skipped — not in language_stack [rust]

Verdict: PASS
```

Without scoping, tester reports:
```
  python: CONCERNS — no pytest files found in repo
  ts:     CONCERNS — no vitest config found
```
These are false positives that block activation and require manual review override.

## Scoping levels

| Scope | When | How |
|-------|------|-----|
| Single language: `[rust]` | RFC touches one service | Tester runs 1 runner |
| Two languages: `[rust, go]` | Cross-service RFC | Tester runs 2 runners |
| Full stack: `[rust, go, ts, python]` | Repo-wide change (e.g. CI config) | Tester runs all 4 |
| Missing `language_stack` | Old RFC without field | Tester runs all 4 (full sweep, warn in EVID) |

## Common errors

| Error | Fix |
|-------|-----|
| Tester reports CONCERNS for "no pytest" on Rust RFC | Add `language_stack: [rust]` to RFC frontmatter |
| Dispatch prompt missing language_stack injection | Orchestrator must read RFC frontmatter before building tester prompt |
| `language_stack: [typescript]` but runner is `jest` | Override runner in AC: `AC-1 (TypeScript): jest --runInBand returns 0` |
| Tester skips language that IS in scope | Verify `language_stack` frontmatter key spelling (case-sensitive) |

## Refs

- agents-core/agents/tester.md Step 4 — base procedure tester follows (scope injection overrides it)
- `per-language-ac-gates.md` — complementary: per-language AC declarations tester reads
- PRD-026 (active) — Profile B tester contract; reads RFC ACs and language_stack literally
- PRD-043 FR-005 (active) — polyglot guidance gap this recipe closes
