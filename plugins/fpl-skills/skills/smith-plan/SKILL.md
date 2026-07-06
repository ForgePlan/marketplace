---
name: smith-plan
description: |
  Task-planning skill. Takes a SPECIFIC TASK as input (e.g., "refactor auth module", "ship payment service", "audit security of API gateway"), classifies it into one of 14 routing-map contexts, applies the matching methodology, and renders a structured Plan using templates/smith-plan.md. Dispatches the `smith` agent for routing decisions, returns a Plan markdown ready for orchestrator hand-off. Optionally creates a NOTE artifact to persist the Plan via forgeplan.

  Triggers: "smith plan", "/smith-plan", "спланируй задачу", "plan this task", "how should we approach", "как подойти к задаче"
origin: forgeplan
---

# /smith-plan — per-task structured plan

You take ONE specific task from the user, classify it into the canonical 14-context routing map, dispatch the `smith` agent for a routing recommendation, and render an 8-section Plan via `templates/smith-plan.md`. The Plan is a **hand-off artifact** — it names which agents to dispatch in which order, what evidence each must produce, what risks to mitigate, and how to back out.

`/smith-plan` is the **per-task entrypoint** of the smith family. Where `/smith` is the default conversational mode and `/smith-bootstrap` is the session-start "where are we" report, `/smith-plan` answers "I know the task — give me the playbook". Read-mostly: the skill produces a markdown Plan and, on user confirmation, may ask the orchestrator to persist it as a NOTE artifact. `/smith-plan` does NOT dispatch the planned agents — it recommends, the orchestrator dispatches.

Foundation: EPIC-002 (smith master-orchestrator) + CLAUDE.md «4-layer pipeline S10→S13». Routing brain: `plugins/fpl-skills/skills/smith/routing-map.md` (14 rows). Output format: `plugins/fpl-skills/templates/smith-plan.md`.

---

## When to invoke

- **User has a specific task in mind** — "refactor the auth module", "audit our API gateway for OWASP issues", "fix the checkout race condition", "ship a fresh billing microservice". The task is named, the playbook is not.
- **Task is non-trivial (Standard+ depth)** — Tactical-level fixes (one-line typos, README polish) skip `/smith-plan` and go straight to `coder` + `code-reviewer`. `/smith-plan`'s overhead only pays off when ≥3 dispatches are likely.
- **Multiple methodologies plausibly apply** — user wants the routing reasoning recorded, not just an answer. E.g., "is this RIPER-5 or just `/forge-cycle`?" → run `/smith-plan` to get the rationale written down.
- **Before invoking `/forge-cycle`** — `/smith-plan` chooses the methodology; `/forge-cycle` enforces it. Running them in this order is cheap insurance against the methodology being wrong.
- **Before dispatching `smith` in `/autorun`** — autonomous loops should call `/smith-plan` to lock in the dispatch sequence before burning sub-agent budget.

Do NOT invoke `/smith-plan` for:

- Tactical fixes (row 5 of routing-map) — process overhead exceeds the work.
- A session-start "where are we" report — that is `/smith-bootstrap` territory.
- A standing routing question without a concrete task — that is `/smith-routing` or a direct routing-map.md read.
- Activating or executing the Plan — that is the orchestrator's job after `/smith-plan` returns.

---

## Input contract

The user (or the orchestrator that invokes the skill) MUST provide:

1. **A task description** (1–3 sentences). Verbs are load-bearing: "refactor", "audit", "fix", "ship", "migrate", "discover", "decide between X and Y". The classifier extracts the verb + object + qualifier.

The user MAY additionally provide:

2. **Additional context** — constraints ("must ship by EOQ", "no downtime"), stakeholders ("payments team owns this surface"), affected artifacts ("supersedes ADR-005").
3. **A preferred methodology** — if the user has a hunch ("I think this is a BMAD job"), record it as the *initial hypothesis* but verify against routing-map before committing.

If the task description is missing or fewer than 5 words, do not guess: ask 3 clarifying questions (see Failure modes).

---

## Procedure

### Step 1 — Parse the task description

Extract three tokens:

- **Verb** — the main action: refactor / audit / fix / ship / migrate / build / decide / discover / cleanup.
- **Object** — the thing being acted on: auth module / API gateway / payment service / etc.
- **Qualifier** — severity, scope, or constraint: production / typo / legacy / new / from scratch / under outage / etc.

Record these in a 3-line block before doing anything else. Verbs are the primary classifier signal in Step 3.

### Step 2 — Read project state

```python
health    = forgeplan_health()
artifacts = forgeplan_list()           # all kinds, recent first
mem       = memory_recall("project context + relevant task background")
```

Plus a one-line git check:

```bash
git status --short && git log -3 --oneline
```

You need three signals from this state:

- Is there an active PRD/RFC pipeline already in motion? → favours `feature` over `greenfield`.
- Are there draft artifacts or blocked items that overlap with the task? → may change the dispatch sequence.
- Does Hindsight remember a previous attempt at the same task? → cite it in the Plan's Context section.

### Step 3 — Classify the task into 1 of 14 contexts

Apply the verb + state signals against the 14 rows of `routing-map.md`. Use the heuristics table below; pick **exactly one** row (smith's single-row rule from `routing-map.md`).

If two rows score equally → escalate via routing-decision (see Failure modes), do NOT guess.

### Step 4 — Read the methodology playbook

Once the context is picked, read the corresponding section file for the full methodology recipe:

```
plugins/fpl-skills/skills/smith/sections/NN-<context>.md
```

Where NN is the row number (01 greenfield, 02 brownfield, … 12 incident). The section file gives you the dispatch sequence, evidence requirements, and risks in detail. Rows 13 (TDD-first feature) and 14 (design-system → code) do not yet have a dedicated section file — read the full row in `routing-map.md` directly instead.

### Step 5 — Dispatch the `smith` agent

```
Task(subagent_type="agents-pro:smith",
     prompt="<task description>. Classified as context=<NN>-<name>. State snapshot: <one paragraph from Step 2>. Methodology playbook: sections/NN-<context>.md. Return a filled Plan per templates/smith-plan.md.")
```

`smith` is Profile B-orchestrator: it reads state, applies routing-map, produces the Plan markdown. It does NOT dispatch the recommended agents and does NOT mutate forgeplan state (its denylist enforces this).

### Step 6 — Receive smith's response

smith returns:

- A filled `smith-plan.md` template (8 sections: header table / context / methodology routing decision / dispatch sequence / evidence requirements / risks / reversibility / hand-off).
- Optionally, a NEED_USER_INPUT sentinel if smith found genuine ambiguity that requires the human to break.
- Optionally, a routing-decision artifact if smith found 2+ contexts equally applicable.

### Step 7 — Render the Plan to the user

Output smith's filled template verbatim, plus a one-paragraph orchestrator-friendly preamble:

> «Classified task as **<NN>-<context>**. Primary methodology: **<name>** (`routing-map.md` row <NN>). Dispatch sequence has **<N>** steps; first agent: **<agent-name>**. Read the Plan below, then confirm to dispatch or revise.»

### Step 8 — Present + offer hand-off

After the rendered Plan, output the hand-off block:

> **Smith plan complete. Recommended first dispatch: `<plugin>:<agent-name>` (Profile <X>). Run `Task(subagent_type="...", prompt="...")` or say "yes" to dispatch.**

If the user confirms persistence ("save this as a NOTE"), the skill emits a recommendation to the orchestrator (NOT a direct call):

> **Persist this Plan?** Run: `forgeplan_new(kind="note", title="Smith plan: <task>", body=<Plan markdown>)` then `forgeplan_link(NOTE-NNN, <parent-artifact-id>, relation="informs")`. `/smith-plan` is read-mostly — it asks the orchestrator to create artifacts; it does not call `forgeplan_new` itself.

---

## Classification heuristics

Verb + qualifier signals → routing-map row. Pick exactly one; if two tie, escalate (see Failure modes).

| Signal | Context (routing-map row) |
|---|---|
| "from scratch" + no `.git` history / fresh repo | **01 greenfield** |
| "new project" / "bootstrap" / "ship a new service" (no existing system) | **01 greenfield** |
| "migrate legacy" / "modernise the monolith" / existing undocumented codebase | **02 brownfield** |
| "we just took over this repo" / "discover the existing system" | **02 brownfield** |
| "add feature X" / "new endpoint" + active PRD pipeline OR mature service | **03 feature** |
| "ship a feature" (existing service context) | **03 feature** |
| "fix bug" + Severity P0/P1 / "production bug" / "race condition" | **04 bug-fix-prod** |
| "fix typo" / "broken link" / "off-by-one" / "trivial" | **05 bug-fix-trivial** |
| "refactor X" / "clean up the code" / no behaviour change intended | **06 refactor** |
| "should we use X or Y" / "architectural choice" / "we need to decide" | **07 adr-decision** |
| "security audit" / "OWASP" / "STRIDE" / "secure this surface" | **08 security-audit** |
| "perf regression" / "slow" / "latency spike" / "DORA review" | **09 perf-audit** |
| "user research" / "discovery" / "JTBD" / "what should we build" | **10 pdlc-discovery** |
| "tech debt" / "cleanup sprint" / "pay down debt" / "DORA stability" | **11 tech-debt** |
| "outage" / "production down" / "live incident" / "SEV-1" | **12 incident** |

**Tie-breakers** (when two rows score equally):

- "refactor while migrating" → 06 (refactor) wins if behaviour-preserving; 02 (brownfield) wins if seams + new bounded contexts emerge. If genuinely both → decompose via `goal-planner` first (see Failure modes).
- "bug in greenfield project" → 04 or 05 by severity, NOT 01 (greenfield is "first ever code"; if code exists, the bug rules win).
- "audit + fix" → 08/09 wins for the audit phase; the fix phase reruns `/smith-plan` for a new context (often 06 refactor or 03 feature).
- Higher-risk row always wins on tie (e.g. 02 brownfield > 01 greenfield; 08 security > 03 feature). Same single-row rule as `smith` agent's `routing-map.md`.

---

## Output contract

After Step 7, the user sees:

1. **A markdown Plan** rendered via `plugins/fpl-skills/templates/smith-plan.md`. Eight sections, all present:
   - Header table (Status / Date / Context-type / Methodology-primary / Methodology-secondary)
   - `## Context`
   - `## Methodology routing decision` (with "Why this row applies" rationale — MANDATORY)
   - `## Dispatch sequence` (numbered agents with Profile + Produces + Why-this-position)
   - `## Evidence requirements` (parseable checklist for orchestrator's gate loop)
   - `## Risks` (each with a mitigation)
   - `## Reversibility` (point-of-no-return + rollback artifact + escape hatch)
   - `## Hand-off back to orchestrator`

2. **A recommended next action** — typically: dispatch the first agent in the Dispatch sequence. Quoted explicit `Task(subagent_type=...)` line so the user/orchestrator can run it directly.

3. **An optional "Persist as NOTE artifact?" prompt** — if the user confirms, the skill returns the exact `forgeplan_new` + `forgeplan_link` commands for the orchestrator to execute.

The Plan markdown is the **load-bearing artifact**; the orchestrator reads it to drive subsequent dispatches and marks `[x]` on the Evidence requirements checklist as each artifact lands. `guardian` reads the same checklist at the activation gate.

---

## Hand-off

The skill's last line of output (after the Plan + recommended next action) is the explicit hand-off block:

> **Smith plan complete. Recommended first dispatch: `<plugin>:<agent-name>` (Profile <X>). Run `Task(subagent_type="<plugin>:<agent-name>", prompt="<one-line goal>")` or say "yes" to dispatch.**

If the user says "yes", the orchestrator (NOT this skill) dispatches the agent. `/smith-plan` is read-mostly; it does not call `Task(...)` itself. The hand-off message exists so the user has a copy-paste-ready command and so `/autorun` can parse the recommendation programmatically.

If smith returned a `NEED_USER_INPUT` sentinel instead of a Plan, the skill propagates it verbatim — the orchestrator pauses for the human, the skill does not invent an answer.

---

## Hard rules

1. **Never dispatch agents from the Plan directly.** The skill recommends; the orchestrator (or the human running the orchestrator) dispatches. This separation enforces ML-12 (ADI before action) and preserves smith's read-mostly contract.
2. **Never invent agents not in the marketplace.** Every agent named in the Plan MUST appear in `routing-map.md`'s Agent index (the 25-row table). If the routing-map says `agents-pro:adr-architect`, write that — do NOT shorten to "architect" or invent "design-expert".
3. **When the task is ambiguous (2+ contexts plausible) — produce a routing-decision artifact, do NOT guess.** Use `plugins/fpl-skills/templates/routing-decision.md` and return that instead of a Plan. The user breaks the tie.
4. **Always cite the routing-map row by number.** The Plan's `## Methodology routing decision` section MUST include a line like «Picked from `routing-map.md` row **<NN>** — <context-name>». Without the citation, the methodology choice is unverifiable.
5. **The "Why this methodology" rationale section is MANDATORY** in the Plan — not optional. One sentence linking task signals to the row's selection criteria. Skipping it makes the Plan look like a vending-machine output and erodes orchestrator trust.
6. **Tactical-depth tasks (row 05) bypass `/smith-plan`.** If classification lands on row 05, the skill should output a one-line «This is a Tactical fix — dispatch `agents-core:coder` directly, then `agents-core:code-reviewer`. No Plan needed.» and stop. Do not render the full template for sub-Standard scope.
7. **Read-mostly contract** — the skill MUST NOT call `forgeplan_new`, `forgeplan_update`, `forgeplan_link`, or `forgeplan_activate`. Persistence is recommended-to-orchestrator only.

---

## Failure modes

| Failure mode | Response |
|---|---|
| **Task description too vague** (<5 words OR no verb extractable) | Stop. Ask 3 clarifying questions: (1) What is the main action — refactor, ship, fix, audit, decide? (2) Which artifact / surface / module is affected? (3) Is this production-critical / has a deadline / depends on a specific outcome? Do NOT guess. |
| **Two contexts equally apply** | Do NOT pick one arbitrarily. Produce a routing-decision artifact via `plugins/fpl-skills/templates/routing-decision.md` listing both contexts as M1/M2, optionally M3 = «lightweight default». Return the routing-decision to the user for tie-breaking. Re-run `/smith-plan` after decision lands. |
| **Task spans 2+ contexts** (e.g., "refactor the auth module while migrating to OAuth2") | Decompose first. Recommend dispatching `agents-pro:goal-planner` to split the task into sub-tasks, then re-run `/smith-plan` per sub-task. Do NOT try to render a single multi-context Plan — that violates the single-row rule. |
| **smith agent returns NEED_USER_INPUT sentinel** | Propagate verbatim. Do NOT invent an answer on smith's behalf. The user (or orchestrator at next user-turn) breaks the ambiguity, then re-invokes `/smith-plan`. |
| **Required state-read tool unavailable** (`forgeplan_health` errors, `memory_recall` empty, git repo missing) | Degrade gracefully: note in the Plan's Context section what could not be read, continue with the rest. If ALL three state signals fail → ask the user to confirm the task is even in a forgeplan-aware repo before continuing. |

---

## Examples

### Example A — Refactor

**User**: «Refactor the auth module to use OAuth2 instead of session cookies.»

- **Verb/Object/Qualifier**: refactor / auth module / no behaviour change at the API surface.
- **Context (Step 3)**: row **06 refactor** — "refactor X" + no behaviour change.
- **Tie-breaker check**: not row 03 (no new feature being added), not row 02 (no legacy migration spanning multiple bounded contexts), not row 07 (the OAuth2 choice is downstream of the refactor framing).
- **Primary methodology**: Branch-by-Abstraction + Mikado Method (per row 06).
- **Secondary**: DDD bounded-context check + Clean Architecture layering.
- **Dispatch sequence** (from routing-map row 06):
  1. `agents-pro:research-analyst` (A) — produces NOTE on OAuth2 vs OIDC vs session-cookie trade-offs.
  2. `agents-pro:code-analyzer` (C) — read-only complexity + coupling baseline of auth module.
  3. `agents-pro:architect-reviewer` (B) — pre-refactor architectural fitness check.
  4. `agents-pro:adr-architect` (A) — full ADR (auth model decision; ≥3 modules → C4 L1+L2 auto-dispatched).
  5. `agents-pro:goal-planner` (A) — task DAG for the refactor.
  6. `agents-core:coder` (C-coder) — branch-by-abstraction implementation.
  7. `agents-pro:architect-reviewer` (B) — post-refactor architectural fitness check.
  8. `agents-core:tester` (B) — regression tests + EVID.
  9. `agents-pro:guardian` (B-gate) — final activation gate.

### Example B — Security audit

**User**: «Audit our API gateway for security issues before the Q3 release.»

- **Verb/Object/Qualifier**: audit / API gateway / pre-release deadline.
- **Context (Step 3)**: row **08 security-audit** — "security audit" + "OWASP" implicit.
- **Tie-breaker check**: not row 04 (no specific bug yet identified — this is preventive); not row 11 (debt sprint is broader than security).
- **Primary methodology**: OWASP Top 10 2025 + STRIDE threat modelling.
- **Secondary**: ASTRIDE (if the gateway has AI/LLM routes) + ADR for any mitigation that changes architecture.
- **Dispatch sequence** (from routing-map row 08):
  1. `agents-pro:research-analyst` (A) — produces NOTE on gateway surface inventory.
  2. `agents-pro:security-expert` (B) — STRIDE + OWASP Top 10 review; produces EVID with findings + PASS/CONCERNS/BLOCKER verdict.
  3. `agents-pro:injection-analyst` (B) — injection-class deep-dive (SQLi, command, prompt-injection).
  4. `agents-pro:pii-detector` (B) — PII exposure surfaces.
  5. `agents-pro:adr-architect` (A) — only if any finding requires an architectural mitigation.
  6. `agents-pro:guardian` (B-gate) — final gate; refuses activation if any reviewer returned BLOCKER.

### Example C — Greenfield ship

**User**: «Ship a fresh payment microservice from scratch — no existing code, picking the stack from zero.»

- **Verb/Object/Qualifier**: ship / payment microservice / from scratch + new project.
- **Context (Step 3)**: row **01 greenfield** — "from scratch" + no existing system.
- **Tie-breaker check**: not row 03 (no existing service to extend); not row 02 (no legacy to fight); not row 07 (the stack choice is *inside* the greenfield flow, not the framing question).
- **Primary methodology**: BMAD-METHOD (trimmed) + GitHub Spec Kit.
- **Secondary**: AGENTS.md scaffold + ADR/MADR + C4 L1+L2.
- **Dispatch sequence** (from routing-map row 01):
  1. `agents-pro:brief-intake` (A) — structured Brief NOTE from user interview.
  2. `agents-sparc:specification` (A) — PRD-shaped artifact.
  3. `agents-pro:adr-architect` (A) — initial stack ADR with ≥3 hypotheses + C4 L1+L2 (auto-dispatched).
  4. `agents-sparc:architecture` (A) — RFC-shaped artifact.
  5. `agents-pro:goal-planner` (A) — task DAG for build-out.
  6. `agents-core:coder` (C-coder) — implementation.
  7. `agents-core:tester` (B) — test coverage + EVID.
  8. `agents-pro:guardian` (B-gate) — activation gate.

---

## Integration

- `plugins/agents-pro/agents/smith.md` — the agent invoked for routing decisions (Step 5). Profile B-orchestrator; denies file-write + forgeplan mutations. Returns Plan markdown + optional sentinels.
- `plugins/fpl-skills/skills/smith/routing-map.md` — classification source (14 rows + 26-entry Agent index). The single source of truth for which methodology applies where.
- `plugins/fpl-skills/skills/smith/sections/NN-*.md` — per-context methodology playbooks. Read in Step 4 for the detailed recipe.
- `plugins/fpl-skills/templates/smith-plan.md` — output format. 8 sections, ≤500 lines.
- `plugins/fpl-skills/templates/routing-decision.md` — ambiguity escalation artifact when 2+ contexts apply.
- **Sibling skills**:
  - `/smith` — default conversational mode; the umbrella entrypoint that may itself dispatch `/smith-plan`.
  - `/smith-bootstrap` — session-start "where are we" report; can recommend `/smith-plan` for the next concrete task.
  - `/smith-routing` — pure routing-map lookup without producing a Plan; useful for "what methodology covers X" questions.
- **Downstream skills/agents that consume Plans**:
  - `/forge-cycle` — executes the Plan's dispatch sequence with full pipeline enforcement.
  - `/autorun` — autonomous loop that reads the Plan's evidence checklist as its gate.
  - `agents-pro:guardian` — reads the Evidence requirements checklist at the activation gate.

---

## References

- **EPIC-002** — smith master-orchestrator initiative. Wave 1 produced the routing-map + sections + smith agent + templates; Wave 2 (this skill is part of Wave 2-B3) produces the four entrypoint skills.
- **`routing-map.md`** — `plugins/fpl-skills/skills/smith/routing-map.md`. 14 contexts × 29 methodologies.
- **CLAUDE.md «4-Layer Pipeline (S10→S13)»** — methodology conveyor: FPF / BMAD / OpenSpec / Forgeplan + C4 architecture extension. Evidence requirements in the Plan derive from these layers.
- **CLAUDE.md «BMAD adversarial review discipline» + «FPF ADI discipline»** — define the EVID quality bar smith and `/smith-plan` enforce in Step 6.
- **`templates/smith-plan.md`** — the 8-section template the skill fills.
- **`templates/routing-decision.md`** — the mini-ADR template used on ambiguity.
- **ML-12 (mental model)** — ADI before action; do not dispatch sub-agents until investigation has survived empirical test. `/smith-plan` is the institutional embodiment of ML-12 at the per-task level.
- **BMAD-METHOD** — https://github.com/bmad-code-org/BMAD-METHOD (inspiration for smith's master-orchestrator role).
- **GitHub Spec Kit** — https://github.com/github/spec-kit (cited by row 01 greenfield).
- **SPARC** — https://github.com/ruvnet/sparc (cited by row 03 feature).
- **RIPER-5** — https://github.com/johnpeterman72/CursorRIPER (cited by row 04 bug-fix-prod).
