# CLAUDE.md hierarchy — global, project, and user-private tiers

## Three tiers

Claude Code recognises three CLAUDE.md tiers, loaded in a fixed order every session:

| # | Tier | Path | Committed? |
|---|------|------|-----------|
| 1 | Global / user | `~/.claude/CLAUDE.md` | No (personal config) |
| 2 | Project | `<repo>/CLAUDE.md` | Yes (shared with team) |
| 3 | User-private overlay | `<repo>/CLAUDE.local.md` | No (gitignored) |

Loading order is 1 → 2 → 3. Each tier's content is appended to the session context after the previous one. None replaces the other.

## Tier 1 — global (`~/.claude/CLAUDE.md`)

Purpose: cross-project habits that apply regardless of which repo you are working in.

Good fits for tier 1:
- Directory naming conventions (`~/Work/` paths should be PascalCase).
- Memory tool behaviour (when to `memory_recall`, when to `memory_retain`).
- Output format preferences (structured reports vs prose, emoji policy).
- Cross-project security habits (never commit secrets, never push --force).

Avoid putting in tier 1:
- Anything project-specific — it will pollute every project.
- Version tables or plugin inventories — those are project-level facts.
- Large blocks of text — tier 1 loads into every session, so size matters.

## Tier 2 — project (`<repo>/CLAUDE.md`)

Purpose: team-wide conventions for this specific repository.

This is the most important tier for day-to-day work. It carries:
- Git workflow (branch naming, commit format, PR process).
- CI/CD rules (what must pass before merge, how to run validation locally).
- Plugin and agent inventories (version tables, which agents are active).
- Artifact cross-references (where PRDs, RFCs, and ADRs live).
- Forbidden operations (what Claude must never do in this repo).
- Sprint history (lightweight context for new sessions).

Because it is committed, every team member and every Claude Code session that opens this repo gets the same context. This makes it the canonical source of truth for project behaviour.

## Tier 3 — user-private overlay (`<repo>/CLAUDE.local.md`)

Purpose: personal preferences that apply to this project only, not shared with the team.

Good fits for tier 3:
- Your preferred debug workflow ("I like to start with X tool").
- Local path overrides ("my DB runs on port 5433, not 5432").
- Personal communication style preferences that differ from the team default.
- Temporary rules you are testing before proposing to the team.

Always add `CLAUDE.local.md` to `.gitignore`. It is not a secret file — it just contains user-specific context that would clutter the shared CLAUDE.md.

## How tiers compose — the append model

All three tiers are **appended** into one context block. Claude Code does not merge or override — it concatenates.

Practical consequence: if tier 1 says "write commit messages in English" and tier 2 says "write commit messages in French", Claude Code sees BOTH instructions. It will try to satisfy both, which is impossible. The later-loaded tier does not automatically win — the conflict creates ambiguity.

Conflict resolution strategy:
1. **Prefer specificity.** If tier 2 gives a project-specific rule, it is more specific than a tier 1 habit. Claude will typically apply it.
2. **Be explicit.** Write "for this project, override global preference: commit messages in French" in tier 2. Explicit beats implicit.
3. **Don't duplicate.** If a rule belongs in tier 1, remove it from tier 2. Duplication invites drift.

## Settings.json — same three-tier hierarchy, different merge semantics

The `settings.json` file follows the same three-tier pattern:

| Tier | Path |
|------|------|
| Global | `~/.claude/settings.json` |
| Project | `<repo>/.claude/settings.json` |
| User-private | `<repo>/.claude/settings.local.json` |

However, `settings.json` uses **key-level merge** semantics, not append. A key in tier 3 overwrites the same key in tier 2, which overwrites tier 1. This is the opposite of CLAUDE.md behaviour.

This distinction matters:
- CLAUDE.md conflict → ambiguity (both instructions visible, Claude picks).
- settings.json conflict → deterministic override (later tier wins for that key).

When configuring tool permissions, hooks, or allowed commands, use `settings.json`. When configuring behaviour rules and context, use CLAUDE.md.

## When to put a rule in which tier

| Question | Tier |
|---------|------|
| "Do I want this rule in EVERY project?" | 1 (global) |
| "Do I want teammates to see and follow this?" | 2 (project) |
| "Is this my personal preference for this repo only?" | 3 (local overlay) |
| "Is this a temporary rule I'm testing?" | 3 (local overlay), promote to 2 when stable |
| "Is this a secret or credential?" | Neither — use env vars |

## Subdirectory CLAUDE.md files

Claude Code also supports CLAUDE.md files in subdirectories (e.g., `src/CLAUDE.md`). These load when Claude is working in that subtree. Use them sparingly — one file per repo is usually sufficient. Subdirectory files are useful when a specific module has rules so specialized that they would be noise in the root CLAUDE.md.

## Related

- `basics.md` — what CLAUDE.md is, lifecycle, what belongs
- `structure.md` — file anatomy and section conventions for tier 2 (project CLAUDE.md)
- `antipatterns.md` — common mistakes with tier confusion and duplication
- `examples.md` — a global CLAUDE.md example contrasted with a project CLAUDE.md
