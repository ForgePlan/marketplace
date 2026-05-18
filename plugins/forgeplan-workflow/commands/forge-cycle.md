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

## Step 0.5: Matrix Dispatch Loading (PRD-026 Phase 6 — FR-041, FR-047)

Load `.forgeplan/project-agent-matrix.yaml` **once** at start of the cycle. The matrix is the source of truth for per-phase agent dispatch (PRD-026 Journey 3, AC-2). When the matrix is absent or malformed, the orchestrator falls back to canonical RFC-003 Layer 2 defaults — existing behaviour is preserved (FR-048 backward-compat).

### Fallback chain (FR-047) — the contract

For every pipeline phase below (`brief`, `shape`, `decompose`, `design`, `estimate`, `gate`, `build`, `audit`, `evidence`, `activate`, `wrap`), the orchestrator resolves the agent through this 4-tier chain in order:

| Tier | Source | When it fires |
|:---:|---|---|
| 1 | **Project-scoped agent** — `primary:` starts with `.claude/agents/<name>.md` | Project committed an override; dispatch via `Task(subagent_type=...)` pointing at the local file |
| 2 | **Marketplace primary** — `primary:` is a pack ref like `agents-pro:guardian` | No project override; dispatch the marketplace pack agent |
| 3 | **Marketplace secondary** — `secondary:` value from matrix | Primary unavailable / not installed |
| 4 | **Inline orchestrator** — handled directly by `/forge-cycle` | Both primary and secondary unavailable, OR sentinel `inline` / `inline-merger`. Log a warning and proceed |

The matrix may also set:
- `parallel:` (audit phase only) → spawn the listed agents in a single message with multiple `Task` calls, then merge their EVIDENCE artifacts before `activate`.
- `depth_filter:` ∈ `{all, tactical-only, standard+, deep+, critical-only}` → if the current task's depth doesn't qualify, **skip the phase silently**.
- `methodology:` ∈ `{fpf, sparc, goap, tdd-london, tdd-classical, bdd, wbs, c4, checklist, none}` → informational; passed to the dispatched agent as context.

**Sentinels** (special `primary` values, not agent IDs):
- `inline` — orchestrator handles the phase directly; no agent dispatch (used for `estimate`, `wrap` until canonical agents ship).
- `inline-merger` — orchestrator merges parallel reviewer verdicts (used for `audit.primary`).
- `none` methodology — no formal methodology applies.

### Load + parse the matrix (read once, dispatch many)

```bash
# Step 0.5 — Matrix dispatch loading.
# Note: project-config.yaml is read FRESH by /autorun (per-operation) and by
# guardian (per-dispatch). Forge-cycle reads project-agent-matrix.yaml ONCE
# for the whole cycle. See "YAML freshness model" in AGENT-AUTHORING-GUIDE.md.
MATRIX_PATH=".forgeplan/project-agent-matrix.yaml"

if [ ! -f "$MATRIX_PATH" ]; then
    echo "info: no $MATRIX_PATH — using canonical RFC-003 Layer 2 defaults"
    MATRIX_AVAILABLE=0
else
    # Validate matrix parses
    if python3 -c "import yaml; yaml.safe_load(open('$MATRIX_PATH'))" 2>/dev/null; then
        MATRIX_AVAILABLE=1
        echo "✓ matrix loaded: $MATRIX_PATH"
        # Optional: surface project_name / domain / language for orchestrator log
        python3 -c "
import yaml
m = yaml.safe_load(open('$MATRIX_PATH'))
print(f\"  project: {m.get('project_name','?')}, domain: {m.get('domain','?')}, lang: {m.get('language','?')}\")
"
    else
        echo "warn: $MATRIX_PATH exists but doesn't parse; falling back to defaults"
        MATRIX_AVAILABLE=0
    fi
fi
```

Hold the parsed YAML in memory for the rest of the cycle — **do not re-read per phase**.

### Per-phase dispatch resolver

```python
# Resolve dispatch for a phase (called once per phase by the orchestrator)
def resolve_phase_dispatch(matrix, phase, current_depth):
    """Returns (primary_agent, secondary_agent, parallel_list, methodology, skip).

    skip=True means depth_filter excludes this phase.
    """
    if not matrix:
        return None, None, None, None, False  # fall back to RFC-003 defaults
    phase_cfg = matrix.get("phase_dispatch", {}).get(phase, {})
    if not phase_cfg:
        return None, None, None, None, False
    # Depth filter
    depth_filter = phase_cfg.get("depth_filter", "all")
    if not _depth_qualifies(current_depth, depth_filter):
        return None, None, None, None, True  # skip
    return (
        phase_cfg.get("primary"),
        phase_cfg.get("secondary"),
        phase_cfg.get("parallel"),
        phase_cfg.get("methodology", "none"),
        False,
    )

def _depth_qualifies(depth, filter_):
    order = {"tactical": 1, "standard": 2, "deep": 3, "critical": 4}
    cur = order.get(depth.lower(), 0)
    if filter_ == "all":
        return True
    if filter_ == "tactical-only":
        return cur == 1
    if filter_ == "standard+":
        return cur >= 2
    if filter_ == "deep+":
        return cur >= 3
    if filter_ == "critical-only":
        return cur == 4
    return True  # unknown filter — be permissive
```

### Identity tag preservation

Matrix dispatch **does not change identity semantics**. Every spawned agent — whether project-scoped, marketplace primary, marketplace secondary, or inline — still claims/releases with the canonical identity tag:

```
claude-code/<version>/<agent-name>-task-<task-id>
```

Examples: `claude-code/2.1/guardian-task-phase8-audit-001`, `claude-code/2.1/coder-task-phase7-build-003`. Per PRD-025 FR-019.

### Audit phase — parallel fan-out + EVIDENCE merge

When `phase_dispatch.audit.parallel` is set, spawn **all listed agents in a single message** (multiple `Task` tool uses concurrently). Each reviewer writes its own EVIDENCE artifact via `forgeplan_new(kind="evidence")`. After all fan-out subagents finish, the orchestrator (sentinel `inline-merger`) consolidates verdicts and links the merged set to the parent PRD/RFC before handing off to `activate`. See Step 6.5 below for the canonical 4-reviewer fan-out shape; `parallel:` overrides that default list when set.

Reference: PRD-026 FR-041 (matrix as dispatch source), FR-047 (fallback chain), FR-048 (backward-compat); EVID-047 (Pipeline integration confirmed).

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

**For Deep+ tasks with agents-sparc installed**, SPARC methodology with per-phase claim/release.

> **Dispatch source of truth (PRD-026 FR-041)**: the specific agent for each SPARC sub-phase is `<dispatched per phase_dispatch.<phase>.primary, fallback chain applied>` — see Step 0.5. The hardcoded `agents-sparc:*` references below are the canonical RFC-003 Layer 2 defaults used when `.forgeplan/project-agent-matrix.yaml` is absent.

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

**Agent dispatch matrix** для Build phase — `<dispatched per phase_dispatch.build.primary, fallback chain applied>` (PRD-026 FR-041). The canonical RFC-003 Layer 2 defaults when matrix absent:
- Backend tasks → `agents-domain:golang-pro` / `agents-domain:fullstack-developer`
- Frontend tasks → `agents-domain:frontend-developer` / `agents-domain:nextjs-developer`
- Tests-heavy → `agents-core:tester` + `agents-core:tdd-london`
- Generic → `agents-core:coder`

Full matrix: RFC-003 Layer 2 (Agent Pack Dispatch Matrix) — superseded by `.forgeplan/project-agent-matrix.yaml` when present.

**Why MCP-first (PRD-021)**: typed dicts + `_next_action` field on every response = methodology-as-protocol. Server tells client what's the correct Shape→Validate→Code→Evidence→Activate next-step. Skills relay these hints to reports instead of hardcoding next steps in prose.

**Why unconditional (PRD-020)**: prior to v1.6.0 of forgeplan-workflow, /forge-cycle spawned SPARC agents directly via Task tool with zero forgeplan claim wiring. Now every SPARC phase is visible in `forgeplan_claims`.

## Step 6: Run Tests

Execute the project's test suite:
- Detect the test framework (jest, pytest, phpunit, go test, cargo test, etc.).
- Run the full suite or the relevant subset.
- All tests must pass before proceeding.

## Step 6.5: Multi-Reviewer Audit (Standard+ depth)

Per RFC-003 Layer 2 + PRD-025 FR-018, spawn **parallel reviewers** in a single message для cross-validation.

> **Dispatch source of truth (PRD-026 FR-041)**: when `.forgeplan/project-agent-matrix.yaml` defines `phase_dispatch.audit.parallel`, use that list (`<dispatched per phase_dispatch.audit.parallel, fallback chain per agent>`). Otherwise use the canonical 4-reviewer default shown below. The orchestrator (sentinel `inline-merger`) merges EVIDENCE artifacts before `activate`.

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
