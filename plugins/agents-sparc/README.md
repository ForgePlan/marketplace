# agents-sparc

SPARC development methodology agents: orchestrator with quality gates, plus 4 phase specialists (specification, pseudocode, architecture, refinement/TDD). **The `sparc-orchestrator`, `specification`, and `architecture` agents are forgeplan-aware** — the orchestrator is a Profile B-orchestrator (RFC-016, the third instance of the AD/AID-PDLC sub-cycle contract), the two phase agents are Profile A creators (PRD-026 canonical profiles).

For context on how SPARC phases (Specification, Architecture, Refinement, Completion) integrate into the full pipeline, see the [Process Reference (EN)](../../docs/process-from-idea-to-delivery-EN.md) / [(RU)](../../docs/process-from-idea-to-delivery-RU.md).

## Installation

```bash
/plugin install agents-sparc@ForgePlan-marketplace
```

## SPARC Methodology

```
S -> Specification  -> Requirements, constraints, acceptance criteria
P -> Pseudocode     -> Algorithms, data structures, complexity analysis
A -> Architecture   -> System design, components, infrastructure
R -> Refinement     -> TDD red-green-refactor, optimization
C -> Completion     -> Integration, validation, deployment
```

## Agents (5)

Legend: ⚙ = forgeplan-aware (B2 paradigm — see [AGENT-AUTHORING-GUIDE.md](../fpl-skills/AGENT-AUTHORING-GUIDE.md)).

| Agent | Profile | Description |
|-------|:-------:|-------------|
| `sparc-orchestrator` ⚙ | B-orchestrator | Master coordinator — manages phase flow, enforces quality gates, delegates to phase specialists; never writes code or artifacts, never activates (RFC-016) |
| `specification` ⚙ | A (Creator) | SPARC Specification phase — produces PRD or SPEC artifacts via forgeplan MCP with SMART acceptance criteria, requirements, constraints, out-of-scope |
| `pseudocode` | — | Algorithm design, data structure selection, complexity analysis |
| `architecture` ⚙ | A (Creator) | SPARC Architecture phase — transforms PRD/SPEC into concrete RFC artifact (module breakdown, component contracts, data flow, function signatures, trade-offs) via forgeplan MCP |
| `refinement` | — | TDD red-green-refactor, code optimization, performance tuning, error handling |

## Forgeplan-aware agents (3, PRD-026 + RFC-016 canonical)

- **`sparc-orchestrator`** (Profile B-orchestrator, RFC-016) — the SPARC stage-master; reads the feature context and walks the five phases as isolated-context Task dispatches with a blocking independent quality-gate between each. `disallowedTools` denylist forbids `Write/Edit/NotebookEdit`, all forgeplan mutations (`new/update/link/validate/activate/reason/claim/release`), and `memory_retain` — it coordinates only, writes nothing, activates nothing.
- **`specification`** (Profile A) — converts user requirements to forgeplan PRD or SPEC kind via `forgeplan_generate` (primary) or `forgeplan_new` + manual body fill (fallback). Calls `forgeplan_reason` before finalising acceptance criteria.
- **`architecture`** (Profile A) — converts parent PRD/SPEC to concrete RFC via the same dual-path approach. Calls FPF ADI reasoning before picking a design option, weighs at least two alternatives.

Both Profile A agents' `disallowedTools` denylist forbids `Write/Edit/NotebookEdit` and `forgeplan_activate`, but allows all other forgeplan mutations needed to create + link + validate the artifact.

## Usage

After installation, agents are available via the `Task` tool with `subagent_type`:

```
Task({ subagent_type: "sparc-orchestrator", prompt: "Guide development of authentication service through all SPARC phases" })
Task({ subagent_type: "specification", prompt: "Define PRD for payment processing module" })
Task({ subagent_type: "architecture", prompt: "Design RFC for real-time chat service from PRD-NNN" })
Task({ subagent_type: "refinement", prompt: "Apply TDD to implement and optimize this feature" })
```

Or invoke the end-to-end walk through the `/sparc` skill (`skills/sparc/`), which dispatches the `sparc-orchestrator` master across all five phases with independent quality-gates between each.

## Version history

- **v1.2.0** (current, 2026-05-19) — Sprint B canonical-lint compliance
  - All 3 legacy agents (`sparc-orchestrator`, `pseudocode`, `refinement`) migrated to canonical pattern: `model: opus/sonnet`, hex colors, bilingual EN/RU/Triggers descriptions
  - Forgeplan-aware agents (`specification`, `architecture`) include methodology citation as first line of description (SPARC-Specification / SPARC-Architecture profile labels)
  - 100% of agents-sparc pack passes LR-1..LR-3; lint warnings eliminated
- **v1.2.1** (Sprint E) — Profile A agents patched with methodology citation convention; Step 9b N/A (no Profile B producer agents in this pack)
- **v1.3.2** (current, RFC-016) — SPARC instance #3 of the AD/AID-PDLC sub-cycle contract: `sparc-orchestrator` promoted to Profile B-orchestrator (forgeplan-aware, coordinates-only denylist) + the `/sparc` skill added as the end-to-end entry point.

For complete change history, see [`forgeplan-marketplace/CLAUDE.md`](../../CLAUDE.md) § Sprint A-E session.

## Profile B sentinel emission (Sprint E)

No agent in this pack emits `<<NEEDS_ACTIVATION>>`. The two Profile A (Creator) agents — `specification` and `architecture` — create artifacts but do not produce EVIDENCE, and the `sparc-orchestrator` is a Profile B-orchestrator that coordinates only (it produces no EVIDENCE either). The sentinel is emitted by Profile B reviewer agents in `agents-core` and `agents-pro`.

Full spec: `plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md` → "Profile B Step 9b — Surface NEEDS_ACTIVATION sentinel".

## License

MIT
