---
name: setup
description: Interactive wizard that configures CC-templates for the current project. Asks about the issue tracker, build/test commands, docs/RFC/TODO paths, and domain glossary; writes answers to `docs/agents/*.md` and optionally creates a starter `CONTEXT.md` in the project root. All other skills (research, audit, sprint, ...) read these files instead of hardcoding paths. Run once per project — or re-run when structure changes. Triggers — "setup project", "init cc-templates", "configure my skills", "поставь скиллы под проект", "/setup".
disable-model-invocation: true
allowed-tools: Read Write Edit Bash(git *) Bash(find *) Bash(cat *) Bash(ls *) Bash(test *)
---

# Setup CC-Templates

One-time interactive wizard. Output: `docs/agents/*.md` + (optional) `CONTEXT.md`.
Other skills read these files via `@docs/agents/...` imports — no hardcode in skill bodies.

## When to invoke

User explicitly types `/setup` or asks "setup my project for CC-templates".
Don't auto-invoke (frontmatter has `disable-model-invocation: true`).

## When NOT to invoke

- Already ran (look for `docs/agents/issue-tracker.md`) — ask user if they want to re-run
- Not in a git repo — refuse, ask user to `git init` first
- User wants a single skill output — that's not what setup does

## Workflow

Run 4 sections **sequentially**. Between sections — short ack from user ("ok / next").
Use `references/*-TEMPLATE.md` as starting content; fill in user answers.

### Section A — Issue tracker

Probe in this order, present the first match as default:

1. `mcp__orch__get_current_context()` works → **Orchestra**
2. `gh repo view` works → **GitHub Issues**
3. `linear-cli` or Linear MCP available → **Linear**
4. `find . -name 'TODO*.md' -maxdepth 3` non-empty → **Local markdown**
5. None → ask user

Confirm with user. Then write `docs/agents/issue-tracker.md` based on `references/ISSUE-TRACKER-TEMPLATE.md`,
filling in: type, identifier (repo URL / workspace), how-to-list, how-to-create, triage labels.

### Section B — Build & test commands

Auto-detect:

```
!`test -f package.json && cat package.json | head -40`
!`test -f Cargo.toml && head -20 Cargo.toml`
!`test -f go.mod && head -5 go.mod`
!`test -f pyproject.toml && head -20 pyproject.toml`
!`test -f Makefile && grep -E '^[a-z_-]+:' Makefile | head -20`
```

Extract: package manager (npm/pnpm/yarn/cargo/uv/pip/go), build/test/lint scripts.
Confirm with user, then write `docs/agents/build-config.md` from `references/BUILD-CONFIG-TEMPLATE.md`.

### Section C — Project paths

Auto-detect:

```
!`find . -maxdepth 4 -type d \( -name docs -o -name .scratch \) 2>/dev/null`
!`find . -maxdepth 4 -iname 'RFC-*.md' 2>/dev/null | head -5`
!`find . -maxdepth 4 -iname 'TODO*.md' -o -iname 'todo*.md' 2>/dev/null | head -5`
!`find . -maxdepth 3 -type d -name 'adr' 2>/dev/null`
```

Ask user to confirm or correct paths for: RFC dir, TODO file(s), ADR dir, architecture docs, known-issues file.
Write `docs/agents/paths.md` from `references/PATHS-TEMPLATE.md`.

### Section D — Domain glossary (CONTEXT.md)

Check `test -f CONTEXT.md`.

If **exists** — note path in `docs/agents/domain.md`, skip creation.

If **missing** — ask user:

> "Want me to create a starter CONTEXT.md (ubiquitous language — domain terms,
> relationships, flagged ambiguities)? It stays empty until you populate it —
> a /grill-style interview helps with that."

If yes:
- Copy `references/CONTEXT-TEMPLATE.md` → project `CONTEXT.md`
- Note in `docs/agents/domain.md`: where it lives + when to update it

## Output structure

```
{project-root}/
├── docs/
│   └── agents/                 ← all metadata other skills read
│       ├── issue-tracker.md
│       ├── build-config.md
│       ├── paths.md
│       └── domain.md
└── CONTEXT.md                  ← ubiquitous language (created if missing)
```

## Wire into CLAUDE.md (final step, requires user confirmation)

Ask: "Append a `## Agent skills` section to your project's `CLAUDE.md` so Claude
auto-loads these files at session start?"

If yes, append:

```markdown
## Agent skills

This project is configured with CC-templates skills. Metadata:

@docs/agents/issue-tracker.md
@docs/agents/build-config.md
@docs/agents/paths.md
@docs/agents/domain.md
@CONTEXT.md
```

`@imports` cause Claude to load these on every session — no need to re-read.

## Done

Tell user:

1. "Setup written to `docs/agents/`. Other skills now read these files."
2. "Re-run me when project structure changes."
3. "Run `/grill-with-docs` to populate CONTEXT.md by interviewing yourself about the domain."
4. "Edit `docs/agents/*.md` directly anytime — no need to re-run setup for tweaks."

## Anti-patterns

- ❌ Don't write hardcoded paths into skill files. Always read from `docs/agents/`.
- ❌ Don't run setup if `docs/agents/` already exists without asking user.
- ❌ Don't fail silently if a probe command isn't installed (e.g. no `gh`) — fall through to next option.
- ❌ Don't append to `CLAUDE.md` without explicit user yes — that's their file.
