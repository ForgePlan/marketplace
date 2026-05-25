---
name: forge-cycle
description: "Run the full forgeplan engineering cycle: health check, route, shape, build, evidence, activate, commit."
---

You are executing the **forgeplan engineering cycle** — a structured workflow that takes a task from idea to committed code with full traceability.

Follow these steps in order. Do NOT skip steps. If a step fails, stop and report the issue.

---

## How this template actually runs (read this first)

This template uses `/sprint`, `/team-up`, `/audit`, `/fpf-simple` as semantic markers — **they are NOT auto-invoked inline by this template**. The orchestrator (main Claude / CLI session) reads each phase and performs the **equivalent operation manually**:

| Template reads | Orchestrator does |
|---|---|
| `/sprint <task>` (Phase 2 — wave plan) | Drafts wave-based plan as structured TaskList + dispatches sub-agents per wave |
| `/team-up <task>` (Phase 3 — build) | Dispatches multiple coder/specialist sub-agents in parallel via Task() |
| `/audit <task>` (Phase 4 — review) | Dispatches code-reviewer / security-expert / architect-reviewer / tester sub-agents in parallel |
| `/fpf-simple <task>` (Phase 1c — FPF decision) | Generates 3 hypotheses → deduces consequences → applies WLNK + reversibility → chooses (no separate skill invocation) |

When you see those tokens anywhere in this template, treat them as "**execute the equivalent sub-agent dispatch + MCP calls**" — orchestrator does the equivalent inline. If you DO want to literally invoke them as skills (when supported by your CLI), check `~/.claude/plugins/marketplaces/` for whether each is installed and use the Skill tool — but the **canonical execution path is direct orchestrator action**.

This template can be invoked by Claude Code, Gemini CLI, Codex CLI, or any other AI tool — the semantics travel via this contract, not via tool-specific slash-command resolution. Each CLI reads this file and performs its own equivalent dispatch; no CLI auto-chains slash commands from within a loaded template.

---

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

## Step 4.5: FPF ADI mandatory dispatch (Standard+ depth — Sprint Z7 PRD-059)

Per S10 FPF design discipline (EPIC-001 4-layer pipeline). MSR 2026 measures **+25–41% complexity gap** in AI-assisted projects without structured design hypothesis cycles — this step forces ≥3 competing hypotheses before any Standard+ artifact can proceed to Build.

> **Depth filter**: skip this step entirely for `tactical` depth tasks (no artifact created). For `standard`, `deep`, `critical` → MANDATORY before Step 5.

### Procedure

```python
# Step 4.5 — FPF ADI mandatory dispatch (Standard+ only)
depth = forgeplan_get(ARTIFACT_ID).get("depth", "tactical")

if depth in ("standard", "deep", "critical"):
    # 1. Dispatch forgeplan_reason (MCP primitive) — wraps FPF ADI cycle
    #    Returns: hypotheses list + deductive predictions + inductive evidence check + recommendation
    adi_result = mcp__forgeplan__forgeplan_reason(id=ARTIFACT_ID)

    # 2. Parse output — count distinct hypothesis sections
    #    Hypotheses are delimited by "### Hypothesis", "### H1/H2/H3", or "**Hypothesis N**" patterns
    import re
    hypothesis_count = len(re.findall(
        r'(?:^###\s+Hypothesis\s*\d*|^###\s+H\d+\b|^\*\*Hypothesis\s+\d+)',
        adi_result.get("body", ""),
        re.MULTILINE | re.IGNORECASE
    ))

    # 3. FPF Abduction minimum threshold = 3
    #    Rationale: 2 hypotheses always collapse to false dichotomy.
    #    The 3rd hypothesis is structurally the most interesting
    #    (often: «do nothing», «in-process alternative», «scope reduction»).
    if hypothesis_count < 3:
        # Re-dispatch with explicit ADI nudge
        adi_result = mcp__forgeplan__forgeplan_reason(
            id=ARTIFACT_ID,
            prompt=(
                "Generate at least 3 distinct hypotheses with deductive predictions. "
                "Hypothesis 1 = primary design direction. "
                "Hypothesis 2 = strongest alternative. "
                "Hypothesis 3 = 'do nothing / in-process alternative' or scope reduction. "
                "Each hypothesis MUST have: abductive premise, deductive prediction, "
                "inductive evidence check (F+G+R)."
            )
        )
        # Re-count after nudge; if still <3 — surface as CONCERNS and continue
        hypothesis_count = len(re.findall(
            r'(?:^###\s+Hypothesis\s*\d*|^###\s+H\d+\b|^\*\*Hypothesis\s+\d+)',
            adi_result.get("body", ""),
            re.MULTILINE | re.IGNORECASE
        ))
        if hypothesis_count < 3:
            print(f"warn: ADI returned {hypothesis_count} hypothesis sections (< 3 required); "
                  "record as CONCERNS in ADI EVID body and continue")

    # 4. Record ADI output as EVIDENCE artifact
    #    Body MUST document: which 3+ hypotheses were considered, which was chosen, why
    adi_evid = mcp__forgeplan__forgeplan_new(
        kind="evidence",
        parent_id=ARTIFACT_ID,
        title=f"ADI cycle for {ARTIFACT_ID} — {hypothesis_count} hypotheses, chosen H<N>"
    )
    mcp__forgeplan__forgeplan_update(
        id=adi_evid["id"],
        body=format_adi_evid_body(
            artifact_id=ARTIFACT_ID,
            hypotheses=adi_result,  # paste full ADI output
            chosen_hypothesis="H<N>",
            rationale="<why this hypothesis — F+G+R Trust Calculus score; deductive prediction matches goal>"
        )
    )
    # parent_id auto-links via forgeplan#295; manual link as fallback:
    mcp__forgeplan__forgeplan_link(
        source=adi_evid["id"],
        target=ARTIFACT_ID,
        relation="informs"
    )

    ADI_EVID_ID = adi_evid["id"]

    # 5. Gate: Step 5+ proceeds ONLY after ADI EVID exists
    #    guardian (Step 7.5 / activation gate) enforces this at activation time.
    #    See guardian.md Step 5 — «Step 4b/4.5: Standard+ artifact has no ADI EVID → BLOCKER»
    print(f"✓ ADI EVID {ADI_EVID_ID} created — {hypothesis_count} hypotheses documented. Proceeding to Step 5.")

else:
    # tactical depth — skip ADI dispatch
    ADI_EVID_ID = None
    pass
```

**Shell fallback** (when MCP not available):
```bash
# Interactive FPF ADI path — use /fpf-reason skill:
# 1. Invoke /fpf-reason (fpf plugin) with the PRD/RFC body as input
# 2. Document ≥3 hypotheses in the PRD body under a «## FPF ADI» section
# 3. forgeplan new evidence "ADI cycle for PRD-XXX" --parent PRD-XXX
# 4. Fill EVID body with chosen hypothesis + rationale

forgeplan new evidence "ADI cycle for ${ARTIFACT_ID}"
# Fill: ## Hypotheses (≥3), ## Chosen, ## Rationale, ## Deductive Prediction
forgeplan link EVID-NNN ${ARTIFACT_ID} --relation informs
```

**Why 3 hypotheses (not 2)**:
- 2 hypotheses = false dichotomy (A vs B, both framed to favour A)
- 3rd hypothesis structurally breaks the framing: «what if we do nothing?», «what if we scope down?», «what if the problem is wrong?»
- FPF Abduction minimum: you need at least one hypothesis that challenges the premise of the other two

**Why MANDATORY (not optional)**:
- Audit 2026-05-25 (EPIC-001): S10 FPF at ~30% adoption — the weakest layer
- Opt-in discipline = absent discipline (Z-sprint meta-lesson from Z1-Z5 chain)
- MSR 2026: +25-41% complexity gap is highest at the design layer (before code is written)

**Enforcement chain**:
- `/forge-cycle` Step 4.5 dispatches ADI (here)
- `guardian` Step 5 verdict matrix enforces at gate time (BLOCKER if no ADI EVID)
- CLAUDE.md «FPF ADI discipline» section defines the workspace-level policy

Reference: PRD-059, EPIC-001 (4-layer pipeline S10), `/fpf-reason` skill (fpf plugin) as interactive alternative.

---

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

## Step 5.5a: Ask-back protocol handling (PRD-029)

Subagents dispatched in Step 5 (Build) may emit a `<<NEED_USER_INPUT:...>>` sentinel when they hit a knowledge gap that cannot be resolved from existing artifacts. This is not an error — it is the ask-back protocol (PRD-029). The orchestrator must detect, surface, and re-dispatch; never ignore sentinels silently.

**Detection**: after each subagent returns, scan the output for `^<<NEED_USER_INPUT:` or `^<<NEED_USER_INPUT_BEGIN>>` (line-start anchor prevents false positives from literal mentions in PRD bodies).

**Parser** (apply to every subagent return in Step 5 and Step 6.5):

```python
def parse_subagent_return(text):
    # Multi-line variant (question + why + options + default_if_no_answer)
    multi = re.search(
        r'^<<NEED_USER_INPUT_BEGIN>>\n(.*?)\n<<NEED_USER_INPUT_END>>',
        text, re.MULTILINE | re.DOTALL)
    if multi:
        return parse_multi_line(multi.group(1))  # yaml-like block

    # Single-line variant (preferred for short questions)
    single = re.search(r'^<<NEED_USER_INPUT:\s*(.+?)>>', text, re.MULTILINE)
    if single:
        return {"question": single.group(1).strip()}

    return None  # no ask-back; continue normally
```

**Surface**: call `AskUserQuestion` with the extracted question text; use `default_if_no_answer` as the recommendation hint (description field).

**Re-dispatch**: invoke the same subagent with its original prompt plus:
```
## User answer to ask-back
Question: {extracted question}
Answer: {user's response}
```

**Anti-loop guard**: if the same subagent emits the same question 2 times in one session, apply `default_if_no_answer` (or skip with a warning if absent), record an EVIDENCE artifact with `verdict=CONCERNS` noting "Anti-loop guard triggered for {agent}: {question}", and continue — never block the pipeline indefinitely.

Full protocol spec: `plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md` — section "Subagent ask-back protocol (PRD-029)".

---

## Step 6: Run Tests

Execute the project's test suite:
- Detect the test framework (jest, pytest, phpunit, go test, cargo test, etc.).
- Run the full suite or the relevant subset.
- All tests must pass before proceeding.

## Step 6.5: BMAD adversarial review (Standard+ depth)

Per S11 BMAD quality-gate discipline (Sprint Z6 — PRD-057). MSR 2026 empirically measures **+25–41% complexity gap** in AI-generated artifacts without adversarial controls. This step enforces ≥1 concrete finding per Profile B reviewer before `forgeplan_activate` is allowed.

> **Depth filter**: skip this step entirely for `tactical` depth tasks (no artifact created). For `standard`, `deep`, `critical` → MANDATORY.

### Procedure

```python
# Step 6.5 — BMAD adversarial review (Standard+ only)
depth = forgeplan_get(ARTIFACT_ID).get("depth", "tactical")

if depth in ("standard", "deep", "critical"):
    # 1. Dispatch Profile B artifact-reviewer with adversarial mandate
    review_result = Task(
        subagent_type="agents-pro:artifact-reviewer",
        description="BMAD adversarial review — find ≥1 concrete issue",
        prompt=f"""BMAD adversarial review of {ARTIFACT_ID}.

Your mandate: find AT LEAST 1 concrete weakness, risk, or gap.
Zero findings = reviewer was not adversarial enough; re-dispatch will follow.

Check:
- Acceptance criteria completeness and measurability
- Non-goals that should be goals (scope gaps)
- Missing NFRs (performance, security, scalability thresholds)
- Vague requirements without numeric targets
- Risk items missing mitigations
- Dependency assumptions not validated

Return EVIDENCE with ## Findings section containing ≥1 finding.
Cite MSR 2026 (+25–41% complexity finding) as motivation for adversarial depth.
"""
    )

    # 2. Parse reviewer EVID; check for ## Findings section
    reviewer_evid_id = extract_evid_id(review_result)
    reviewer_evid = forgeplan_get(reviewer_evid_id)
    has_findings = "## Findings" in reviewer_evid.get("body", "")
    findings_non_empty = bool(
        re.search(r'## Findings\s*\n+\S', reviewer_evid.get("body", ""))
    )

    if not findings_non_empty:
        # 3. Re-dispatch with explicit adversarial nudge
        review_result = Task(
            subagent_type="agents-pro:artifact-reviewer",
            description="BMAD adversarial re-review — specifically look for issues",
            prompt=f"""Re-review {ARTIFACT_ID}. Prior reviewer returned zero findings — this is insufficient.

Specifically look for:
X) Any acceptance criteria that are not SMART (not time-bound or not measurable)
Y) Any FR that leaks implementation detail (mentions a technology instead of a capability)
Z) Any risk row without a concrete mitigation owner

Even one finding is required. If the artifact is genuinely exceptional, explain why in
## Findings with ≥2 sentences. Default expectation: ≥1 actionable finding.
"""
        )
        reviewer_evid_id = extract_evid_id(review_result)

    # 4. Link reviewer EVID before proceeding to Step 7
    # (auto-linked if reviewer used parent_id; otherwise link manually)
    forgeplan_link(source=reviewer_evid_id, target=ARTIFACT_ID, relation="informs")

    # 5. guardian (Step 8) will enforce: zero Profile B EVID with verdict=PASS → BLOCKER
    # (see guardian.md Step 5 — "Step 4b: Standard+ artifact has zero linked Profile B EVID
    #  with verdict=PASS in audit chain → BLOCKER — Sprint Z6 PRD-057")
else:
    # tactical depth — skip adversarial review
    pass
```

**MSR 2026 finding** (motivation): McKinsey/Stanford Mixed-Methods Review 2026 reports AI-assisted teams exhibit +25–41% higher specification complexity gaps than human-only teams when no structured adversarial review is present. Mandatory ≥1 finding closes the "confident incompleteness" failure mode where an AI generates a plausible-sounding artifact with no reviewer challenging it.

**Enforcement chain**:
- `/forge-cycle` Step 6.5 dispatches reviewer (here)
- `guardian` Step 5 verdict matrix enforces at gate time (BLOCKER if no Profile B EVID with verdict=PASS)
- CLAUDE.md «BMAD adversarial review discipline» section defines the workspace-level policy

Reference: PRD-057, EPIC-001 (4-layer pipeline S11).

---

## Step 6.6: Multi-Reviewer Audit (Standard+ depth)

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

## Step 7.5: Parse NEEDS_ACTIVATION sentinel (Sprint D — PRD-032)

After subagents (especially Profile B reviewers) complete in Steps 6.5–7, scan their
return values for the `<<NEEDS_ACTIVATION:` sentinel at the start of a line. Pattern:

```python
# Pseudo-code — runs after each subagent return in Steps 6.5 and 7
import re

def parse_needs_activation(return_text):
    match = re.search(r'^<<NEEDS_ACTIVATION:\s*(EVID-\d+)>>', return_text, re.MULTILINE)
    if match:
        return match.group(1)
    return None

artifact_id = parse_needs_activation(subagent_return)
if artifact_id:
    # Re-verify R_eff before activating (false-positive guard)
    score = mcp__forgeplan__forgeplan_score(id=artifact_id)
    if score.r_eff > 0:
        # Interactive mode (/forge-cycle): confirm with user before activating
        confirm = AskUserQuestion(
            f"Reviewer signalled {artifact_id} is complete (R_eff={score.r_eff}). Activate now?",
            options=["yes", "no — I'll review first"]
        )
        if confirm == "yes":
            mcp__forgeplan__forgeplan_activate(id=artifact_id)
            # Phase 6.5.1: Auto-ingest activated artifact into Hindsight bank
            # (Sprint S — PRD-045 / Sprint R HIGH gap closure)
            # Activated artifacts become semantic-searchable for future sub-agents.
            try:
                artifact = mcp__forgeplan__forgeplan_get(id=artifact_id)
                kind = artifact.kind  # prd / rfc / adr / evid / spec / epic / note
                projection_path = f".forgeplan/{kind}s/{artifact_id}-*.md"
                mcp__plugin_fpl-hsmem_hindsight__document_ingest_file(
                    path=projection_path,
                    tags=[kind, "active", "auto-ingest"]
                )
            except Exception as e:
                # Non-fatal — log and continue. Activation succeeded; ingest is bonus persistence.
                print(f"Hindsight ingest skipped (non-fatal): {e}")
    else:
        # R_eff=0 means drift — surface to user for investigation
        AskUserQuestion(
            f"{artifact_id} claimed complete but R_eff=0 — possible drift. Investigate?",
            options=["yes — show details", "skip for now"]
        )
```

This closes Anomaly #7 from the Sprint A+B+C anomaly log: EVIDs stuck in draft because
Profile B agents are physically denied `forgeplan_activate` per `disallowedTools`.
The sentinel lets reviewers SIGNAL completion; the orchestrator performs the activate.

### Phase 6.5.1 — Auto-ingest activated artifact (Sprint S PRD-045)

Immediately after `forgeplan_activate` succeeds, the orchestrator calls
`document_ingest_file` to ingest the artifact projection (`.forgeplan/<kind>s/<ID>-*.md`)
into the Hindsight bank with tags `[<kind>, "active", "auto-ingest"]`. This closes the
HIGH-priority gap identified in `docs/HINDSIGHT-OPTIMIZATION-SPRINT-R.md`:

- Pre-Sprint S: 70+ activated PRDs in workspace, 79 documents in bank → most active PRDs
  NOT ingested → future sub-agents cannot semantic-search over PRD bodies via Hindsight
- Post-Sprint S: every newly-activated artifact auto-ingests. Backlog catch-up requires
  one-time bootstrap (`/fpl-hsmem:bootstrap`).

Failure mode is **non-fatal** — activation already succeeded; ingest is persistence-layer
bonus. A `try/except` around the ingest call ensures forge-cycle doesn't fail because
Hindsight server is unavailable.

Cross-reference: `AGENT-AUTHORING-GUIDE.md` Profile B Step 9b (sentinel convention),
`<<NEED_USER_INPUT>>` precedent from Sprint A (PRD-029), `/autorun` NEEDS_ACTIVATION
sentinel section (autopilot variant — auto-activates without confirmation).

## Step 7.7 (Phase 6.7): Live smoke verification (Sprint F — PRD-034 / Anomaly #11)

Before declaring Sprint done + commit, **dispatch at least 1 live sub-agent** that exercises the changes you just shipped. This is **encouragement, not enforcement** — but skipping it accumulates declared-vs-wired gaps (the Sprint A-E meta-lesson — see `docs/SPRINT-A-E-RETROSPECTIVE.md`).

> Discipline check label: **Phase 6.7 — Live smoke verification**

**When to skip**:
- Sprint scope is purely additive documentation (no behavioural change)
- Live smoke would consume disproportionate tokens/time vs the change size
- The change IS itself a live smoke verification of prior work

**When to do it**:
- New skill or hook added — dispatch a sub-agent that uses it
- Agent body patched — dispatch that agent with a representative task
- Orchestrator parser added — emit a test sentinel and verify parser fires
- Sentinel convention extended — verify organic emission

**Outcome shape**:
- GREEN: sub-agent behaviour matches Sprint claim → commit
- YELLOW: minor issues found but not blocking → fix inline OR record as follow-up EVID
- RED: Sprint claim doesn't match reality → STOP, return to Step 5 Build

**Meta-lesson** (from Sprint A-E retrospective): "declared ≠ wired ≠ verified live". Sprint A through D wrote documentation; Sprint E live-smoke (W2-F) was the first time NEEDS_ACTIVATION sentinel actually fired in production. Without that smoke, Anomaly #10 (declared-vs-wired gap) would have persisted indefinitely.

Cross-reference: `docs/SPRINT-A-E-RETROSPECTIVE.md` "Patterns that worked" section #5 (audit-driven closure) + Meta-lesson ML-1.

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

### Phase 7.3: Auto-changelog via forgeplan_release_notes (Sprint J+K — PRD-036)

When creating PR after a Sprint, draft changelog automatically from artifacts touched since last tag:

```python
mcp__forgeplan__forgeplan_release_notes(since="v2.3.0", draft=False)
```

Returns a structured payload — touched PRDs grouped Added/Fixed/Security/Changed by kind. Inject into PR body as starting point; refine narrative manually.

**Setup constraint** (Sprint J+K finding): tool requires `.forgeplan/` and `.git/` in the SAME directory. In multi-repo workspaces where `.forgeplan/` is at workspace root but git lives in a child repo, `forgeplan_release_notes` returns "git log failed: fatal: not a git repository". Workaround: run via shell `forgeplan release-notes --since v2.3.0` from inside the git repo (with `.forgeplan/` symlinked or co-located).

**Quality gate**: by default only active artifacts with R_eff > 0 are included (`draft=False`). Pass `draft=True` to include all touched artifacts including drafts. Do not pass `draft=True` for production releases — that bypasses the quality gate.

### Step 9.5: Auto-generate changelog before PR (Sprint J — PRD-037)

Before `gh pr create`, query the forgeplan artifact graph for a changelog block. Prefer MCP-first; CLI fallback when MCP not connected.

**MCP path** (preferred):
```python
mcp__forgeplan__forgeplan_release_notes(
    since="v<previous-tag>",   # omit for auto-detect latest tag
    until="HEAD",              # default
    draft=False                # quality gate: only active artifacts / r_eff > 0
)
```

**CLI fallback**:
```bash
forgeplan release-notes --since v<previous-tag> --until HEAD
```

The tool returns a Keep-a-Changelog–shaped structured payload (Added/Changed/Fixed/Security buckets), classified by artifact kind: PRD→Added, PROB→Fixed, EVID-on-security→Security, RFC/ADR→Changed. Quality gate (default): only `status==active` or `r_eff>0` artifacts included.

**Use as PR body baseline**: paste the structured output as the "What's changed" section of `gh pr create --body`, then optionally append hand-curated context. This eliminates per-PR hand-writing of changelog blocks.

**Anti-pattern**: do not pass `draft=True` for production releases — that bypasses the quality gate and includes incomplete artifacts.

Cross-reference: `plugins/fpl-skills/skills/progress-dashboard/SKILL.md` includes a "Recent release notes" panel reading from this same tool.

## Error Handling

- If `forgeplan` commands fail, check `forgeplan health` output and report the issue.
- If tests fail, fix the code and re-run before creating evidence.
- If validation fails, fix the artifact and re-validate.
- Never force-push or skip the evidence step.
