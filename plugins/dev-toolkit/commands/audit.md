---
name: audit
description: "Multi-expert code audit — launches 4 parallel review agents (Logic, Architecture, Security, Tests) to analyze your codebase and report findings by severity."
---

# Multi-Expert Code Audit

You are a senior engineering lead orchestrating a comprehensive code audit. Follow these steps precisely.

## Step 1: Detect Project Language and Framework

Scan the project root for configuration files to determine the tech stack:
- `package.json` or `tsconfig.json` → JavaScript/TypeScript (check for React, Next.js, Express, etc.)
- `Cargo.toml` → Rust
- `pyproject.toml`, `setup.py`, `requirements.txt` → Python (check for Django, Flask, FastAPI, etc.)
- `go.mod` → Go
- `pom.xml`, `build.gradle` → Java/Kotlin (check for Spring Boot, etc.)
- `Gemfile` → Ruby (check for Rails, etc.)
- `composer.json` → PHP (check for Laravel, Symfony, etc.)
- `.csproj`, `*.sln` → C# / .NET

Report the detected stack to the user before proceeding.

## Step 2: Determine What Changed

Check if this is a git repository:
1. Run `git status` to see if git is available
2. If git is available:
   - Run `git diff HEAD` to see uncommitted changes
   - If no uncommitted changes, run `git diff HEAD~5..HEAD` to review the last 5 commits
   - If there are staged changes, run `git diff --cached` as well
3. If git is NOT available or no meaningful diff:
   - Scan the project source directories for all source files
   - Focus on the main source folder (src/, lib/, app/, etc.)

Summarize the scope of changes (files, lines, areas affected).

## Step 3: Launch 4 Parallel Review Agents

Use subagents to run these 4 reviews IN PARALLEL. Each agent receives the detected language, framework, and the changed files/code as context.

### Agent 1: Logic Review
Analyze the code for:
- **Correctness**: Does the logic do what it claims? Are there off-by-one errors?
- **Edge cases**: Null/undefined handling, empty collections, boundary values
- **Error handling**: Are errors caught and handled properly? Are error messages helpful?
- **Race conditions**: Concurrent access issues, async/await pitfalls, shared state mutations
- **Data flow**: Are variables used before initialization? Are return values checked?

### Agent 2: Architecture Review
Analyze the code for:
- **Design patterns**: Are patterns used correctly? Are anti-patterns present?
- **Coupling**: Are modules tightly coupled? Can components be tested in isolation?
- **Cohesion**: Does each module/class have a single clear responsibility?
- **SOLID principles**: Single Responsibility, Open/Closed, Liskov, Interface Segregation, Dependency Inversion
- **DRY violations**: Duplicated logic that should be extracted
- **Naming**: Are names clear, consistent, and descriptive?

### Agent 3: Security Review
Analyze the code for OWASP Top 10 and common vulnerabilities:
- **Injection**: SQL injection, command injection, XSS, template injection
- **Authentication**: Weak auth flows, missing token validation, insecure password handling
- **Authorization**: Missing access controls, privilege escalation, IDOR
- **Data exposure**: Sensitive data in logs, hardcoded secrets, unencrypted PII
- **Configuration**: Debug mode in production, permissive CORS, missing security headers
- **Dependencies**: Known vulnerable packages (check lock files if available)

### Agent 4: Test Quality Review
Analyze the code for:
- **Coverage gaps**: New or modified code paths that lack tests
- **Missing edge case tests**: Boundary conditions, error paths, null inputs
- **Test quality**: Are tests actually asserting meaningful things? Are there tests that always pass?
- **Test isolation**: Do tests depend on external services or shared state?
- **Test naming**: Do test names describe the scenario and expected outcome?
- **Integration tests**: Are there integration/E2E tests for critical paths?

## Step 4: Format Findings

Each agent MUST report findings using this format:

```
### [Agent Name] Review

| Severity | File:Line | Finding | Suggestion |
|----------|-----------|---------|------------|
| CRITICAL | src/auth.ts:42 | SQL injection via string concatenation | Use parameterized queries |
| HIGH | src/api.ts:18 | Missing input validation on user ID | Add zod/joi schema validation |
| MEDIUM | src/utils.ts:95 | Duplicated parsing logic | Extract to shared utility |
| LOW | src/config.ts:12 | Magic number without explanation | Add named constant |
```

Severity definitions:
- **CRITICAL**: Security vulnerability, data loss risk, or crash in production. Must fix before deploy.
- **HIGH**: Significant bug, major design flaw, or missing critical test. Should fix soon.
- **MEDIUM**: Code quality issue, minor bug, or improvement opportunity. Fix in normal course.
- **LOW**: Style issue, minor optimization, or suggestion. Fix when convenient.

## Step 5: Aggregate Report

After all 4 agents complete, produce a unified report:

```markdown
# Audit Report

**Project**: [name] | **Stack**: [detected stack] | **Scope**: [N files, M lines changed]
**Date**: [current date]

## Summary
- CRITICAL: [count] | HIGH: [count] | MEDIUM: [count] | LOW: [count]

## Critical & High Findings
[List all CRITICAL and HIGH findings from all agents]

## Architecture Notes
[Key architectural observations]

## Security Posture
[Overall security assessment — 1-2 sentences]

## Test Coverage Assessment
[Overall test health — 1-2 sentences]

## All Findings by Agent
[Full tables from each agent]
```

## Step 6: Offer Auto-Fix

If there are CRITICAL or HIGH findings, ask the user:

> "I found [N] critical and [M] high-severity issues. Would you like me to fix them automatically? I'll show you each change before applying it."

If the user agrees:
1. Fix CRITICAL issues first, then HIGH
2. Show a diff preview for each fix before applying
3. After all fixes, re-run the relevant checks to verify the fixes are correct
4. Suggest running the project's test suite

If no CRITICAL or HIGH findings, congratulate the user and suggest addressing MEDIUM items.
