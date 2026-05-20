# polyglot

Recipes for working with Rust + Go + TypeScript + Python monorepos in
the forgeplan pipeline — CLAUDE.md cascade, RFC AC gates, worktree cold
starts, dispatch bucketing, and tester scoping.

## Contents

| File | Description | Lines |
|------|-------------|-------|
| [polyglot-claude-md-cascade.md](polyglot-claude-md-cascade.md) | Root vs per-lang-dir CLAUDE.md — what goes where in a 4-lang monorepo | 54 |
| [per-language-ac-gates.md](per-language-ac-gates.md) | RFC template: cargo test / go test -race / pytest / tsc --noEmit ACs | 60 |
| [worktree-cold-start.md](worktree-cold-start.md) | Dep-restore sequence (cargo fetch / go mod / pnpm install / pip) + cold-cost notes | 58 |
| [affected-files-discipline.md](affected-files-discipline.md) | `affected_files` frontmatter for path-prefix dispatch bucketing | 56 |
| [tester-multi-runner-scope.md](tester-multi-runner-scope.md) | Scope tester to `language_stack` field — avoid noise in single-lang RFCs | 54 |

## When to use which recipe

| Scenario | Recipe |
|----------|--------|
| Setting up CLAUDE.md for a polyglot monorepo | polyglot-claude-md-cascade.md |
| Writing an RFC that spans Rust + Go services | per-language-ac-gates.md |
| Coder dispatched to worktree, deps missing | worktree-cold-start.md |
| `forgeplan_dispatch` falling back to serial | affected-files-discipline.md |
| Tester reporting false CONCERNS for wrong language | tester-multi-runner-scope.md |
