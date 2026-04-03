# Evaluation Guide

How to evaluate decisions and compare alternatives using FPF Trust Calculus and F-G-R scoring.

## When to use

You have two or more options and need to choose. The choice matters enough that
"gut feeling" is not sufficient — you need to show your reasoning or you need
to identify what evidence is missing before committing.

## Steps

### 1. Frame the decision

State it as a question: "Which of A, B, C should we choose to achieve X?"
List 3-5 criteria that matter (performance, cost, risk, team familiarity, etc.).

### 2. Score with F-G-R (C.2)

For each option, rate three dimensions on a 0-3 scale (per FPF C.2):

- **Formality** — How precisely defined is this option?
  (0 = napkin sketch, 3 = formal specification with contracts)
- **Granularity** — How detailed is our understanding?
  (0 = "it probably works", 3 = component-level design with edge cases)
- **Reliability** — How well-evidenced is it?
  (0 = someone blogged about it, 3 = proven in our environment under load)

Low scores are not disqualifying — they identify WHERE more work is needed.

### 3. Apply Trust Calculus (B.3)

For each option, classify the evidence:

- **Anecdotal**: someone said it works (lowest trust)
- **Empirical**: we or others observed it working
- **Analytical**: we derived from principles that it should work
- **Formal**: we proved or measured it rigorously (highest trust)

Assign a confidence score (0.0 to 1.0) reflecting the combined weight.

### 4. Map evidence and gaps

For each option, list:
- Supporting evidence (concrete facts that confirm it)
- Missing evidence (things we do not know that could change the decision)
- Risks (what could go wrong)
- Assumptions (what must be true for this to work)

### 5. Build the decision matrix

| Option | F | G | R | Trust | Key strength | Key risk | Verdict |
|--------|---|---|---|-------|-------------|----------|---------|

State the recommendation and the single piece of evidence that, if discovered,
could reverse it.

## Output

A decision matrix, a recommended choice with reasoning, and a list of evidence
gaps ranked by impact — these become the next investigation tasks.
