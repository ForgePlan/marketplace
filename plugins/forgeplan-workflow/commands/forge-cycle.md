---
name: forge-cycle
description: "Run the full forgeplan engineering cycle: health check, route, shape, build, evidence, activate, commit."
---

You are executing the **forgeplan engineering cycle** — a structured workflow that takes a task from idea to committed code with full traceability.

Follow these steps in order. Do NOT skip steps. If a step fails, stop and report the issue.

## Step 1: Health Check

Run `forgeplan health` to check the project state.
- If blind spots are reported, fix them before proceeding (missing README, no tests, stale artifacts, etc.).
- If forgeplan is not installed or `.forgeplan/` does not exist, tell the user and stop.

## Step 2: Identify the Task

Determine what to work on:
- If the user provided a task description, use that.
- Otherwise, check `TODO.md` or `forgeplan list --status pending` for the next item.
- If nothing is found, ask the user what they want to build.

## Step 3: Route the Task

Run `forgeplan route "<task description>"` to determine the appropriate depth level.
- **Tactical**: Small fix, no artifact needed. Skip to Step 6.
- **Standard**: Needs a PRD. Continue to Step 5.
- **Deep**: Needs PRD + RFC. Continue to Step 5, also create RFC.
- **Critical**: Needs PRD + RFC + ADR. Continue to Step 5, create all artifacts.

## Step 4: Shape the Work (Standard+ only)

Create the PRD:
```bash
forgeplan new prd "<task title>"
```

Open the created PRD file and fill in these sections:
- **Problem Statement**: What problem does this solve?
- **Goals**: 2-3 measurable goals.
- **Functional Requirements**: Specific requirements with acceptance criteria.
- **Non-Functional Requirements**: Performance, security, maintainability constraints.

Validate the PRD:
```bash
forgeplan validate PRD-XXX
```

If depth is Deep+, also create RFC with `forgeplan new rfc "<title>"` and fill architectural decisions.
If depth is Critical, also create ADR with `forgeplan new adr "<title>"` for the key decision record.

## Step 5: Build

Implement the code changes according to the PRD requirements.
- Write clean, well-structured code following project conventions.
- Add or update tests to cover the new functionality.
- Run the project's test suite and ensure all tests pass.

## Step 6: Run Tests

Execute the project's test suite:
- Detect the test framework (jest, pytest, phpunit, go test, cargo test, etc.).
- Run the full suite or the relevant subset.
- All tests must pass before proceeding.

## Step 7: Create Evidence

Create an evidence artifact linking implementation to the PRD:
```bash
forgeplan new evidence "<brief description of what was built>"
```

Fill in the evidence with structured fields:
- **verdict**: PASS or FAIL
- **congruence_level**: CL1 (exact match) through CL5 (no match)
- **evidence_type**: test_result | code_review | manual_verification
- **linked_artifact**: PRD-XXX
- **summary**: Brief description of what was verified and how.

## Step 8: Review and Activate

Run the review process:
```bash
forgeplan review PRD-XXX
```

If the review passes, activate the artifact:
```bash
forgeplan activate PRD-XXX
```

## Step 9: Commit

Stage all changes and commit using conventional commit format:
- `feat: <description>` for new features
- `fix: <description>` for bug fixes
- `refactor: <description>` for refactoring
- `docs: <description>` for documentation
- `test: <description>` for test-only changes

Include the PRD reference in the commit body: `Refs: PRD-XXX`

## Error Handling

- If `forgeplan` commands fail, check `forgeplan health` output and report the issue.
- If tests fail, fix the code and re-run before creating evidence.
- If validation fails, fix the artifact and re-validate.
- Never force-push or skip the evidence step.
