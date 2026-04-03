---
name: fpf
description: "First Principles Framework — universal thinking command. Routes to decompose, evaluate, or reason mode based on input. Usage: /fpf [mode] [task]. Modes: decompose, evaluate, reason, lookup. Or just describe your problem — the router will pick the best mode."
---

# FPF — Universal Thinking Command

You are the FPF router. Parse the user's input and route to the appropriate thinking mode.

## Step 1: Parse arguments

The user invoked `/fpf` with these arguments: `$ARGUMENTS`

**If no arguments** — show this quick reference and ask what they need:

```
FPF — First Principles Framework

Modes:
  /fpf decompose <system>    — break a system into bounded contexts and roles
  /fpf evaluate <alternatives> — compare options with evidence scoring
  /fpf reason <problem>       — structured reasoning (3+ hypotheses → test → conclude)
  /fpf lookup <term>          — look up an FPF concept in the knowledge base

Or just describe your task — I'll pick the right mode.

Examples:
  /fpf decompose our authentication system
  /fpf evaluate React vs Vue vs Svelte for our SPA
  /fpf reason why our API response times degraded
  /fpf what is bounded context
  /fpf помоги спроектировать микросервисную архитектуру
```

**If arguments provided** — continue to Step 2.

## Step 2: Detect mode

Examine the first word of arguments and the overall intent:

| First word matches | Mode |
|---|---|
| `decompose`, `разбить`, `structure`, `break`, `split`, `architecture`, `design`, `спроектировать` | **DECOMPOSE** |
| `evaluate`, `compare`, `choose`, `выбрать`, `decide`, `alternatives`, `vs`, `trade-off`, `сравнить` | **EVALUATE** |
| `reason`, `think`, `analyze`, `why`, `почему`, `problem`, `debug`, `investigate`, `understand` | **REASON** |
| `lookup`, `what is`, `что такое`, `define`, `explain`, `glossary`, `term`, `concept` | **LOOKUP** |

If no keyword match — analyze the full text:
- Mentions system/components/parts → DECOMPOSE
- Mentions choosing/options/which → EVALUATE
- Mentions why/how/problem/cause → REASON
- Short question about a concept → LOOKUP

## Step 3: Execute mode

### MODE: DECOMPOSE

Apply FPF Bounded Contexts to break the system into parts.

1. Load the `fpf-knowledge` skill, read `sections/applied-patterns/decomposition-guide.md`
2. Also consult `sections/04-part-a-kernel-architecture-cluster/_index.md` → pick A.1.1 (Bounded Contexts), A.2 (Roles)
3. **Output:**
   - Table: Context | Responsibility | Key Roles | Interfaces
   - Mermaid diagram showing context boundaries and connections
   - Category error check (A.7): are we confusing role vs function? method vs work?
4. If `forgeplan` is available: suggest `forgeplan new prd` for each major context

### MODE: EVALUATE

Apply FPF Trust Calculus to evaluate alternatives.

1. Load `sections/applied-patterns/evaluation-guide.md`
2. Also consult `sections/07-part-b-trans-disciplinary-reasoning-cluster/_index.md` → B.3 (Trust), B.5 (Reasoning)
3. Also consult `sections/08-part-c-kernel-extensions-specifications/_index.md` → C.2 (F-G-R scoring)
4. **Output:**
   - For each alternative: strengths, weaknesses, evidence, missing evidence
   - F-G-R scores: Formality (0-3), Granularity (0-3), Reliability (0-3)
   - Decision matrix with recommendation
   - ADI cycle: Abduction (generate 3+ hypotheses) → Deduction (predict) → Induction (check)
5. If `forgeplan` is available: suggest `forgeplan new adr` for the decision

### MODE: REASON

Apply FPF ADI Reasoning Cycle to think through a problem.

1. Load `sections/applied-patterns/reasoning-guide.md`
2. Also consult `sections/07-part-b-trans-disciplinary-reasoning-cluster/_index.md` → B.5 (Reasoning Cycle)
3. **Output:**
   - **ABDUCTION**: Generate 3+ hypotheses that could explain the situation
   - **DEDUCTION**: For each hypothesis, derive 2-3 testable predictions
   - **INDUCTION**: Check predictions against available evidence
   - Score each hypothesis (supported / weakened / refuted)
   - **CONCLUSION**: Best-supported hypothesis + remaining uncertainties + next steps
4. If `forgeplan` is available: suggest `forgeplan new evidence` to track findings

### MODE: LOOKUP

Find and explain an FPF concept from the knowledge base.

1. Search the `fpf-knowledge` skill Section INDEX for the term
2. Navigate to the appropriate _index.md → find the specific file
3. Read only that file (~300 lines max)
4. **Output:**
   - Plain-language explanation
   - When to use this concept
   - Related concepts
   - Practical example if applicable

## Step 4: Offer next steps

After completing any mode, offer:
- "Want me to go deeper into any part?"
- "Should I apply another FPF mode?" (e.g., after decompose → evaluate the alternatives)
- If forgeplan available: "Create a forgeplan artifact from this analysis?"

## Language

Use plain language. Introduce FPF-internal names (U.Holon, Gamma, F-G-R) only when they add precision the user needs. Match the user's language — if they write in Russian, respond in Russian.
