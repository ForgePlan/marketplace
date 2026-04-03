# Route -> Shape -> Build Cycle

The forgeplan engineering cycle has six stages. Every task enters at Route and exits at Activate.

## 1. Route

Determine the task's depth using `forgeplan route "<description>"`.

The router analyzes complexity, risk, and scope to assign one of four depth levels:
- **Tactical**: Simple fix, < 1 hour. No artifacts needed.
- **Standard**: Feature or significant change. Needs a PRD.
- **Deep**: Cross-cutting concern or risky change. Needs PRD + RFC.
- **Critical**: Irreversible decision or major architecture change. Needs PRD + RFC + ADR.

## 2. Shape

Create and fill the required artifacts based on depth.

For Standard+:
```bash
forgeplan new prd "Feature title"
```
Fill in Problem, Goals, Functional Requirements, Non-Functional Requirements.

For Deep+:
```bash
forgeplan new rfc "Technical approach title"
```
Fill in Context, Options Considered, Decision, Trade-offs.

For Critical:
```bash
forgeplan new adr "Decision title"
```
Fill in Status, Context, Decision, Consequences.

Always validate: `forgeplan validate <ARTIFACT-ID>`

## 3. Build

Implement the code according to the shaped artifacts. Follow project conventions. Write tests alongside code.

## 4. Audit

Run tests. Optionally run `/forge-audit` for a multi-expert review. Fix any CRITICAL or HIGH findings before proceeding.

## 5. Evidence

Create evidence linking implementation to requirements:
```bash
forgeplan new evidence "What was verified"
```
Set verdict (PASS/FAIL), congruence level (CL1-CL5), and evidence type.

## 6. Activate

Review and activate the artifact:
```bash
forgeplan review <ARTIFACT-ID>
forgeplan activate <ARTIFACT-ID>
```

This marks the work as complete and moves the artifact to the active knowledge base.
