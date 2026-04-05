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

## License

MIT
