---
name: shape
description: Interview-from-scratch skill that turns a raw idea into a structured PRD draft. Asks one focused question at a time, sharpens the problem statement and goals, surfaces target users and constraints, and writes the result as a forgeplan PRD draft (or markdown if forgeplan CLI is missing). Pairs with `/refine` (which polishes an existing plan) — `/shape` creates the plan from a fuzzy idea. Triggers (EN/RU) — "shape this idea", "I have an idea", "help me think this through", "от идеи к PRD", "продумать фичу", "оформить идею", "/shape".
disable-model-invocation: true
allowed-tools: Read Write Edit Bash(test *) Bash(forgeplan *) Bash(command *) Bash(grep *) Bash(ls *)
---

# shape — From a fuzzy idea to a draft PRD

A short interview that turns a half-baked idea into a structured artifact. **One question at a time**, no walls of text. Each answer feeds the next question. By the end you have a filled draft PRD (or RFC, or ADR — depending on what surfaces).

This skill is the **front-end** of the forgeplan lifecycle. `/refine` polishes plans you already wrote; `/shape` writes the plan with you.

---

## When to use

- "I have a vague idea, walk me through it." Idea is in your head, not on paper.
- New feature where you don't yet know who the user is or what success looks like.
- You can describe the problem in 1-2 sentences but can't draft a full PRD.
- You explicitly type `/shape "<rough idea>"` or `/shape` (skill prompts for the idea).
- Russian: "оформи идею", "продумай фичу", "от идеи к PRD".

## When NOT to use

- You already have a draft plan / RFC / PRD — use [`/refine`](../refine/SKILL.md) instead.
- You need research / prior art before shaping — use [`/research`](../research/SKILL.md) first.
- The task is tactical (one-line fix, typo, config tweak) — just do it.
- You want full automation from the idea — use [`/autorun`](../autorun/SKILL.md) instead (it routes through forgeplan-workflow internally).

---

## Interview principles

1. **One question per turn.** Never dump a list of 10 questions. Wait for the answer, build the next question on top.
2. **Concrete over abstract.** Ask "who exactly will use this?" not "what's the user persona?". Names, examples, numbers.
3. **Each question moves a section forward.** No questions for their own sake — every answer fills a slot in the draft PRD.
4. **Stress-test, don't stenograph.** When the user gives a thin answer ("for everyone"), push back with a counter-example ("would the new admin user benefit from this? what about the API client?").
5. **Surface contradictions immediately.** If answer 5 contradicts answer 2 — flag it on the spot, don't accumulate.
6. **Cap at 8-12 questions.** Beyond that, you're refining (use `/refine` for that). Less can be enough — stop when MUST sections are filled.

---

## Question script (template)

Adapt these to the conversation. Don't ask them robotically.

| # | Section | Question shape | What it fills |
|---|---|---|---|
| 1 | Problem | "Tell me what's broken or missing today, in one sentence." | Problem statement (line 1) |
| 2 | Problem | "When does this hurt — daily, weekly, on a specific event?" | Problem severity / cadence |
| 3 | Target users | "Who feels this pain first — by role, not persona?" | Target Users §1 |
| 4 | Target users | "How do they work around it today?" | Status quo + workaround cost |
| 5 | Goal | "If you could only fix one thing about this — what?" | Primary goal (G-1) |
| 6 | Goal | "What does success look like in 2 weeks if it works?" | Success Criteria SC-1 |
| 7 | Scope | "What's the smallest version that would help — MVP?" | MVP scope |
| 8 | Scope | "What are you NOT going to build right now?" | Non-goals |
| 9 | Constraints | "Are there hard limits — budget, time, tech, team?" | Constraints / NFRs |
| 10 | Risks | "What could go wrong that you're worried about?" | Risks (R-1, R-2) |
| 11 | Decision points | "Where are you uncertain enough that you want to research before deciding?" | Open questions / route to `/research` |
| 12 | Wrap | "If I had to write this up as a PRD right now, did I miss anything important?" | Catch-all |

The order is flexible. If the user volunteered the goal in question 1, skip 5-6 and go to scope. If they kept saying "I don't know" — narrower scope, more concrete questions.

---

## Process

### 1. Orient

```bash
pwd
test -f CLAUDE.md && echo "claude-md present" || echo "no claude-md"
test -d .forgeplan && echo "forgeplan present" || echo "no forgeplan"
command -v forgeplan
```

If `forgeplan` is on `$PATH` and `.forgeplan/` exists — write the draft as a real PRD via `forgeplan new prd`. If not — write a markdown file at `docs/ideas/<slug>.md` and tell the user to migrate it later.

If the user passed `$ARGUMENTS` ("shape this: build PDF export"), skip the opener question and start at #1 with that as context. If empty, open with: "What's the idea?".

### 2. Conduct the interview

Ask one question. Wait for the answer. Reflect briefly ("So the pain shows up when …, got it.") to confirm understanding. Move to the next question.

After every 3 answers, summarise what you've heard so far in 2-3 lines and ask "is this right?". This catches drift early.

If the user goes off on a tangent — let them, then gently return ("…that's good context. Coming back to the goal: …").

### 3. Produce the draft

When you have enough to fill the MUST sections of a PRD (problem, goals, target users, scope, at least one risk, one constraint), stop interviewing.

Write the draft:

**Forgeplan-aware mode**:
```bash
forgeplan new prd "<title from interview>"
# Then update body with content collected during interview:
forgeplan_update id=PRD-NNN body="<full markdown body>"
forgeplan validate PRD-NNN
```

**Plain markdown fallback** (no forgeplan CLI):
```bash
mkdir -p docs/ideas
$EDITOR docs/ideas/<slug>.md   # write the draft here
```

### 4. Hand-off

Tell the user where the draft is and what's next:

```
✓ Draft PRD-NNN created — open it in your editor or run `forgeplan get PRD-NNN`.

What I captured:
  • Problem: <one line>
  • Primary goal: <one line>
  • Target users: <list>
  • MVP scope: <one line>
  • Open questions: <list>

Next steps (pick one):
  1. /refine PRD-NNN     — polish, surface contradictions, add ADRs
  2. /research <topic>   — investigate one of the open questions
  3. /forge-cycle        — automated build cycle (route → build → evidence → activate)
  4. Edit the draft yourself — it's just markdown
```

---

## What the draft looks like

A `/shape` PRD is **a draft, not a finished spec**. It captures:

- ✅ Problem statement (1-3 sentences)
- ✅ Primary goal + 1-3 success criteria (rough numbers OK)
- ✅ Target users (concrete roles, not personas)
- ✅ MVP scope (bullet list of in/out)
- ✅ At least one risk + one constraint
- ✅ Open questions (the things you didn't know during the interview)

It does NOT yet have:
- ❌ Functional requirements (those come during `/refine` or `/forge-cycle` Shape phase)
- ❌ Architecture / RFC (that's `/rfc create` after refine)
- ❌ Implementation plan (that's `/sprint` or `/build`)

The draft is a **starting point**. Expect to spend 30+ minutes refining it before it's ready for activation.

---

## Forgeplan integration

If the `forgeplan` CLI is on `$PATH`, this skill writes the draft directly as a forgeplan artifact:

```bash
forgeplan new prd "<title>"
forgeplan_update id=PRD-NNN body=<markdown>
forgeplan validate PRD-NNN          # confirm MUST sections present
# Status stays draft — activation is later, after /refine + evidence
```

For Deep+ scope detected during interview (cross-system change, irreversible decision):

```bash
forgeplan route "<task>"            # confirms Deep depth
forgeplan reason PRD-NNN            # mandatory ADI for Deep — 3+ hypotheses
```

If a clear architectural decision surfaced during the interview — also create an ADR:

```bash
forgeplan new adr "<key decision>"
forgeplan link ADR-MMM PRD-NNN --relation informs
```

### Want this orchestrated for you?

If you want the draft + automatic build, use [`/autorun "<idea>"`](../autorun/SKILL.md) — it shapes (`/shape` flow internally), routes, builds, audits, activates. Use `/shape` directly when you want to **understand** the idea before committing to build.

---

## Anti-patterns

- ❌ **Asking 5 questions at once.** Defeats the interview pattern. One question per turn.
- ❌ **Writing the PRD before the interview is done.** Premature draft = premature commitment.
- ❌ **Accepting "for everyone" as a target user.** Push back with a concrete counter-example.
- ❌ **Skipping the "what's NOT in scope" question.** Non-goals are 50% of a useful PRD.
- ❌ **Writing FRs in the draft.** That's `/refine` work — `/shape` captures problem + goal + scope.
- ❌ **Letting the interview run past 15 questions.** Wrap up and hand off to `/refine`.
- ❌ **Direct `Edit`/`Write` on `.forgeplan/prds/*.md`.** Use `forgeplan_update` — direct edits desync the LanceDB index. (See `plugins/fpl-skills/skills/bootstrap/resources/guides/FORGEPLAN-SETUP.md`.)

---

## Related

- [`/refine`](../refine/SKILL.md) — polish a draft you already wrote (or that `/shape` produced).
- [`/research`](../research/SKILL.md) — gap analysis on a specific question raised during shaping.
- [`/rfc`](../rfc/SKILL.md) — formalise the refined plan as an RFC.
- [`/autorun`](../autorun/SKILL.md) — full automation if you don't want to interview.
- [`/forge-cycle`](../../../forgeplan-workflow/commands/forge-cycle.md) — orchestrated lifecycle from task to commit.
