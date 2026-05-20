# Worktree Cold Start — Dependency Restore Before Build

## Цель

Sub-agents with `isolation: worktree` check out a fresh tree where
`target/`, `node_modules/`, `vendor/`, and `__pycache__/` are absent.
Running a build immediately fails with cryptic errors. Dep restore is
mandatory before coder Step 4 (compile/lint verification).

## The problem

```
worktree checkout:
  ✓ rust/src/        ← source present
  ✗ rust/target/     ← NOT present (gitignored)
  ✗ ts/node_modules/ ← NOT present (gitignored)
  ✗ go/vendor/       ← NOT present (gitignored)
  ✗ python/.venv/    ← NOT present (gitignored)

cargo build → error[E0432]: unresolved import
go build    → cannot find module providing package
pnpm test   → sh: vitest: command not found
pytest      → ModuleNotFoundError: No module named 'fastapi'
```

## Команда

Cold-start restore sequence (run once at worktree root, before any build):

```bash
[ -f rust/Cargo.toml ]          && (cd rust   && cargo fetch)
[ -f go/go.mod ]                && (cd go     && go mod download)
[ -f ts/package.json ]          && (cd ts     && pnpm install --frozen-lockfile)
[ -f python/requirements.txt ]  && (cd python && pip install -q -r requirements.txt)

# Modern Python with pyproject.toml:
[ -f python/pyproject.toml ]    && (cd python && pip install -q -e ".[dev]")
```

Expected cold cost per language: `cargo fetch` 30-90s, `go mod download`
15-45s, `pnpm install` 30-120s, `pip install` 20-60s.

## Пример

Modified coder Step 4 for polyglot worktree:

```bash
# 0. Cold-start restore (skip if not isolation:worktree)
[ -f rust/Cargo.toml ] && (cd rust && cargo fetch)
[ -f go/go.mod ]       && (cd go  && go mod download)
[ -f ts/package.json ] && (cd ts  && pnpm install --frozen-lockfile)

# 1. Compile + typecheck
(cd rust && cargo build --message-format=short)
(cd go   && go build ./...)
(cd ts   && pnpm typecheck)

# 2. Lint
(cd rust && cargo clippy --workspace -- -D warnings)
(cd ts   && pnpm lint)
```

## Restore options: fetch vs install

| Language | Light (fetch only) | Full (install) | When to use full |
|----------|--------------------|----------------|-----------------|
| Rust | `cargo fetch` (30-90s) | `cargo build` | If proc-macros must compile |
| Go | `go mod download` (15-45s) | `go mod vendor` | If using `-mod=vendor` flag |
| TypeScript | `pnpm install --frozen-lockfile` (30-120s) | same | Always |
| Python | `pip install -q -r requirements.txt` | `pip install -e ".[dev]"` | If src layout |

## Common errors

| Error | Fix |
|-------|-----|
| "missing crate" on cargo build | Run `cargo fetch`; ensure Cargo.lock is committed |
| `go: cannot find module` | Run `go mod download`; verify `go.sum` is committed |
| `vitest: command not found` | Run `pnpm install --frozen-lockfile`; never `npm install` (lockfile mismatch) |
| Copying `node_modules/` via `.worktreeinclude` | Avoid: 200-500 MB per worktree; run `pnpm install` instead |
| Restore takes 3+ min per agent | Pre-warm via `cargo fetch` in orchestrator before dispatching coder |

## Refs

- Anthropic docs — `isolation: worktree` agent frontmatter
- `polyglot-claude-md-cascade.md` — CLAUDE.md per-lang conventions complement
- `per-language-ac-gates.md` — AC gates that depend on restored deps
- PRD-043 FR-005 (active) — worktree cold-start as documented pattern
