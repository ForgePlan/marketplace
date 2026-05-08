---
name: forge-cycle
description: "Run the full forgeplan engineering cycle: health check, route, shape, build, evidence, activate, commit."
---

You are executing the **forgeplan engineering cycle** — a structured workflow that takes a task from idea to committed code with full traceability.

Follow these steps in order. Do NOT skip steps. If a step fails, stop and report the issue.

## Reading Forgeplan Output (v0.25.0+)

After **every** `forgeplan` command in this cycle, read the contract marker:

- `Next: <command>` → run it as the next step
- `Fix: <command>` → run it to recover from error
- `Or: <command>` → use only if primary `Next:` blocks
- `Wait: <condition>` → retry after condition
- `Done.` → step complete, move on

JSON consumers read `_next_action` field. List/tree `--json` puts hint on stderr (bare array on stdout for jq compat).

Full reference: [`forgeplan-methodology` skill section 06](../skills/forgeplan-methodology/sections/06-output-hints/agent-protocol.md).

**Don't paraphrase or substitute placeholders** — execute the command exactly.

---

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
- **Tactical**: Small fix, no artifact needed. Skip to Step 5 (Build).
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

**Forgeplan-aware spawning (UNCONDITIONAL — PRD-020)**: every sub-agent claims the artifact before starting and releases on completion. For Tactical work without a created PRD, derive `SESSION_ID="SESSION-$(date -u +%Y-%m-%d-%H%M%S)"` and use it as the artifact-id below. This makes every SPARC phase visible in `forgeplan claims` for the duration of work.

**For Deep+ tasks with agents-sparc installed**, use the SPARC methodology with per-phase claim/release:

```bash
ARTIFACT_ID="${PRD_ID:-SESSION-$(date -u +%Y-%m-%d-%H%M%S)}"

# Phase 1 — Specification
forgeplan claim "$ARTIFACT_ID" --agent sparc-specification/v1 --note "Step 5 — Specification phase"
# spawn `specification` agent for requirements and acceptance criteria
forgeplan release "$ARTIFACT_ID" --agent sparc-specification/v1

# Phase 2 — Pseudocode
forgeplan claim "$ARTIFACT_ID" --agent sparc-pseudocode/v1 --note "Step 5 — Pseudocode phase"
# spawn `pseudocode` agent for algorithm design
forgeplan release "$ARTIFACT_ID" --agent sparc-pseudocode/v1

# Phase 3 — Architecture
forgeplan claim "$ARTIFACT_ID" --agent sparc-architecture/v1 --note "Step 5 — Architecture phase"
# spawn `architecture` agent for system design and diagrams
forgeplan release "$ARTIFACT_ID" --agent sparc-architecture/v1

# Phase 4 — Refinement
forgeplan claim "$ARTIFACT_ID" --agent sparc-refinement/v1 --note "Step 5 — Refinement phase"
# spawn `refinement` agent for TDD and implementation
forgeplan release "$ARTIFACT_ID" --agent sparc-refinement/v1

# Phase 5 — Completion: integration and docs (no separate claim)
```

Use `sparc-orchestrator` to coordinate phases. Fall back to direct implementation if agents-sparc is not installed — but **still claim the artifact** before direct work and release after.

**For Standard/Tactical tasks**, implement directly with claim wrapping:

```bash
ARTIFACT_ID="${PRD_ID:-SESSION-$(date -u +%Y-%m-%d-%H%M%S)}"
forgeplan claim "$ARTIFACT_ID" --agent forge-cycle/v1 --note "Step 5 — direct implementation"
# Write clean, well-structured code following project conventions.
# Add or update tests to cover the new functionality.
# Run the project's test suite and ensure all tests pass.
forgeplan release "$ARTIFACT_ID" --agent forge-cycle/v1
```

**Why unconditional (PRD-020)**: prior to v1.6.0 of forgeplan-workflow, /forge-cycle spawned SPARC agents directly via Task tool with zero forgeplan claim wiring. That left the artifact graph silent during the most important phase (build), defeating the audit trail PRD-018 set up in CLAUDE.md. Now every SPARC phase is visible.

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
