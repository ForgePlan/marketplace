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

## Step 0: Memory Bootstrap (optional — Hindsight v2)

If `mcp__hindsight__memory_status` is available, probe the project memory bank for context:

```python
# Check availability
if has_tool("mcp__hindsight__memory_status"):
    status = mcp__hindsight__memory_status()
    if status.healthy:
        # List mental models with project knowledge
        models = mcp__hindsight__mental_model_list()

        # Read methodology stack if exists
        for model in models:
            if model.id == "mm-pipeline-methodology":
                methodology_ctx = mcp__hindsight__mental_model_get("mm-pipeline-methodology")
                # Use methodology_ctx для dispatch decisions in Step 5

            if model.id == "mm-agent-selection":
                agent_ctx = mcp__hindsight__mental_model_get("mm-agent-selection")
                # Use agent_ctx для specialist selection
```

**Graceful degradation**: if Hindsight not available — proceed без memory context. Pipeline still functional (NFR-014 PRD-025).

Reference: RFC-003 Layer 3 (Hindsight v2 Integration). Per PRD-025 FR-022.

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

**Forgeplan-aware spawning (UNCONDITIONAL + MCP-FIRST — PRD-020 + PRD-021)**: every sub-agent claims the artifact before starting and releases on completion. For Tactical work without a created PRD, derive `SESSION_ID="SESSION-$(date -u +%Y-%m-%d-%H%M%S)"` and use it as the artifact-id below.

### Tool selection (MCP vs shell)

Probe once at start of Step 5: list available tools via `ToolSearch query="select:mcp__forgeplan__forgeplan_claim"`. If schema returns — **MCP path** (preferred); else **shell fallback**. MCP returns typed dicts + `_next_action` server hint for relay.

**For Deep+ tasks with agents-sparc installed**, SPARC methodology with per-phase claim/release:

**MCP-first**:
```python
ARTIFACT_ID = PRD_ID or f"SESSION-{datetime.utcnow().strftime('%Y-%m-%d-%H%M%S')}"

# Phase 1 — Specification
mcp__forgeplan__forgeplan_claim(id=ARTIFACT_ID, agent="sparc-specification/v1", note="Step 5 — Specification phase")
# spawn `specification` agent for requirements and acceptance criteria
mcp__forgeplan__forgeplan_release(id=ARTIFACT_ID, agent="sparc-specification/v1")

# Phase 2 — Pseudocode
mcp__forgeplan__forgeplan_claim(id=ARTIFACT_ID, agent="sparc-pseudocode/v1", note="Step 5 — Pseudocode phase")
# spawn `pseudocode` agent for algorithm design
mcp__forgeplan__forgeplan_release(id=ARTIFACT_ID, agent="sparc-pseudocode/v1")

# Phase 3 — Architecture
mcp__forgeplan__forgeplan_claim(id=ARTIFACT_ID, agent="sparc-architecture/v1", note="Step 5 — Architecture phase")
# spawn `architecture` agent
mcp__forgeplan__forgeplan_release(id=ARTIFACT_ID, agent="sparc-architecture/v1")

# Phase 4 — Refinement
mcp__forgeplan__forgeplan_claim(id=ARTIFACT_ID, agent="sparc-refinement/v1", note="Step 5 — Refinement phase")
# spawn `refinement` agent for TDD + implementation
mcp__forgeplan__forgeplan_release(id=ARTIFACT_ID, agent="sparc-refinement/v1")

# Phase 5 — Completion: integration and docs (no separate claim)
```

**Shell fallback**:
```bash
ARTIFACT_ID="${PRD_ID:-SESSION-$(date -u +%Y-%m-%d-%H%M%S)}"

forgeplan claim "$ARTIFACT_ID" --agent sparc-specification/v1 --note "Step 5 — Specification phase"
# spawn `specification` agent
forgeplan release "$ARTIFACT_ID" --agent sparc-specification/v1

# (repeat pattern for pseudocode, architecture, refinement)
```

Use `sparc-orchestrator` to coordinate phases. Fall back to direct implementation if agents-sparc is not installed — but **still claim the artifact** before direct work and release after.

**For Standard/Tactical tasks**, implement directly with claim wrapping (MCP-first; shell fallback otherwise):

```python
# MCP-first
ARTIFACT_ID = PRD_ID or f"SESSION-{datetime.utcnow().strftime('%Y-%m-%d-%H%M%S')}"
mcp__forgeplan__forgeplan_claim(id=ARTIFACT_ID, agent="forge-cycle/v1", note="Step 5 — direct implementation")
# Write clean, well-structured code following project conventions.
# Add or update tests to cover the new functionality.
# Run the project's test suite and ensure all tests pass.
mcp__forgeplan__forgeplan_release(id=ARTIFACT_ID, agent="forge-cycle/v1")
```

### Step 5.5: Parallel build dispatch (Deep+ depth, multi-artifact work)

For Deep+ tasks with multiple artifacts (RFC has N sub-tasks), use **parallel subagent dispatch** per RFC-003 Layer 1:

```python
# 1. Compute parallel-safe work plan
plan = mcp__forgeplan__forgeplan_dispatch(
    agents=3,           # N subagents
    status="draft",
    kind="rfc",
    agent_skills=[      # optional: per-bucket skills
        ["backend"],
        ["frontend"],
        ["tests"],
    ]
)
# Returns: { buckets, serial_queue, reasoning }

# 2. Pre-claim on behalf of subagents (orchestrator-on-behalf-of pattern)
for i, bucket in enumerate(plan.buckets):
    task_id = f"phase6-build-{SESSION_ID}-{i}"
    mcp__forgeplan__forgeplan_claim(
        id=bucket.artifact_id,
        agent=f"claude-code/2.1/{task_id}",
        note=f"Phase 6 Build bucket {i}",
        ttl_minutes=60
    )

# 3. Spawn N parallel subagents in SINGLE message
# (Multiple Task tool calls в одном response для параллели)
# Each Task() goes to subagent_type matching bucket skills
# Examples: agents-core:coder, agents-domain:typescript-pro, agents-core:tester

# 4. On subagent completion — orchestrator или subagent releases claim
# Force-release escape hatch if subagent crashes:
# mcp__forgeplan__forgeplan_release(id=..., agent=..., force=true)
```

Reference: RFC-003 Section 1.2 (Subagent spawn pattern), PRD-025 FR-017.

**Agent dispatch matrix** для Build phase:
- Backend tasks → `agents-domain:golang-pro` / `agents-domain:fullstack-developer`
- Frontend tasks → `agents-domain:frontend-developer` / `agents-domain:nextjs-developer`
- Tests-heavy → `agents-core:tester` + `agents-core:tdd-london`
- Generic → `agents-core:coder`

Full matrix: RFC-003 Layer 2 (Agent Pack Dispatch Matrix).

**Why MCP-first (PRD-021)**: typed dicts + `_next_action` field on every response = methodology-as-protocol. Server tells client what's the correct Shape→Validate→Code→Evidence→Activate next-step. Skills relay these hints to reports instead of hardcoding next steps in prose.

**Why unconditional (PRD-020)**: prior to v1.6.0 of forgeplan-workflow, /forge-cycle spawned SPARC agents directly via Task tool with zero forgeplan claim wiring. Now every SPARC phase is visible in `forgeplan_claims`.

## Step 6: Run Tests

Execute the project's test suite:
- Detect the test framework (jest, pytest, phpunit, go test, cargo test, etc.).
- Run the full suite or the relevant subset.
- All tests must pass before proceeding.

## Step 6.5: Multi-Reviewer Audit (Standard+ depth)

Per RFC-003 Layer 2 + PRD-025 FR-018, spawn **4 parallel reviewers** in single message для cross-validation:

```python
# Single message, 4 parallel Agent calls (Claude Code Task tool)
reports = parallel_spawn([
    Agent(
        subagent_type="agents-core:code-reviewer",
        description="Logic + style review",
        prompt=f"Review {ARTIFACT_ID} linked code. Check: logic issues, style, dead code, naming."
    ),
    Agent(
        subagent_type="agents-pro:security-expert",
        description="Security audit",
        prompt=f"Security audit {ARTIFACT_ID}: OWASP top 10, secrets exposure, injection vectors, auth flows."
    ),
    Agent(
        subagent_type="agents-pro:architect-reviewer",
        description="Architecture review",
        prompt=f"Review {ARTIFACT_ID} architecture vs linked RFC. Check: SOLID, coupling, layer violations."
    ),
    Agent(
        subagent_type="agents-core:tester",
        description="Test coverage review",
        prompt=f"Review test coverage {ARTIFACT_ID}: coverage%, edge cases, integration tests."
    ),
])

# Aggregate findings; surface critical immediately
consensus = synthesize_findings(reports)
critical = [f for f in consensus if f.severity == "CRITICAL"]
```

For Deep+ depth, add `agents-pro:performance-engineer` для perf-critical paths.

If critical findings — halt и address before Step 7. If clean — proceed to Step 7 with consolidated audit findings ready for EVID body.

## Step 7: Create Evidence

Create an evidence artifact linking implementation to the PRD (MCP-first):

```python
# MCP-first
evid = mcp__forgeplan__forgeplan_new(
    kind="evidence",
    title=f"<brief description of what was built>"
)
mcp__forgeplan__forgeplan_update(
    id=evid["id"],
    body=format_evidence_body(reports_from_step_6_5)
)
mcp__forgeplan__forgeplan_link(
    source=evid["id"],
    target=PRD_ID,
    relation="informs"
)
```

Shell fallback:
```bash
forgeplan new evidence "<brief description of what was built>"
```

Fill in the evidence with structured fields:
- **verdict**: PASS or FAIL
- **congruence_level**: CL3 (same-context) typical; CL1-CL2 for cross-context
- **evidence_type**: test_result | code_review | manual_verification
- **linked_artifact**: PRD-XXX
- **summary**: Brief description of what was verified and how.

### Autonomous decisions logging (mail-as-beads pattern per NOTE-004)

If at any step the orchestrator или a subagent made an **autonomous decision** (без explicit user input — e.g. FPF-resolved conflict, automatic agent fallback, gate-check override), record as a typed NOTE:

```python
mcp__forgeplan__forgeplan_new(
    kind="note",
    title=f"Autonomous decision: <short summary>"
)
# Body содержит:
# - Context: what triggered decision
# - Options considered: list
# - Chosen: + reasoning (FPF justification if applicable)
# - Impact: which artifact affected
mcp__forgeplan__forgeplan_link(
    source=NOTE_ID, target=PRD_ID, relation="informs"
)
```

Reference: NOTE-004 (mail-as-beads pattern from Gas Town), PRD-025 FR-027.

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
