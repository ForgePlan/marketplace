---
name: fpf-reason
description: "Reason through a complex question or problem using FPF's structured reasoning cycle. Generates multiple hypotheses, tests them against evidence, and identifies the best-supported conclusion with remaining uncertainties."
---

# /fpf-reason — Structured Reasoning Cycle

You are applying the FPF Reasoning Cycle (B.5) to think through a complex problem
systematically. Follow these steps precisely.

## Step 1 — State the Question

Ask the user for the question or problem they want to reason through.
If already provided, restate it as a clear, answerable question.
Identify: What type of answer is needed? (explanation, prediction, recommendation, diagnosis)

## Step 2 — ABDUCTION: Generate Hypotheses

Read `sections/07-part-b-trans-disciplinary-reasoning-cluster/22-b-5-2-0---u-abductiveprompt.md`
for the formal abductive pattern, then:

1. Generate **at least 3** distinct hypotheses or explanations.
2. Make them genuinely different — not variations of the same idea.
3. Include at least one "unlikely but possible" hypothesis to avoid anchoring bias.
4. For each hypothesis, state it in one sentence and note what worldview or assumption it rests on.

Present them as:
- **H1**: [hypothesis] — assumes [key assumption]
- **H2**: [hypothesis] — assumes [key assumption]
- **H3**: [hypothesis] — assumes [key assumption]

## Step 3 — DEDUCTION: Derive Testable Predictions

For each hypothesis, derive 2-3 predictions — things that SHOULD be observable
or true IF the hypothesis is correct:

- **H1 predicts**: if H1 is right, then we should see [P1a], [P1b], [P1c]
- **H2 predicts**: if H2 is right, then we should see [P2a], [P2b], [P2c]
- **H3 predicts**: if H3 is right, then we should see [P3a], [P3b], [P3c]

Good predictions are specific and distinguishing — they separate one hypothesis
from the others.

## Step 4 — INDUCTION: Test Against Evidence

Check each prediction against available evidence:

| Hypothesis | Prediction | Evidence | Status |
|------------|-----------|----------|--------|
| H1 | P1a | [what we know] | Confirmed / Refuted / Unknown |
| H1 | P1b | ... | ... |
| ... | ... | ... | ... |

Count confirmed, refuted, and unknown for each hypothesis.

## Step 5 — Score with Trust Calculus

For each hypothesis, assign a confidence score:

- **H1**: [score 0-1] — [N confirmed, M refuted, K unknown]
- **H2**: [score 0-1] — [N confirmed, M refuted, K unknown]
- **H3**: [score 0-1] — [N confirmed, M refuted, K unknown]

The score reflects the weight of evidence, not just the count.
A single strong refutation can outweigh multiple weak confirmations.

## Step 6 — Conclusion

State the best-supported hypothesis and explain why in 2-3 sentences.

List **remaining uncertainties**:
- What evidence is missing that could change the conclusion?
- What experiments, observations, or questions would resolve the unknowns?

Suggest **next steps** — concrete actions the user can take to strengthen
or challenge the conclusion.

## Tone

Keep language plain and direct. Introduce FPF terms (Abduction, Trust Calculus,
U.AbductivePrompt) only in parentheses when they add precision. The user should
feel they are reasoning clearly, not studying a framework.
