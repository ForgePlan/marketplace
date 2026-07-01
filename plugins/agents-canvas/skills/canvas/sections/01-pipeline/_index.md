# CANVAS pipeline — the ordered C-A-N-V-A walk

The full phase list the `canvas-coordinator` conducts. Each letter maps to one worker phase; `Intake`
and `Retro` bookend the five. **Cardinal rule:** every phase receives the full accumulated output of all
prior phases (Phase N gets 1..N-1) — the coordinator carries artifact IDs + salient content forward in
each dispatch prompt.

| # | Phase | Letter | Owner | Context | Output |
|---|---|---|---|---|---|
| 0 | **Intake** (C1 entry-gate) | — | `canvas-coordinator` (master) | dispatches | precondition verdict; refuse if no design intent |
| 1 | **Design / Capture** | **C** | `canvas-designer` | SUB (Pencil) | updated `.pen` DS + **DS snapshot** (manifest + screenshots + layout dump) + Design NOTE (non-freezable) |
| 2 | **Audit** + **Norm-check** | **A** + **N** | `canvas-guardian` + `canvas-tester` | SUB (parallel) | DS-build convention EVID + DS<->PRD/ADR/EVID traceability EVID |
| 3 | **Port / Vectorize** | **V** | `canvas-porter-storybook` | SUB (Pencil read) | **port manifest** (token contract + per-component story specs + reference screenshots) |
| 4 | **Code / Assemble** | **A** | `canvas-coder` | SUB | native-framework component code + `*.stories.ts` + unit + visual-regression tests + token theme |
| 5 | **Retro** (C6) | — | `evidence-recorder` | SUB | terminal EVID pinning all reviewed revisions; Hindsight retain; ROADMAP sync |

> **S (Spread) is out-of-default.** The default pipeline generates natively in the project's one
> framework — no master, no per-framework wrappers, no Spread step. A multi-framework wrapper fan-out
> (`canvas-porter-framework`, per-package worktrees + a parity gate) is an OPTIONAL path, dispatched only
> on an explicit multi-framework request (deferred to ADR-016). CANVAS remains the methodology's name.

## Dispatch discipline — all phases are Task sub-agents (RFC-021 FR-9)

- **Every phase AND every verifier is a `Task` sub-agent in a fresh isolated context** — including the
  Pencil-touching Capture (`canvas-designer`) and Vectorize (`canvas-porter-storybook`). Pencil MCP runs
  fine inside a dispatched sub-agent (proven, EVID-179); there is **no** main-session-bound phase. The
  coordinator dispatches the whole walk like `bmad-orchestrator`.
- **Serial spine (never concurrent):** Capture -> Vectorize -> Assemble are strictly serial — each
  consumes the prior's frozen-or-pinned output, so they are never run in parallel.
- **No default parallel fan-out.** Native single-framework output has no master and no per-framework
  wrappers, so the default pipeline is serial end-to-end. The optional multi-framework porter path
  (out-of-default, ADR-016) is the only place a fan-out applies: if the user explicitly requests
  multiple targets, one `canvas-porter-framework` agent runs **per framework package**, each owning a
  **disjoint** `packages/canvas-<framework>/` subtree (strict file ownership), each in its **own git
  worktree** (`git worktree list` differs from `main` — verify, never assume) and its **own fresh
  context**; the master seeds each worktree's CANVAS state (`tokens_active=true` + the same
  `guarded_globs`, FR-6) so the hook-gate stays active-and-unlocked there.
- **Sequencing via `blockedBy`:** each phase is dispatched only after the prior phase's C4 gate returns
  PASS, encoded as `blockedBy` on the gate chain — never fire-and-forget. (In the optional multi-target
  path only, the per-framework wrapper tasks are all `blockedBy` the Code gate PASS and the parity gate
  is `blockedBy` all of them.)

## Ordered pipeline with gates

```
0. Intake (C1)               -> active PRD/ADR + .pen path + frameworks; pencil get_editor_state; git status
1. C  Capture (SUB)          -> design/extend the Pencil DS; verify loop after every batch; export DS snapshot
2. GATE A+N (parallel C4)    -> Guardian (Audit) + Tester (Norm-check), both read-only on the snapshot
                                both PASS -> NEEDS_ACTIVATION (Design NOTE + 2 EVIDs); any FAIL -> back to 1
3. V  Vectorize (SUB)        -> port manifest: Style-Dictionary token contract + story specs + ref screenshots
4. GATE V (C4)               -> Tester + architect-reviewer validate the tokens contract
                                PASS -> NEEDS_ACTIVATION tokens RFC -> [C5 unlock: set-tokens <slug> RFC true]
5. A  Assemble (SUB)         -> native-framework component code + stories + visual-regression tests (only after C5 unlock)
6. GATE Storybook (C4)       -> canvas-storybook-validator: BUILT Storybook vs the Pencil oracle
                                (story coverage, visual parity, play/interaction, a11y/axe, token fidelity, coverage)
7. GATE Code (C4)            -> code-reviewer + tester + /laws-of-ux:ux-review on generated *.ts/*.css
8. Retro (C6)                -> terminal EVID; Hindsight retain; ROADMAP/Current Position sync

   (Optional, out-of-default — only on an explicit multi-framework request, ADR-016:
    S  Spread    -> N canvas-porter-framework agents, one per framework pkg, file-disjoint +
                    worktree-isolated + own context, all blockedBy the Code gate
    GATE Parity  -> code-reviewer + tester parity tests across frameworks (blockedBy all Spread tasks),
                    then Retro.)
```

## Freezable vs non-freezable (declared per phase)

- **Non-freezable** (intermediates — still get a C4 + a C6 record pinning the reviewed revision): the
  Pencil Design NOTE, the DS snapshot, the port manifest. Each carries a `## Pinned revision`
  (a deterministically-normalized hash + verdict) re-checked for freshness at the next gate
  (conditional-freeze, reusing RIPER's pattern — RFC-021 FR-7).
- **Freezable** (frozen-on-activate by the lifecycle): the tokens SPEC/RFC, the Storybook stories +
  tests, the wired framework code.

See `../02-gates/_index.md` for the per-gate verdict + activation + the C5 tokens-unlock protocol.
