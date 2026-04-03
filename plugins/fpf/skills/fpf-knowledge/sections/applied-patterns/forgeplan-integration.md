# Forgeplan Integration

How FPF outputs map to forgeplan artefacts, creating a complete chain from
structured thinking to project documentation.

## When to use

You are using both the FPF plugin (for thinking) and the forgeplan plugin
(for project artefacts). This guide connects them so reasoning flows into
trackable, auditable documents.

## The Mapping

| FPF activity | FPF output | Forgeplan artefact | Captures |
|-------------|-----------|-------------------|----------|
| /fpf-decompose | Bounded contexts, roles, interfaces | **PRD** | WHAT the system must do |
| /fpf-decompose (per context) | Context design, responsibilities | **RFC** | HOW a part is built |
| /fpf-evaluate | Decision matrix, recommendation | **ADR** | WHY a choice was made |
| /fpf-reason | Hypothesis scores, evidence gaps | **Evidence log** | TRUST level and gaps |

## The Workflow: Route → Shape → Reason → Evidence

### 1. Route

Use the FPF thinking-verb router to identify which FPF patterns apply.
This is a 30-second step — scan the router table, find your verb.

### 2. Shape

Apply the relevant FPF command (/fpf-decompose, /fpf-evaluate, /fpf-reason)
to produce structured output: tables, scores, diagrams.

### 3. Reason

Capture decisions in ADRs. Every time /fpf-evaluate produces a recommendation,
create an ADR that records:
- The context (why this decision arose)
- The options considered
- The decision and its rationale
- The expected consequences and trade-offs

### 4. Evidence

Log confidence scores and evidence gaps. These become tasks:
- F-G-R score below 3 on any axis → needs investigation
- Trust level "anecdotal" → needs empirical validation
- "Unknown" predictions from /fpf-reason → needs experiment or measurement

## Practical Tips

- Start with /fpf-decompose to get the PRD structure, then write RFCs for
  each bounded context.
- Run /fpf-evaluate for any decision that affects multiple contexts — these
  always deserve an ADR.
- Use /fpf-reason when debugging cross-context failures — the ADI cycle
  prevents premature diagnosis.
- Evidence gaps from any FPF command become backlog items in forgeplan.

## Output

A set of forgeplan artefacts (PRD, RFCs, ADRs) with explicit links back to
the FPF reasoning that produced them. The chain is: thinking (FPF) →
documentation (forgeplan) → action (implementation).
