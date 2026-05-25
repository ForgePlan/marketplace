# Bug fix — trivial / hotfix

## When this applies

The bug is mechanically obvious and the fix is small: typo, off-by-one,
broken link, wrong env var name, missing null-check on a clearly nullable
path. Triggers include "typo", "hotfix", "broken link", "off-by-one",
"опечатка", "хотфикс". If the bug involves race conditions, intermittent
failures, or anything where you would have to **debug** to understand the
fix, route to section 04 (production bug) instead. The trivial fast-path
is a conscious risk-cost trade-off; do not abuse it for non-trivial bugs.

## Methodology chain

1. **Primary**: Tactical fast-path — no formal methodology, no PRD, no ADR. `/methodology-check` automatically scopes Tactical artifacts to S12+S13 only (S10 FPF + S11 BMAD marked N/A).
2. **Secondary**: None — the whole point of this row is to *not* pay methodology overhead.
3. **Tertiary**: None.

## Dispatch sequence

1. **coder** (Profile C-coder) — implements the fix directly. Why first: there is no spec/design phase; the fix is mechanical.
2. **code-reviewer** (Profile B) — produces line-level review EVID. Why second: even tactical fixes get one Profile B pair of eyes; this is the one non-negotiable gate.

That's the entire sequence. No `guardian` for purely tactical depth — the
`code-reviewer` EVID is the gate. No `tester` Profile B EVID required, but
the coder MUST run existing tests locally and report green in the PR
description (a regression test is welcomed but not gated).

## Evidence requirements

- [ ] code-reviewer Profile B EVID with verdict=PASS (single finding line acceptable if the fix is truly trivial; reviewer must explicitly state what was checked)
- [ ] PR description with existing-tests-green confirmation

Explicitly **not** required for tactical depth:

- ~~PRD~~ — N/A
- ~~RFC~~ — N/A
- ~~ADR~~ — N/A (unless the fix accidentally surfaces an architectural smell; then route to section 07 separately)
- ~~ADI EVID~~ — N/A per S10 scoping for tactical artifacts
- ~~BMAD adversarial EVID with ≥1 finding~~ — N/A; code-reviewer EVID suffices
- ~~tester Profile B EVID~~ — N/A; coder runs tests
- ~~guardian gate EVID~~ — N/A; code-reviewer EVID is the gate

## Failure modes

1. **The "trivial" fix turns out to be non-trivial mid-implementation.** Coder realises the typo is hiding a real bug. **Recovery**: stop, re-route to section 04 (production bug); do not silently upgrade the depth without re-routing — that defeats the methodology-check gate.
2. **Fix is technically correct but breaks a downstream consumer.** No tester EVID required, so the breakage isn't caught until prod. **Recovery**: this is the accepted risk of the tactical path; if the failure mode keeps biting, escalate the depth to Standard.
3. **Reviewer approves without reading because "it's trivial".** Pattern: rubber-stamping. **Recovery**: code-reviewer Profile B EVID body must explicitly state what was checked (the LR-8 Profile B canon and Sprint Z6 rules apply even at tactical depth — "no findings" is acceptable only with ≥2 sentences explaining the check).
4. **Team uses the tactical path to ship a feature.** A "fix" that adds new behaviour is not a fix. **Recovery**: route to section 03 (feature) instead; tactical path is for repairing existing behaviour, not adding new behaviour.

## Example invocation

```
User: "We have a typo in our marketing landing page. 'Recieve' instead
      of 'Receive' in the hero copy."

Smith: Context=bug-fix-trivial (row 5). Methodology=tactical fast-path.
       Dispatch:
       1. coder → fix the typo + run existing tests locally
       2. code-reviewer → EVID (verified spelling fix matches design copy;
          no regression; coverage unchanged; PASS)

       Evidence required: code-reviewer EVID with PASS verdict
       Methodology refs: N/A — tactical depth per /methodology-check
                         scopes S10/S11 as N/A; only S12+S13 (structure +
                         automation) apply

User: "We have an off-by-one in our pagination — last page shows 0 items
      instead of being hidden."

Smith: Context=bug-fix-trivial (row 5) IF the cause is genuinely a one-line
       arithmetic fix. Verify with coder before committing to the row:
       1. coder reads the pagination code → confirms it's `idx >= total`
          should be `idx > total` → 1-line fix
       2. code-reviewer → EVID (PASS, regression test optional but added)

       If coder discovers the off-by-one is masking a deeper bug
       (e.g. total count is itself off by one due to a JOIN issue),
       smith re-routes to section 04 (production bug, non-trivial).
```

## References

- `../routing-map.md` — table row #5
- This repo's CLAUDE.md — `/methodology-check` Tactical scoping (Sprint Z10)
- This repo's CLAUDE.md — Sprint Z6 (Profile B EVID `## Findings` rules apply even tactically)
- No external methodology source — the fast-path is a deliberate absence of methodology
