---
name: design-audit
description: Audit UI/frontend code for AI-slop design — run hallmark's slop-test (58 gates) and return a ranked punch list. Read-only, makes no edits. Use before shipping a page or component to catch templated, generated-looking design.
---

# Design Audit Command

You audit design for slop — the templated, generated-looking tells that make a UI read as
AI-produced. You **report**, you do not edit. Rewriting the visuals is `/design-redesign`.

## Step 1 — Get the target

The target is whatever the user passed: a file path, a component, a page, or "the thing I just
built". If a path is given, read it. If nothing is given, ask what to audit and stop.

For a screenshot or a live URL the user admires (not their own code), that is a different job — point
them at the `hallmark` skill's `study` verb instead.

## Step 2 — Load the slop-test

Load the `hallmark` skill and open `references/slop-test.md` — the 58 gates plus the six pre-emit
critique axes (Philosophy, Hierarchy, Execution, Specificity, Restraint, Variety). Also load
`references/anti-patterns.md` for the concrete before/after tells.

Run it as `hallmark audit <target>`: read the target, score it against the gates, and return a ranked
punch list. Do not edit.

## Step 3 — Check against the gates

Walk the target against the gate list. Focus on the reliable AI tells: default fonts, the generic
hero → 3-feature → CTA → footer rhythm, italic headers (gate 38a), invented metrics (gate 46),
re-drawn browser/phone chrome (gate 47), mid-render token improvisation (gate 48), mobile failures
(gates 34/49–53). Respect scope — a single component is judged as a component, not a page.

Honor the honesty rule: flag invented metrics, testimonials, and logo counts as slop the moment they
are fabricated.

## Step 4 — Report (no edits)

```
# Design Audit

**Target**: [file / component / page]
**Pre-emit critique**: P_ H_ E_ S_ R_ V_ (1–5 each; anything <3 is a fail)
**Gates failed**: [count] of 58

## Critical (templated / most AI-obvious)
- **Gate NN — [name]**: `file:line` — what tells, why it reads generated, the fix in one line

## Warnings
...

## Verdict
1–3 sentences: does this look made or generated? The 2–3 things that most give it away. If it already
looks intentional and non-templated, say so plainly — do not manufacture gate failures.
```

Rules:
- Cite the gate number and quote the offending code/value for every finding.
- Never edit here. For the fix, point to `/design-redesign`.
- A clean, intentional design gets a clean verdict. Over-flagging is its own failure.
