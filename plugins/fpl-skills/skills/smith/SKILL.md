---
name: smith
description: |
  Master-orchestrator entry-point. Reads project state (forgeplan_health, memory_recall, git), classifies context (1 of 12: greenfield / brownfield / feature / bug-fix / refactor / decision / audit / discovery / tech-debt / incident), applies methodology routing matrix, returns a structured Plan and recommends specialist-agent dispatches. Calls the `smith` agent for the planning + the routing-map.md for the brain. Default behaviour: status + recommend next step. Sub-modes via args: `bootstrap` (greenfield onboarding), `plan <task>` (per-task plan), `routing` (educational walkthrough), `status` (current state only).

  Triggers: "smith", "/smith", "кузнец", "что дальше", "куда идём", "возьми управление", "scrum master", "master orchestrator", "captain mode", "оркеструй", "take charge"
---

# /smith — master orchestrator entry-point

`/smith` is the **strategic entry-point** for the ForgePlan ecosystem. When invoked, it inspects
the current project state (forgeplan artifacts, hindsight memory, git tree), classifies the
situation against the **12-context routing matrix**, and returns a structured **Plan** that names
which specialist agents to dispatch in which order, with which methodology backing each step.

This skill is **strategic, not executional**: smith picks the route; the orchestrator walks it.
The Plan returned by smith is consumed by the main session (or `/autorun`), which dispatches the
named agents one at a time and gates each step. Smith never writes source files, never mutates
forgeplan artifacts, and never dispatches more than one agent at a time without explicit user
confirmation. It is the ForgePlan analogue of the **BMAD Master** pattern — same role as the
master persona in [bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD),
adapted to the ForgePlan artefact vocabulary (PRD / RFC / ADR / EVID) and dispatch surface
(named subagents instead of personas).

Foundation: EPIC-002 «Smith master-orchestrator + routing matrix» — Wave 1 (agent body + routing
map + sections + templates), Wave 2 (this entry-point skill + sub-skills).

---

## When to invoke

- At **session start** when the user is unsure what to do next — "что дальше?", "where are we?",
  "what's on the plate?".
- On a **fresh repo** (no `CLAUDE.md`, no `.git`, no `forgeplan` init) — `/smith` auto-routes to
  greenfield bootstrap.
- When a task is **non-trivial** and methodology routing matters — feature build, refactor,
  architecture decision, security audit, performance audit, live incident, tech-debt sprint.
- When existing `/forge-cycle` or `/autorun` **doesn't fit** the situation — e.g. a bug-fix
  workflow (RIPER-5 + 5 Whys) that the canonical Build-pipeline isn't shaped for, or an incident
  where ICS is the right primary methodology, not BMAD adversarial review.
- When the user **explicitly invokes** smith by name — "smith", "кузнец", "scrum master",
  "captain mode", "take charge", "оркеструй", "возьми управление".
- Before launching a **multi-sprint epic** where the team needs to agree on the methodology
  primary + dispatch order before any code is written.

Do NOT invoke `/smith` for:

- Tactical one-line fixes (typo, link rename) — just do them; smith is overhead for sub-Standard
  scope. The routing matrix Row 5 explicitly bypasses smith for trivial hotfixes.
- Executing a known dispatch — if you already know which agent to call (`adr-architect`,
  `specification`, `coder`), call it directly. Smith picks WHICH; it doesn't replace any.
- Activating an artifact — orchestrator + `guardian` agent only. Smith **never** calls
  `forgeplan_activate`.

---

## Modes (args routing)

`/smith` dispatches into one of six modes depending on the args supplied. Default (no args) is the
status-plus-recommend flow.

| Args | Mode | Sub-skill / agent | One-line behaviour |
|---|---|---|---|
| (none) | **default** | dispatches `smith` agent for status + recommend | reads forgeplan_health + git + memory; returns Plan |
| `status` | **status-only** | reads state, no recommendation | situation awareness without commitment to a route |
| `bootstrap` | **greenfield** | delegates to `/smith-bootstrap` skill | fresh repo — Spec Kit + BMAD onboarding walkthrough |
| `plan <task>` | **task-plan** | delegates to `/smith-plan` skill | per-task Plan from the routing-map for a named task |
| `routing` | **educational** | delegates to `/smith-routing` skill | "which methodology for X?" walkthrough — explains the row |
| `handoff` | **end-of-session** | renders `templates/smith-handoff.md` | summary back to the user before session close |

The default mode is **read-mostly**: smith reads state, classifies, and returns a Plan. The
orchestrator (or the user) then decides whether to execute the Plan, redirect smith to a
different row, or hand off to `/autorun`.

---

## Procedure (default mode)

When `/smith` is invoked without args, the main session runs this 8-step procedure. Steps that
involve MCP calls cite the exact tool name; the orchestrator is responsible for the calls.

### Step 1 — Detect context (greenfield vs brownfield vs existing work)

Probe the project filesystem and forgeplan workspace:

```bash
ls -la                                            # presence of CLAUDE.md, AGENTS.md, .git, .forgeplan
git status --short                                # uncommitted changes
git log --oneline -10                             # recent commit signal
```

And via MCP:

```
mcp__forgeplan__forgeplan_health()
mcp__forgeplan__forgeplan_list(status="active")
mcp__forgeplan__forgeplan_blocked()
mcp__forgeplan__forgeplan_stale()
```

Record:

- `is_greenfield`: no `CLAUDE.md` AND no `.forgeplan/` AND no `.git/` (or empty git history)
- `is_brownfield`: existing `.git/` with non-trivial history AND no `CLAUDE.md` / no `forgeplan` init
- `has_active_artifacts`: `forgeplan_health` returns ≥1 active PRD/RFC/ADR
- `has_blocked_artifacts`: `forgeplan_blocked` returns ≥1 entry
- `has_stale_drafts`: `forgeplan_stale` returns ≥1 entry

### Step 2 — Auto-route to bootstrap if greenfield

If Step 1 detects `is_greenfield = true`, **delegate to `/smith-bootstrap` skill** (sibling Wave 2
deliverable) and stop. The bootstrap skill walks the user through CLAUDE.md scaffolding, AGENTS.md
shim, `forgeplan init`, first PRD, and the BMAD analyst → PM → architect chain. Return its output
to the user.

Skip Steps 3-8 in this branch.

### Step 3 — Recall hindsight memory

If Hindsight MCP is wired in this project (`.mcp.json` contains `mcpServers.hindsight`), recall
the project context:

```
mcp__plugin_fpl-hsmem_hindsight__memory_recall(query="project context")
mcp__plugin_fpl-hsmem_hindsight__memory_status()
```

Memory recall surfaces cross-session knowledge that forgeplan artifacts don't carry (recent
decisions made in chat, user preferences specific to this project, lessons from prior sprints).
Pass the recalled snippets to smith in Step 4 as additional context.

If Hindsight is NOT wired, skip — smith will work from forgeplan state alone.

### Step 4 — Dispatch the `smith` agent

Dispatch the smith agent (lives in `plugins/agents-pro/agents/smith.md`) with the gathered state:

```
Task(subagent_type="agents-pro:smith",
     prompt="""
       Project state snapshot:
       - forgeplan_health: <output of Step 1 MCP call>
       - active artifacts: <list IDs and titles>
       - blocked: <list>
       - stale drafts: <list>
       - hindsight recall: <snippets from Step 3, or 'none'>
       - git: branch=<name>, uncommitted=<count>, recent_commits=<count>
       - user intent (verbatim): <what the user actually typed; may be empty>

       Read routing-map.md, classify the context against the 12-row matrix,
       and return a Plan using templates/smith-plan.md.
     """)
```

The smith agent reads the **routing map** (`plugins/fpl-skills/skills/smith/routing-map.md`),
optionally pulls one **section file** (`sections/01-greenfield.md` through `12-incident.md`) if
the chosen row needs a deeper playbook, and applies the matrix.

### Step 5 — Smith agent applies routing matrix → returns Plan markdown

The smith agent picks **exactly one row** from the 12-context matrix (no blending — see Hard
Rules below) and returns a Plan markdown that fills out `templates/smith-plan.md`:

- **Context-type** (1 of 12)
- **Methodology-primary** + **Methodology-secondary**
- **Dispatch sequence** (numbered list of agent dispatches in execution order)
- **Evidence requirements** (parseable checklist for the guardian gate)
- **Risks + reversibility** (what would force a re-route)

If the chosen row is **ambiguous** (e.g. greenfield service inside a legacy monolith), smith picks
the row whose **risk profile is higher** (brownfield > greenfield, audit > feature) and explicitly
notes the deviation in the Plan's «Notes» section. The single-row rule prevents methodology
cocktails.

### Step 6 — Render Plan using `templates/smith-plan.md`

The orchestrator receives the smith agent's Plan markdown and verifies it matches the template's
8 mandatory sections (Context, Methodology routing decision, Dispatch sequence, Evidence
requirements, Risks, Reversibility, Notes, Hand-off). If any section is missing, re-dispatch smith
with an explicit "fill section X" instruction. Do not patch the Plan manually — smith owns the
output shape.

### Step 7 — Present Plan to user with confirm/redirect options

The orchestrator shows the user the Plan and asks one of three questions:

1. **Confirm**: «Run this Plan? (yes/no/redirect)»
2. **Redirect**: if the user disagrees with the row choice, ask which row they think applies
   instead, and re-dispatch smith with the override.
3. **Defer**: if the user wants to read the Plan but not act on it yet, save it as a NOTE
   artifact via `forgeplan_new(kind="note", title="Plan: <task title>")` and exit — the Plan
   remains available for a later session.

Smith itself does NOT call `forgeplan_new`; the orchestrator does, post-confirmation.

### Step 8 — Dispatch the first agent if user confirms

On user confirmation, the orchestrator (NOT smith) dispatches the **first agent** from the Plan's
Dispatch sequence:

```
Task(subagent_type="<first agent from Plan>",
     prompt="<Plan-derived prompt — sufficient context to execute step 1>")
```

After each dispatch, the orchestrator pauses and asks the user whether to continue with the next
agent in the Plan. The default is «ask after each step»; the user can override to «run all» if
they trust the Plan and want autonomous execution. **Smith does not dispatch via the Agent tool
itself** — the main session does. Smith is read-mostly.

---

## Procedure (status mode)

When invoked as `/smith status`, the main session runs a shorter 5-step procedure that surfaces
state without committing to a route. Use this when the user wants situation awareness only.

1. **Snapshot forgeplan**: `forgeplan_health()` + `forgeplan_list(status="active")` +
   `forgeplan_blocked()` + `forgeplan_stale()`.
2. **Snapshot git**: branch, uncommitted file count, last 5 commits.
3. **Snapshot memory** (if Hindsight wired): `memory_status()` + recent retains via
   `memory_recall("recent decisions")`.
4. **Render summary** as a 1-page markdown table: artifact counts by status, blocked + stale
   lists, git branch + delta, memory bank id + size.
5. **Return to user** without dispatching smith or any other agent. No Plan, no recommendation,
   just facts. The user reads and decides whether to follow up with default `/smith` or a
   specific sub-mode.

---

## When to delegate vs do directly

`/smith` is a router; most invocations should end with a delegation, not a direct answer. Use this
table to decide:

| Situation | What `/smith` does |
|---|---|
| Greenfield repo (no `CLAUDE.md`) | Auto-delegate to `/smith-bootstrap` (Step 2 above) |
| User explicitly named a task | If user supplied a task — delegate to `/smith-plan <task>`. If not — default mode (Steps 3-8) |
| Vague «what to do» | Default mode — full Steps 1-8, return Plan |
| Educational «explain methodology X» | Delegate to `/smith-routing` with the methodology name as arg |
| User wants snapshot only | `/smith status` — status mode (5 steps, no Plan) |
| User wants session-close summary | `/smith handoff` — render `templates/smith-handoff.md` |
| Single-task in-flight, blocked on decision | Default mode — Plan will surface the blocker + recommend the gating agent (usually `adr-architect` for an ADR or `research-analyst` for context) |
| Live production incident | Default mode auto-routes to Row 12 (incident) — Plan dispatches `error-detective` + `debugger` + `platform-engineer` (infra read-only) BEFORE any post-mortem agent |

---

## Hard rules

These rules are absolute. Violations are CONCERNS at the next Profile B review.

1. **Never write source files.** Smith renders markdown Plans only. The `disallowedTools` on the
   smith agent (Wave 1A: `Write`, `Edit`, `NotebookEdit`) enforce this; the skill must not
   shell out to file writes either.
2. **Never dispatch more than one agent at a time without explicit user confirmation.** The
   default in Step 8 is «ask after each step». The user can opt into «run all» but must do so
   explicitly. Auto-dispatch of a multi-step chain without checkpoints is the failure mode that
   makes orchestrators feel out-of-control.
3. **Never activate forgeplan artifacts directly.** Smith recommends; the orchestrator (or
   `guardian` gate) does the `forgeplan_activate` call. Smith's denylist includes
   `forgeplan_activate` precisely so this rule cannot be circumvented even by accident.
4. **Always cite the routing-map row + methodology when explaining a Plan.** The user must be
   able to read the Plan and trace back to the row — «picked Row 4 (bug-fix-prod) because the
   task has `production` + `non-trivial` signals, primary methodology RIPER-5». Citation is
   structural, not optional.
5. **When no Plan-Mode args given, ALWAYS produce default mode output.** A bare `/smith` MUST
   run Steps 1-8 and return a Plan (or auto-route to bootstrap if greenfield). Replying with
   «hello, what can I do for you?» is a failure — the user already invoked smith; smith owes
   them a Plan.
6. **Smith is read-mostly: if the user wants action, smith says «dispatching X agent» and the
   main session does the dispatch.** Smith never calls `Task(subagent_type=...)` itself. The
   smith agent's job is to write the Plan; the dispatch happens in the orchestrator turn after
   smith returns.
7. **No methodology blending.** Pick exactly one row. If the situation truly sits between two
   rows, pick the higher-risk row and note the deviation. Mixing BMAD + SPARC + Spec Kit «to
   cover all bases» produces artefacts that fit none of them and forces the team to invent
   review checklists from scratch — see `routing-map.md` «How to read this map».
8. **Tactical work bypasses smith entirely.** Trivial fixes (Row 5 of the matrix) must NOT go
   through smith — process overhead exceeds the fix cost. Smith should explicitly tell the user
   «this is tactical, just do it» when the signal matches Row 5, then exit without a Plan.

---

## Integration points

- **`plugins/agents-pro/agents/smith.md`** — the smith agent invoked in default mode Step 4.
  Profile B-orchestrator. Reads the routing map, classifies, returns the Plan.
- **`plugins/fpl-skills/skills/smith/routing-map.md`** — the smith **brain**. 12 contexts, 25
  methodology cards, 26-agent index. Loaded by the smith agent on every dispatch.
- **`plugins/fpl-skills/skills/smith/sections/`** — agentic-RAG section files
  (`01-greenfield.md` through `12-incident.md`). Loaded by the smith agent on demand when the
  chosen row needs deeper playbook guidance (e.g. failure-mode recovery hints).
- **`plugins/fpl-skills/templates/smith-plan.md`** — output template (≤500 lines, 8 mandatory
  sections). Smith fills this; orchestrator verifies completeness in Step 6.
- **Sibling sub-skills** (Wave 2):
  - `/smith-bootstrap` — greenfield onboarding walkthrough.
  - `/smith-plan` — per-task Plan generator (called by `/smith plan <task>`).
  - `/smith-routing` — educational walkthrough of the routing matrix.
- **Related orchestration skills**:
  - `/forge-cycle` (in `forgeplan-workflow`) — reactive enforcer; runs ONE task through the
    9-phase pipeline. Smith picks WHICH task; `/forge-cycle` executes it.
  - `/autorun` — autonomous long-running loop; on cold start, should dispatch `/smith` first to
    get a Plan, then walk the Plan task-by-task.
  - `/forge-progress` — real-time visibility into in-flight forgeplan work; orthogonal to smith.
  - `/methodology-check <ID>` — pre-activation 4-layer coverage report; orthogonal to smith
    (smith routes; methodology-check audits one artifact).

---

## Example invocations

### Example 1 — vague «what next»

```
User: что делать дальше?
/smith
→ Default mode. Steps 1-8 run.
→ forgeplan_health: 8 active PRDs, 1 blocked (PRD-049 waits on forgeplan#325), 2 stale drafts.
→ Hindsight recall: «last session closed Sprint W (LR-8 lint rule)».
→ smith agent picks Row 11 (tech-debt) — 2 stale drafts + 1 blocked artifact signal cleanup.
→ Plan returned: dispatch sequence (code-analyzer → research-analyst → architect-reviewer →
  adr-architect → goal-planner → coder → tester → guardian). Evidence: A3 NOTE + ADR-supersede
  for stale drafts.
→ Orchestrator presents Plan to user with «confirm / redirect / defer» options.
```

### Example 2 — explicit bootstrap

```
User: /smith bootstrap
→ Args=bootstrap. Default mode skipped.
→ Delegate to /smith-bootstrap skill (sibling Wave 2).
→ /smith-bootstrap walks user through CLAUDE.md scaffold, AGENTS.md shim, `forgeplan init`,
  first PRD via brief-intake agent.
→ Smith returns control to user after first-PRD created.
```

### Example 3 — brownfield trigger phrase

```
User: smith, мы тут с легаси, помоги разобраться.
/smith
→ Default mode. Steps 1-8 run.
→ Step 1 detects: .git/ with 5y history + no CLAUDE.md + no .forgeplan/ → is_brownfield=true.
→ smith agent picks Row 2 (brownfield modernisation) — primary methodology Strangler Fig + DDD
  + ACL.
→ Plan returned: dispatch sequence starts with `discover` agent (7-phase MCP brownfield
  protocol from forgeplan-brownfield-pack), then ddd-domain-expert, then adr-architect.
→ User confirms; orchestrator dispatches `discover` as the first step.
```

### Example 4 — educational walkthrough

```
User: /smith routing для bug fix
→ Args=routing. Default mode skipped.
→ Delegate to /smith-routing skill with context=bug-fix.
→ /smith-routing explains: Row 4 (non-trivial production bug, RIPER-5 + 5 Whys + blameless
  post-mortem) vs Row 5 (trivial hotfix, tactical fast-path). Walks user through how to tell
  which applies and what each dispatch sequence looks like.
→ No Plan generated; this is educational only.
```

---

## References

- **`routing-map.md`** (in this skill folder) — the 12-context routing matrix + 25 methodology
  cards + 26-agent index.
- **`smith` agent** — `plugins/agents-pro/agents/smith.md`. Profile B-orchestrator. Reads the
  routing map and produces the Plan.
- **BMAD-METHOD** — [github.com/bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD).
  Smith is the ForgePlan analogue of the BMAD Master persona.
- **EPIC-002** — «Smith master-orchestrator + routing matrix» (forgeplan artifact, created
  during Wave 1; ID assigned post-Wave-2 sync).
- **AGENT-AUTHORING-GUIDE.md** — `plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md` Profile
  B-orchestrator section. Canonical reference for the denylist + dispatch contract that smith
  follows.
- **CLAUDE.md** (repo root) — 4-Layer Pipeline (S10→S13) and BMAD adversarial review discipline
  cited by every methodology row in the routing map.
- **Sibling skills**: `/smith-bootstrap`, `/smith-plan`, `/smith-routing` (Wave 2 deliverables).
