# Agent & tooling anti-patterns — the design traps

These are the ways an agent definition or a verification chain quietly fails. The deep frontmatter canon lives in `../agents/frontmatter.md` + `../agents/tools-and-denylist.md` (and `plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md` for the full canon). These are the recurring mistakes.

## T1 — generator == verifier (grading your own homework)

**The trap**: the agent (or session) that produced an outcome also confirms it — the coder says "tests pass", and that claim is taken as proof. No independent reviewer reads the ground truth.

**Why it bites**: a verification done by the producer inherits the producer's blind spots. The motivating incident (PROB-002): a worker self-reported success, downstream trusted the report, the gap surfaced much later. This is the same failure class as Claude Code issue [#44035](https://github.com/anthropics/claude-code/issues/44035).

**The fix**: **generator ≠ verifier** (ADR-009). A Profile B reviewer is mandatory even when the coder self-reports "ALL CHECKS PASS" (ML-13). The reviewer checks the claim against frozen external ground truth it reads itself — the git object store for code, `forgeplan_get` for an artifact mutation — and pastes the literal probe output into a `## Ground-truth verification` EVID section that the guardian gate re-checks. Reference: repo CLAUDE.md "Ground-truth verification discipline"; `AGENT-AUTHORING-GUIDE.md` § "Rationale — generator ≠ verifier".

## T2 — vacuous green (empty diff = null result, not a pass)

**The trap**: a green test suite is reported as a pass — but `git diff base..head` is empty. Nothing changed, so of course nothing broke.

**Why it bites**: a suite stays green when *nothing changed*. "Tests pass" on an empty diff is a **null result**, not evidence the claimed change works. It reads identically to a real pass, so it slips through unless someone checks the diff. Scanners being clean does not rescue it.

**The fix**: empty diff on a claimed change = **BLOCKER**, even when tests are green. The reviewer asserts a non-empty delta and names the expected token the change must introduce, then greps for it. Run the git probe under `bash --noprofile --norc` and resolve the root with `git -C <cwd> rev-parse --show-toplevel` — never assume `$CLAUDE_PROJECT_DIR` is itself a git repo. Miniature proof: `sandbox-verify/r3-reviewer-groundtruth-smoke.sh`.

## T3 — denylist holes (allowlist coverage ≠ denylist must-contain)

**The trap**: trusting that a forgeplan-aware agent is locked down because its tools validate. A Profile A/B/D agent that denies `forgeplan_activate` but forgets to also deny `Write`/`Edit`/`NotebookEdit` can still write straight to `.forgeplan/<kind>/`, bypassing the MCP path.

**Why it bites**: lint rules that only check *allowlist coverage* never catch a *missing denial*. Sprint V shipped exactly this hole to CI — the rules confirmed what was spec'd but not what should be spec'd (ML-13 again). File edits to artifacts also silently lose against LanceDB (the real source of truth, not the `.md` projection).

**The fix**: Profile A/B/D agents MUST deny `Write`, `Edit`, `NotebookEdit` in addition to `forgeplan_activate` — enforced by the LR-8 lint rule. Use `disallowedTools:` (denylist), never `tools:` (allowlist) — the allowlist physically broke MCP propagation (Anthropic #53865). Verify on-disk with `grep` after any frontmatter change; never accept a sub-agent's "applied" report (T1). Reference: `AGENT-AUTHORING-GUIDE.md` "Why disallowedTools, not tools".

## T4 — shipping an unverified gate (no negative control)

**The trap**: writing a fail-closed gate (a `PreToolUse` hook, a guardian verdict row) and shipping it after confirming only that it *allows* legitimate work. The deny path is never exercised.

**Why it bites**: a gate that has only ever been seen to pass is indistinguishable from a gate that always passes. Without a negative control — a deliberately-bad input that MUST be blocked — you do not know the gate blocks anything. A silently fail-open gate is worse than none, because it manufactures false confidence.

**The fix**: every gate ships with a negative control proving it denies. The ground-truth gate has `sandbox-verify/r3-reviewer-groundtruth-smoke.sh` (green tests + empty diff → BLOCKER); the LR-8 rule shipped with a synthetic violator that fired the exact error. If you cannot show the gate rejecting a bad case, it is not verified. See `../hooks/fail-closed.md`.

## Related

- `hooks-and-mcp.md` — the gate-mechanics side (exit codes, fail-open)
- `process.md` — vacuous green as a process discipline; the self-report trap
- `../agents/tools-and-denylist.md` — the B2 denylist canon (and `../agents/profiles.md` for the per-profile sets)
