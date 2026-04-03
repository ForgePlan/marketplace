[English](README.md) | [Русский](README-RU.md)

# dev-toolkit

Universal engineering toolkit for Claude Code. Works with any project, any language.

## What it does

- **Multi-expert audit** (`/audit`) — Launches 4 parallel review agents (Logic, Architecture, Security, Tests) that analyze your code and report findings by severity, with auto-fix for critical issues.
- **Wave-based sprints** (`/sprint`) — Breaks complex tasks into parallel execution waves, plans the approach, gets your approval, then executes methodically with progress tracking.
- **Session recall** (`/recall`) — Restores your session context by reading CLAUDE.md, git history, and any available memory tools, giving you a quick briefing so you know where you left off.

## Install

```bash
claude plugin add /path/to/dev-toolkit
```

Or copy the `dev-toolkit/` folder into your Claude Code plugins directory.

## Usage

### Audit your code

```
/audit
```

Detects your project's language and framework, checks what changed (via git diff), then runs 4 parallel expert reviews. Produces a structured report with CRITICAL/HIGH/MEDIUM/LOW findings and offers to auto-fix the serious ones.

### Run a sprint

```
/sprint Add user authentication with JWT tokens
```

Researches your project context, breaks the task into 2-4 waves of parallel work, presents the plan for approval, then executes wave-by-wave. Runs tests at the end and provides a full summary.

### Restore session context

```
/recall
```

Reads CLAUDE.md, checks git status and recent commits, queries any available memory tools, and presents a 5-10 line briefing so you can get back up to speed instantly.

## Hooks

The plugin includes two automatic hooks:

- **Safety hook** (PreToolUse on Bash): Blocks dangerous commands before they execute — `git push --force`, `git reset --hard`, `git clean -f`, `rm -rf /`, and `DROP TABLE/DATABASE`. Protects you from accidental destruction.

- **Test reminder** (PostToolUse on Write/Edit): When a file edit adds a new public function or method that lacks a test, you get a one-line reminder to consider adding one.

## Agent

- **dev-advisor**: A background advisor that suggests running `/audit` after big changes, reminds about tests for new functions, flags security concerns in auth code, and recommends `/sprint` for complex tasks.

## Compatibility

Works with: JavaScript/TypeScript, Python, Rust, Go, Java/Kotlin, Ruby, PHP, C#/.NET, and any other language with standard project conventions.
