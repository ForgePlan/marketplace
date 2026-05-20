# recipes-workflow

Recipes for running the full forgeplan SDLC cycle efficiently.

## Contents

| File | Description | Lines |
|------|-------------|-------|
| [route-shape-build-audit-activate.md](route-shape-build-audit-activate.md) | Full Route→Shape→Build→Audit→Activate SDLC with /forge-cycle references | 60 |
| [wave-based-dispatch.md](wave-based-dispatch.md) | File-isolated parallel sub-agent pattern (Sprint A-O: 0 merge conflicts) | 52 |
| [dogfood-inline-activate.md](dogfood-inline-activate.md) | Sprint D discipline: activate PRDs+EVIDs immediately, no draft pile | 48 |
| [polyglot-claude-md-cascade.md](polyglot-claude-md-cascade.md) | Root + per-lang-dir CLAUDE.md layout for Rust/Go/TypeScript/Python monorepos | 54 |
| [per-language-ac-gates.md](per-language-ac-gates.md) | RFC template with per-language AC blocks and language_stack frontmatter | 60 |
| [worktree-cold-start.md](worktree-cold-start.md) | Dep-restore sequence (cargo fetch/go mod/pnpm install/pip) before coder Step 4 | 58 |
| [affected-files-discipline.md](affected-files-discipline.md) | affected_files frontmatter convention for path-prefix parallel bucketing | 56 |
| [tester-multi-runner-probe.md](tester-multi-runner-probe.md) | Scope tester probe to RFC language_stack — skip runners not in scope | 54 |

## When to use which pattern

| Scenario | Recipe |
|----------|--------|
| Starting a new feature end-to-end | route-shape-build-audit-activate.md |
| Building ≥3 files in parallel | wave-based-dispatch.md |
| EVID accumulating in draft | dogfood-inline-activate.md |
| Setting up CLAUDE.md for polyglot monorepo | polyglot-claude-md-cascade.md |
| Writing RFC for multi-language feature | per-language-ac-gates.md |
| Coder dispatched to worktree, deps missing | worktree-cold-start.md |
| forgeplan_dispatch falling back to serial | affected-files-discipline.md |
| Tester reporting false CONCERNS for wrong language | tester-multi-runner-probe.md |
