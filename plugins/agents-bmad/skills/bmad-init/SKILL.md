---
name: bmad-init
description: |
  One-time per-project setup for the BMAD pipeline — generates the `.forgeplan/bmad/stack.json`
  language binding that the `bmad-gate.sh` hook reads (test command, test/source file globs, the
  assertion-failure marker, lint command) and initialises the per-branch state file. Without
  stack.json the gate cannot classify files, so the no-code-before-plan rule cannot be enforced.
  Auto-detects the stack from repo markers (pyproject/go.mod/Cargo.toml/package.json/composer.json/
  Gemfile/pom.xml), optionally reconciles with a stack-ADR, shows the result for human review, writes it.
  EN: Run once before the first `/bmad` cycle on a project. Detects the test/source stack and writes
  `.forgeplan/bmad/stack.json`; initialises `.forgeplan/bmad/state-<branch>.json` at phase=planning.
  RU: Запусти один раз перед первым циклом `/bmad`. Определяет тест/исходный стек и пишет
  `.forgeplan/bmad/stack.json`; инициализирует `.forgeplan/bmad/state-<branch>.json` в phase=planning.
  Triggers: "bmad init", "/bmad-init", "set up bmad", "bmad setup", "configure bmad", "generate bmad stack.json",
  "заведи bmad", "настрой bmad", "stack.json для bmad"
---

# /bmad-init — set up the BMAD gate binding for this project

`/bmad` enforces "no application code before the plan is done" with the `bmad-gate.sh` PreToolUse
hook. That hook needs to know **what counts as a source/test file** (to block early code writes) — it
reads `.forgeplan/bmad/stack.json`. This skill creates it and initialises the per-branch state. Run it
**once per project** (re-run to update after a stack change).

## Why this is required

With no `stack.json` the gate cannot classify files, so it allows everything — **no enforcement**.
`stack.json` is the per-project binding that turns the generic methodology into a concrete enforced
arc. It is the derived cache the hook reads on every write — fast, no MCP call (hooks cannot call MCP).

## Procedure

### Step 1 — auto-detect the stack

```bash
. "${CLAUDE_PLUGIN_ROOT}/scripts/bmad-lib.sh"   # or plugins/agents-bmad/scripts/bmad-lib.sh
detect_stack            # emits: language <TAB> test_command <TAB> test_file_glob <TAB> source_file_glob <TAB> red_confirm <TAB> lint_command
```

`detect_stack` recognises: Python (pyproject/setup.py/pytest.ini/tox.ini), Rust (`Cargo.toml`), Go
(`go.mod`), TypeScript/JS (`package.json` → vitest/jest/npm), PHP (`composer.json`), Ruby (`Gemfile`),
Java (`pom.xml`).

- **Exit 0** → confident match; carry its six fields to Step 3.
- **Exit 1** → nothing matched (polyglot or unusual repo). Go to Step 2.

### Step 2 — reconcile / fill (only if detection was uncertain or the user wants overrides)

- If a **stack-ADR** exists (`kind=adr` titled like "Stack: …"), read it via `forgeplan_get` and prefer
  its declared `test_command` / globs — the ADR is the source of truth; `stack.json` is its cache.
- If detection returned exit 1 and there is no stack-ADR, **ask the user** for the test command, the
  test-file glob, the source-file glob, the assertion-failure marker (`red_confirm`), and the lint
  command. Do not guess silently — a wrong glob silently breaks file classification (the gate's #1 job).

### Step 3 — show the result for review, then write + initialise state

Present the six fields as a small table and confirm. On confirmation:

```bash
write_stack_json "<language>" "<test_command>" "<test_file_glob>" "<source_file_glob>" "<red_confirm>" "<lint_command>"
# writes <repo_root>/.forgeplan/bmad/stack.json and echoes the path

# initialise the per-branch state at phase=planning (governing_rfc filled later by the master)
bash "${CLAUDE_PLUGIN_ROOT}/scripts/bmad-lib.sh" init "$(branch_slug)" ""
```

Then show the final `stack.json` and tell the user BMAD is ready: "Run `/bmad` (or route a greenfield
brief through smith Row 1) to start the persona walk."

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
  win over source when both could match. **These two globs are what the gate blocks during planning/
  solutioning** — get them right or the no-code rule misfires.
- `red_confirm` / `lint_command` — used by the QA personas; carried for parity with the methodology.

## HARD RULES

1. **Do not hand-author `stack.json` blindly** — run `detect_stack` first; fall back to asking the user
   only when detection is uncertain. A wrong glob silently breaks the gate's file classification.
2. **The stack-ADR (if present) is the source of truth; `stack.json` is its cache.** On disagreement,
   prefer the ADR and note the drift.
3. **Re-run after a stack change.** A stale `stack.json` classifies files wrong and misfires the gate.
4. **This skill does not start a cycle** — it only writes config + initial state. The first `/bmad` run
   does the rest.

## Related

- `/bmad` — the persona walk this config enables.
- `scripts/bmad-lib.sh` — `detect_stack` + `write_stack_json` + the state CLI.
- `hooks/bmad-gate.sh` — the consumer of `stack.json` + the state file.
- RFC-013 (FR-4 gate / FR-5 state+config), ADR-010 (C5 enforcement reads this binding).
