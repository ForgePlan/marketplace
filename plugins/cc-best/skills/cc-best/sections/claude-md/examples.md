# CLAUDE.md examples — annotated real-world examples

Three examples, progressing from complex (production multi-plugin monorepo) to minimal (small library) to global (cross-project personal config). Each shows a 20-40 line excerpt with annotations explaining the choices.

---

## Example 1 — Production multi-plugin monorepo (ForgePlan marketplace)

This is the CLAUDE.md used by the ForgePlan marketplace repository — a monorepo housing 15 Claude Code plugins with active CI, branch protection, and a multi-agent workflow. It is the most complete example of the patterns in this section.

### Excerpt: metadata block + communication style

```markdown
# ForgePlan Marketplace — Claude Code Configuration

**Repo**: ForgePlan/marketplace
**Catalog version**: 1.61.0
**Plugins**: 15 (9 workflow + 5 agent packs + 1 memory plugin)
**Last Updated**: 2026-05-22 (post Sprint W: LR-8 lint rule active + canonical
frontmatter schema. 28 anomalies (24 resolved), catalog v1.61.0)
**Project board**: https://github.com/orgs/ForgePlan/projects/5

---

## User-facing communication style

Write like a PM talking to a PM, not like an engineer talking to an engineer.
Internal methodology terms stay in forgeplan artifacts; give the user the outcome.

### Principles

1. One language per reply. Russian conversation → Russian reply; English → English.
2. Conclusion first, justification second.
3. Short concrete phrases. "Waiting on the forgeplan core team" not "awaiting upstream triage".
4. If there is nothing to do, say so. Do not dress it up as "production-grade baseline".
```

**Annotation**:
- Metadata block is 6 lines — compact but complete. Catalog version + last-updated-with-summary are the two most load-bearing fields.
- Communication style appears before workflow (Pattern 7). It shapes every reply.
- "Write like a PM talking to a PM" is opinionated and memorable. Vague rules ("be clear") do not produce consistent behaviour.
- The principles are numbered to make them scannable. Each is a concrete instruction, not a vague aspiration.

### Excerpt: git workflow + forbidden

```markdown
## Git Workflow

**CRITICAL: feature branches + PR only. Direct push to `main` and `dev` is forbidden.**

| Branch | Purpose | Protection |
|-------|-----------|------------|
| `main` | Production. Stable release | PR + 1 review + CI strict |
| `dev` | Integration. Next release | PR + CI |
| `feat/*`, `fix/*`, `chore/*`, `docs/*` | Working branches | No restrictions |

### Commit message format

```
type(module): short summary

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

---

## Forbidden

- `git push --force` — NEVER.
- `git push origin main` / `git push origin dev` — only through a PR.
- `git add .` / `git add -A` — stage specific files only.
- `--no-verify` — do not skip hooks.
- Merging without green CI.
```

**Annotation**:
- The CRITICAL callout at the top of the section is the right place for it — before the table, so it is seen first.
- The branch table gives the full picture in 5 rows. Names, purposes, and protection rules in one view.
- Forbidden is adjacent to Git Workflow, not at the bottom of the file. Proximity means context is fresh when the rules are read.
- Short imperative list. "NEVER" is unambiguous. No hedging.

### Excerpt: plugin version table

```markdown
## Plugin versions (catalog v1.61.0)

### Workflow plugins

| Plugin | Version |
|--------|:-------:|
| **fpl-skills** | **1.24.5** (Sprint T: forge-cleanup Step 2.5 + Profile B EVID 2-step) |
| **fpl-hsmem** | 2.1.0 |
| **forgeplan-workflow** | **1.10.3** (Sprint T: forgeplan_unlink MCP adopted) |
| **laws-of-ux** | 1.4.1 |
| **dev-toolkit** | 1.6.3 |
```

**Annotation**:
- Bold plugin names make the table scannable. Bold version numbers highlight recently-changed entries.
- Parenthetical sprint notes in the version cell give enough context to understand what changed without reading the full sprint section.
- The table is the single source of truth. The sprint history section references these versions; the table does not repeat the sprint history.

### Excerpt: sprint history section

```markdown
## Sprint W 2026-05-22 — Anomaly #27 + #28 closure

Inline tactical sprint. Closed 2 process anomalies that escaped Sprint V CI:

| PRD | Sprint | Deliverable |
|-----|--------|-------------|
| **PRD-050** (active) | Sprint W | LR-8 lint rule + AGENT-AUTHORING-GUIDE schema update |

### Anomalies resolved Sprint W

- **#27** → RESOLVED. LR-8 rule live; catches exact Sprint V BLOCKER class in CI.
- **#28** → RESOLVED. Canonical schema formalises `skills:`, `maxTurns:`, `isolation:`.
```

**Annotation**:
- Section title is dated and named. "Sprint W 2026-05-22 — Anomaly #27 + #28 closure" identifies it precisely — no ambiguity about when or what.
- Opening sentence is a one-line summary. A new session can read just this line and understand the sprint's scope.
- Anomaly resolution log references numbers — stable identifiers that work across sessions and docs.

---

## Example 2 — Minimal CLAUDE.md for a small library

A small open-source TypeScript library. One maintainer, no CI complexity, no multi-agent workflow. The file should be under 60 lines.

```markdown
# my-lib — Claude Code Configuration

**Repo**: username/my-lib
**Language**: TypeScript (Node 20+)
**Last Updated**: 2026-05-15

---

## Conventions

- All source files in `src/`. Tests co-located: `src/foo.test.ts` next to `src/foo.ts`.
- Export from `src/index.ts` only — do not add exports to internal modules.
- No runtime dependencies. Dev dependencies only.

## Commit format

```
type: short description
```

Types: `feat`, `fix`, `docs`, `test`, `chore`. No scope needed — repo is small.

## Before pushing

```bash
npm run build       # must succeed
npm run test        # must pass
npm run lint        # zero warnings
```

## Forbidden

- Do not add runtime dependencies without discussion.
- Do not modify `src/index.ts` public API without a CHANGELOG entry.
```

**Annotation**:
- Metadata block is 4 lines — only what is needed. No catalog version, no project board — those do not exist here.
- Conventions section replaces the full workflow section. There is no CI, no branch protection, no multi-plugin complexity.
- "Before pushing" replaces the Forbidden section's CI gate — smaller project, simpler check.
- Forbidden is two lines. The scope of risk is small; the list should match.
- Total: ~35 lines. That is appropriate for the complexity.

The lesson: CLAUDE.md should scale with project complexity. Do not copy a 600-line enterprise CLAUDE.md into a small library. Write what is actually needed.

---

## Example 3 — Global CLAUDE.md (`~/.claude/CLAUDE.md`)

A cross-project global config covering habits that apply regardless of which repo is open. This example is paraphrased — the structure and patterns are canonical; the specific rules are illustrative.

```markdown
# Global Claude Configuration

---

## Output format defaults

When completing a task that spans ≥3 files or ≥5 tool calls, output a structured
summary instead of prose. Sections: TL;DR, files changed, verified, next steps.

For simple Q&A (no actions taken) — use plain prose. Do not over-report.

---

## Cross-project directory naming

New top-level directories under ~/Work/ use PascalCase, no separators.
For ecosystem projects: prefix with the org name.

Examples:
- ~/Work/MyOrgProjectName  — correct
- ~/Work/my-project        — wrong (kebab-case)

---

## Memory tool behaviour

On session start in a Hindsight-enabled project: one broad recall for project context.
Save (retain) only when knowledge is non-obvious — bugs + fixes, architectural
decisions, user preferences. Do not retain ephemeral state or git history.

---

## Security defaults (all projects)

- Never commit secrets, tokens, or API keys.
- Never `git push --force` without explicit user confirmation.
- Never `git add .` — stage specific files only.
```

**Annotation**:
- No metadata block — global CLAUDE.md does not have a single repo, version, or board.
- Rules are cross-project habits that apply universally. Nothing project-specific.
- Memory tool behaviour belongs here because it is the same across all Hindsight-enabled projects — each project should not have to repeat it.
- Security defaults at the global level mean they apply even to repos that have a minimal or missing project CLAUDE.md.
- Total: ~40 lines. Global config should be sparse — it loads into every session.

The contrast with Example 1: the global file has zero sprint history, zero version tables, zero workflow sections. Those are project-level concerns. The global file contains only cross-cutting habits.

---

## Related

- `basics.md` — what belongs in CLAUDE.md (the theory behind these examples)
- `structure.md` — the anatomy rules that produced Example 1's layout
- `patterns.md` — each pattern in Example 1 is listed and explained there
- `antipatterns.md` — what Example 2 deliberately avoids (over-engineering a small repo)
- `hierarchy.md` — how Examples 1 and 3 relate (project tier vs global tier)
