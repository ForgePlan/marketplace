---
name: forge-audit
description: "Run a multi-expert audit on the current codebase. Launches parallel review agents for logic, architecture, security, tests, performance, and docs."
---

You are running a **multi-expert code audit** on this project. You will simulate multiple specialized reviewers, each examining the codebase from a different angle, then aggregate their findings into a structured report.

## Step 1: Detect Project Context

Identify the project's language, framework, and structure:
- Check for package.json, go.mod, Cargo.toml, composer.json, requirements.txt, pom.xml, etc.
- Identify the primary language and framework.
- Locate the main source directories and test directories.
- Note the project's architecture pattern if detectable.

## Step 2: Run Parallel Expert Reviews

For each expert below, review the codebase and produce findings. Each finding has a severity: **CRITICAL**, **HIGH**, **MEDIUM**, or **LOW**.

### Expert 1: Logic & Correctness Reviewer
- Look for off-by-one errors, null/undefined handling, race conditions.
- Check edge cases in business logic.
- Verify error handling covers failure modes.
- Check data validation at boundaries.

### Expert 2: Architecture & Patterns Reviewer
- Evaluate separation of concerns.
- Check for proper abstraction levels.
- Look for code duplication and DRY violations.
- Assess dependency direction (no circular deps, proper layering).
- Evaluate naming conventions and code organization.

### Expert 3: Security Reviewer
- Check for injection vulnerabilities (SQL, XSS, command injection).
- Review authentication and authorization logic.
- Look for hardcoded secrets or credentials.
- Check input validation and output encoding.
- Review dependency versions for known CVEs.

### Expert 4: Test Coverage Reviewer
- Assess test coverage (unit, integration, e2e).
- Check test quality — are they testing behavior or implementation?
- Look for missing edge case tests.
- Verify mocks and stubs are used appropriately.
- Check for flaky test patterns.

### Expert 5: Performance Reviewer (if applicable)
- Look for N+1 query patterns.
- Check for unnecessary memory allocations.
- Identify blocking operations in async code.
- Review caching strategy.
- Check for resource leaks.

### Expert 6: Documentation Reviewer (if applicable)
- Check for missing or outdated API docs.
- Verify README accuracy.
- Look for undocumented public interfaces.
- Check inline comment quality.

## Step 3: Aggregate Results

Produce a structured report in this format:

```
## Audit Report: <project name>
Date: <current date>
Scope: <files/directories reviewed>

### Summary
- CRITICAL: <count>
- HIGH: <count>
- MEDIUM: <count>
- LOW: <count>

### CRITICAL Findings
<numbered list with file, line, description, suggested fix>

### HIGH Findings
<numbered list with file, line, description, suggested fix>

### MEDIUM Findings
<numbered list with file, line, description>

### LOW Findings
<numbered list with file, line, description>

### Recommendations
<top 3-5 prioritized action items>
```

## Step 4: Suggest Fixes

For every CRITICAL and HIGH finding:
- Provide a concrete code fix or clear remediation steps.
- Explain why it matters (impact if left unfixed).

## Step 5: Create Evidence (Optional)

If the user wants to record the audit in forgeplan, create an evidence artifact:
```bash
forgeplan new evidence "Code audit - <date>"
```

Fill in:
- **verdict**: PASS (no critical) or FAIL (has critical findings)
- **evidence_type**: code_review
- **summary**: Audit summary with finding counts and top issues.

Ask the user if they want to create this evidence before doing so.
