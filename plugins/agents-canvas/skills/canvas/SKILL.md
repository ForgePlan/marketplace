---
name: canvas
description: |
  Entry point for the CANVAS design-system -> code pipeline — the master-coordinated walk from a Pencil
  design to framework-agnostic Web Component code (Capture -> Audit -> Norm-check -> Vectorize ->
  Assemble -> Spread), an instance of the AD/AID-PDLC sub-cycle contract (ADR-010 / RFC-021),
  hook-gate=YES. Dispatches the canvas-coordinator master, which walks EVERY phase + EVERY verifier as
  separate isolated-context Task sub-agents (BMAD-shaped) — including the Pencil-touching Designer and
  Storybook-Porter (Pencil MCP works in dispatched sub-agents) — with a blocking generator-not-verifier
  gate at each handoff and a fail-closed PreToolUse tokens-gate that blocks design-system/framework
  source writes until the tokens RFC is active.
  EN: Run CANVAS on a design-system slice — Pencil DS -> Audit -> Norm-check vs ForgePlan -> Storybook
  port manifest (Style-Dictionary tokens) -> Web Component code + visual tests -> React/Vue/Svelte/
  Angular/Solid wrappers. Use for Pencil-to-code design-system work, not feature logic (SPARC),
  greenfield products (BMAD), or bug hunts (RIPER).
  RU: Запусти CANVAS на срез дизайн-системы — Pencil DS -> Audit -> Norm-check против ForgePlan ->
  Storybook port-манифест (токены Style-Dictionary) -> код Web Components + визуальные тесты -> обёртки
  React/Vue/Svelte/Angular/Solid. Для работы "из Pencil в код", не для фич-логики (SPARC), greenfield
  (BMAD) или поиска багов (RIPER).
  Triggers: "canvas", "/canvas", "run canvas", "pencil to code", "design system pipeline", "storybook port",
  "design system to code", "tokens to storybook", "из pencil в код", "перенеси дизайн-систему в storybook",
  "проведи дизайн через canvas", "дизайн-система в код"
---

# /canvas — the design-system -> code walk (Pencil -> DS -> Storybook -> framework code)

`/canvas` runs the **CANVAS methodology** as a master-coordinated sub-cycle: the `canvas-coordinator`
walks one design-system slice from a Pencil design to shipped, framework-agnostic Web Component code,
gating every handoff with an independent reviewer (generator != verifier) and blocking any
design-system source write until the **tokens contract is active**. It is an instance of the
AD/AID-PDLC sub-cycle contract (ADR-010); peers are `/bmad` (greenfield, RFC-013), `/tdd` (Build-stage,
RFC-012), and the SPARC / RIPER instances `/smith` routes to.

CANVAS is a **hook-gate methodology mapped onto the existing contract** — its master is warranted by the
ADR-012 hook-gate test (tokens-before-code binds **human / out-of-band edits**, exactly like BMAD's
no-code-before-plan), not by any new contract dimension and not by reopening the closed program. It
occupies the previously-empty `{hook-gate=Yes, conditional-freeze}` interior cell of the existing two
axes — a recombination, not a new axis.

The six CANVAS letters name the six worker phases — **C**apture, **A**udit, **N**orm-check,
**V**ectorize, **A**ssemble, **S**pread; the canonical phase names are `Design - Audit - Norm-check -
Port - Code - Spread` (bookended by `Intake` and `Retro`). The coordinator conducts the C-A-N-V-A-S walk
by dispatching each phase and each verifier as its own `Task` sub-agent.

## Topology (LOCKED DECISIONS, RFC-021 FR-2)

- **Framework-agnostic Web Components** (Lit-based canonical layer) + **thin per-framework wrappers**.
  Storybook uses the `web-components` framework. Max portability — every framework wraps the same
  custom elements.
- **Tokens = Style-Dictionary -> CSS custom properties.** A single `tokens.json` (mirrors Pencil
  `variables`) compiles to CSS vars consumed by the WC shadow DOM + JS token exports. **One source,
  never forked.**
- **Spread targets (top-5): React, Vue, Svelte, Angular, Solid** wrappers over the WC base.
- **hook-gate = YES (fail-closed).** A PreToolUse hook hard-blocks `Write`/`Edit` to
  `packages/design-system/**` (and the framework packages) until the tokens RFC is `active`.

## When to use CANVAS vs the neighbours

| Use... | When | Primary |
|---|---|---|
| **`/canvas`** (this) | **Design-system -> code**: a Pencil design becomes tokens + Storybook + framework components. The whole Pencil -> DS -> Storybook -> React/Vue/... arc. | CANVAS |
| `/smith` Row 3 -> SPARC | A single well-scoped **feature in an existing active system** (business/application logic, not a design system) | SPARC |
| `/bmad` | **Greenfield** — a brand-new product/service, idea -> shipped, full Analyst -> QA arc | BMAD |
| `/smith` Row 4 -> RIPER | A **bug investigation** / defect hunt in an existing system | RIPER |
| `/laws-of-ux:ux-review` | A **one-shot UX audit** of already-written frontend code (no Pencil, no pipeline) | laws-of-ux |

**Disambiguator.** CANVAS is the only methodology whose source of truth is a **Pencil `.pen` design**
and whose output is a **design-system** (tokens + components), not application logic. If there is no
approved design intent and no `.pen` file, CANVAS refuses — route greenfield product to BMAD, a feature
to SPARC, a bug to RIPER. If the work is just "audit this existing `.tsx` for UX" with no design-system
build, use `/laws-of-ux:ux-review` directly, not CANVAS.

## When /smith routes here

CANVAS is registered with the `/smith` master-orchestrator as the **design-system -> code stage-master**.
When `/smith` inspects intent and sees a **Pencil-to-code / design-system build** context (an approved
`.pen` design + a request to produce tokens/Storybook/framework components), it picks the CANVAS row,
hands off to `canvas-coordinator`, and lets this skill run the C-A-N-V-A-S walk. `/smith` never blends
methodologies — it either routes design-system work **to CANVAS** or routes feature/greenfield/bug work
to SPARC/BMAD/RIPER. The `canvas-coordinator` is the L2 stage-master in that routing; `/smith` is the
master-of-masters above it.

## Prerequisite — run `/canvas-init` once per branch (hook-gate=YES)

The tokens-gate needs `.forgeplan/canvas/state-<branch>.json` to know which packages to guard and
whether the tokens RFC is active. Run **`/canvas-init` once per branch** before the first `/canvas`
cycle. Without it the gate is dormant (allows everything) — `/canvas-init` arms enforcement.

## The contract this runs (ADR-010 C1-C6, specialized for CANVAS)

| C | Element | CANVAS instantiation | Who owns it |
|---|---|---|---|
| **C1** | Entry gate | An **active scope PRD/ADR** defining the DS slice + the canonical `.pen` path + the target framework list; `pencil get_editor_state(include_schema:true)` confirms the schema; `git status` clean-ish. Refuse otherwise (greenfield product -> BMAD; bug -> RIPER; feature logic -> SPARC). | ForgePlan harness — coordinator enforces |
| **C2** | Stage-master | `canvas-coordinator` (opus, Profile B-orchestrator) — **dispatches every phase + every verifier via `Task`**, writes nothing to the product, activates nothing, **owns the per-branch state file** (writes phase + `tokens_active` via `canvas-lib.sh`; the hook only READS). Identical posture to `bmad-orchestrator`. | this skill / the agent |
| **C3** | Phase agents | `canvas-designer` (Capture, Pencil) -> `canvas-porter-storybook` (Vectorize, Pencil read) -> `canvas-coder` (Assemble) -> `canvas-porter-framework` (Spread). **All ordinary `Task` sub-agents** — Pencil MCP runs fine inside a dispatched sub-agent (EVID-179). | agents-canvas |
| **C4** | Independent verifier | Fresh-context sub-agents, generator != verifier: `canvas-guardian` (Audit), `canvas-tester` (Norm-check), tokens gate (`canvas-tester` + `architect-reviewer`), **Storybook gate (`canvas-storybook-validator`)**, code gate (`code-reviewer` + `tester` + `/laws-of-ux:ux-review`), parity gate (`code-reviewer` + `tester`). Freeze/pin on PASS. | agents-canvas + reused reviewers |
| **C5** | Enforcement | **hook-gate=YES** — the `canvas-gate.sh` PreToolUse hook blocks design-system/framework source writes until `tokens_active=true`. The coordinator WRITES that flag via `canvas-lib.sh`; the hook only READS. Binds dispatched agents **and** human/out-of-band edits. | the hook |
| **C6** | EVIDENCE-out | One EVID per gate embedding the C4 verdict + reviewed revision; a terminal Retro EVID pins all reviewed revisions. The coordinator emits `NEEDS_ACTIVATION`; the orchestrator activates. | ForgePlan harness — coordinator emits a sentinel |
| **C7** | FPF substrate | On-demand (`/fpf` for token-system design or framework-choice trade-offs). | orthogonal, callable |

**Invariant:** generator != verifier at every stage (ADR-009) — guaranteed because **every phase AND
every verifier is a `Task` sub-agent in a fresh context**: the producer (e.g. `canvas-coder`) and its
verifier (e.g. `canvas-storybook-validator`) never share a context. There is no main-session-bound
phase to caveat.

## The seven role agents

CANVAS ships one master + **seven** new role agents (design-system roles with no analogue in the set):

- **C3 generators (produce):** `canvas-designer` (Capture/Pencil), `canvas-porter-storybook`
  (Vectorize/tokens+manifest), `canvas-coder` (Assemble/Web-Components), `canvas-porter-framework`
  (Spread/wrappers).
- **C4 verifiers (audit, fresh context):** `canvas-guardian` (Audit — DS conventions), `canvas-tester`
  (Norm-check — traceability vs PRD/ADR/EVID), `canvas-storybook-validator` (Storybook gate — built
  Storybook vs the Pencil oracle, generator != verifier vs `canvas-coder`).

## Procedure

When `/canvas` is invoked, the main session runs this. The main session is the **orchestrator**: it
dispatches the `canvas-coordinator` master and performs the user-gated activations — it does not enact
any phase itself.

### Step 1 — context + precondition (C1)

1. Snapshot state: `forgeplan_health`, `git status`, and (if Hindsight is wired) `memory_recall("project context")`.
2. Confirm an **active scope PRD/ADR** defines the DS slice; confirm the canonical `.pen` path and the
   target framework list; run `pencil get_editor_state(include_schema:true)`.
3. Confirm `.forgeplan/canvas/state-<branch>.json` exists; if not, run `/canvas-init` first.
4. **Refuse** if there is no approved design intent: greenfield product -> BMAD; bug -> RIPER; feature
   logic -> SPARC. If it is a greenfield DS scope with no PRD, route to `specification` to draft +
   activate a PRD first.

### Step 2 — dispatch the master

Dispatch the `canvas-coordinator`; it walks the whole C-A-N-V-A-S arc as separate `Task` sub-agents
(BMAD-shaped — every phase and every verifier is its own isolated context):

```
Task(subagent_type="agents-canvas:canvas-coordinator",
     prompt="""
       Design-system -> code task. Canonical .pen: <path>. DS slice: <scope PRD/ADR>.
       Frameworks: React/Vue/Svelte/Angular/Solid.
       Run the CANVAS walk per RFC-021 / ADR-010 C1-C6. Verify Precondition C1 (active scope PRD/ADR + Pencil reachable).
       Walk (each a separate Task / fresh context):
         canvas-designer (Capture) -> [C4 canvas-guardian Audit + canvas-tester Norm-check] ->
         canvas-porter-storybook (Vectorize) -> [C4 canvas-tester + architect-reviewer Gate V tokens
                                                  -> activate tokens RFC -> set-tokens true (C5 unlock)] ->
         canvas-coder (Assemble) -> [C4 canvas-storybook-validator Gate Storybook]
                                 -> [C4 code-reviewer + tester + /laws-of-ux:ux-review Gate Code] ->
         canvas-porter-framework x5 (Spread — PARALLEL fan-out, one pkg per agent, FR-9)
                                 -> [C4 code-reviewer + tester Gate Parity] ->
         evidence-recorder (Retro C6).
       Sequence by blockedBy on the gate chain; the Spread fan-out is the ONLY parallel step
       (file-disjoint, worktree-isolated, own context). Write phase/tokens transitions via canvas-lib.sh.
       Emit NEEDS_ACTIVATION sentinels; never activate.
       task-id: <id>
     """)
```

See `sections/01-pipeline/_index.md` for the full ordered pipeline (incl. the FR-9 dispatch discipline)
and `sections/02-gates/_index.md` for the per-gate verdict + activation protocol.

### Step 3 — walk the gates with the user

The coordinator returns a structured handoff after each phase (or pauses at a gate). Default is
**ask after each phase** — present the gate verdict + the next phase, let the user confirm or redirect.
On any FAIL, the coordinator returns to the producing phase (3 strikes -> `<<NEED_USER_INPUT>>`).

### Step 4 — activation duty (orchestrator, not the master)

The coordinator emits `NEEDS_ACTIVATION: <ID>` after each C4 PASS (Profile-B agents cannot self-activate).
The **orchestrator** (you, the main session) activates the EVID + the gated artifact via
`forgeplan_activate` — a **user-gated** step (matches our Gate-D / `R_eff>0` culture). **The tokens RFC
activation is the C5 unlock**: only after it is `active` does the coordinator run
`canvas-lib.sh set-tokens <slug> RFC-NNN true`, which lets the hook permit the Coder's design-system
writes. The orchestrator never auto-activates; the coordinator never activates at all.

## Dispatch & parallelism discipline (RFC-021 FR-9)

The master is the **team lead** (Profile B-orchestrator): it owns the task graph, dispatches, and gates;
it never edits product files. Three rules govern sequencing and concurrency:

1. **Sequence by the gate chain (`blockedBy`).** Each phase is dispatched only after the prior phase's
   C4 gate returns PASS. When the master uses Workflow / AgentTeams primitives, this is encoded as
   `blockedBy` dependencies (a phase task is `blockedBy` its predecessor's gate task) — never
   fire-and-forget.
2. **Spread is the SOLE parallel fan-out.** The Capture -> Vectorize -> Assemble spine is **strictly
   serial** — each consumes the prior's frozen-or-pinned output, so those phases are **never run
   concurrently**. Only the **Spread** phase fans out: one `canvas-porter-framework` agent **per
   framework package** (React/Vue/Svelte/Angular/Solid), each
   - owning a **disjoint file set** (its own `packages/canvas-<framework>/` subtree) — strict file
     ownership, no two agents write the same file;
   - running in its **own git worktree** — verify with `git worktree list` differs from `main`, never
     assume isolation took effect;
   - running in its **own fresh context** — no shared mutable state.
   The master seeds each Spread worktree's CANVAS state (`tokens_active=true` + the same
   `guarded_globs`, FR-6) so the hook-gate stays correctly active-and-unlocked in every worktree. The 5
   Spread tasks are **siblings, all `blockedBy` the Code gate PASS**, and **Gate Parity is `blockedBy`
   all 5**.
3. **No cross-phase race.** Because the serial spine consumes pinned outputs, serial phases are never
   started in parallel. The only concurrency is the file-disjoint Spread fan-out above.

Cites the project canon: sprint/wave strict file-ownership, `agents-core:coder` `isolation: worktree`,
the AGENT-AUTHORING-GUIDE Step 11 `affected_files` discipline, and the ground-truth worktree-verify rule.

## The six HARD RULES (always-loaded — Pencil design discipline, RFC-021 FR-2)

1. **Ref-first** — always ref a DS component and customize via `descendants`/`slot`; never build
   primitives from raw frames.
2. **Check-DS-first** — `batch_get({patterns:[{reusable:true}]})` before creating anything; rediscover
   IDs per `.pen` file (doc IDs are file-specific — reference IDs belong to another file and must be
   rediscovered).
3. **<=25 ops per `batch_design`** — split larger work.
4. **Verify-after-every-batch** — `get_screenshot` + `snapshot_layout(problemsOnly:true)`; height-aware
   `nextY = prevY + prevHeight + gap`.
5. **Never-detach-for-minor-edits**, **never-make-a-screen-reusable**.
6. **Never-delete/refactor without user approval** + an OLD-vs-NEW screenshot comparison; **never
   `Read`/`Grep` a `.pen` file** (encrypted — Pencil MCP only).

## What makes CANVAS different from running the agents by hand

- **The tokens-gate.** Until Gate V passes and the tokens RFC is `active`, the `canvas-gate.sh` hook
  **physically blocks** any design-system / framework source write — by an agent OR a human. This
  enforces "no component code against an unfrozen token set", CANVAS's #1 anti-pattern (a forked
  single-source-of-truth).
- **Mandatory independent validation.** Every handoff is gated by a fresh-context reviewer
  (generator != verifier). Every phase — including the Pencil-touching Capture/Vectorize — is itself a
  `Task` sub-agent, so the verifier never shares the producer's context.
- **One coordinated arc.** The coordinator tracks phase + tokens state in `.forgeplan/canvas/state-...`,
  so the arc is a single auditable flow, not a pile of ad-hoc dispatches.

## Design references the agents use

- **getdesign.md** — at design time the `canvas-designer` consults `https://getdesign.md/` via WebFetch:
  a curated catalog of analyzed production DESIGN.md systems (color/typography/component/token
  patterns). **Reference-only** — adapt to our brand, never copy 1:1. Lives in
  `canvas-design/sections/05-style-guides`.
- **context7** — the code-touching agents (`canvas-coder`, `canvas-porter-storybook`,
  `canvas-porter-framework`, `canvas-storybook-validator`, and `canvas-design` where it touches
  Storybook/Style-Dictionary) **MUST** use the context7 MCP (`resolve-library-id` -> `query-docs`) for
  Storybook / Lit / Style-Dictionary / React / Vue / Svelte / Angular / Solid docs **before writing
  code**, and prompt the user to use context7 on any library/version question.
- **laws-of-ux** — the `canvas-designer` proactively loads `laws-of-ux:ux-laws` at design start and the
  Gate Code C4 runs `/laws-of-ux:ux-review` on the generated `*.tsx/*.css`.

## HARD RULES (methodology)

1. **Design-system slices only.** No approved design intent / no `.pen` file -> refuse and route via
   `/smith` (BMAD greenfield / SPARC feature / RIPER bug). The coordinator refuses otherwise (C1).
2. **`/canvas-init` first (per branch).** No state file -> the gate can't guard -> design-system writes
   are unguarded.
3. **The master coordinates; the phase agents produce; the orchestrator activates.** Three roles, never
   collapsed. The coordinator dispatches **every** phase + verifier via `Task` — including the
   Pencil-touching Designer and Storybook-Porter, which are ordinary sub-agents (Pencil MCP works in a
   dispatched sub-agent, EVID-179). The coordinator never writes product files and never activates.
4. **Every handoff is gated by an independent context** (generator != verifier). The C4 validations are
   mandatory, not optional.
5. **Design-system source is unlocked only when the tokens RFC is active.** Until then the hook blocks
   all design-system/framework writes — that is the methodology, not an obstacle. Never flip
   `tokens_active` by hand to "move things along".
6. **Dispatch discipline (FR-9).** Sequence phases via `blockedBy` on the gate chain; the **Spread**
   fan-out is the only parallel step — file-disjoint per-package ownership + git worktree isolation
   (verified, not assumed) + own context; serial phases are never run concurrently.
7. **The six Pencil HARD RULES above are non-negotiable** — ref-first, check-DS-first, <=25 ops,
   verify-after-every-batch, never-detach/never-screen-reusable, never-Read-a-.pen.

## Related

- `canvas-coordinator` agent — the master this skill dispatches (`agents/canvas-coordinator.md`).
- `/canvas-init` — one-time per-branch setup (arms the tokens-gate).
- `/canvas-audit` (Guardian-as-command), `/canvas-review` (post-export code+UX gate), `/canvas-rule`
  (lookup a DS convention / UX law).
- `hooks/scripts/canvas-gate.sh` + `canvas-lib.sh` — the C5 enforcement layer.
- KB skills: `canvas-design` (Pencil designer), `canvas-conventions` (Guardian rules), `canvas-port`
  (Pencil -> Storybook -> framework), `canvas-truth-map` (DS <-> PRD/ADR/EVID),
  `canvas-storybook-test` (the Storybook validator's checks).
- `/laws-of-ux:ux-review` (code-boundary UX gate); `/smith` (the master-of-masters router).
- ADR-010 (the contract), ADR-012 (the hook-gate test warranting the master), RFC-021 (the CANVAS
  instance), the BMAD (RFC-013) / RIPER (RFC-018) sibling instances.
