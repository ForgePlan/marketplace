---
name: tdd-init
description: |
  One-time per-project setup for the enforced-TDD methodology — generates the `.forgeplan/tdd/stack.json`
  language binding that the `tdd-gate.sh` hook reads (test command, test/source file globs, the
  assertion-failure marker, lint command). Without it the gate cannot classify files and the TDD cycle
  cannot start. Auto-detects the stack from repo markers (pyproject/go.mod/Cargo.toml/package.json/
  composer.json/Gemfile/pom.xml), optionally reconciles with a stack-ADR if one exists, shows the result
  for human review, then writes it.
  EN: Run once before the first `/tdd` cycle on a project. Detects the test stack and writes
  `.forgeplan/tdd/stack.json`. Re-run to update after a stack change.
  RU: Запусти один раз перед первым циклом `/tdd` на проекте. Определяет тест-стек и пишет
  `.forgeplan/tdd/stack.json`. Перезапусти, чтобы обновить после смены стека.
  Triggers: "tdd init", "/tdd-init", "set up tdd", "tdd setup", "generate stack.json", "configure tdd",
  "заведи tdd", "настрой tdd", "stack.json для tdd"
---

# /tdd-init — set up the TDD language binding for this project

`/tdd` cannot run until `.forgeplan/tdd/stack.json` exists — it is the config the `tdd-gate.sh` hook
reads to know **how to run tests** and **what counts as a test file vs a source file**. This skill
creates it. Run it **once per project** (re-run to update after a stack change).

## Why this is required

The gate is dormant with no `stack.json` (it cannot classify files, so it allows everything — no
enforcement). `stack.json` is the per-project binding that turns the generic, language-neutral
methodology into a concrete enforced cycle. It is the derived cache the hook reads on every write —
fast, no MCP call (hooks cannot call MCP).

## Procedure

### Step 1 — auto-detect the stack

Source the lib and run the detector against the repo root:

```bash
. "${CLAUDE_PLUGIN_ROOT}/scripts/tdd-lib.sh"   # or plugins/agents-tdd/scripts/tdd-lib.sh
detect_stack            # emits: language <TAB> test_command <TAB> test_file_glob <TAB> source_file_glob <TAB> red_confirm <TAB> lint_command
```

`detect_stack` recognises: Python (pyproject/setup.py/pytest.ini/tox.ini → `pytest -q`), Rust
(`Cargo.toml` → `cargo test`), Go (`go.mod` → `go test ./...`), TypeScript/JS (`package.json` →
vitest/jest/npm), PHP (`composer.json` → phpunit), Ruby (`Gemfile` → rspec), Java (`pom.xml` → mvn).

- **Exit 0** → a confident match; carry its six fields to Step 3.
- **Exit 1** → nothing matched (polyglot repo, or an unusual setup). Go to Step 2.

### Step 2 — reconcile / fill (only if detection was uncertain or the user wants overrides)

- If a **stack-ADR** exists in the graph (a `kind=adr` titled like "Stack: …"), read it via `forgeplan_get`
  and prefer its declared `test_command` / globs over the auto-detected guess — the ADR is the source of
  truth; `stack.json` is its derived cache.
- If detection returned exit 1 and there is no stack-ADR, **ask the user** for: the test command, the
  test-file glob, the source-file glob, the assertion-failure marker (`red_confirm` — the string that
  appears in the runner's output on a real assertion failure, e.g. pytest `FAILED`, go `--- FAIL:`,
  cargo `test result: FAILED`), and the lint command. Do not guess silently — a wrong `red_confirm`
  makes the "valid RED" check unreliable.

### Step 3 — show the result for review, then write

Present the six fields to the user as a small table and confirm before writing. On confirmation:

```bash
write_stack_json "<language>" "<test_command>" "<test_file_glob>" "<source_file_glob>" "<red_confirm>" "<lint_command>"
# writes <repo_root>/.forgeplan/tdd/stack.json and echoes the path
```

Then show the final `stack.json` and tell the user TDD is ready: "Run `/tdd` (or route a TDD-first
feature through smith) to start the first cycle on an active PRD+SPEC."

## `stack.json` shape

```json
{
  "language": "python",
  "test_command": "pytest -q",
  "test_file_glob": "test_*.py|*_test.py|tests/*.py",
  "source_file_glob": "*.py",
  "red_confirm": "FAILED",
  "lint_command": "ruff check ."
}
```

- `test_file_glob` / `source_file_glob` — pipe-delimited globs; a pattern with `/` matches the full
  relative path, without `/` matches the basename. The gate's `classify_file` uses these; test patterns
  win over source when both could match.
- `red_confirm` — the marker the orchestrator looks for to confirm a **valid RED** (an assertion
  failure, not a compile/collection error).

## HARD RULES

1. **Do not hand-author `stack.json` blindly** — run `detect_stack` first; only fall back to asking the
   user when detection is uncertain. A wrong glob silently breaks file classification (the gate's #1 job).
2. **The stack-ADR (if present) is the source of truth; `stack.json` is its cache.** When both exist and
   disagree, prefer the ADR and note the drift.
3. **Re-run after a stack change** (e.g. migrating jest → vitest). A stale `stack.json` runs the wrong
   test command.
4. **This skill does not start a cycle** — it only writes config. The first `/tdd` run does the rest.

## Related

- `/tdd` — the cycle this config enables.
- `scripts/tdd-lib.sh` — `detect_stack` + `write_stack_json`.
- `hooks/tdd-gate.sh` — the consumer of `stack.json`.
- RFC-012 (FR-2/FR-5 config-derived test command), ADR-010 (C5 enforcement reads this binding).
