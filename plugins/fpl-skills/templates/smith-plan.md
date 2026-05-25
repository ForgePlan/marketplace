# Smith Plan Template

> Output template for `/smith` and `/smith-plan`. Smith fills this in and returns it to the orchestrator. Orchestrator uses it as the canonical hand-off artifact.
> **Hard limit**: ≤500 lines. **All 8 sections MUST be present.**

---

# Smith Plan: <one-sentence task title>

| Field | Value |
|---|---|
| Status | Draft |
| Date | YYYY-MM-DD |
| Context-type | <one of 12 (per routing-map.md rows 1-12): greenfield / brownfield / feature / bug-fix-prod / bug-fix-trivial / refactor / adr-decision / security-audit / perf-audit / pdlc-discovery / tech-debt / incident> |
| Methodology-primary | <e.g., FPF / BMAD / OpenSpec / C4 / SRE / ADI / SPARC> |
| Methodology-secondary | <e.g., FPF (if primary is BMAD) / none> |

## Context

<2-3 sentences. What is being asked, what constraint forces a structured plan over ad-hoc action, what's the trigger. Cite the task / artifact ID (PRD-NNN, EVID-NNN, GitHub issue) if applicable.>

## Methodology routing decision

Picked from `routing-map.md` row: **<row identifier or context-type → methodology mapping>**.

- **Why this row applies**: <one sentence linking task signals to the row's selection criteria>
- **Routing-map reference**: [`routing-map.md#<anchor>`](../skills/smith/routing-map.md)
- **Fallback**: if primary methodology hits a blocker, smith re-routes to **<secondary>** with EVID linking the pivot rationale.

## Dispatch sequence

Numbered steps. Each step is one agent dispatch. Orchestrator runs them in order, closing the loop after each.

1. **Step 1**
   - **Agent**: `<plugin>:<agent-name>` (e.g., `agents-pro:brief-intake`)
   - **Profile**: <A / B / C / C-coder / D>
   - **Produces**: <artifact-kind — brief / prd / rfc / adr / evid / code-diff / note>
   - **Why this position**: <one line — why this must come before step 2>

2. **Step 2**
   - **Agent**: `<plugin>:<agent-name>`
   - **Profile**: <A / B / C / C-coder / D>
   - **Produces**: <artifact-kind>
   - **Why this position**: <one line>

3. **Step 3**
   - **Agent**: `<plugin>:<agent-name>`
   - **Profile**: <A / B / C / C-coder / D>
   - **Produces**: <artifact-kind>
   - **Why this position**: <one line>

<Add steps 4..N as needed. Typical plan is 3-7 steps. If >10 steps, consider splitting into sub-plans.>

## Evidence requirements

Parseable checklist. Orchestrator marks `[x]` as each evidence item lands. Guardian gate uses this list to verify pre-activation completeness.

- [ ] **Artifact**: <kind, e.g., evid> — <acceptance criteria, e.g., "Profile B EVID with ≥1 finding informs PRD-NNN">
- [ ] **Artifact**: <kind, e.g., adr> — <acceptance criteria, e.g., "ADR with ≥3 hypotheses, F+G+R sum ≥12 on chosen option">
- [ ] **Artifact**: <kind, e.g., evid> — <acceptance criteria, e.g., "ADI cycle EVID with 3 hypotheses + chosen + rationale">
- [ ] **Artifact**: <kind, e.g., code-diff> — <acceptance criteria, e.g., "PR merged with green CI, validate-all-plugins.sh ALL PASSED">

## Risks

Bullet list. Each risk has a mitigation. If a risk has no mitigation, surface it as an open question, not a risk.

- **Risk**: <one-line risk statement>
  - **Mitigation**: <concrete action — agent, gate, or fallback that prevents it>
- **Risk**: <one-line risk statement>
  - **Mitigation**: <concrete action>
- **Risk**: <one-line risk statement>
  - **Mitigation**: <concrete action>

## Reversibility

<One paragraph. How to back out if this plan turns out wrong. Identify the **point of no return** (which step makes rollback expensive), the **rollback artifact** (which ADR/EVID supersedes if reverted), and the **escape hatch** (manual fix, supersede, or full revert). If the plan is irreversible by design, state that explicitly and cite the ADR that locks it in.>

## Hand-off back to orchestrator

Smith has produced a plan. Orchestrator should now:

1. **Review** — read the dispatch sequence + evidence requirements. Reject and re-prompt smith if a step looks wrong before dispatching anything.
2. **Dispatch the first agent** — run Step 1's agent with the profile and produces-target above. Capture the output artifact ID.
3. **Close the loop after each step** — verify the produced artifact matches the evidence requirement row, mark `[x]`, then proceed to the next step. If a step fails, re-prompt smith (`/smith-plan continue from step N`) before improvising.

Smith does NOT execute steps. Smith plans, orchestrator dispatches. This separation enforces ML-12 (ADI before action) and prevents smith from becoming a one-shot replacement for the conveyor.

---

## How to use this template

1. Run `/smith <task description>` — smith fills this template based on routing-map.md + task signals.
2. Review the rendered plan in chat. Push back on any step that looks wrong BEFORE accepting.
3. Orchestrator dispatches Step 1, captures artifact, marks `[x]` on evidence-requirements row.
4. Continue until all evidence rows are `[x]`. Run `/methodology-check <ARTIFACT-ID>` before final activation.
5. If the plan needs revision mid-execution, run `/smith-plan revise` — smith updates the plan with delta-spec.
