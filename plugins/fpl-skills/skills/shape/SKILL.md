---
name: shape
description: Interview-from-scratch skill that turns a raw idea into a structured PRD draft. Asks one focused question at a time, sharpens the problem statement and goals, surfaces target users and constraints, and writes the result as a forgeplan PRD draft via **MCP-first** path (`mcp__forgeplan__forgeplan_new` + `forgeplan_update` + `forgeplan_validate`) with CLI fallback when MCP is not connected, or plain markdown when neither is available. Pairs with `/refine` (which polishes an existing plan) — `/shape` creates the plan from a fuzzy idea. Triggers (EN/RU) — "shape this idea", "I have an idea", "help me think this through", "от идеи к PRD", "продумать фичу", "оформить идею", "/shape".
disable-model-invocation: true
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

#### 3a. Probe MCP availability (one call)

```python
# True if the forgeplan MCP server is wired in this session
have_mcp = "mcp__forgeplan__forgeplan_new" in available_tools
```

If `have_mcp` is unclear, attempt `mcp__forgeplan__forgeplan_health()`. Connection error → `have_mcp = False`, proceed to the CLI fallback (3c), never silently skip.

#### 3b. MCP-first flow (`have_mcp = True`)

```python
# Create the PRD draft
prd = mcp__forgeplan__forgeplan_new(
    kind="prd",
    title="<title from interview>"
)
PRD_ID = prd["id"]   # e.g. "PRD-NNN"

# Fill body with content collected during interview
mcp__forgeplan__forgeplan_update(
    id=PRD_ID,
    body="<full markdown body — problem, goals, target users, MVP scope, risks, constraints>"
)

# Confirm MUST sections present
mcp__forgeplan__forgeplan_validate(id=PRD_ID)
```

The MCP response carries `_next_action` hints — relay them to the user verbatim.

#### 3c. CLI fallback (`have_mcp = False`, but `forgeplan` is on `$PATH`)

```bash
forgeplan new prd "<title from interview>"        # capture PRD-NNN from output
forgeplan update id=PRD-NNN body="<full markdown body>"
forgeplan validate PRD-NNN
```

#### 3d. Plain markdown fallback (no MCP, no forgeplan CLI)

```bash
mkdir -p docs/ideas
$EDITOR docs/ideas/<slug>.md   # write the draft here — user migrates later
```

Tell the user explicitly which path was used: `Tool path: MCP` / `Tool path: CLI fallback (MCP not connected)` / `Tool path: markdown fallback (no forgeplan)`.

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

This skill is **forgeplan-aware** with hybrid MCP/CLI dispatch per PRD-022. The interview always ends with a structured artifact — `/shape` never leaves the user with raw markdown when forgeplan is reachable.

**MCP-first path** (`have_mcp = True`):

```python
# Mutating operations on MCP — drafts the PRD inside the artifact graph
prd = mcp__forgeplan__forgeplan_new(kind="prd", title="<title>")
mcp__forgeplan__forgeplan_update(id=prd["id"], body="<markdown>")
mcp__forgeplan__forgeplan_validate(id=prd["id"])
# Status stays draft — activation is later, after /refine + evidence

# Deep+ scope detected during interview (cross-system, irreversible)
route = mcp__forgeplan__forgeplan_route(task="<scope summary>")
if route["depth"] in ("deep", "critical"):
    mcp__forgeplan__forgeplan_reason(id=prd["id"])   # mandatory ADI — 3+ hypotheses

# Architectural decision surfaced during interview
if adr_warranted:
    adr = mcp__forgeplan__forgeplan_new(kind="adr", title="<key decision>")
    mcp__forgeplan__forgeplan_link(source=adr["id"], target=prd["id"], relation="informs")
```

**CLI fallback** (`have_mcp = False`, `forgeplan` on `$PATH`):

```bash
forgeplan new prd "<title>"
forgeplan update id=PRD-NNN body="<markdown>"
forgeplan validate PRD-NNN

# Deep+ scope
forgeplan route "<task>"
forgeplan reason PRD-NNN

# ADR
forgeplan new adr "<key decision>"
forgeplan link ADR-MMM PRD-NNN --relation informs
```

**No-forgeplan environment**: tell the user "forgeplan not detected — wrote draft to `docs/ideas/<slug>.md`. Migrate later with `forgeplan import <path>`."

The `Tool path:` line in the hand-off (Step 4) MUST reflect which branch ran.

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
