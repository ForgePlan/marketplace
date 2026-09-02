# Design-system → code (CANVAS)

## When this applies

There is an approved design system in a Pencil `.pen` file and the user
wants it in code — tokens, a Storybook, and components in the project's
own framework. Triggers include "design system to code", "Pencil to
Storybook", "port the design to components", "token pipeline", "design
tokens to code", "дизайн-система в код", "перенести дизайн в компоненты",
"Pencil в Storybook". CANVAS refuses without a design source: no approved
design intent and no `.pen` file → route a greenfield product to section
01, feature logic to section 03, a bug to section 04. If the ask is a
one-shot heuristic UX audit of already-written UI with no port and no
token pipeline, use `/laws-of-ux:ux-review` directly instead of this row.

## Methodology chain

1. **Primary**: CANVAS — the master-coordinated **Capture → Audit → Norm-check → Vectorize → Assemble** walk (RFC-021, instance #5 of the ADR-010 sub-cycle contract). **hook-gate=Yes**: a fail-closed PreToolUse hook denies `Write`/`Edit` to the guarded design-system globs until the tokens RFC is `active`, the direct analogue of BMAD's no-code-before-plan.
2. **Secondary**: the single-source token contract — one `tokens.json` mirroring the Pencil variables, compiled to CSS custom properties. Tool-agnostic (Style-Dictionary is one option, never the mandatory one) and **never forked**.
3. **Tertiary**: Storybook in the resolved framework's renderer + visual-regression (Playwright/Chromatic) + the Storybook a11y/axe addon + `/laws-of-ux:ux-review` at the code boundary, plus the conditional-freeze pin pattern borrowed from RIPER for the non-freezable Pencil products.

## Dispatch sequence

**Precondition (C1) + Step 0**: an active scope PRD or ADR defining the DS
slice, the canonical `.pen` path, Pencil MCP reachable, and **the target
framework resolved as an input** — detected from `AGENTS.md` /
`CLAUDE.md` / `package.json` and announced, or force-asked when undeclared
or ambiguous. CANVAS then generates **natively in that one framework**;
Web Components/Lit is one selectable target, not the canon. Run
`/canvas-init` once per branch first — without the per-branch state file
the tokens-gate is dormant and design-system writes are unguarded.

1. **canvas-coordinator** (Profile B-orchestrator) — dispatches every phase **and every verifier** as its own `Task` sub-agent, owns the per-branch state file (phase + `tokens_active`, written via `canvas-lib.sh`; the hook only reads), writes no product and activates nothing. Why first: with the producer and its verifier always in separate contexts, generator ≠ verifier holds by construction rather than by promise.
2. **canvas-designer** (Capture) — produces the DS snapshot + Design NOTE from the Pencil design system. The Pencil products are non-freezable, so they get pinned rather than hashed. Why second: the design is the spec for this row; everything downstream is measured against it.
3. **canvas-guardian** (Profile C reviewer + EVID recorder, Audit) — EVID on **how** the DS was built: refs/slots and no-detach, `$--var` token usage and `Category/Variant` naming, atomic layering, screens-not-reusable, clipping/spacing health. PASS pins the snapshot (C6). Why third: build quality is a separate question from requirement coverage, and answering both at once means one goes unasked.
4. **canvas-tester** (Profile B, Norm-check) — EVID on traceability of the DS against the PRD/ADR/EVID truth: coverage + provenance. Why fourth: the complement to step 3 — step 3 asks "was it built right", step 4 asks "is it the right thing".
5. **canvas-porter-storybook** (Vectorize) — authors the **tokens RFC** (`tokens.json` → CSS-custom-properties contract), the story specs, the visual oracle (reference screenshots) and the port manifest. Why fifth: the contract is written before any component code exists — that is the entire point of the gate.
6. **Gate V** — **tester** (Profile B) + **architect-reviewer** (Profile B) certify the tokens RFC. On PASS the orchestrator activates it and the coordinator sets `tokens_active=true`. Why sixth: this is the C5 unlock — until it lands, no design-system source can be written by an agent **or** a human.
7. **canvas-coder** (Profile C-coder, Assemble) — native component code in the resolved framework + story files + visual-regression tests + the token theme. Why seventh: only against a frozen, active token contract.
8. **canvas-storybook-validator** (Profile C reviewer + EVID recorder, Gate Storybook) — EVID certifying the **built** Storybook against the Pencil source only: story coverage vs the port-manifest variant matrix, visual parity, play/interaction tests, structural a11y (axe), token fidelity (computed styles resolve to the token custom properties, no hardcoded values), coverage thresholds. Why eighth: a fresh context, so the coder never grades its own port.
9. **Gate Code** — **code-reviewer** (Profile B) + **tester** (Profile B) + `/laws-of-ux:ux-review`. Why ninth: token forks, framework residue and UX-law violations are caught at the code boundary, not by eyeball.
10. **evidence-recorder** (Profile B, Retro) — terminal C6 EVIDENCE pinning all reviewed revisions.

The default walk ends here: **native single-framework, no wrappers, no
parallel fan-out** — the Capture → Vectorize → Assemble spine is strictly
serial because each phase consumes the prior's frozen-or-pinned output,
sequenced by `blockedBy` on the gate chain. The optional multi-framework
**Spread** path — `canvas-porter-framework` fanned out one agent per
additional framework package, file-disjoint, worktree-isolated, each
`blockedBy` the code gate, followed by a parity gate before Retro — runs
only on an explicit multi-framework request and is out-of-default
(tracked for a future ADR-016).

The coordinator emits `NEEDS_ACTIVATION` after each C4 PASS; the
orchestrator activates, the master never does. On a FAIL the coordinator
returns to the producing phase; three strikes → `<<NEED_USER_INPUT>>`.

## Evidence requirements

- [ ] active scope PRD or ADR defining the DS slice + the canonical `.pen` path + a resolved target framework (C1 / Step 0)
- [ ] `.forgeplan/canvas/state-<branch>.json` from `/canvas-init` — without it the gate is dormant and the row's one structural control is absent
- [ ] Pencil Design NOTE (non-freezable) + its `## Pinned revision` C4+C6 pin (Audit PASS + Norm-check PASS)
- [ ] canvas-guardian Audit EVID (DS conventions)
- [ ] canvas-tester Profile B EVID (traceability vs PRD/ADR/EVID)
- [ ] tokens RFC-NNN **active before any design-system code write**, certified by the Gate-V EVID (tester + architect-reviewer)
- [ ] canvas-storybook-validator EVID (built Storybook vs the Pencil oracle)
- [ ] Gate-Code EVID (code-reviewer + tester + `/laws-of-ux:ux-review`)
- [ ] BMAD adversarial EVID with ≥1 finding
- [ ] terminal Retro EVIDENCE pinning all reviewed revisions
- [ ] Only on the optional multi-framework Spread path: parity-gate EVID + dogfood EVID (5 concurrent worktrees, disjoint subtrees)

## Failure modes

1. **`/canvas-init` was never run on this branch.** The gate finds no state file, treats CANVAS as inactive, and allows everything — the one structural control is silently off while everyone believes it is on. **Recovery**: run `/canvas-init`; confirm the derived guarded globs match real on-disk directories (a zero-match set must be refused, not persisted); restart from Capture.
2. **Component values are written before the tokens RFC is active.** The single source of truth forks the moment a hardcoded hex or px lands beside the token — CANVAS's #1 anti-pattern, and the reason the gate exists at all. **Recovery**: revert those writes; finish Gate V; activate the tokens RFC; re-run Assemble. If the write got through, the gate was dormant or `tokens_active` was flipped by hand — fix that first.
3. **The framework was assumed instead of resolved.** Step 0 is skipped and CANVAS emits Lit/Web-Components into a React app (or the reverse); every component is framework residue that the project must then unpick. **Recovery**: stop; run Step 0 detection; announce the resolved framework; regenerate the Assemble output natively; re-run the Storybook and Code gates.
4. **The Storybook validator shares a context with the coder.** The producer certifies its own output against the design, so visual parity becomes self-assessment. **Recovery**: re-dispatch `canvas-storybook-validator` as a fresh isolated Task against the Pencil source only; re-issue the gate EVID.
5. **Audit and Norm-check are collapsed into one review.** "The DS looks right" answers the build-quality question and the requirement-coverage question with a single verdict, and one of them is never actually asked. **Recovery**: dispatch both — `canvas-guardian` for conventions, `canvas-tester` for traceability — as separate EVIDs.
6. **A master component is missing and the porter invents one.** A fabricated component has no Pencil provenance, so the visual oracle can never certify it and the divergence surfaces months later as a design/code mismatch. **Recovery**: porter and coder never fabricate — raise a typed PROBLEM and run a scoped re-Capture with `canvas-designer`.

## Example invocation

```
User: "Take the Pencil design system in design/app.pen and turn it into
      our component library — tokens, Storybook, real components."

Smith: Context=design-system → code (row 14). Methodology=CANVAS
       (hook-gate=Yes).
       Precondition C1: PRD-058 (active) scopes the DS slice;
       design/app.pen reachable via Pencil MCP; Step 0 resolves
       framework=react (from package.json, announced);
       /canvas-init armed the tokens-gate on this branch.
       Dispatch (canvas-coordinator walks it; every phase and every
       verifier is its own Task):
       1. canvas-designer → DS snapshot + Design NOTE (non-freezable)
       2. canvas-guardian → Audit EVID (2 findings: 3 detached buttons,
          1 screen marked reusable → fixed → PASS)
          → C6 pin of the snapshot
       3. canvas-tester → Norm-check EVID (every DS section traced to
          PRD-058 FRs; 1 orphan component flagged → PASS)
       4. canvas-porter-storybook → RFC-NNN (tokens.json → CSS custom
          properties, 84 tokens) + story specs + reference screenshots
          + port manifest
       5. Gate V: tester + architect-reviewer → EVID (PASS)
          → orchestrator activates RFC-NNN
          → coordinator sets tokens_active=true → gate unlocks code
       6. canvas-coder → 23 React components + stories +
          visual-regression tests + token theme
       7. canvas-storybook-validator → EVID (coverage 23/23 stories;
          visual parity 21 PASS / 2 diff → returned → re-run PASS;
          axe clean; token fidelity: 0 hardcoded values)
       8. Gate Code: code-reviewer + tester + /laws-of-ux:ux-review
          → EVID (1 UX finding: 32px touch target below the Fitts
          minimum → fixed → PASS)
       9. evidence-recorder → terminal Retro EVIDENCE pinning all
          reviewed revisions

       Default walk ends here — native React, no wrappers, no fan-out.
       Evidence required: Design NOTE + snapshot pin + Audit EVID +
                          Norm-check EVID + active tokens RFC +
                          Gate-V EVID + Storybook-gate EVID +
                          Code-gate EVID + BMAD EVID + Retro EVIDENCE
       Methodology refs: RFC-021 + RFC-022 / ADR-015 (CANVAS,
                                   framework as a Step-0 input)
                         ADR-010 (sub-cycle contract)
                         ADR-012 (the hook-gate test)
                         Laws of UX  https://lawsofux.com
```

## References

- `../routing-map.md` — table row #14
- Entry points: `/canvas-init` once per branch, then `/canvas` — `plugins/agents-canvas/`
- Enforcement + state: `plugins/agents-canvas/hooks/scripts/canvas-gate.sh` + `canvas-lib.sh`, `.forgeplan/canvas/state-<branch>.json`
- RFC-021 — the CANVAS instance; RFC-022 / ADR-015 — the framework, design-source and language resolved as Step-0 inputs; the optional multi-framework Spread path is tracked for a future ADR-016
- ADR-010 — the AD/AID-PDLC sub-cycle contract (C1–C7); ADR-012 — the hook-gate test warranting the master; ADR-009 — generator ≠ verifier
- Laws of UX: https://lawsofux.com — `/laws-of-ux:ux-review` is the code-boundary gate
- Storybook: https://storybook.js.org — renderer matching the resolved framework, a11y/axe addon, play/interaction tests
- This repo's CLAUDE.md — Sprint Z6 (BMAD adversarial ≥1 finding)
