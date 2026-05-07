---
name: bootstrap
description: Deploys the author's Claude Code starter scaffold into a new or existing project — creates a CLAUDE.md from the template, a guides/ folder with author guides (Git Flow, CLAUDE.md best practices), and guides/INDEX.md. Use when the user starts a new project and wants the standard Claude Code baseline, or when adding these guides to an existing project. Triggers (EN/RU) — "bootstrap project", "init claude baseline", "install my guides", "scaffold claude code", "поставь мои гайды", "разверни базу", "установи базовый CLAUDE.md", "подготовь проект под claude", "засетапь проект".
---

# Bootstrap Claude Project

Deploys the baseline Claude Code artifacts into the current project:
`CLAUDE.md`, `guides/` with author guides, `guides/INDEX.md`.

The skill's resources live next to this SKILL.md, in `resources/`:

```
~/.claude/skills/bootstrap/
├── SKILL.md           ← you are reading this
└── resources/
    ├── guides/
    │   ├── CLAUDE-MD-GUIDE.ru.md
    │   ├── GIT-FLOW-GUIDE.ru.md
    │   └── INDEX.md.template
    └── templates/
        └── CLAUDE.md.template
```

If the skill is invoked from the source repo (`CC-templates/skills/bootstrap`),
the same paths are valid relative to that directory — use the absolute path to
the directory containing this SKILL.md.

---

## When to use

- The user starts a new project and asks to "deploy the baseline", "install the guides", "bootstrap".
- An existing project lacks `CLAUDE.md` or `guides/`, and the user wants it brought up to standard.
- The user explicitly mentions one of the triggers from `description`.

## When NOT to use

- The current cwd is the `CC-templates` repo itself (it's the source — no need to scaffold it).
  → Detect by checking for `CLAUDE.md` + `skills/bootstrap/` in cwd.
- The project already has both `CLAUDE.md` **and** a complete `guides/` — nothing to do.
  → Tell the user and exit.

---

## Input (clarify before running)

Ask the three parameters in one question if the user hasn't specified them:

1. **Target path** — where to install. Defaults to current `pwd`.
2. **Which guides** — `all` (default) / `git-flow` / `claude-md`.
3. **What to do with existing `CLAUDE.md`** — `skip` (leave alone) / `append` (add a
   "See guides" block) / `replace` (recreate from template, save the old one as `CLAUDE.md.bak`).
   Default — `append`. If `CLAUDE.md` is missing — don't ask, create from the template.

---

## Process

### 1. Orient

Run:

```bash
pwd
ls -la
git rev-parse --show-toplevel 2>/dev/null || echo "not a git repo"
test -f CLAUDE.md && echo "CLAUDE.md exists" || echo "no CLAUDE.md"
test -d guides && echo "guides/ exists" || echo "no guides/"
```

Checks:
- If **no `.git`** — warn the user: "the guides assume git, recommend `git init -b main` before continuing." Ask whether to proceed without git.
- If cwd == root of `CC-templates` (signature: `skills/bootstrap/SKILL.md` exists) — refuse with "this is the source, no need to scaffold it".

### 2. Plan

Build a short plan (3–6 lines): what will be created, what will be overwritten, what will be skipped. Show the user and wait for confirmation.

Example:
```
Buy-in:
  + CLAUDE.md (will create from template)
  + guides/CLAUDE-MD-GUIDE.ru.md (will copy)
  + guides/GIT-FLOW-GUIDE.ru.md (will copy)
  + guides/INDEX.md (will create)
Proceed? [y/n]
```

### 3. Detect stack (before rendering CLAUDE.md)

Probe the project to fill the template's `{{VAR}}` placeholders and decide
which `{{IF_*}}` blocks to keep. Run these in parallel and read the output:

```bash
test -f package.json    && cat package.json
test -f Cargo.toml      && head -40 Cargo.toml
test -f go.mod          && head -10 go.mod
test -f pyproject.toml  && head -40 pyproject.toml
test -f Gemfile         && head -10 Gemfile
test -f Makefile        && grep -E '^[a-z_-]+:' Makefile | head -20
ls package-lock.json yarn.lock pnpm-lock.yaml Cargo.lock go.sum poetry.lock 2>/dev/null
test -f pnpm-workspace.yaml -o -d packages -o -d apps  &&  echo "monorepo-likely"
test -f .pre-commit-config.yaml -o -d .husky  &&  echo "pre-commit-hook"
```

Map the results to placeholders:

| Var | How to derive |
|---|---|
| `{{LANG}}` | "TypeScript" if `tsconfig.json` exists; "JavaScript" if only `package.json`; "Rust" if `Cargo.toml`; "Go" if `go.mod`; "Python" if `pyproject.toml`/`requirements.txt`; else "—" |
| `{{PKG_MANAGER}}` | `pnpm` if `pnpm-lock.yaml`, `yarn` if `yarn.lock`, `npm` if only `package-lock.json`, `cargo`, `go`, `uv`/`poetry`/`pip` from `pyproject.toml`/lockfiles |
| `{{TEST_FRAMEWORK}}` | from `package.json` devDeps (vitest/jest/mocha) / `pyproject.toml` (pytest) / `cargo test` / `go test` |
| `{{INSTALL_CMD}}` | `pnpm i` / `yarn` / `npm i` / `cargo build` / `go mod download` / `uv sync` / `poetry install` |
| `{{BUILD_CMD}}` | from `package.json` `scripts.build` / `cargo build` / `go build ./...` / project-specific |
| `{{TEST_CMD}}` | from `scripts.test` / `cargo test` / `go test ./...` / `pytest` |
| `{{LINT_CMD}}` | from `scripts.lint` / `cargo clippy` / `go vet ./...` / `ruff check` |
| `{{LOCKFILE}}` | the actual lockfile path |
| `{{WORKSPACE_TOOL}}` | "pnpm workspaces" / "yarn workspaces" / "cargo workspace" / "go workspaces" / project-specific |
| `{{MIN_RUNTIME}}` | from `engines.node` / `rust-version` / `python_requires` |
| `{{PUBLISH_CMD}}` | `pnpm changeset publish` / `cargo publish` / `npm publish` / `python -m build && twine upload` |

Conditional blocks:

| `{{IF_*}}` | Keep when |
|---|---|
| `IF_LANG_TS` | TypeScript or JavaScript detected |
| `IF_LANG_RS` | Rust detected |
| `IF_LANG_PY` | Python detected |
| `IF_LANG_GO` | Go detected |
| `IF_MONOREPO` | `apps/`, `packages/`, `pnpm-workspace.yaml`, `cargo workspace`, or `go.work` present |
| `IF_PUBLIC_PACKAGE` | `package.json` has no `private: true`, OR `Cargo.toml` has `[package]` without `publish = false`, OR `pyproject.toml` declares `version` |
| `IF_PRE_COMMIT_HOOK` | `.pre-commit-config.yaml`, `.husky/`, or `lefthook.yml` present |

Anything you can't determine → leave the placeholder visible (`{{VAR}}`)
with a comment line above: `<!-- /bootstrap: could not detect — fill manually -->`.
This is **better than guessing** — the user fixes it once, never again.

### 4. Render and write

**Resolve the absolute path to resources.** Use:
```bash
SKILL_DIR="$HOME/.claude/skills/bootstrap"
test -d "$SKILL_DIR/resources" || SKILL_DIR="<absolute path to this skill in CC-templates>"
```

If the skill was installed via symlink to `CC-templates/skills/bootstrap/`, `$HOME/.claude/skills/bootstrap` works. If the skill is invoked directly from the repo (no install) — use the absolute path to the directory containing this SKILL.md.

**Render the template**: read `$SKILL_DIR/resources/templates/CLAUDE.md.template`,
substitute every `{{VAR}}` from the table above, and for each `{{IF_X}}...{{/IF_X}}`
block: keep the inner content if the condition is true, drop the whole block
(including the markers) if false. Inline `{{IF_X}}...{{/IF_X}}` blocks (used
inside lists for one-line additions) follow the same rule.

**Run the operations for the chosen scenario:**

- **CLAUDE.md:**
  - File missing → write the rendered template to `./CLAUDE.md`, replacing `<PROJECT_NAME>` with `basename "$PWD"`.
  - File present and mode `append` → append the block:
    ```
    ## Reference

    See [`guides/INDEX.md`](guides/INDEX.md) — Git Flow, CLAUDE.md best practices.
    ```
    (Deduplicate: if the block is already there, skip.)
  - Mode `replace` → `mv CLAUDE.md CLAUDE.md.bak && cp <template> CLAUDE.md`.
  - Mode `skip` → do nothing.

- **guides/ folder:** `mkdir -p guides`.

- **Copy guides:**
  - `all` → copy both `.ru.md` files from `$SKILL_DIR/resources/guides/` into `./guides/`.
  - `git-flow` → only `GIT-FLOW-GUIDE.ru.md`.
  - `claude-md` → only `CLAUDE-MD-GUIDE.ru.md`.
  - If `./guides/` already has the file — ask: overwrite / skip / diff. Default skip.

- **guides/INDEX.md:** from `resources/guides/INDEX.md.template`, keep only the lines for guides that were actually copied.

### 4. Report

Show the result:
```
✓ CLAUDE.md            created
✓ guides/              created
✓ guides/INDEX.md      created
✓ guides/GIT-FLOW-GUIDE.ru.md
✓ guides/CLAUDE-MD-GUIDE.ru.md
```

Remind the user:
- "Edit `CLAUDE.md` — the 'What this project is' section is still a placeholder."
- "If the repo has no commit yet — commit: `git add . && git commit -m \"chore: add Claude Code baseline scaffold\"`."

---

## Idempotency and safety

- **Never overwrite existing files without explicit confirmation.**
- For `replace` on CLAUDE.md — always save `CLAUDE.md.bak`.
- **Don't auto-commit.** The scaffold leaves changes in the working tree; the commit is the user's call.
- Don't touch `.git/`, `node_modules/`, `vendor/`, or other system directories.

## Errors and recovery

| Symptom | Diagnosis | Action |
|---|---|---|
| `resources/` not found | Skill is broken or not installed | Report the path you tried and ask to reinstall via `scripts/install-skill.sh bootstrap`. |
| `guides/<file>.ru.md` already exists | Idempotent re-run | Show diff; default skip. |
| cwd is `CC-templates` | Run inside the source itself | Refuse with a message. |

## Example references

See `examples/full-setup.md` next to this SKILL.md — a full dialogue example.
