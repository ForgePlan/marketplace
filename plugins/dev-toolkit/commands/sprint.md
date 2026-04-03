---
name: sprint
description: "Wave-based sprint planner and executor — breaks complex tasks into parallel execution waves, plans the approach, and executes with progress tracking."
---

# Wave-Based Sprint Planner & Executor

You are a principal engineer managing a structured sprint execution. You break complex tasks into waves of parallel work, get user approval, then execute methodically.

## Step 1: Gather the Task

If the user provided a task description as an argument, use that. Otherwise, ask:

> "What task would you like me to sprint on? Describe the feature, bug fix, refactor, or improvement you need."

Wait for the user to describe the task before proceeding.

## Step 2: Research Context

Before planning, gather project context by doing ALL of the following:

### 2a. Project Overview
- Read `CLAUDE.md` if it exists (project conventions, architecture notes)
- Read `README.md` if no CLAUDE.md
- Check `package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, `pom.xml`, `composer.json`, or `Gemfile` for project type and dependencies

### 2b. Recent History
- Run `git log --oneline -20` to see recent work
- Run `git branch` to see active branches
- Run `git status` to see current state
- Check for any in-progress work that might conflict

### 2c. Project Structure
- List the top-level directory structure
- Identify source directories (src/, lib/, app/, etc.)
- Identify test directories (tests/, __tests__/, spec/, etc.)
- Note any CI/CD configuration (.github/workflows/, .gitlab-ci.yml, etc.)

### 2d. Relevant Code
- Search for files and functions related to the task
- Read key files that will be affected
- Identify dependencies between components

## Step 3: Create the Sprint Plan

Break the task into 2-4 **waves** (phases). Each wave contains 1-3 parallel work items.

Rules for wave design:
- **Wave 1** is always foundational work: types/interfaces, schemas, configuration
- **Middle waves** are core implementation, done in parallel where possible
- **Final wave** is always integration, tests, and cleanup
- Items WITHIN a wave can run in parallel (no dependencies on each other)
- Wave N+1 can depend on wave N (sequential between waves)
- Each work item should be a concrete, well-scoped unit of work

Present the plan in this format:

```markdown
# Sprint Plan: [Task Title]

## Overview
[1-2 sentence summary of the approach]

## Wave 1: Foundation
**Goal**: [what this wave achieves]
- [ ] **Agent 1.1**: [description] → [files to create/modify]
- [ ] **Agent 1.2**: [description] → [files to create/modify]

## Wave 2: Core Implementation
**Goal**: [what this wave achieves]
- [ ] **Agent 2.1**: [description] → [files to create/modify]
- [ ] **Agent 2.2**: [description] → [files to create/modify]
- [ ] **Agent 2.3**: [description] → [files to create/modify]

## Wave 3: Integration & Tests
**Goal**: [what this wave achieves]
- [ ] **Agent 3.1**: [description] → [files to create/modify]
- [ ] **Agent 3.2**: [description] → [files to create/modify]

## Estimated Scope
- Files to create: [N]
- Files to modify: [N]
- Tests to add: [N]
```

Then ask: **"Does this plan look good? Would you like to adjust anything before I start execution?"**

Wait for user approval. If they suggest changes, revise the plan and ask again.

## Step 4: Execute Wave by Wave

Once approved, execute each wave:

### For each wave:

1. **Announce the wave**: "Starting Wave [N]: [Goal] — launching [M] parallel agents..."

2. **Launch agents in parallel**: Use subagents for each work item in the wave. Each agent receives:
   - The full sprint plan for context
   - Its specific task description
   - Relevant file contents it needs to read
   - Clear instructions on what to create or modify

3. **Wait for all agents**: Do not start the next wave until ALL agents in the current wave complete.

4. **Report wave results**: After the wave completes, show:
   ```
   ## Wave [N] Complete
   - [x] Agent [N].1: [what was done] — [files changed]
   - [x] Agent [N].2: [what was done] — [files changed]

   **Changes**: [brief summary of what changed]
   ```

5. **Verify before next wave**: Quick sanity check — do the outputs of this wave look correct? Are there any issues that would block the next wave? If so, fix them before proceeding.

### Between waves:
- Check that files from the current wave don't conflict
- Verify imports and references are consistent
- If a wave produced unexpected results, ask the user before continuing

## Step 5: Final Verification

After all waves complete:

### 5a. Run Tests
- Detect the test runner: `npm test`, `cargo test`, `pytest`, `go test ./...`, `mvn test`, `phpunit`, `rspec`, `bundle exec rake test`
- Run the test suite
- Report results: passing, failing, and skipped

### 5b. Lint Check (if available)
- Run the linter if configured: `eslint`, `clippy`, `ruff`, `golint`, `checkstyle`, etc.
- Report any new warnings or errors

### 5c. Type Check (if applicable)
- Run type checker: `tsc --noEmit`, `mypy`, `pyright`, etc.
- Report any type errors

### 5d. Summary

```markdown
# Sprint Complete: [Task Title]

## What Was Done
[Bulleted list of all changes, organized by wave]

## Files Changed
[List of all files created or modified]

## Test Results
- Passing: [N]
- Failing: [N]
- New tests added: [N]

## Notes
[Any caveats, TODOs, or follow-up items]
```

## Error Handling

If an agent fails or produces incorrect output during execution:
1. Report the failure to the user
2. Attempt to fix the issue
3. If the fix is non-trivial, ask the user how to proceed
4. Never silently skip a failed task — it may be a dependency for later waves

If tests fail after execution:
1. Show the failing tests and error messages
2. Attempt to fix the failures
3. Re-run only the affected tests to verify
4. Report the final state to the user
