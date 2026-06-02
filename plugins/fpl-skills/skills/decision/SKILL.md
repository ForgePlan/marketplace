---
name: decision
description: |
  Fast path for recording a routine decision as a light ADR (200-400 words, 6-section DDR shape). Use when you just chose one approach over another and want to capture the why before it slips out of memory. NOT for big architecture — that's `adr-architect` agent territory.

  Triggers: "record decision", "/decision", "запиши решение", "quick adr", "light adr", "ddr"
origin: forgeplan
---

# /decision — quick decision record

You are helping the user capture a routine decision they JUST made (lib choice, config tweak, small refactor approach) as a **light ADR** (200-400 words, 6 sections including Revisit Trigger).

## When to use this skill (vs `adr-architect` agent)

| Use `/decision` (this skill) | Use `adr-architect` agent |
|---|---|
| Decision touches 1-2 modules | Decision touches ≥3 modules |
| User says "let's record this", "quick ADR" | User says "full ADR", "major architectural decision" |
| Routine choice (lib, config, small refactor) | System-level decision (supersedes ADR, multi-sprint scope) |
| ADI surfaces ≤2 trade-offs | ADI surfaces ≥3 unresolved trade-offs |
| You're mid-session and don't want to break flow | You can spend 30+ min on the decision |

If in doubt — start with `/decision` (light). Easier to escalate from light to full than to compress full into light.

## Procedure

### Step 1 — Read the template

```
Read ${CLAUDE_PLUGIN_ROOT}/templates/adr-light.md
```

Use it as your structure — 6 named sections.

### Step 2 — Gather facts from the live session

Don't ask the user for things you can already see. From the current chat context:

- **Context**: what was discussed in the last 1-3 turns leading to the choice.
- **Hypotheses considered**: which options came up in conversation. If only one was discussed, prompt the user for two more (DDR rule: minimum 3).
- **Decision**: which option the user picked.

Ask the user ONLY for what's missing:
- Revisit Trigger (the key MUST field — usually not in chat history)
- Reasons for rejecting alternatives (if not already stated)

### Step 3 — Score F+G+R per hypothesis

For each hypothesis, score by the rubric in the template:

- **F** (Formality): 0 if "gut feel", 9 if "spec/proof"
- **G** (Granularity): 0 if "slow", 9 if "p99=47ms @ 10k RPS"
- **R** (Reliability): 0 if "Slack anecdote", 9 if "peer-reviewed or our prod benchmark"

If the chosen hypothesis's F+G+R sum <12, OFFER to dispatch the `evidence-gatherer` agent for rigorous evidence collection. Do NOT force this — it's user's choice whether the rigour is worth the time.

```
Task(
  subagent_type = "agents-pro:evidence-gatherer",
  prompt = "Gather evidence for hypothesis '<H>'. Current F+G+R sum is <N> (below 12). Search 20-30 sources across 5+ classes, score R per source, ask user for production data if applicable, return per-source breakdown."
)
```

When the agent returns, take its synthesis EVID's aggregate F+G+R and re-score the hypothesis. Update the light ADR's Evidence table with the new numbers + cite the evidence-gatherer EVID by ID. If still <12 after rigorous gathering — be honest about the weak foundation in the Decision section ("chose this despite weak evidence because <reason>").

### Step 4 — Create the ADR

```python
adr = forgeplan_new(kind="adr", title="<one-sentence decision>")
forgeplan_update(id=adr.id, body=<filled adr-light.md template>)
```

### Step 5 — Create EVID + activate

The EVID for a light ADR can be inline (1-2 paragraphs verifying the decision was actually applied — e.g., "config X is now in production as of commit Y"):

```python
evid = forgeplan_new(kind="evidence", title="Verification — decision <NNN> applied", parent_id=adr.id)
forgeplan_update(id=evid.id, body=<bold-pattern with Verdict: APPLIED, Congruence level, Evidence type>)
forgeplan_activate(id=evid.id)
forgeplan_activate(id=adr.id)
```

### Step 6 — Confirm to user

Tell the user:
- ADR-NNN created and active
- Revisit Trigger summary (1 line — when this will need re-opening)
- If F+G+R was low: remind about `evidence-gatherer` as a follow-up if rigour matters

## Hard rules

1. **Never skip Revisit Trigger.** This is the DDR distinction from old-style ADR. A decision without a trigger is a memorial.
2. **Never artificially inflate F+G+R.** If it's a gut feel, write F=2 G=2 R=2. Self-honest weak score is more valuable than a fake strong one.
3. **If you exceed 400 lines, STOP and switch to `adr-architect` full template.** This is a light record; if it needs more, the decision is bigger than light scope.
4. **Never wait on the user for >2 follow-up questions.** Make reasonable defaults, note what's assumed, let the user correct after the ADR is created.
5. **Default Depth = Tactical.** Light ADR is by definition tactical scope.

## References

- Template: `plugins/fpl-skills/templates/adr-light.md`
- Full ADR alternative: `plugins/fpl-skills/templates/adr-full.md` (via `adr-architect` agent)
- DDR methodology (user-provided 2026-05-24): 6 sections, 200-400 words, mandatory Revisit Trigger
- Sprint Z2 (PRD-053): Revisit Trigger enforcement via guardian + decay-watch
- Sprint Z4 (PRD-055): evidence-gatherer agent for rigorous F+G+R scoring
