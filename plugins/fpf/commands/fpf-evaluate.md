---
name: fpf-evaluate
description: "Evaluate a decision or compare alternatives using FPF Trust Calculus and F-G-R scoring. Produces a structured decision matrix with confidence scores, evidence gaps, and an optional ADR artefact."
---

# /fpf-evaluate — Structured Decision Evaluation

You are performing a structured evaluation of a decision or set of alternatives using the
First Principles Framework (FPF). Follow these steps precisely.

## Step 1 — Frame the Decision

Ask the user for the decision they need to make, or the set of alternatives to compare.
If already provided, restate it as a clear decision question:
"Which of {A, B, C} should we choose for {goal}?"

List the decision criteria the user cares about. If not stated, propose 3-5 criteria
and ask the user to confirm or adjust.

## Step 2 — Apply Trust Calculus (B.3)

Read `sections/07-part-b-trans-disciplinary-reasoning-cluster/13-b-3---trust-assurance-calculus.md`
for the formal model, then for each alternative:

- **Confidence score** (0-1): How much evidence supports this option?
- **Assurance level**: What kind of evidence do we have?
  - Anecdotal (someone said so)
  - Empirical (we observed it)
  - Analytical (we derived it from principles)
  - Formal (we proved it or measured it rigorously)

## Step 3 — F-G-R Scoring (C.2)

Read `sections/08-part-c-kernel-extensions-specifications/_index.md`, then pick `01-c-2---epistemic-holon-composition.md` for the KD-CAL pattern (also `05-c-2-3---unified-formality-characteristic-f.md` for Formality, `03-c-2-2---reliability-r-in-the-f-g-r-triad.md` for Reliability).

Score each alternative on three axes:

- **Formality** (0-3): How precisely is this option defined? (0 = vague idea, 3 = formal spec)
- **Granularity** (0-3): How detailed is our understanding? (0 = hand-wavy, 3 = implementation-ready)
- **Reliability** (0-3): How well-evidenced is it? (0 = gut feeling, 3 = proven in production)

## Step 4 — Evidence Analysis

For each alternative, identify:

1. **Supporting evidence** — What confirms this is a good choice? List concrete facts.
2. **Missing evidence** — What do we NOT know that could change the decision?
3. **Risks** — What could go wrong if we choose this?
4. **Assumptions** — What must be true for this option to work?

## Step 5 — ADI Reasoning Cycle

Apply the Abduction-Deduction-Induction cycle:

### Abduction — Generate Hypotheses
For the decision at hand, generate at least 3 distinct hypotheses about which option
is best and WHY. Do not anchor on the obvious choice.

### Deduction — Derive Predictions
For each hypothesis, state what SHOULD be true if it is correct.
These are testable predictions.

### Induction — Check Against Evidence
Compare predictions to the evidence gathered in Step 4.
Mark each prediction as: confirmed, refuted, or untestable with current data.

## Step 6 — Decision Matrix

Produce a summary table:

| Alternative | F-G-R | Trust | Supporting | Missing | Risks | Recommendation |
|-------------|-------|-------|------------|---------|-------|----------------|
| ... | F/G/R | 0-1 | ... | ... | ... | ... |

State the recommended choice and the primary reason.
State what evidence, if obtained, could REVERSE the recommendation.

## Step 7 — Create an ADR (if forgeplan available)

If the forgeplan plugin is available:

- Suggest creating an **ADR** (Architecture Decision Record) capturing:
  - Context: why this decision arose
  - Options considered (from the matrix)
  - Decision: which option and why
  - Consequences: expected trade-offs
- Remind the user: the ADR is the "why" artefact — it preserves the reasoning
  so future team members understand the decision without re-deriving it.

## Tone

Use plain language. Introduce FPF terms (Trust Calculus, F-G-R, ADI cycle)
only when they add precision the user needs. Focus on actionable insight,
not framework jargon.
