# Worktree Cold Start — Dependency Restore Before Build

## Цель

Sub-agents with `isolation: worktree` check out a fresh tree where
`target/`, `node_modules/`, `vendor/`, and `__pycache__/` are MISSING.
Running a build directly will fail with cryptic errors. Dep restore
is mandatory before coder Step 4 (compile/lint verification).

## The problem

```
worktree checkout:
  ✓ rust/src/        ← source present
  ✗ rust/target/     ← NOT present (gitignored)
  ✗ ts/node_modules/ ← NOT present (gitignored)
  ✗ go/vendor/       ← NOT present (gitignored)
  ✗ python/.venv/    ← NOT present (gitignored)

cargo build → error[E0432]: unresolved import (deps not fetched)
go build    → cannot find module providing package (vendor missing)
pnpm test   → sh: vitest: command not found
pytest      → ModuleNotFoundError: No module named 'fastapi'
```

## Команда

Cold-start restore sequence (run at worktree root before any build):

```bash
# Detect presence and restore only what exists in this repo
[ -f rust/Cargo.toml ] && (cd rust && cargo fetch)
[ -f go/go.mod ]       && (cd go  && go mod download)
[ -f ts/package.json ] && (cd ts  && pnpm install --frozen-lockfile)
[ -f python/requirements.txt ] && (cd python && pip install -q -r requirements.txt)

# For Python with pyproject.toml (modern layout):
[ -f python/pyproject.toml ] && (cd python && pip install -q -e ".[dev]")
```

Run this block ONCE per worktree session, before any `cargo build`,
`go build`, `pnpm build`, or `pytest` call.

## Пример

Modified coder Step 4 for polyglot worktree:

```
### Step 4 — Verify locally via Bash

# 0. Cold-start restore (worktree only — skip if not isolation:worktree)
[ -f rust/Cargo.toml ] && (cd rust && cargo fetch)
[ -f go/go.mod ]       && (cd go  && go mod download)
[ -f ts/package.json ] && (cd ts  && pnpm install --frozen-lockfile)
[ -f python/requirements.txt ] && (cd python && pip install -q -r requirements.txt)

# 1. Compile + typecheck
(cd rust && cargo build --message-format=short 2>&1)
(cd go   && go build ./...)
(cd ts   && pnpm typecheck)

# 2. Lint
(cd rust && cargo clippy --workspace -- -D warnings)
(cd go   && golangci-lint run ./...)
(cd ts   && pnpm lint)
```

## Restore options: fetch vs install

| Language | Light (fetch only) | Full (install) | When to use full |
|----------|-------------------|----------------|-----------------|
| Rust | `cargo fetch` | `cargo build` | If proc-macros must compile |
| Go | `go mod download` | `go mod vendor` | If using `-mod=vendor` flag |
| TypeScript | `pnpm install --frozen-lockfile` | same | Always (no lighter option) |
| Python | `pip install -q -r requirements.txt` | `pip install -e ".[dev]"` | If package has src layout |

## Common errors

| Error | Fix |
|-------|-----|
| "missing crate" on cargo build | Run `cargo fetch` before build; Cargo.lock must be committed |
| `go: cannot find module` | Run `go mod download`; verify `go.sum` is committed |
| `vitest: command not found` | Run `pnpm install --frozen-lockfile`; do NOT use `npm install` (lockfile mismatch) |
| Using `.worktreeinclude` to copy `node_modules/` | Avoid: 200-500 MB per worktree; run `pnpm install` instead |
| Restore takes 3+ minutes per agent | Pre-warm via `cargo fetch` in orchestrator before dispatching coder |

## Refs

- Anthropic worktree docs — `isolation: worktree` agent frontmatter
- GitHub issue #39886 — silent worktree build fails (no error on missing deps)
- `polyglot-claude-md-cascade.md` — CLAUDE.md per-lang conventions complement
- PRD-043 FR-005 (active) — worktree cold-start as documented (not automated) pattern
