---
name: diagnose
description: Disciplined diagnosis loop for hard bugs and performance regressions. Six phases — build feedback loop → reproduce → hypothesise → instrument → fix + regression test → cleanup + post-mortem. Phase 1 (the feedback loop) is the entire skill — everything else is mechanical once you have a fast deterministic pass/fail signal. Use when a bug is non-trivial, intermittent, performance-related, or has resisted obvious fixes. Triggers (EN/RU) — "diagnose this", "debug this", "find the root cause", "performance regression", "intermittent bug", "продиагностируй", "найди причину бага", "отладь", "/diagnose".
---

# Diagnose

Discipline for hard bugs. Skip phases only when explicitly justified — the phases are not stages of a tutorial, they are guardrails against the failure modes that wreck most debugging sessions.

Adapted from Matt Pocock's diagnose skill. Same six-phase structure; integrates with our project-context system.

---

## Project context (read first)

@docs/agents/build-config.md
@docs/agents/paths.md
@CONTEXT.md

`build-config.md` tells you the project's test/typecheck/lint commands — the foundation of any feedback loop. `paths.md` tells you where source and tests live. `CONTEXT.md` gives the domain glossary so hypotheses use the right vocabulary.

If `docs/agents/` is missing — auto-detect from `package.json` / `Cargo.toml` / `go.mod` / `pyproject.toml` / `Makefile`.

---

## When to use

- The bug is non-trivial, intermittent, or has resisted an obvious fix.
- Performance regression — something got slower, no one knows why.
- The user said: "diagnose this", "debug this", "find the root cause", "продиагностируй", "найди причину бага".
- Before [`audit`](../audit/SKILL.md) when reviewing a fix — `audit` checks whether the fix is sound; `diagnose` finds what to fix in the first place.

## When NOT to use

- The bug is obvious from the stack trace and a one-line fix works — just fix it.
- The user wants a code review of an unrelated change — that's [`audit`](../audit/SKILL.md).
- The user wants to map an unfamiliar feature — that's [`research`](../research/SKILL.md).

---

## Phase 1 — Build a feedback loop

**This is the skill. Everything else is mechanical.** If you have a fast, deterministic, agent-runnable pass/fail signal for the bug, you will find the cause — bisection, hypothesis-testing, and instrumentation all just consume that signal. If you don't have one, no amount of staring at code will save you.

Spend disproportionate effort here. **Be aggressive. Be creative. Refuse to give up.**

### Ways to construct one — try them in roughly this order

1. **Failing test** at whatever seam reaches the bug — unit, integration, e2e.
2. **Curl / HTTP script** against a running dev server.
3. **CLI invocation** with a fixture input, diffing stdout against a known-good snapshot.
4. **Headless browser script** (Playwright / Puppeteer) — drives the UI, asserts on DOM/console/network.
5. **Replay a captured trace.** Save a real network request / payload / event log to disk; replay it through the code path in isolation.
6. **Throwaway harness.** Spin up a minimal subset of the system (one service, mocked deps) that exercises the bug code path with a single function call.
7. **Property / fuzz loop.** If the bug is "sometimes wrong output", run 1000 random inputs and look for the failure mode.
8. **Bisection harness.** If the bug appeared between two known states (commit, dataset, version), automate "boot at state X, check, repeat" so you can `git bisect run` it.
9. **Differential loop.** Run the same input through old-version vs new-version (or two configs) and diff outputs.
10. **HITL bash script.** Last resort. If a human must click, drive _them_ with a structured `read -p` loop so the loop is still tight. Captured output feeds back to you.

Build the right feedback loop and the bug is 90% fixed.

### Iterate on the loop itself

Treat the loop as a product. Once you have _a_ loop, ask:

- Can I make it faster? (Cache setup, skip unrelated init, narrow the test scope.)
- Can I make the signal sharper? (Assert on the specific symptom, not "didn't crash".)
- Can I make it more deterministic? (Pin time, seed RNG, isolate filesystem, freeze network.)

A 30-second flaky loop is barely better than no loop. A 2-second deterministic loop is a debugging superpower.

### Non-deterministic bugs

The goal is not a clean repro but a **higher reproduction rate**. Loop the trigger 100×, parallelise, add stress, narrow timing windows, inject sleeps. A 50%-flake bug is debuggable; 1% is not — keep raising the rate until it is.

### When you genuinely cannot build a loop

Stop and say so explicitly. List what you tried. Ask the user for: (a) access to whatever environment reproduces it, (b) a captured artifact (HAR file, log dump, core dump, screen recording with timestamps), or (c) permission to add temporary production instrumentation. Do **not** proceed to hypothesise without a loop.

Do not proceed to Phase 2 until you have a loop you believe in.

---

## Phase 2 — Reproduce

Run the loop. Watch the bug appear.

Confirm:

- [ ] The loop produces the failure mode the **user** described — not a different failure that happens to be nearby. Wrong bug = wrong fix.
- [ ] The failure is reproducible across multiple runs (or, for non-deterministic bugs, reproducible at a high enough rate to debug against).
- [ ] You have captured the exact symptom (error message, wrong output, slow timing) so later phases can verify the fix actually addresses it.

Do not proceed until you reproduce the bug.

---

## Phase 3 — Hypothesise

Generate **3–5 ranked hypotheses** before testing any of them. Single-hypothesis generation anchors on the first plausible idea.

Each hypothesis must be **falsifiable**: state the prediction it makes.

> Format: "If <X> is the cause, then <changing Y> will make the bug disappear / <changing Z> will make it worse."

If you cannot state the prediction, the hypothesis is a vibe — discard or sharpen it.

**Show the ranked list to the user before testing** if they're watching. Domain knowledge re-ranks instantly ("we just deployed a change to #3", "we already ruled out #1 last week"). Cheap checkpoint, big time saver. Don't block on it — proceed with your ranking if the user is AFK or autopilot.

---

## Phase 4 — Instrument

Each probe must map to a specific prediction from Phase 3. **Change one variable at a time.**

Tool preference:

1. **Debugger / REPL inspection** if the env supports it. One breakpoint beats ten logs.
2. **Targeted logs** at the boundaries that distinguish hypotheses.
3. Never "log everything and grep".

**Tag every debug log** with a unique prefix, e.g. `[DEBUG-a4f2]`. Cleanup at the end becomes a single grep. Untagged logs survive; tagged logs die.

**Perf branch.** For performance regressions, logs are usually wrong. Instead: establish a baseline measurement (timing harness, `performance.now()`, profiler, query plan), then bisect. Measure first, fix second.

---

## Phase 5 — Fix + regression test

Write the regression test **before the fix** — but only if there is a **correct seam** for it.

A correct seam is one where the test exercises the **real bug pattern** as it occurs at the call site. If the only available seam is too shallow (single-caller test when the bug needs multiple callers, unit test that can't replicate the chain that triggered the bug), a regression test there gives false confidence.

**If no correct seam exists, that itself is the finding.** Note it. The codebase architecture is preventing the bug from being locked down. Flag this for Phase 6.

If a correct seam exists:

1. Turn the minimised repro into a failing test at that seam.
2. Watch it fail.
3. Apply the fix.
4. Watch it pass.
5. Re-run the Phase 1 feedback loop against the original (un-minimised) scenario.

---

## Phase 6 — Cleanup + post-mortem

Required before declaring done:

- [ ] Original repro no longer reproduces (re-run the Phase 1 loop).
- [ ] Regression test passes (or absence of seam is documented).
- [ ] All `[DEBUG-...]` instrumentation removed (`grep` the prefix).
- [ ] Throwaway prototypes deleted (or moved to a clearly-marked debug location).
- [ ] The hypothesis that turned out correct is stated in the commit / PR message — so the next debugger learns.

**Then ask: what would have prevented this bug?** If the answer involves architectural change (no good test seam, tangled callers, hidden coupling), capture it as a finding and surface to the user — likely a follow-up [`audit`](../audit/SKILL.md) or an [`rfc`](../rfc/SKILL.md) draft. Make the recommendation **after** the fix is in, not before — you have more information now than when you started.

If the bug uncovered a missing project rule (e.g. "always validate inputs at this boundary"), add it to `CONTEXT.md` or `CLAUDE.md` so future sessions don't repeat it.

---

## Output format (final report)

```markdown
# Diagnose: <bug summary>

**Status**: FIXED | PARTIAL FIX | UNRESOLVED
**Time**: <h:mm>  **Phases entered**: 1–6 (or "stopped at Phase N: <reason>")

## Feedback loop
- Type: <test/curl/cli/replay/harness/fuzz/bisect/differential/hitl>
- Speed: <Xs per cycle>  Determinism: <%>  Sharpness: <what it asserts>

## Reproduction
- Symptom: <exact failure mode>
- Rate: <100% / X% / N out of M runs>

## Hypotheses
1. ✅/❌ <H1> — prediction: <…> — verdict: <evidence>
2. ✅/❌ <H2> — prediction: <…> — verdict: <evidence>
3. ✅/❌ <H3> — prediction: <…> — verdict: <evidence>

## Root cause
<one paragraph — what was actually wrong, why>

## Fix
- File: `<path:line>` — <what changed>
- Regression test: `<path>` (or "no correct seam — see Findings")

## Findings
- <architectural / process insights worth surfacing>

## Cleanup
- [ ] Loop removed / archived: <where>
- [ ] DEBUG tags removed: <prefix grepped>
- [ ] Prototypes deleted: <files>
```

---

## Related skills

- [`audit`](../audit/SKILL.md) — for code-quality review of the fix, or for architectural findings surfaced in Phase 6.
- [`research`](../research/SKILL.md) — when the bug area is unfamiliar; do a quick research pass before Phase 1.
- [`restore`](../restore/SKILL.md) — to recover context on the bug area before starting (recent commits, related TODOs).
- [`rfc`](../rfc/SKILL.md) — when Phase 6 surfaces an architectural change worth proposing formally.

---

## Anti-patterns

- ❌ **Skipping Phase 1.** Hypothesising before you can reproduce wastes hours. Build the loop first.
- ❌ **Single hypothesis.** Anchors on the first plausible idea. Always generate 3–5.
- ❌ **Untagged debug logs.** They survive into commits. Tag with a unique prefix you can grep.
- ❌ **Logs for performance bugs.** Logs lie about timing. Use measurements (profiler, `performance.now`, query plan).
- ❌ **Test at the wrong seam.** A passing unit test that doesn't exercise the real bug pattern is false confidence.
- ❌ **"Done" without re-running the original loop.** A green regression test ≠ a fixed bug. Re-run the original repro.
- ❌ **Architectural recommendation before the fix.** You don't know enough yet. Recommend in Phase 6, not Phase 1.
