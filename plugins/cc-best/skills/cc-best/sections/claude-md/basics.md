# CLAUDE.md basics — what it is, where it lives, lifecycle

## What CLAUDE.md is

CLAUDE.md is a markdown file that Claude Code automatically loads as system-level context at the start of every session. It acts as standing instructions — the configuration layer between you and the assistant, distinct from chat history, code comments, or README files.

Think of it as a persistent rules contract: things written here are visible every turn, shaping how the assistant behaves across the entire conversation without you repeating yourself.

Key distinction: CLAUDE.md is **project configuration**, not project documentation. A README explains a project to humans. CLAUDE.md tells Claude how to behave while working on it.

## Where it lives (overview)

There are three tiers, each at a different path:

| Tier | Path | Audience |
|------|------|----------|
| Global | `~/.claude/CLAUDE.md` | All projects, all sessions |
| Project | `<repo>/CLAUDE.md` | Everyone who clones the repo |
| User-private overlay | `<repo>/CLAUDE.local.md` | You only, gitignored |

Full load order and conflict rules are in `hierarchy.md`. Short answer: all three load, in the order listed above.

## When it loads

Claude Code loads CLAUDE.md automatically at two moments:

1. **Session start** — fresh conversation, no existing context.
2. **Session resume** — continuing a prior conversation in the same project.

It does NOT re-load mid-conversation when you edit the file. Changes take effect on the next session start. If you need a rule active immediately, paste the relevant section into chat directly.

## What belongs in CLAUDE.md

Content that Claude needs on **every turn** to behave correctly:

- Project-wide conventions (commit format, branch naming, file structure rules).
- Tool usage rules (what is forbidden, what must always run before a PR).
- Workflow instructions (the sequence: route → validate → commit → PR).
- Communication style rules (language, tone, format).
- Version tables and plugin inventories (single source of truth for installed tools).
- Artifact cross-references (PRD-NNN, RFC-NNN — so Claude knows where decisions live).
- Sprint history summaries (lightweight context for new sessions).

These are **durable facts** — they remain true across many sessions and many code changes.

## What does NOT belong in CLAUDE.md

| Do not put | Put it instead |
|---|---|
| Secrets, tokens, API keys | Environment variables or a secret manager |
| One-off notes ("remember to fix this before Friday") | A GitHub issue or task |
| Transient state ("currently working on feature X") | A TODO comment in the code |
| Full contents of specs / PRDs | A reference: "see PRD-042 for the shape decision" |
| Code examples already in docstrings or README | A reference: "see docs/CONTRIBUTING.md" |
| Repeated content from code comments | The code is the source — do not duplicate |

The rule of thumb: if the content becomes stale within one sprint, it does not belong here. See `antipatterns.md` for the full list of what degrades CLAUDE.md over time.

## Lifecycle — how to maintain it

### Adding a section

Add when a rule is repeated in conversation more than twice — that is a signal it should be permanent. Write the rule in positive form first ("do X"), then add the negative ("do NOT do Y") if there is a common failure mode.

### Editing a section

Edit the existing section, do not append a note at the bottom. The bottom is reserved for dated sprint history (see `patterns.md` — Pattern 1). Mid-file edits are intentional: you own the structure.

### Retiring a section

Delete when the rule no longer applies. A rule about a workflow that was changed six months ago is worse than no rule — it creates confusion. If unsure whether to keep, move the rule to a comment block in the relevant source file instead.

### Keeping it fresh

Update the "Last Updated" line in the metadata block any time you make structural changes. Without a date, no one (including you, three months later) can tell whether the rules still apply.

## Hooks — one sentence

CLAUDE.md is loaded by the Claude Code harness directly at session start — it is not triggered by a hook. If you want rule-like behaviour triggered by a specific tool call (e.g., run lint after every Edit), that belongs in `hooks.json`, not in CLAUDE.md. See `../hooks/_index.md` for hook patterns.

## Related

- `hierarchy.md` — global / project / user-private tiers and load order
- `structure.md` — file anatomy, section ordering, header conventions
- `antipatterns.md` — what degrades CLAUDE.md over time
- `patterns.md` — production-proven patterns to adopt
- `examples.md` — annotated real-world examples
