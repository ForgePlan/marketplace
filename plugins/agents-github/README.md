# agents-github

GitHub operations agents: PR management, issue tracking, release automation, multi-repo coordination, project boards, workflow engineering, and repo architecture.

## Installation

```bash
/plugin install agents-github@ForgePlan-marketplace
```

## Requirements

- [GitHub CLI (`gh`)](https://cli.github.com/) installed and authenticated

## Agents (7)

| Agent | Description |
|-------|-------------|
| `pr-manager` | PR lifecycle management -- create, review, merge with automated validation and merge strategy selection |
| `issue-manager` | Issue lifecycle -- create, triage, decompose, track, and automate stale issue cleanup |
| `release-manager` | Automated releases -- changelog generation, version management, release creation, asset uploads |
| `multi-repo-manager` | Cross-repository operations -- org-wide discovery, synchronized updates, batch PR creation |
| `project-board-manager` | GitHub Projects V2 -- create projects, configure fields, add items, track status |
| `workflow-engineer` | GitHub Actions -- create workflows, analyze failures, optimize CI/CD pipelines |
| `repo-architect` | Repository scaffolding -- create repos, .github/ structure, templates, branch protection |

## Usage

After installation, agents are available via the `@agent-name` syntax:

```
@pr-manager Create a PR for the current branch with a summary of changes
@release-manager Generate changelog and create a new release v2.0.0
@workflow-engineer Debug the failing CI workflow
@repo-architect Scaffold a new repository with proper structure
```

## Version history

- **v1.1.0** (current, 2026-05-19) — Sprint B canonical-lint compliance
  - All 7 agents migrated to canonical pattern: `model: sonnet`, GitHub-themed hex colors, bilingual EN/RU/Triggers descriptions
  - Closed marketplace-wide lint warnings 121 → 0 (LR-1..LR-3 pass)
- **v1.1.1** (in-flight, Sprint E) — documentation drift closed; no forgeplan-aware agents in this pack, Step 9b sentinel N/A

For complete change history, see [`forgeplan-marketplace/CLAUDE.md`](../../CLAUDE.md) § Sprint A-E session.

## License

MIT

## Scope: deliberately NOT forgeplan-aware

None of this pack's agents carry forgeplan MCP access, and that is a **recorded scope decision**
(2026-09-04, marketplace#236 — previously an undocumented gap per EVID-231): these agents are
runtime-generic specialists constrained by `tools:` allowlists; artifact lifecycle work belongs to
the forgeplan-aware agents in `agents-core` / `agents-pro`, which dispatch or hand off to this pack
for domain execution. If a future agent here needs to touch the artifact graph, it moves to (or is
mirrored in) a forgeplan-aware pack rather than acquiring MCP access in place.
