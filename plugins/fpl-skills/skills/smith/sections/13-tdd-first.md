# TDD-first feature (tests frozen before code)

## When this applies

There is an **active SPEC carrying `#### Scenario` blocks** and the user
wants it implemented test-first. Triggers include "TDD", "test-first",
"write the tests first", "enforced TDD", "red-green", "тесты сначала",
"TDD-фича", "сначала тесты потом код". If the design is still open — no
SPEC, or a SPEC with no `#### Scenario`s — route to section 03 (SPARC)
first and come back here once its SPEC is active; SPARC's Refinement
phase delegates here when the work is test-critical. For a one-line fix,
section 05 — the sub-cycle costs more than the change.

## Methodology chain

1. **Primary**: Enforced-TDD sub-cycle — plan → RED → independent certification → freeze → GREEN, with each tier in its own isolated context and a fail-closed PreToolUse gate making test-immutability structural rather than prompt-level. First instance of the AD/AID-PDLC sub-cycle contract (RFC-012 implements ADR-010).
2. **Secondary**: Spec-Driven Development (light path) — the SPEC's `#### Scenario` GIVEN/WHEN/THEN blocks are the primary, reviewed, frozen oracle; the coder turns each scenario into a test and may not edit it.
3. **Tertiary**: Hexagonal Architecture (keeps the unit under test port-shaped and mockable) + Ground-truth verification (generator ≠ verifier) — the discipline the whole row is built on.

## Dispatch sequence

**Precondition (C1), checked before anything is dispatched**: PRD **and**
SPEC both `active`, and the SPEC body carries ≥1 `#### Scenario` block.
No SPEC → no oracle → refuse and route to Specification. Never synthesize
scenarios on the fly: an oracle invented mid-flight defeats the entire
control. Run `/tdd-init` once per project so `.forgeplan/tdd/stack.json`
exists — without it the gate cannot classify test vs source files and is
dormant.

1. **tdd-orchestrator** (Profile B-orchestrator) — coordinates C1–C6: dispatches each tier as a separate isolated Task, enforces a blocking gate between every phase, writes the per-branch phase state via `tdd-lib.sh`. Why first: it coordinates and never executes — the master writing work product would collapse the context separation the row exists to guarantee.
2. **tdd-planner** (Profile A) — produces the test plan artifact from the frozen scenarios: the cases to write, what each asserts, the edge cases, the RED-first ordering. Language-neutral — picks no engine, writes no code. Why second: deciding *what to assert* is a different act from writing the assertion, and mixing them is how a test ends up asserting whatever the implementation happens to do.
3. **coder-tdd** (Profile C-coder, tests) — turns the plan into failing tests in the stack's engine read from `stack.json`. May write source only with a `STUB:TDD` marker (minimal stubs so tests can import). Why third: RED authoring is a pinned behavioural discipline, not a deliberation — valid RED means the test **compiles, executes ≥1 assertion, and fails on that assertion**, never on a compile/collection error.
4. **tdd-test-validator** (Profile B-gate) — certifies in a **fresh context**: every scenario has ≥1 covering test, the RED is valid, the tests are not tautological, assertion strength is adequate, no mock gaps. FAIL returns to step 3; PASS freezes the oracle — the normalized full-file SHA-256 of the SPEC is stamped into `spec_hash`. Why fourth: this is the load-bearing anti-self-grading control — the agent that wrote the tests never certifies them (ADR-009).
5. **coder** (Profile C-coder, reused from `agents-core`) — GREEN: writes source that makes the **frozen** tests pass. It cannot edit test files; if a frozen test is genuinely wrong it STOPS and emits `TEST_BUG: {file}:{line} — {desc}` rather than silently fixing it. Why fifth: only after the oracle is certified and frozen is there anything meaningful to code against.
6. **code-reviewer** (Profile B) — produces line-level review EVID on the implementation. Why sixth: green tests prove the frozen contract is met, not that the code is good.
7. **tester** (Profile B) — produces tester EVID with coverage vs the gate. Why second-to-last: the frozen tests cover the scenarios; coverage answers what the scenarios did not reach.
8. **guardian** (Profile B-gate) — produces gate EVID with PASS/CONCERNS/BLOCKER.

The fail-closed `tdd-gate.sh` PreToolUse hook binds all of them (and any
human editing out of band), per phase: `tdd-plan` denies source **and**
test writes; `tdd-red` allows tests and denies source unless the content
carries `STUB:TDD`; `tdd-green` **denies test writes** — the #1 control —
and blocks source writes if the SPEC's live normalized hash drifted from
the frozen `spec_hash`. Bash write-redirects (`echo > test.py`, `sed -i`,
`tee`) are classified the same as a direct edit. The agents' denylists are
the coarse secondary layer; the hook is the path-and-phase-aware one.

## Evidence requirements

- [ ] active PRD-NNN + active SPEC-NNN with ≥1 `#### Scenario` block (C1, before any dispatch)
- [ ] test plan artifact from `tdd-planner`
- [ ] `tdd-test-validator` EVID with verdict=PASS **plus the frozen normalized SPEC hash** (C4 / RFC-012 FR-6) — before GREEN starts
- [ ] code-reviewer Profile B EVID on the implementation
- [ ] tester EVID with verdict=PASS and coverage ≥ `min_test_coverage` gate
- [ ] BMAD adversarial EVID with ≥1 finding
- [ ] C6 EVIDENCE-out embedding the `tdd-test-validator` PASS verdict **and validator identity** — per ADR-010, EVIDENCE presence alone is not sufficient to unblock the next stage
- [ ] guardian Profile B EVID with verdict=PASS

## Failure modes

1. **The cycle starts on a `draft` SPEC, or one with no `#### Scenario`s.** There is no oracle, so the tests encode whatever the planner imagined and the freeze certifies an invention. **Recovery**: stop at C1; route to Specification (section 03) for a scenario-bearing SPEC; activate it; restart the cycle.
2. **The validator runs in the same context as `coder-tdd`.** The test author certifies its own tests — self-grading, and the anti-cheat property evaporates while the paperwork still says PASS. **Recovery**: discard the verdict; re-dispatch `tdd-test-validator` as a fresh isolated Task; re-certify before any GREEN write.
3. **The oracle is frozen right after RED, before certification.** Uncertified tests become the contract, so a vacuous or tautological test now defines "done". **Recovery**: clear `spec_hash`, return the state to `tdd-red`, run the validator, freeze only on PASS.
4. **A compile or collection error is accepted as valid RED.** The suite "fails", but no assertion ever executed — nothing was proven to test anything, and GREEN unlocks against an empty oracle. **Recovery**: fix the import/compile break in the test tier (`STUB:TDD` stubs exist for exactly this), re-run `test_command`, confirm an assertion-level failure against `red_confirm`.
5. **The SPEC is edited in place mid-GREEN.** The oracle moves under the implementation and requirement history is erased; the gate BLOCKS on hash drift. **Recovery**: never patch a frozen SPEC — write a delta-spec and `/supersede` it (S12), then restart the cycle so a fresh oracle is frozen against the new requirements.
6. **The C6 EVIDENCE exists but does not embed the C4 verdict.** Downstream unblocks on "an EVID is present" instead of "the validator PASSed", and the independent gate becomes ceremonial. **Recovery**: rewrite the EVIDENCE body to quote the validator's verdict and agent identity; re-run `guardian`.

## Example invocation

```
User: "SPEC-014 is active with 7 scenarios for the coupon-stacking rules.
      Implement it test-first — I don't want the implementer touching
      the tests."

Smith: Context=TDD-first feature (row 13). Methodology=Enforced-TDD
       sub-cycle + SDD light path (frozen #### Scenario oracle).
       Precondition C1: PRD-041 active; SPEC-014 active with 7
       #### Scenario blocks; .forgeplan/tdd/stack.json present
       (python / pytest -q / red_confirm=FAILED).
       Dispatch (each tier a separate isolated Task):
       1. tdd-orchestrator → drives C1-C6, writes phase state
       2. tdd-planner → test plan artifact (7 scenarios → 19 cases,
          4 edge cases, RED-first order)                [phase tdd-plan]
       3. coder-tdd → 19 failing tests                  [phase tdd-red]
          valid RED confirmed: 19 collected, 19 assertion failures,
          0 collection errors
       4. tdd-test-validator (fresh context) → EVID
          (1 finding: scenario 5 asserted only the happy path →
          back to coder-tdd → re-certified PASS; all 7 covered)
          → freeze: spec_hash 9f2c1ab4e07d… stamped [phase tdd-green]
       5. coder → source only; 0 test edits (the gate denies them);
          1 TEST_BUG raised and adjudicated by the user, not silently
          fixed
       6. code-reviewer → EVID (1 finding: coupon precedence duplicated
          across two branches — CONCERNS → fixed → PASS)
       7. tester → EVID (coverage 91%, gate 80%, PASS)
       8. guardian → gate EVID (PASS)

       Evidence required: active PRD + active SPEC + test plan +
                          validator EVID with frozen hash +
                          code-reviewer EVID + tester EVID + BMAD EVID +
                          C6 EVIDENCE carrying the C4 verdict +
                          guardian EVID
       Methodology refs: RFC-012 (the enforced-TDD instance)
                         ADR-010 (AD/AID-PDLC sub-cycle contract)
                         ADR-009 (generator ≠ verifier)
                         Kent Beck, TDD: By Example (2002)
```

## References

- `../routing-map.md` — table row #13
- Entry points: `/tdd-init` once per project, then `/tdd` — `plugins/agents-tdd/skills/`
- Enforcement + state: `plugins/agents-tdd/hooks/tdd-gate.sh`, `plugins/agents-tdd/scripts/tdd-lib.sh`, `.forgeplan/tdd/stack.json`, `.forgeplan/tdd/state-<branch>.json`
- RFC-012 — the enforced-TDD pipeline (FR-6: normalized full-file SPEC hash as the frozen oracle)
- ADR-010 — the AD/AID-PDLC sub-cycle contract (C1–C7) this row instantiates first
- ADR-009 / RFC-011 / PROB-002 — generator ≠ verifier + ground-truth verification
- Kent Beck, *Test-Driven Development: By Example* (2002)
- This repo's CLAUDE.md — Sprint Z6 (BMAD adversarial ≥1 finding) + Ground-truth verification discipline
