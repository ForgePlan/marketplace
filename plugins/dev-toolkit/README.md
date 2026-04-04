[English](README.md) | [Русский](README-RU.md)

# dev-toolkit

Universal engineering toolkit -- works with any project. No dependencies.

Four parallel code reviewers, wave-based task execution, and instant session restore. Drop it into Claude Code and go.

## Quick Start

```bash
/plugin install dev-toolkit@ForgePlan-marketplace    # install
/audit                           # review your code right now
/sprint fix login bug            # break a task into parallel waves
```

## Usage Examples

### `/audit` -- Multi-expert code review

```
> /audit

Launching 4 parallel reviewers...

Logic       ████████░░  3 findings
Architecture████████████  0 findings
Security    ██████░░░░  2 findings (1 HIGH)
Tests       ████░░░░░░  4 findings

| # | Severity | Reviewer | File | Issue |
|---|----------|----------|------|-------|
| 1 | HIGH | Security | auth.ts:23 | JWT secret from env not validated |
| 2 | MEDIUM | Logic | utils.ts:45 | Unchecked null return from DB query |
| 3 | MEDIUM | Tests | user.test.ts | Missing edge case: empty email |
...

9 findings: 1 high, 4 medium, 4 low
Fix HIGH issues? [y/n]
```

### `/sprint` -- Wave-based task execution

```
> /sprint implement user authentication

Researching context... reading CLAUDE.md, git log, project structure

Sprint Plan (3 waves):
  Wave 1: [Auth service] + [User model] — 2 agents parallel
  Wave 2: [API routes] + [Middleware] — 2 agents parallel
  Wave 3: [Tests] + [Docs] — 2 agents parallel

Approve plan? [y/n]
```

### `/recall` -- Instant session restore

```
> /recall

Session Briefing:
  Branch: feat/auth-system
  Status: 3 uncommitted files
  Last commit: "feat: add user model" (2h ago)
  Recent: 5 commits on feat/auth-system
  Open items: TODO.md has 2 unchecked P0

Ready to continue feat/auth-system.
```

## What's Included

| Type | Name | Description |
|------|------|-------------|
| Command | `/audit` | 4 parallel expert reviewers with severity report and auto-fix |
| Command | `/sprint` | Wave-based parallel task execution with plan approval |
| Command | `/recall` | Session context restore from git, CLAUDE.md, and memory tools |
| Agent | `dev-advisor` | Background advisor: suggests audits, flags security, recommends sprints |
| Hook | Safety | Blocks `git push --force`, `rm -rf /`, `DROP TABLE` before execution |
| Hook | Test reminder | Nudges you when a new public function has no test |

## Supported Languages

JavaScript/TypeScript, Python, Rust, Go, Java, Kotlin, Ruby, PHP, C#/.NET, C/C++, Swift, and any language with standard project conventions.

## License

MIT
