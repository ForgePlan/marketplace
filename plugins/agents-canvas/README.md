[English](README.md) | [Русский](README-RU.md)

# CANVAS -- Design-System -> Code Methodology Plugin

Drive a **Pencil design system** through to **framework-agnostic Web Component code** with an
independent quality gate at every handoff. CANVAS is an instance of the AD/AID-PDLC sub-cycle contract
(ADR-010 / RFC-021): a master (`canvas-coordinator`) conducts a six-phase walk -- **C**apture,
**A**udit, **N**orm-check, **V**ectorize, **A**ssemble, **S**pread -- dispatching **every phase and
every verifier via `Task`** so the generator is never the verifier, while a fail-closed PreToolUse hook
blocks design-system source until the token contract is active (**hook-gate = Yes**).

CANVAS is **brand/style-agnostic**: the visual style is an input the project provides -- read from a
forgeplan scope artifact (the active PRD/Brief, an ADR design-direction, or a recorded design-tokens
decision); if none is recorded yet, the Designer first helps you choose one and records it before any
design work begins.

> `agents-canvas` -- agents `canvas-*` -- entry skill `/canvas`. Topology: framework-agnostic **Web
> Components** (Lit canonical) + thin React/Vue/Svelte/Angular/Solid wrappers. Tokens:
> **Style-Dictionary -> CSS custom properties** from a single `tokens.json`, never forked.

## Quick Start

```bash
/plugin install agents-canvas@ForgePlan-marketplace   # requires the pencil MCP + laws-of-ux plugin
/canvas-init                                           # arm the tokens-gate on this branch (once)
/canvas                                                # run the C-A-N-V-A-S walk on a DS slice
```

`/canvas` refuses to start without a **design source** (a canonical `.pen` path + Pencil MCP reachable)
and a target framework list. No design intent? Route greenfield -> `/bmad`, a feature -> SPARC, a bug
-> RIPER.

## CANVAS pipeline

```
[C1 intake: a Pencil design-system -> code task; coordinator refuses without a design source + Pencil reachable]
  |
  v  Capture     canvas-designer          Pencil DS -> DS snapshot + Design NOTE (non-freezable)   [Task sub]
       --[C4 Audit:      canvas-guardian  -- DS conventions PASS -> EVID + C6 pin of the snapshot]-->
       --[C4 Norm-check: canvas-tester    -- traceability vs PRD/ADR/EVID -> EVID]-->
  v  Vectorize   canvas-porter-storybook  DS -> tokens contract (RFC) + story specs + visual oracle + port manifest
       --[Gate V (C4):   agents-core:tester + agents-pro:architect-reviewer -- CERTIFY the tokens RFC ->
                          coordinator activates tokens RFC + sets tokens_active=true -> gate unlocks code]-->
  v  Assemble    canvas-coder             Web-Components code + stories + visual-regression tests
       --[Gate Storybook (C4): canvas-storybook-validator -> EVID PASS/FAIL vs the Pencil oracle]-->
       --[Gate Code (C4):      agents-core:code-reviewer + agents-core:tester + /laws-of-ux:ux-review -> EVID]-->
  v  Spread      canvas-porter-framework  (x5 PARALLEL fan-out -- one framework pkg per agent,
                                           file-disjoint, git-worktree isolated)
                                          React/Vue/Svelte/Angular/Solid wrappers + parity tests
       --[Gate Parity (C4):    agents-core:code-reviewer + agents-core:tester -> EVID]-->
  v  Retro       agents-pro:evidence-recorder -> terminal C6 EVIDENCE + Hindsight
```

`canvas-coordinator` dispatches the whole walk via `Task` -- there is no main-session binding (Pencil
MCP works in dispatched sub-agents). A blocking gate sits at every arrow. On FAIL the coordinator
returns to the producing phase (3 strikes -> `<<NEED_USER_INPUT>>`). On PASS it emits
`NEEDS_ACTIVATION` -- the orchestrator (you) activates; the master never activates. The **tokens RFC
activation is the C5 unlock**: only then does the hook permit design-system source writes. The
**Spread phase is the one parallel fan-out** -- one agent per framework package, strict file ownership,
git-worktree isolation, each `blockedBy` the code-gate PASS (FR-9).

## The 8-agent roster (master + 7 roles)

| Agent | Phase | Profile | Role |
|---|---|---|---|
| `canvas-coordinator` | conductor | B-orchestrator (opus) | Owns the gate state machine; dispatches every phase + verifier via `Task`; writes phase + `tokens_active` transitions via `canvas-lib.sh`; never writes product, never activates. |
| `canvas-designer` | **C** Capture | creator-contract | Designs/extends the Pencil DS (atomic design + UX laws); exports the DS snapshot + Design NOTE. Ordinary `Task` sub-agent. |
| `canvas-guardian` | **A** Audit | C read-only reviewer | Audits *how the DS was built* -- refs/slots/tokens/naming/atomic layering/no-clipping. Emits a C4 EVID + C6 pin of the snapshot. |
| `canvas-tester` | **N** Norm-check | C reviewer + EVID | Validates the DS against the ForgePlan PRD/ADR/EVID truth -- coverage + provenance. C4 EVID. |
| `canvas-porter-storybook` | **V** Vectorize | creator-contract | Extracts the approved DS into a Style-Dictionary token contract (RFC) + story specs + reference screenshots + port manifest. Ordinary `Task` sub-agent. |
| `canvas-coder` | **A** Assemble | C-coder | Builds the Storybook (Web Components + `*.stories.ts` + visual-regression tests + token theme). |
| `canvas-storybook-validator` | Gate **Storybook** | C reviewer + EVID | Validates the **built Storybook** against the Pencil source only (generator != verifier vs `canvas-coder`): story coverage, visual parity, play/interaction, structural a11y (axe), token fidelity, coverage thresholds. Owns the `canvas-storybook-test` skill. C4 EVID. |
| `canvas-porter-framework` | **S** Spread | C-coder | Ports the components to React/Vue/Svelte/Angular/Solid against the shared token + story contract; parity tests. One agent per package in the parallel fan-out. |

The C4 gates also dispatch **reused** independent reviewers (`laws-of-ux:ux-reviewer`,
`agents-core:code-reviewer` / `architect-reviewer`, `agents-core:tester`) -- generator != verifier.

## /smith integration

CANVAS is registered with the **`/smith`** master-orchestrator as the **design-system -> code
stage-master**. When `/smith` sees a Pencil-to-code / design-system context (an approved `.pen` + a
request for tokens/Storybook/framework components), it routes the work to `canvas-coordinator` and lets
`/canvas` run the walk. `/smith` never blends methodologies -- it routes design-system work to CANVAS,
feature logic to SPARC, greenfield to BMAD, bugs to RIPER. `canvas-coordinator` is the L2 stage-master in
that map; `/smith` is the master-of-masters above it.

## What's included

| Component | Description |
|---|---|
| `/canvas` | The master playbook -- the C-A-N-V-A-S walk, the ADR-010 C1-C6 table, the mandatory C4 gates, the FR-9 dispatch discipline, the when-to-use-vs-neighbours table. |
| `/canvas-init` | One-time per-branch setup -- arms the tokens-gate (writes `.forgeplan/canvas/state-<branch>.json`). |
| `/canvas-audit` | One-shot DS-convention audit (Guardian-as-command). |
| `/canvas-review` | Post-export code + UX gate (wraps `/laws-of-ux:ux-review`). |
| `/canvas-rule [name]` | Look up a DS convention or UX law. |
| 8 `canvas-*` agents | The roster above -- 1 master + 7 role agents. |
| `PreToolUse` hook | `canvas-gate.sh` -- fail-closed; blocks design-system + framework-package writes until the tokens RFC is active. |
| KB skills | `canvas-design` (Pencil designer), `canvas-conventions` (Guardian rules), `canvas-port` (Pencil->Storybook->framework), `canvas-truth-map` (DS<->ForgePlan), `canvas-storybook-test` (the Storybook-validator's check suite). Agentic-RAG, loaded via the `/canvas` entry skill. |

## Design references the agents use

- **getdesign.md** -- the `canvas-designer` consults [`https://getdesign.md/`](https://getdesign.md/) via
  WebFetch: a curated catalog of analyzed production DESIGN.md systems (color/typography/component/
  token patterns, authored machine-readable for AI agents). **Reference-only** -- adapt to your project's
  chosen brand (the one recorded in the scope artifact), never copy 1:1.
- **context7** -- the code-touching agents (`canvas-coder`, `canvas-porter-storybook`,
  `canvas-porter-framework`, `canvas-storybook-validator`, and `canvas-design` where it touches
  Storybook/Style-Dictionary) **must** use the **context7 MCP** (`resolve-library-id` -> `query-docs`)
  for Storybook / Lit / Style-Dictionary / React / Vue / Svelte / Angular / Solid docs **before writing
  code**, and prompt the user to use context7 on any library/version question.

## Requirements

- **MCP:** `pencil` (the `.pen` editor -- the methodology cannot function without it).
- **Plugins:** `laws-of-ux` (the UX-law KB the Designer + Gate Code lean on; load-bearing -- the
  code-gate runs `/laws-of-ux:ux-review`).
- Optional: the `context7` MCP for live library docs (strongly recommended for the code phases).

## Status

`beta` -- v0.1.0. The `canvas-coordinator` master + 7 role agents + the five KB skills + the commands +
the `canvas-gate.sh` hook are authored per RFC-021's phased build (dogfooded against real product
screens).

## License

MIT
