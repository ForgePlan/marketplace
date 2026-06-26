# CANVAS gates — the C4 verdicts, activation duty, and the C5 tokens-unlock

CANVAS has **five C4 gates** across the walk (A+N, tokens, Storybook, Code, Parity) plus a terminal
**C6 Retro**. Each C4 gate is run by a fresh-context sub-agent (generator != verifier, ADR-009). A gate
emits a verdict, an EVID, and — on PASS — a `NEEDS_ACTIVATION` sentinel the orchestrator acts on. The
coordinator **never activates**; activation is a user-gated main-session step. Gates are sequenced by
`blockedBy` on the chain (a phase is dispatched only after the prior phase's gate PASSes); the Spread
fan-out's 5 tasks are all `blockedBy` the Code gate, and Gate Parity is `blockedBy` all 5 (FR-9 — see
`../01-pipeline/_index.md`).

## The gates

| Gate | After phase | Verifier(s) (SUB, fresh context) | Checks | On PASS |
|---|---|---|---|---|
| **A + N** | Capture | `canvas-guardian` + `canvas-tester` (parallel) | A: DS-build conventions (refs/slots/tokens/naming/atomic layering/no-clipping/no-screen-reusable). N: DS vs PRD/ADR/EVID coverage + provenance. | `NEEDS_ACTIVATION`: Design NOTE + both EVIDs |
| **V (tokens)** | Vectorize | `canvas-tester` + `architect-reviewer` | The Style-Dictionary token contract is complete, theme-correct (Mode:Light/Dark axes), and traceable to the ADR palette decisions. **Certify only — they do NOT author the tokens RFC.** | `NEEDS_ACTIVATION`: tokens SPEC/RFC -> **C5 unlock** |
| **Storybook** | Assemble | `canvas-storybook-validator` | The **BUILT Storybook vs the Pencil source ONLY** (Figma = future seam): (1) story coverage vs the port-manifest variant matrix; (2) visual parity vs Pencil reference screenshots (visual-regression); (3) play/interaction tests; (4) structural a11y via the axe addon (WCAG); (5) token fidelity (computed styles resolve to Style-Dictionary CSS vars, no hardcoded); (6) coverage thresholds. **Generator != verifier vs `canvas-coder`.** | `NEEDS_ACTIVATION`: the validated Storybook |
| **Code** | Assemble | `code-reviewer` + `tester` + `/laws-of-ux:ux-review` | Generated `*.ts/*.css` quality, visual-regression vs reference screenshots, UX-law compliance at the code boundary, `slot`/`descendants` semantics honored. The `/laws-of-ux:ux-review` heuristic UX pass is **distinct from** the Storybook gate's structural axe a11y check — they are not conflated. | `NEEDS_ACTIVATION`: the Assemble products (WC code + stories) |
| **Parity** | Spread | `code-reviewer` + `tester` | Each target framework renders the variant matrix equivalently; the token contract is not forked. | `NEEDS_ACTIVATION`: framework packages |
| **Retro (C6)** | Spread done | `evidence-recorder` | Terminal EVID pins all reviewed revisions; Hindsight retain; ROADMAP sync. | terminal exit |

## Verdict protocol (every gate)

1. Each verifier returns a binary **PASS / CONCERNS / BLOCKER** plus a `## Findings` section (>=1
   finding, each with a node-id or `file:line` + a concrete fix) and an EVID body with `## Structured
   Fields` (verdict, congruence_level, evidence_type) — without those the parser silently scores CL0 and
   R_eff collapses to 0.1.
2. **CONCERNS / BLOCKER** -> the coordinator returns to the **producing phase** with the specific
   findings; it does not advance. Three failed strikes on one phase -> emit `<<NEED_USER_INPUT>>` with
   the concrete blocker (do not grind).
3. **PASS** -> the coordinator emits `NEEDS_ACTIVATION: <ID>`; the orchestrator (main session) activates
   the EVID + the gated artifact via `forgeplan_activate` (user-gated, `R_eff>0` required).

## The C5 tokens-unlock (the hook-gate=YES lever)

This is the one gate with a **hard enforcement side-effect**. Until Gate V passes and the tokens RFC is
`active`, the `canvas-gate.sh` PreToolUse hook **denies every write** to `packages/design-system/**` and
the framework wrapper packages — for a dispatched agent AND a human hand-edit.

Sequence on Gate V PASS:

```
1. canvas-tester + architect-reviewer return PASS on the tokens contract (certify only)
2. coordinator emits NEEDS_ACTIVATION: RFC-NNN (the Style-Dictionary tokens RFC)
3. orchestrator (user-gated) activates the EVID + the tokens RFC via forgeplan_activate
4. coordinator runs:  bash hooks/scripts/canvas-lib.sh set-tokens <slug> RFC-NNN true
5. the hook now ALLOWS design-system writes -> canvas-coder is dispatched (Assemble)
```

`state.tokens_active` is written `true` ONLY after the Gate-V EVID verdict is PASS **AND** the tokens RFC
is `active` (the unlock is bound to a verified PASS, not a bare boolean — ADR-010 C6). The coordinator
**writes** the flag through `canvas-lib.sh`; the hook only **reads** it. Never flip the flag by hand to
"move things along" — that defeats C5. For a throwaway spike before the unlock, write under a
`.canvas-scratch/` segment (always allowed); for a legitimate non-design-system edit, set a logged
override (`CANVAS_GATE_OVERRIDE=1` or `canvas-lib.sh set-override <slug> true`).

**Per-branch state + the Spread fan-out (FR-6 x FR-9).** Because the hook keys state by branch and each
Spread writer runs in its own worktree/branch, the coordinator MUST seed each Spread worktree's
`state-<branch>.json` with `tokens_active=true` + the same `guarded_globs` immediately after creating
the worktree — so the hook-gate is active-and-unlocked in every worktree, never silently inert and never
falsely denying the post-tokens framework writes.

## Why the gates are real (generator != verifier)

Every phase AND every verifier is a `Task` sub-agent in a fresh context — including the Pencil-touching
Capture (`canvas-designer`) and Vectorize (`canvas-porter-storybook`); Pencil MCP works in a dispatched
sub-agent (proven, EVID-179). The Storybook gate (`canvas-storybook-validator`) reads the **BUILT
Storybook + the exported Pencil reference**, never the producer's (`canvas-coder`'s) working state.
Generator != verifier is guaranteed by the context boundary, full stop — there is no main-session
generation to caveat.

See `../01-pipeline/_index.md` for the ordered phase list this gates.
