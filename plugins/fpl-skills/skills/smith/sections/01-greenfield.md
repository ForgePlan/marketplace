# Greenfield bootstrap

## When this applies

The user is starting a brand-new project or service with no existing
codebase, no legacy gravity, and no inherited domain model. Triggers
include "new project", "from scratch", "bootstrap a service", "новый
проект", "с нуля". If any sentence in the user's framing mentions an
existing system to integrate with, the context is **not** greenfield —
route to brownfield (section 02) or feature (section 03) instead.

## Methodology chain

1. **Primary**: BMAD-METHOD (trimmed) — gives the canonical Analyst-PM-Architect-Dev role split that maps cleanly onto our Profile A creator chain.
2. **Secondary**: GitHub Spec Kit — spec-first scaffolding (`spec/`, `plan/`, `tasks/` + AGENTS.md) for cross-CLI portability from day one.
3. **Tertiary**: ADR/MADR + C4 L1+L2 — once the architecture is non-trivial (≥3 modules per Sprint Z9), every irreversible decision gets a full ADR with C4 diagrams.

## Dispatch sequence

Step-by-step, with each agent's role:

1. **brief-intake** (Profile A) — produces structured Brief NOTE. Why first: every downstream agent needs the user's intent in writing, not in chat history. Brief frames goals, non-goals, target users, and constraints.
2. **specification** (Profile A) — produces PRD-NNN from the Brief. Why second: BMAD's Analyst → PM handoff happens here; the PRD becomes the canonical source for goals, FRs, and acceptance criteria.
3. **adr-architect** (Profile A) — produces ADR(s) for boundary decisions (storage, language, deployment target). Why third: foundational choices must be recorded before the RFC, otherwise the RFC has implicit unjustified premises. Auto-dispatches `c4-diagram` skill for ≥3-module decisions.
4. **architecture** (Profile A) — produces RFC-NNN from the PRD + ADRs. Why fourth: SPARC's Architecture phase here gives the team a fleshed-out design that respects the ADR boundaries.
5. **goal-planner** (Profile A) — produces task DAG from PRD + RFC. Why fifth: turns design into actionable units, partitioned so `coder` agents can run in parallel via `isolation: worktree`.
6. **coder** (Profile C-coder) — produces source files implementing the DAG. Why sixth: only writes after the spec + design + plan are gated; can be dispatched in parallel waves.
7. **tester** (Profile B) — produces tester EVID with coverage % vs `min_test_coverage` gate. Why second-to-last: tests must exist and pass before any review can be meaningful.
8. **guardian** (Profile B-gate) — produces gate EVID with PASS/CONCERNS/BLOCKER. Why last: aggregates all prior Profile B reviews (code-reviewer, tester, architect-reviewer) into a single activation decision.

## Evidence requirements

What must exist before activation:

- [ ] PRD-NNN (Standard+ depth, ≥3 hypotheses ADI EVID per S10)
- [ ] RFC-NNN (with explicit affected-modules list)
- [ ] ≥1 ADR-NNN (foundational tech choice) with C4 L1+L2 diagrams at `docs/c4/ADR-NNN.md` if ≥3 modules
- [ ] BMAD adversarial EVID with ≥1 finding per S11 (from `artifact-reviewer`)
- [ ] tester EVID with verdict=PASS and coverage ≥ `min_test_coverage` gate
- [ ] `guardian` Profile B EVID with verdict=PASS

## Failure modes

1. **The team skips brief-intake and dives into specification.** The PRD ends up missing target users or non-goals, and the downstream RFC has to be re-derived from chat history. **Recovery**: stop, dispatch `brief-intake` retroactively to produce a Brief NOTE, then re-run `artifact-reviewer` on the PRD to confirm alignment.
2. **ADRs get written after the RFC instead of before.** The RFC reads like a fait accompli; foundational decisions are described as "we chose X" without alternatives. **Recovery**: extract every "we chose" sentence in the RFC into a draft ADR, run `forgeplan_reason` to surface the ≥3 alternatives that *should* have been considered, then ratify or reverse each.
3. **`coder` is dispatched before the DAG is gated.** Code lands but doesn't map to a clear task; PR reviewers can't tell what acceptance criterion each commit satisfies. **Recovery**: pause coder dispatch, complete `goal-planner`, link each new commit to a DAG node post-hoc, and rerun `code-reviewer`.
4. **C4 diagrams are skipped for an ≥3-module ADR.** `adr-architect` Step 5b.1 should have auto-dispatched `c4-diagram`; if it didn't, `guardian` flags CONCERNS. **Recovery**: dispatch `c4-diagram` in Dispatch mode with the modules list; produce `docs/c4/ADR-NNN.md`; re-run guardian.
5. **AGENTS.md is missing.** Cross-CLI portability degrades; users on Cursor/Codex can't read project context. **Recovery**: copy the canonical scaffold from `plugins/fpl-skills/templates/AGENTS.md` (Wave 1C deliverable) into the repo root; reference CLAUDE.md from it.

## Example invocation

```
User: "I want to start a payment service from scratch. Stripe-style API,
      multi-tenant, PCI-DSS scope-out via tokenisation."

Smith: Context=greenfield (row 1). Methodology=BMAD-trim + Spec Kit.
       Dispatch:
       1. brief-intake → Brief NOTE (target users: API consumers; non-goals:
          card storage, PCI-DSS scope-in; constraints: multi-tenant)
       2. specification → PRD-NNN (FRs: tokenise, charge, refund, webhook)
       3. adr-architect → ADR-NNN (Tokenisation provider) +
                          ADR-NNN+1 (Multi-tenancy isolation strategy) +
                          c4-diagram skill (L1+L2 for both ADRs, 3+ modules)
       4. architecture → RFC-NNN (Hexagonal layering, port-per-adapter)
       5. goal-planner → task DAG (12 nodes, 4 parallel groups)
       6. coder × 4 (Profile C-coder, isolation: worktree) → source files
       7. tester → tester EVID (coverage 87%, gate min=80%, PASS)
       8. guardian → gate EVID (PASS, links to 2 ADRs, RFC, PRD, BMAD EVID)

       Evidence required: PRD + RFC + 2× ADR + 2× C4 file + ADI EVID +
                          BMAD EVID + tester EVID + guardian EVID
       Methodology refs: BMAD-METHOD https://github.com/bmad-code-org/BMAD-METHOD
                         Spec Kit    https://github.com/github/spec-kit
                         MADR        https://adr.github.io/madr/
                         C4 model    https://c4model.com
```

## References

- `../routing-map.md` — table row #1
- BMAD-METHOD: https://github.com/bmad-code-org/BMAD-METHOD
- GitHub Spec Kit: https://github.com/github/spec-kit
- C4 Model: https://c4model.com
- MADR: https://adr.github.io/madr/
- This repo's CLAUDE.md — Sprint Z9 (C4 auto-recommend) + Sprint Z6 (BMAD adversarial)
