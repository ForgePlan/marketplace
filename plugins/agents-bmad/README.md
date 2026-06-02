# agents-bmad — BMAD greenfield methodology (instance #2 of the AD/AID-PDLC contract)

The **BMAD** methodology as a first-class, master-coordinated sub-cycle: the `bmad-orchestrator` walks
the persona arc **Analyst → PM → Architect → Scrum-Master → Dev → QA** from a raw idea to a shipped,
QA-verified feature, gating every handoff with an independent reviewer and **physically blocking any
application-code write until the plan is done**.

It is the **second instance** of the AD/AID-PDLC sub-cycle contract (**ADR-010**); the first is the
enforced-TDD plugin `agents-tdd` (**RFC-012**). BMAD is built per **RFC-013**.

## What's in the box

| Component | What |
|---|---|
| `agents/bmad-orchestrator.md` | The master (the only new agent). Profile B-orchestrator — walks the personas via Task, enforces gates, writes nothing, activates nothing. |
| `skills/bmad/SKILL.md` | `/bmad` — entry point; runs the persona walk end-to-end. |
| `skills/bmad-init/SKILL.md` | `/bmad-init` — one-time setup (detect stack → `stack.json`, init per-branch state). |
| `hooks/bmad-gate.sh` + `hooks/hooks.json` | Fail-closed PreToolUse gate: no source/test write until phase=implementation **and** dev_unlocked. |
| `scripts/bmad-lib.sh` | Shared bash: branch slug, file classification, atomic locked state, path canonicalizer, stack detection, + the state CLI the master writes through. |
| `tests/test-bmad-gate.sh` | Behavioral suite (phase rules, scratch exemption, override, fail-closed, detect_stack, state CLI). Run by CI. |

## The personas are reused, not reinvented

BMAD's value here is the **master + the gate + the mandatory independent validation**, not a new fleet
of agents. Each persona maps onto an existing forgeplan-aware agent:

| BMAD persona | forgeplan agent | produces |
|---|---|---|
| Analyst | `brief-intake` | Brief NOTE |
| PM / PO | `specification` | PRD |
| Architect | `adr-architect` + `architecture` | ADR + RFC |
| Scrum-Master | `goal-planner` (story files = per-task RFCs via `forgeplan_decompose`) | story RFCs |
| Dev | `coder` | code |
| QA | `tester` + `code-reviewer` | EVIDENCE |
| Readiness gate / retro | `guardian` / `evidence-recorder` | gate EVID / retro EVID |

## The contract (ADR-010 C1-C6)

- **C1 Entry** — a greenfield signal; the master refuses otherwise and won't advance a stage whose input isn't `active`.
- **C2 Master** — `bmad-orchestrator`, coordinates only.
- **C3 Personas** — the reused agents above.
- **C4 Verifiers** — `architect-reviewer` (Validate-PRD, RFC fitness), `guardian` (Implementation-Readiness), `tester`+`code-reviewer` (Dev↔QA). Generator≠verifier at every handoff.
- **C5 Enforcement** — `bmad-gate.sh`: the no-code-before-plan rule, binding agents **and** human edits.
- **C6 Exit** — each handoff emits EVIDENCE carrying its C4 verdict + identity; the retro EVIDENCE is the terminal exit; the orchestrator activates.

## Usage

```text
1. /bmad-init           # once per project — detects stack, writes .forgeplan/bmad/stack.json, inits state
2. /bmad                # on a greenfield brief — runs the persona walk with gates
```

Use BMAD for a **brand-new product/service** (idea → shipped). For a single feature in an existing
system use SPARC (`/smith` Row 3); for a Build-stage test-first cycle use `/tdd` (Row 13); for brownfield
modernisation use Strangler Fig (`/smith` Row 2). The master refuses to start when the signal is not
greenfield.

## Escape hatches (bounded, audited)

- **Spikes:** write throwaway code under `.bmad-scratch/` (gitignored) — always allowed, never the committed feature.
- **Legitimate non-feature edit:** a logged override — `BMAD_GATE_OVERRIDE=1` or `bmad-lib.sh set-override <slug> true` — recorded in state. Never use it to write feature code early (that defeats C5).

## Freezable-product note (RFC-013 FR-7)

Every BMAD product is a forgeplan artifact, frozen-on-activate by the lifecycle. BMAD therefore does
**not** exercise the conditional-freeze (non-freezable-product) path of the ADR-010 contract — that
remains the job of a future RIPER-Research instance.

## References

- **RFC-013** — the BMAD instance (this plugin's mandate).
- **ADR-010** — the AD/AID-PDLC sub-cycle contract.
- **RFC-012** / `agents-tdd` — the sibling first instance; `bmad-lib.sh` ports its `tdd-lib.sh`.
