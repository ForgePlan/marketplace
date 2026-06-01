---
name: sparc
description: |
  Entry point for the SPARC feature pipeline — the master-coordinated five-phase walk that drives a SINGLE
  feature in an EXISTING active system from specification to a completed, independently-verified feature
  (Specification → Pseudocode → Architecture → Refinement → Completion), the THIRD instance of the
  AD/AID-PDLC sub-cycle contract (ADR-010 / RFC-016). Dispatches the `sparc-orchestrator` master, which walks
  the five phases as separate isolated-context agents with a blocking INDEPENDENT quality-gate between each.
  hook-gate=No: there is NO fail-closed hook — C5 is harness phase-ordering + delegating Refinement to the
  existing TDD hook-gate (RFC-012) when test-immutability matters.
  EN: Run SPARC on a single feature in an existing active system — spec → pseudocode → architecture (RFC) →
  code+tests → completion, with a MANDATORY independent reviewer at every phase gate. Use for one well-scoped
  feature in an active codebase, NOT a brand-new product from scratch (that is BMAD) or brownfield
  modernisation (that is Strangler Fig).
  RU: Запусти SPARC на одной фиче в существующей активной системе — spec → pseudocode → architecture (RFC) →
  код+тесты → completion, с обязательным независимым ревьюером на каждом гейте. Для одной well-scoped фичи в
  активной кодовой базе, НЕ для нового продукта с нуля (это BMAD) и не для модернизации legacy (это Strangler).
  Triggers: "sparc", "/sparc", "run sparc", "feature in existing system", "single feature", "spec to completion",
  "five-phase feature", "sparc pipeline", "запусти sparc", "фича в существующей системе", "проведи фичу через sparc",
  "spec pseudo arch refine complete"
---

# /sparc — the five-phase feature walk (Specification → Pseudocode → Architecture → Refinement → Completion)

`/sparc` runs the **SPARC methodology** as a master-coordinated sub-cycle: the `sparc-orchestrator` walks one
feature from a specification to a completed, verified feature, gating every phase with an **independent**
reviewer. It is the **third instance** of the AD/AID-PDLC sub-cycle contract (ADR-010); the siblings are
`/tdd` (RFC-012, the Build stage) and `/bmad` (RFC-013, the greenfield arc). SPARC is the
**single-feature-in-an-active-system** methodology; the five phase agents already exist — the only finished
piece is the master (`sparc-orchestrator`, brought to Profile B-orchestrator canon).

## When to use SPARC vs the neighbours

| Use… | When | Primary |
|---|---|---|
| **`/sparc`** (this) | **A single, well-scoped feature in an EXISTING active system** — spec → completed feature | SPARC |
| `/bmad` (Row 1) | **Greenfield** — a brand-new product/service, idea → shipped, full Analyst→QA arc | BMAD |
| `/smith` Row 2 → Strangler | **Brownfield** modernisation of a legacy system | Strangler Fig + DDD |
| `/tdd` (Row 13) | **Build-stage** test-first enforcement on an existing active SPEC/RFC | TDD |

If the task is a brand-new product → use `/bmad`. If it's modernising legacy → route via `/smith` (Strangler).
If it's pure test-first on an already-active SPEC → `/tdd`. SPARC's **Refinement phase may itself delegate to
`/tdd`** when the feature is test-critical (the contract composes — instance #3 nests instance #1). The
`sparc-orchestrator` refuses to start when the signal is not a single-feature-in-an-active-system
(Precondition C1).

## No setup needed (hook-gate=No — the contrast with `/bmad`)

SPARC has **no fail-closed hook**, so there is **nothing to initialise** — no `/sparc-init`, no `stack.json`,
no per-branch state file. Its enforcement (C5) is the forgeplan harness (phase-ordering: no source/test is
dispatched until the Architecture RFC is `active`) plus delegating Refinement to the existing TDD hook-gate
when test-immutability matters. This is the visible payoff of hook-gate=No: a lighter instance than BMAD/TDD.

## The contract this runs (ADR-010 C1-C6)

| Element | In SPARC |
|---|---|
| **C1 Entry** | A feature scoped against an EXISTING active system; the master refuses otherwise (greenfield → `/bmad`, brownfield → Strangler, Build-only → `/tdd`), and won't advance a phase whose input isn't `active`. |
| **C2 Master** | `sparc-orchestrator` (opus, Profile B-orchestrator) — walks the five phases, writes nothing, activates nothing. |
| **C3 Phases** | `specification` (Spec) → `pseudocode` (Pseudo) → `adr-architect`+`architecture` (Arch) → `refinement`+`coder` (Refine) → `evidence-recorder` (Completion). |
| **C4 Verifiers** | mandatory, independent, at EVERY gate: `artifact-reviewer`/`architect-reviewer` (Validate-spec); `architect-reviewer` (+`system-dev`) (RFC fitness + Pseudocode-absorption); `tester`+`code-reviewer` (Refine). |
| **C5 Enforcement** | **hook-gate=No — no hook.** Harness phase-ordering + Refinement delegates to the TDD hook-gate (RFC-012). |
| **C6 Exit** | each gate emits EVIDENCE carrying its C4 verdict + identity; the Completion EVIDENCE is the terminal exit; the orchestrator activates. |

## Procedure

When `/sparc` is invoked, the main session runs this:

### Step 1 — context + precondition

1. Snapshot state: `forgeplan_health`, the active parent PRD/system, `git status`, and (if Hindsight is wired) `memory_recall("project context")`.
2. Confirm the task is a **single feature in an existing active system**. If it's a brand-new product → `/bmad`; if brownfield → `/smith` Row 2 (Strangler); if Build-stage test-first only → `/tdd`. Do not start SPARC otherwise.
3. Pick the **scale tier**: MICRO (bug-fix-sized — skip Pseudocode + collapse to a light spec) / STANDARD (a normal feature — all five phases) / SYSTEM (a large feature — all phases + `system-dev` at the Architecture gate).

### Step 2 — orchestrate the five-phase walk (the main session IS the orchestrator)

hook-gate=No (ADR-012) means **the main session is the SPARC orchestrator** — it dispatches each phase agent and each C4 gate directly (via Task/Agent), following the `sparc-orchestrator` contract, and activates the EVID + gated artifact between phases. The walk:

```
specification → [C4 Validate-spec: architect-reviewer] → pseudocode → architecture(+adr-architect)
  → [C4 RFC fitness + Pseudocode-absorption: architect-reviewer (+system-dev)]
  → refinement+coder (delegate to /tdd if test-critical) → [C4 tester + code-reviewer]
  → evidence-recorder (C6)
```

Every phase receives the FULL accumulated prior-phase output; Profile A/B agents emit `NEEDS_ACTIVATION` and the main session activates before the next phase's C1.

> **Do NOT dispatch `sparc-orchestrator` as a subagent expecting it to run the walk.** The platform blocks `Task` inside subagents, so a dispatched orchestrator cannot spawn the phase agents — it can only verify Precondition C1, return the walk plan, and (correctly) refuse to author/self-certify the work. The `sparc-orchestrator` agent is the **codified walk contract + a discipline guardrail**; the **executor is the main session** (hook-gate=No instances have no dedicated dispatched executor — proven in the RFC-016 dogfood, EVID-165).

### Step 3 — walk the gates with the user

The master returns a structured handoff after each phase (or pauses at a gate). The default is **ask after
each phase** — present the gate verdict and the next phase, and let the user confirm or redirect. The user can
opt into "run all" for autonomous execution if they trust the plan.

### Step 4 — activation duty (orchestrator, not the master)

The master emits `NEEDS_ACTIVATION: <ID>` after each C4 PASS (Profile-B agents cannot self-activate). The
**orchestrator** (you, the main session) activates the EVID + the gated artifact via `forgeplan_activate`,
then tells the master to advance. On a `<<NEED_USER_INPUT>>` sentinel (e.g. a gate failed 3×), surface the
blocker to the user.

## What makes SPARC different from just running the agents by hand

- **Independent review at EVERY gate.** Canonical SPARC gates Specification and Architecture with a
  *self-checklist*; the instance makes an independent different-context C4 review mandatory at Spec, Arch, and
  Refine — generator≠verifier at every handoff. This is the methodology's real value, not decoration.
- **Full context accumulation.** Every phase receives the FULL output of all prior phases (the master's
  cardinal rule) — the single biggest determinant of output consistency.
- **Refinement→TDD delegation.** When the feature is test-critical, Refinement hands off to the `/tdd`
  hook-gate so the tests are independently frozen before GREEN — fail-closed test-immutability without a new hook.
- **Pseudocode's conditional-freeze handled honestly.** Pseudocode is a non-freezable intermediate; its
  C4+C6 are co-located at the Architecture gate (the architect-reviewer certifies the algorithm was carried
  into the RFC; the Arch-gate EVID pins it under `## Pseudocode-absorption`).

## Escape hatches (bounded)

- **Scale-tiering is the only "skip".** MICRO scope legitimately skips Pseudocode + collapses heavy gates; it
  does NOT skip the Refine C4 (code is always independently reviewed). There is no fail-closed hook to override
  (hook-gate=No), so there is no gate-bypass to misuse.

## HARD RULES

1. **Single feature in an active system only.** Greenfield → `/bmad`; brownfield → Strangler; Build-only → `/tdd`. The master refuses otherwise (Precondition C1).
2. **The master coordinates; the phase agents produce; the orchestrator activates.** Three roles, never collapsed.
3. **Every phase gate is an independent context** (generator≠verifier). The C4 reviews at Spec, Arch, and Refine are mandatory, not optional — this is the upgrade over unenforced SPARC.
4. **No source/test until the Architecture RFC is active.** That is SPARC's "no code before design", enforced by phase-ordering (hook-gate=No — no hook).
5. **Pseudocode is non-freezable** — its review is co-located at the Architecture gate (`## Pseudocode-absorption`); never run it as production logic without that certification.

## Related

- `sparc-orchestrator` agent — the master this skill dispatches (`agents/sparc-orchestrator.md`).
- `/tdd` (RFC-012) — the Build-stage sibling instance; SPARC's Refinement delegates to it for test-immutability.
- `/bmad` (RFC-013) — the greenfield sibling; `/smith` — the master-of-masters router (SPARC is Row 3).
- RFC-016 (the SPARC instance), ADR-010 (the contract), ADR-012 (the hook-gate → hook-gate=No, no new hook/state).
