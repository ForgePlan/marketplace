---
name: forge-audit
description: "Run a multi-expert audit on the current codebase. Launches parallel review agents for logic, architecture, security, tests, performance, and docs."
---

Note: This command extends `/audit` from dev-toolkit with 2 additional experts (Performance, Documentation) and optional forgeplan evidence creation. If you only need a universal audit, use `/audit` instead.

You are running a **multi-expert code audit** on this project. You will simulate multiple specialized reviewers, each examining the codebase from a different angle, then aggregate their findings into a structured report.

## Step 1: Detect Project Context + Claim audit slot (UNCONDITIONAL — PRD-020)

Identify the project's language, framework, and structure:
- Check for package.json, go.mod, Cargo.toml, composer.json, requirements.txt, pom.xml, etc.
- Identify the primary language and framework.
- Locate the main source directories and test directories.
- Note the project's architecture pattern if detectable.

**Claim the audit slot** so concurrent audits (or multi-agent races) are visible. **MCP-first preference per PRD-021**: probe deferred-tools list for `mcp__forgeplan__forgeplan_claim`; if present use MCP, else shell.

**MCP-first**:
```python
# If user invoked with explicit artifact-ID (e.g. "/forge-audit PRD-018"), use it.
# Otherwise derive a synthetic SESSION-id with audit prefix.
ARTIFACT_ID = artifact_arg or f"AUDIT-{datetime.utcnow().strftime('%Y-%m-%d-%H%M%S')}"
result = mcp__forgeplan__forgeplan_claim(
    id=ARTIFACT_ID,
    agent="forge-audit/v1",
    note="Multi-expert audit in progress",
    ttl_minutes=60
)
# Relay result["_next_action"] to user report
```

**Shell fallback**:
```bash
ARTIFACT_ID="${1:-AUDIT-$(date -u +%Y-%m-%d-%H%M%S)}"
forgeplan claim "$ARTIFACT_ID" --agent forge-audit/v1 --note "Multi-expert audit in progress" --ttl-minutes 60
```

The `AUDIT-YYYY-MM-DD-HHMMSS` prefix distinguishes audit-claims from sprint-SESSIONs in `forgeplan claims` output. TTL is 60 min (audits run longer than typical sprints).

Release at the end of Step 5 (after evidence emission, see below).

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

## Step 5: Create Evidence + Release claim (UNCONDITIONAL + MCP-FIRST — PRD-020 + PRD-021)

Always emit at least one evidence artifact recording the audit, then release the claim from Step 1. Evidence is no longer "optional" — it's the audit trail PRD-018 requires. User-confirmation only applies to *content* edits, not to whether evidence gets created.

**MCP-first**:
```python
# Evidence — always created (links to ARTIFACT_ID from Step 1)
evid = mcp__forgeplan__forgeplan_new(
    kind="evidence",
    title=f"Code audit {ARTIFACT_ID} - {today}: {verdict_summary}"
)
mcp__forgeplan__forgeplan_link(
    source=evid["id"],
    target=ARTIFACT_ID,
    relation="informs"
)
# Optionally re-score the parent artifact via MCP
mcp__forgeplan__forgeplan_score(id=ARTIFACT_ID)

# Release the audit claim
mcp__forgeplan__forgeplan_release(id=ARTIFACT_ID, agent="forge-audit/v1")
```

**Shell fallback**:
```bash
EVID_ID=$(forgeplan new evidence "Code audit ${ARTIFACT_ID} - $(date -u +%Y-%m-%d): <verdict-summary>" --json | jq -r '.id')
forgeplan link "$EVID_ID" "$ARTIFACT_ID" --relation informs
forgeplan release "$ARTIFACT_ID" --agent forge-audit/v1
```

Fill in evidence body (ask user before editing if content is non-trivial):
- **verdict**: PASS (no critical) or FAIL (has critical findings)
- **evidence_type**: code_review
- **summary**: Audit summary with finding counts and top issues.

For real PRD-NNN audits (`/forge-audit PRD-018`), the evidence is linked back to the source PRD — supplements R_eff confidence over time. For synthetic AUDIT-* IDs, the evidence stands alone but remains discoverable via `forgeplan list -k evidence` filtered by AUDIT-* in title.
