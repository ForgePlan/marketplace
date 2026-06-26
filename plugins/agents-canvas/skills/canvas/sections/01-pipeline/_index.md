# CANVAS pipeline — the ordered C-A-N-V-A-S walk

The full phase list the `canvas-coordinator` conducts. Each letter maps to one worker phase; `Intake`
and `Retro` bookend the six. **Cardinal rule:** every phase receives the full accumulated output of all
prior phases (Phase N gets 1..N-1) — the coordinator carries artifact IDs + salient content forward in
each dispatch prompt.

| # | Phase | Letter | Owner | Context | Output |
|---|---|---|---|---|---|
| 0 | **Intake** (C1 entry-gate) | — | `canvas-coordinator` (master) | dispatches | precondition verdict; refuse if no design intent |
| 1 | **Design / Capture** | **C** | `canvas-designer` | SUB (Pencil) | updated `.pen` DS + **DS snapshot** (manifest + screenshots + layout dump) + Design NOTE (non-freezable) |
| 2 | **Audit** + **Norm-check** | **A** + **N** | `canvas-guardian` + `canvas-tester` | SUB (parallel) | DS-build convention EVID + DS<->PRD/ADR/EVID traceability EVID |
| 3 | **Port / Vectorize** | **V** | `canvas-porter-storybook` | SUB (Pencil read) | **port manifest** (token contract + per-component story specs + reference screenshots) |
| 4 | **Code / Assemble** | **A** | `canvas-coder` | SUB | Storybook code (Web Components) + `*.stories.ts` + unit + visual-regression tests + token theme |
| 5 | **Spread** | **S** | `canvas-porter-framework` | SUB x5 (parallel fan-out, FR-9) | React/Vue/Svelte/Angular/Solid wrappers + parity tests |
| 6 | **Retro** (C6) | — | `evidence-recorder` | SUB | terminal EVID pinning all reviewed revisions; Hindsight retain; ROADMAP sync |

## Dispatch discipline — all phases are Task sub-agents (RFC-021 FR-9)

- **Every phase AND every verifier is a `Task` sub-agent in a fresh isolated context** — including the
  Pencil-touching Capture (`canvas-designer`) and Vectorize (`canvas-porter-storybook`). Pencil MCP runs
  fine inside a dispatched sub-agent (proven, EVID-179); there is **no** main-session-bound phase. The
  coordinator dispatches the whole walk like `bmad-orchestrator`.
- **Serial spine (never concurrent):** Capture -> Vectorize -> Assemble are strictly serial — each
  consumes the prior's frozen-or-pinned output, so they are never run in parallel.
- **Sole parallel fan-out — Spread:** one `canvas-porter-framework` agent **per framework package**
  (React/Vue/Svelte/Angular/Solid), each owning a **disjoint** `packages/canvas-<framework>/` subtree
  (strict file ownership — no two agents write the same file), each in its **own git worktree**
  (`git worktree list` differs from `main` — verify, never assume) and its **own fresh context**. The
  master seeds each worktree's CANVAS state (`tokens_active=true` + the same `guarded_globs`, FR-6) so
  the hook-gate stays correctly active-and-unlocked there.
- **Sequencing via `blockedBy`:** each phase is dispatched only after the prior phase's C4 gate returns
  PASS, encoded as `blockedBy` on the gate chain — never fire-and-forget. The 5 Spread tasks are all
  `blockedBy` the Code gate PASS; **Gate Parity is `blockedBy` all 5**.

## Ordered pipeline with gates

```
0. Intake (C1)               -> active PRD/ADR + .pen path + frameworks; pencil get_editor_state; git status
1. C  Capture (SUB)          -> design/extend the Pencil DS; verify loop after every batch; export DS snapshot
2. GATE A+N (parallel C4)    -> Guardian (Audit) + Tester (Norm-check), both read-only on the snapshot
                                both PASS -> NEEDS_ACTIVATION (Design NOTE + 2 EVIDs); any FAIL -> back to 1
3. V  Vectorize (SUB)        -> port manifest: Style-Dictionary token contract + story specs + ref screenshots
4. GATE V (C4)               -> Tester + architect-reviewer validate the tokens contract
                                PASS -> NEEDS_ACTIVATION tokens RFC -> [C5 unlock: set-tokens <slug> RFC true]
5. A  Assemble (SUB)         -> Web Component code + stories + visual-regression tests (only after C5 unlock)
6. GATE Storybook (C4)       -> canvas-storybook-validator: BUILT Storybook vs the Pencil oracle
                                (story coverage, visual parity, play/interaction, a11y/axe, token fidelity, coverage)
7. GATE Code (C4)            -> code-reviewer + tester + /laws-of-ux:ux-review on generated *.ts/*.css
8. S  Spread (SUB x5, FR-9)  -> 5 canvas-porter-framework agents, one per framework pkg, file-disjoint +
                                worktree-isolated + own context, all blockedBy the Code gate
9. GATE Parity (C4)          -> code-reviewer + tester parity tests across frameworks (blockedBy all 5 Spread tasks)
10. Retro (C6)               -> terminal EVID; Hindsight retain; ROADMAP/Current Position sync
```

## Freezable vs non-freezable (declared per phase)

- **Non-freezable** (intermediates — still get a C4 + a C6 record pinning the reviewed revision): the
  Pencil Design NOTE, the DS snapshot, the port manifest. Each carries a `## Pinned revision`
  (a deterministically-normalized hash + verdict) re-checked for freshness at the next gate
  (conditional-freeze, reusing RIPER's pattern — RFC-021 FR-7).
- **Freezable** (frozen-on-activate by the lifecycle): the tokens SPEC/RFC, the Storybook stories +
  tests, the wired framework code.

See `../02-gates/_index.md` for the per-gate verdict + activation + the C5 tokens-unlock protocol.
