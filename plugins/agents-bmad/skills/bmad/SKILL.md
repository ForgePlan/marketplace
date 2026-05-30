---
name: bmad
description: |
  Entry point for the BMAD greenfield pipeline — the master-coordinated persona walk from a raw idea
  to a shipped, QA-verified feature (Analyst → PM → Architect → Scrum-Master → Dev → QA), the SECOND
  instance of the AD/AID-PDLC sub-cycle contract (ADR-010 / RFC-013). Dispatches the `bmad-orchestrator`
  master, which walks the personas as separate isolated-context agents with a blocking quality-gate
  between each, three mandatory independent C4 validations, and a fail-closed no-code-before-plan gate.
  EN: Run BMAD on a greenfield brief — idea → Brief → PRD → ADR+RFC → story RFCs → code → QA → ship.
  Use for a brand-new product/service, not a single feature in an existing system (that is SPARC) or
  brownfield modernisation (that is Strangler Fig).
  RU: Запусти BMAD на greenfield-бриф — идея → Brief → PRD → ADR+RFC → story RFC → код → QA → релиз.
  Для нового продукта/сервиса с нуля, не для одной фичи в существующей системе (это SPARC) и не для
  модернизации legacy (это Strangler Fig).
  Triggers: "bmad", "/bmad", "run bmad", "greenfield project", "new product from scratch", "idea to ship",
  "bmad pipeline", "запусти bmad", "greenfield с нуля", "от идеи до релиза", "новый продукт"
---

# /bmad — the greenfield persona walk (Analyst → PM → Architect → SM → Dev → QA)

`/bmad` runs the **BMAD methodology** as a master-coordinated sub-cycle: the `bmad-orchestrator` walks
the personas from a raw idea to a shipped feature, gating every handoff with an independent reviewer and
blocking any application-code write until the plan is done. It is the **second instance** of the
AD/AID-PDLC sub-cycle contract (ADR-010); the first is `/tdd` (RFC-012). BMAD is the full **greenfield
arc**; the personas map onto existing forgeplan-aware agents — the only new piece is the master.

## When to use BMAD vs the neighbours

| Use… | When | Primary |
|---|---|---|
| **`/bmad`** (this) | **Greenfield** — a brand-new product/service, idea → shipped, full Analyst→QA arc | BMAD |
| `/smith` Row 3 → SPARC | A single well-scoped feature **in an existing active system** | SPARC |
| `/tdd` (Row 13) | **Build-stage** test-first enforcement on an existing active SPEC/RFC | TDD |
| `/smith` Row 2 → Strangler | **Brownfield** modernisation of a legacy system | Strangler Fig + DDD |

If the task is a single feature or a bug, do **not** use BMAD — it's the whole-arc methodology. Route via
`/smith` instead. The `bmad-orchestrator` refuses to start when the signal is not greenfield (Precondition C1).

## Prerequisite — run `/bmad-init` once

The no-code-before-plan gate needs `.forgeplan/bmad/stack.json` to know what counts as a source/test
file. Run `/bmad-init` once per project before the first `/bmad` cycle (it auto-detects the stack and
initialises the per-branch state). Without it the gate is dormant (allows everything) — `/bmad-init`
turns enforcement on.

## The contract this runs (ADR-010 C1-C6)

| Element | In BMAD |
|---|---|
| **C1 Entry** | A greenfield signal; the master refuses otherwise, and won't advance a stage whose input isn't `active`. |
| **C2 Master** | `bmad-orchestrator` (opus, Profile B-orchestrator) — walks the personas, writes nothing, activates nothing. |
| **C3 Personas** | `brief-intake` (Analyst) → `specification` (PM) → `adr-architect`+`architecture` (Architect) → `goal-planner` (Scrum-Master) → `coder` (Dev) → `evidence-recorder` (retro). |
| **C4 Verifiers** | mandatory, independent: `architect-reviewer` (Validate-PRD, then RFC fitness); `guardian` (Implementation-Readiness); `tester`+`code-reviewer` (Dev↔QA). |
| **C5 Enforcement** | `bmad-gate.sh` PreToolUse — no source/test write until phase=implementation AND dev_unlocked. |
| **C6 Exit** | each handoff emits EVIDENCE carrying its C4 verdict + identity; the retro EVIDENCE is the terminal exit; the orchestrator activates. |

## Procedure

When `/bmad` is invoked, the main session runs this:

### Step 1 — context + precondition

1. Snapshot state: `forgeplan_health`, `git status`, and (if Hindsight is wired) `memory_recall("project context")`.
2. Confirm the task is genuinely **greenfield**. If it's a single feature → tell the user to use `/smith` Row 3 (SPARC); if brownfield → Row 2 (Strangler). Do not start BMAD on a non-greenfield task.
3. Confirm `.forgeplan/bmad/stack.json` exists; if not, run `/bmad-init` first.

### Step 2 — dispatch the master

```
Task(subagent_type="agents-bmad:bmad-orchestrator",
     prompt="""
       Greenfield brief (verbatim): <the user's idea>.
       Run the BMAD persona walk per RFC-013 / ADR-010 C1-C6. Verify Precondition C1 (greenfield).
       Walk: brief-intake → specification → [C4 architect-reviewer Validate-PRD] →
             adr-architect → architecture → [C4 architect-reviewer RFC fitness] →
             goal-planner (story RFCs) → [C4 guardian Implementation-Readiness → unlock dev] →
             coder ⇄ tester+code-reviewer (bounded) → evidence-recorder (C6).
       Write phase transitions via the bmad-lib.sh CLI. Emit NEEDS_ACTIVATION sentinels; never activate.
       task-id: <id>
     """)
```

### Step 3 — walk the gates with the user

The master returns a structured handoff after each phase (or pauses at a gate). The default is **ask
after each phase** — present the gate verdict and the next persona, and let the user confirm or redirect.
The user can opt into "run all" for autonomous execution if they trust the plan.

### Step 4 — activation duty (orchestrator, not the master)

The master emits `NEEDS_ACTIVATION: <ID>` after each C4 PASS (Profile-B agents cannot self-activate). The
**orchestrator** (you, the main session) activates the EVID + the gated artifact via `forgeplan_activate`,
then tells the master to advance. On a `<<NEED_USER_INPUT>>` sentinel (e.g. a gate failed 3×), surface the
blocker to the user.

## What makes BMAD different from just running the agents by hand

- **The gate.** Until the Implementation-Readiness gate (`guardian`) PASSes and the master unlocks dev,
  the `bmad-gate.sh` hook **physically blocks** any source/test write — by an agent OR a human. This
  enforces "no application code before the PRD/architecture/stories exist", BMAD's #1 anti-pattern.
- **Mandatory independent validation.** BMAD's own discipline ("validate with a different context") becomes
  three mandatory C4 gates (Validate-PRD, RFC fitness, Readiness) — generator≠verifier at every handoff.
- **One coordinated arc.** The master tracks phase + the Dev↔QA attempt count in `.forgeplan/bmad/state-…`,
  so the arc is a single auditable flow, not a pile of ad-hoc dispatches.

## Escape hatches (bounded, audited)

- **Architectural spikes:** write throwaway code under `.bmad-scratch/` (gitignored) — the gate always
  allows it, even during solutioning. It is never the committed feature.
- **Legitimate non-feature edit during the long planning arc:** set a logged override —
  `BMAD_GATE_OVERRIDE=1` (env) or `bash scripts/bmad-lib.sh set-override <slug> true` — recorded in state
  for audit. Never use the override to write actual feature code early; that defeats C5.

## HARD RULES

1. **Greenfield only.** Not greenfield → route via `/smith` (Row 2 brownfield / Row 3 single-feature). The master refuses otherwise.
2. **`/bmad-init` first.** No `stack.json` → the gate can't classify files → no enforcement.
3. **The master coordinates; the personas produce; the orchestrator activates.** Three roles, never collapsed.
4. **Every handoff is gated by an independent context** (generator≠verifier). The three C4 validations are mandatory, not optional.
5. **Dev is unlocked only at the readiness-gate PASS.** Until then the hook blocks all source/test writes — that is the methodology, not an obstacle.

## Related

- `bmad-orchestrator` agent — the master this skill dispatches (`agents/bmad-orchestrator.md`).
- `/bmad-init` — one-time setup (writes `stack.json`, inits state).
- `hooks/bmad-gate.sh` + `scripts/bmad-lib.sh` — the C5 enforcement layer.
- `/tdd` (RFC-012) — the sibling instance (Build-stage); `/smith` — the master-of-masters router.
- RFC-013 (the BMAD instance), ADR-010 (the contract), RFC-012 (the TDD instance it mirrors).
