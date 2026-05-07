---
name: refine
description: Interview-driven refinement of a plan, design, or proposal. Walks the user down each branch of the design tree one question at a time, sharpening fuzzy terminology, surfacing contradictions against the existing domain model, stress-testing edge cases with concrete scenarios, and updating CONTEXT.md and ADRs inline as decisions crystallise. Use when a plan is rough, when terms are being used loosely, when the user said "thoughts?" or "does this make sense?", or before kicking off a sprint where ambiguity will cost time. Adapted from Matt Pocock's grill-with-docs. Triggers (EN/RU) — "refine this plan", "stress-test this", "review my design", "sharpen the spec", "уточни план", "проверь на прочность", "доведи до ума", "/refine".
---

# Refine

Relentless interview. One question at a time. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. Update `CONTEXT.md` and ADRs **inline as you go** — never batch.

Adapted from Matt Pocock's `grill-with-docs`. Same interview pattern, same "lazy file creation" rule, same conservative bar for ADRs.

---

## Project context (read first)

@docs/agents/paths.md
@CONTEXT.md

`paths.md` tells you where ADRs live (`docs/adr/`, `docs/decisions/`, etc.) and where domain docs live. `CONTEXT.md` is the existing domain glossary — challenge new terms against it.

If `CONTEXT.md` doesn't exist yet — that's fine. Create it lazily when the first term is resolved (don't pre-populate). Same for `docs/adr/` — create it when the first real ADR is offered, not before.

---

## When to use

- The user has a rough plan and wants it pressure-tested before committing.
- A design doc / RFC draft uses fuzzy terms ("account", "transaction", "user") that might mean different things to different people.
- Before kicking off [`sprint`](../sprint/SKILL.md) where ambiguity in the spec will cost time during execution.
- The user said: "thoughts?", "does this make sense?", "stress-test this", "уточни", "доведи до ума".
- After [`research`](../research/SKILL.md) when synthesising findings into a concrete plan.

## When NOT to use

- The plan is already tight and the user just wants execution — go to [`sprint`](../sprint/SKILL.md) or [`do`](../do/SKILL.md).
- The decision is trivial (rename a variable, fix a typo).
- The user is asking a factual question, not seeking refinement — answer it directly.
- No `CONTEXT.md` AND the project has no apparent domain (a CLI utility, a config script) — there's nothing to challenge against.

---

## How to interview

### One question at a time

Ask one question. Wait for the answer. Then ask the next. Don't dump a list of 10 questions — that overloads the user and produces shallow answers.

For each question, **provide your recommended answer** along with the question. The user can correct, refine, or accept. This is faster than open-ended Socratic prompting and respects the user's time.

### Explore code before asking

If a question can be answered by reading the codebase — read the codebase instead of asking. Asking the user to recall what their own code does wastes their time.

### Walk the design tree

Decisions depend on other decisions. Resolve roots first:

1. **What problem are we actually solving?** (If unclear, everything below is fragile.)
2. **What are the entities and their relationships?** (Domain model.)
3. **What are the boundaries — what's in scope, what's out?** (Non-goals.)
4. **What's the integration surface — who calls this, what does it call?**
5. **What are the constraints — perf, compliance, deadlines?**
6. **What are the failure modes and how do we handle them?**

Don't go deep on a leaf decision (cache TTL, button color) before the trunk is settled.

### Surface contradictions immediately

When the user says something that conflicts with the existing `CONTEXT.md`, an ADR, or the actual code — surface it on the spot. Don't let it slide.

> "Your `CONTEXT.md` defines `cancellation` as full-order cancellation, but you just described partial cancellation. Which is right — the doc, the new plan, or both (with a sub-concept)?"

### Sharpen fuzzy language

When the user uses an overloaded term, propose a precise canonical alternative.

> "You're saying 'account' — do you mean the **Customer** (the buying entity) or the **User** (the human who logs in)? Those are different things in your model."

### Stress-test with concrete scenarios

Invent edge cases that probe boundaries:

> "If a Customer places three Orders and cancels the second, does the third still ship? Why?"
>
> "Two users edit the same Order at the same time — last write wins, merge, or reject the second? Why?"

Use scenarios to force precision about the limits of the model, not to cover every case.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, name the file and line, and ask which is right.

---

## Update CONTEXT.md inline

When a term is resolved during the session, update `CONTEXT.md` immediately — not at the end.

Format: see [`references/CONTEXT-FORMAT.md`](references/CONTEXT-FORMAT.md). Key rules:

- **Be opinionated.** Pick one canonical term, list aliases under `_Avoid_`.
- **One sentence per definition.** Define what it IS, not what it does.
- **Show relationships.** "An Order produces one or more Invoices."
- **Only domain-specific terms.** Generic programming concepts (timeouts, error types) don't belong.

If `CONTEXT.md` doesn't exist yet, create it the moment the first term is resolved — empty file with a single entry. Don't pre-fill skeleton sections.

---

## Offer ADRs sparingly

Only offer to write an ADR when **all three** are true:

1. **Hard to reverse.** The cost of changing your mind later is meaningful.
2. **Surprising without context.** A future reader will wonder "why did they do it this way?"
3. **Result of a real trade-off.** There were genuine alternatives; you picked one for specific reasons.

If any of the three is missing, skip the ADR. The plan is enough; an ADR adds noise.

Format: see [`references/ADR-FORMAT.md`](references/ADR-FORMAT.md). Key rules:

- ADRs can be a single paragraph. Don't pad.
- Sequential numbering: scan `docs/adr/` for the highest, increment.
- Status / Options / Consequences sections are optional — only if they add value.

---

## End of session

When the design tree is exhausted (every branch either resolved or explicitly deferred):

1. Summarize what was decided (one paragraph per major decision).
2. List what's still open with a short note on why (so future sessions pick up here).
3. Confirm `CONTEXT.md` reflects every term resolved.
4. Confirm any ADRs are written and committed.
5. Suggest the next step — usually [`rfc`](../rfc/SKILL.md) to formalize, [`sprint`](../sprint/SKILL.md) to execute, or [`research`](../research/SKILL.md) if a new gap emerged.

---

## Output format (final summary)

```markdown
# Refine session: <topic>

## Decisions
- <decision 1> — rationale
- <decision 2> — rationale

## Open questions
- <question> — why deferred

## CONTEXT.md updates
- Added: <terms>
- Sharpened: <terms> (was fuzzy / aliased)
- Flagged: <ambiguities now resolved>

## ADRs written
- ADR-NNNN: <title>  (or "none — no decision met all three criteria")

## Next step
<one of: /rfc, /sprint, /research, /do — and why>
```

---

## Related skills

- [`research`](../research/SKILL.md) — gather context before refining; refine builds on what research finds.
- [`rfc`](../rfc/SKILL.md) — formalize the refined plan into a structured RFC.
- [`sprint`](../sprint/SKILL.md) — execute the refined plan.
- [`setup`](../setup/SKILL.md) — creates the initial empty `CONTEXT.md`; refine fills it in over time.
- [`do`](../do/SKILL.md) — for tasks where the plan is already tight and refinement isn't needed.

---

## Anti-patterns

- ❌ **Question dumps.** Asking 10 questions at once gets 10 shallow answers. One at a time.
- ❌ **Pre-filling CONTEXT.md or docs/adr/.** Lazy creation only — write when there's something real to record.
- ❌ **Padding ADRs.** A single paragraph that captures _why_ beats five sections of boilerplate.
- ❌ **Asking the user about their own code.** Read the code first.
- ❌ **Letting contradictions slide.** If the new plan conflicts with CONTEXT.md or existing code, surface it on the spot.
- ❌ **Going deep on leaves before trunk.** Cache TTL doesn't matter if the entity boundaries are still fuzzy.
- ❌ **Open-ended Socratic prompts.** "What do you think?" wastes time. Provide a recommended answer with each question.
