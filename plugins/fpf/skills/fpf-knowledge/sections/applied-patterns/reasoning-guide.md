# Reasoning Guide

How to use the ADI (Abduction-Deduction-Induction) reasoning cycle from FPF Part B.5.

## When to use

You face a question where the answer is not obvious, multiple explanations seem
plausible, or you suspect you are anchored on the first idea that came to mind.
The ADI cycle forces you to generate alternatives and test them against evidence.

## Steps

### 1. State the question clearly

Write a single, answerable question. Bad: "What should we do about performance?"
Good: "Why does the checkout API exceed 500ms p99 latency under 200 rps?"

### 2. ABDUCTION — Generate hypotheses

Produce at least three genuinely different explanations. The goal is breadth.
Include one that feels unlikely — it guards against anchoring.

Rules:
- Each hypothesis must be falsifiable (there is evidence that could disprove it).
- Each must rest on a stated assumption.
- Avoid dressing up one idea in three costumes.

### 3. DEDUCTION — Derive predictions

For each hypothesis, write 2-3 predictions: "If H1 is true, then we should
observe X." Good predictions discriminate — they are true under one hypothesis
but false under another.

### 4. INDUCTION — Test predictions

Check each prediction against available evidence. Mark it as:
- **Confirmed** — evidence supports the prediction
- **Refuted** — evidence contradicts the prediction
- **Unknown** — we lack the data to judge

Tally the results per hypothesis.

### 5. Score and conclude

The hypothesis with the most confirmations and fewest refutations wins —
but weight matters. One strong refutation (a controlled experiment) outweighs
several weak confirmations (anecdotal reports).

State the winner, the confidence level, and the remaining unknowns.

### 6. Plan next steps

For each "Unknown" prediction, write a concrete action to resolve it:
run a test, ask an expert, check a log, measure a metric. These become
your investigation backlog.

## Output

A ranked list of hypotheses with evidence scores, a best-supported conclusion,
and a prioritized list of unknowns to investigate next.
