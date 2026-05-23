# CLAUDE.md structure — file anatomy and conventions

## File anatomy overview

A well-structured project CLAUDE.md has five zones, in this order:

1. **Metadata block** — repo facts, version, last-updated, board link.
2. **Communication style** — how the assistant talks to the user (high leverage, near the top).
3. **Workflow rules** — the sequence the assistant must follow for common operations.
4. **Reference tables** — version inventories, plugin lists, branch protection rules.
5. **Sprint history** — dated sections at the bottom, oldest to newest.

Most files also end with a **Forbidden** section embedded somewhere in the workflow zone — a compact list of operations that must never happen.

## Metadata block

The metadata block sits at the very top, before any `##` sections. It is a compact cluster of bold-label lines (not a table) covering the key facts a new session needs immediately.

Example shape:

```markdown
# Project Name — Claude Code Configuration

**Repo**: org/repo-name
**Catalog version**: 1.61.0
**Plugins**: 15 (brief description of what's installed)
**Last Updated**: 2026-05-22 (one-sentence summary of what changed)
**Project board**: https://github.com/orgs/Org/projects/5
```

Rules:
- Keep it to 5-10 lines. Every extra line costs tokens on every session.
- Include the last-updated date with a parenthetical summary. Without the date, no one knows if the content is current.
- "Plugins: N" is enough — the full version table lives in the Reference tables zone.

## Section ordering — most important first

Put the rules that affect the most common actions at the top. Put historical context (sprint history) at the bottom.

Recommended order:

| Zone | Why this position |
|------|------------------|
| Metadata block | Always visible without scrolling |
| Communication style | Shapes EVERY response — load early |
| Workflow rules | Git, CI, PRs — the daily operations |
| Security / Forbidden | Near workflow so context is fresh |
| Reference tables | Consulted by lookup, not by read-through |
| Sprint history | Historical — load only when needed |

Avoid putting sprint history mid-file. It grows continuously; if it is in the middle, it pushes workflow rules further and further down as the file grows.

## Header levels

| Level | Use for |
|-------|---------|
| `#` | File title only. One per file. |
| `##` | Major sections (Workflow, Git, CI, Forbidden) |
| `###` | Subsections within a major section |
| `####` | Avoid. If you need a 4th level, the section is too long — split it. |

Using `#` for section headers (not just the title) makes the file look flat in editors and breaks the visual hierarchy that Claude Code's parser uses to chunk context.

## Table conventions

Tables are the preferred format for reference data — version inventories, branch rules, tier comparisons. They are faster to scan than bullet lists and cheaper to update.

Rules:
- Short headers (one or two words). "Plugin" not "Plugin Name and Repository".
- Fact-dense cells. "1.4.1 (Sprint T: unlink adopted)" in one cell, not split across rows.
- Align with `:---:` for centered columns (version numbers), `---` for left-aligned (names, descriptions).
- Do not use tables for procedural content (steps, rules) — use numbered lists or bullet lists there.

```markdown
| Plugin | Version |
|--------|:-------:|
| **fpl-skills** | **1.24.5** (Sprint T: forge-cleanup Step 2.5) |
| **fpl-hsmem** | 2.1.0 |
```

## Link conventions

| Type | Format |
|------|--------|
| Repo-internal file | Relative path: `[guide](docs/CONTRIBUTING.md)` |
| Section within same file | `[#Forbidden](#forbidden)` |
| External URL | Full URL: `[board](https://github.com/orgs/Org/projects/5)` |
| Artifact reference | Plain text: "see PRD-042" — no link needed if forgeplan is wired |

Do not use absolute filesystem paths for repo-internal links — they break on other machines. Relative paths work regardless of where the repo is cloned.

## Language rule

The file body must be in one language throughout. Mixing languages degrades readability and causes the assistant to mix languages in its replies.

For public or team repositories: use English throughout.

The one legitimate exception is a communication-style section that illustrates the failure mode with examples. If the rule is "do not mix Russian and English", an example showing the wrong Russian phrasing must be in Russian. This is intentional — keep the example, not the mixed language.

Correct structure:

```markdown
## User-facing communication style

Write in the same language as the user. Do not mix.

### Anti-patterns (Russian conversation)

❌ «Все open items требуют external trigger»
✅ «Все незакрытые задачи ждут внешнего сигнала»
```

The anti-pattern examples are in Russian because they illustrate Russian-language failures — not because the file is bilingual.

## File length

Keep the file under ~600 lines. Beyond that, readers (human and AI) start skimming, and important rules get missed.

Strategies when the file grows too long:

1. Move sprint history older than 3 sprints to `docs/SPRINT-HISTORY.md` and link from CLAUDE.md.
2. Move detailed process guides (e.g., full PR checklist) to `docs/` and link.
3. Move section-specific rules to a `<repo>/CLAUDE.local.md` if they are user-specific.
4. Delete stale content — anything that was true 6 months ago and has since changed should be updated, not appended.

When you link out, write a one-line summary in CLAUDE.md so the context is still accessible without following the link:

```markdown
## Plugin cache troubleshooting

Full guide: [docs/CACHE-TROUBLESHOOTING.md](docs/CACHE-TROUBLESHOOTING.md)

Short answer: if `/plugin install` says "already installed" but new version is present,
run `/plugin uninstall` then `/plugin install` to force re-resolve.
```

## Code blocks

Use fenced code blocks with a language tag for all command examples and file content samples.

```bash
# Good — language tag present
./scripts/validate-all-plugins.sh plugin-name
```

Without the language tag, syntax highlighting breaks in editors and the content is harder to distinguish from prose.

## Forbidden section placement

Put the Forbidden section adjacent to the workflow section it protects. If it is buried at the bottom after 400 lines of sprint history, it is invisible when the user is reading about git workflow.

```markdown
## Forbidden

- `git push --force` — NEVER.
- `git push origin main` — only through a PR.
- `git add .` / `git add -A` — stage specific files only.
- `--no-verify` — do not skip hooks.
- Merging without green CI.
```

Short, imperative, absolute. No explanation needed for items that are universally understood as dangerous; one-phrase rationale for anything that might seem arbitrary.

## Related

- `basics.md` — what CLAUDE.md is and what belongs in it
- `hierarchy.md` — which tier this structure applies to
- `patterns.md` — good patterns to copy from production CLAUDE.md files
- `antipatterns.md` — what structural mistakes to avoid
- `examples.md` — annotated real examples showing anatomy in practice
