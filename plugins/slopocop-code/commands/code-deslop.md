---
name: code-deslop
description: Behavior-preserving rewrite that strips the AI-slop layer from source code — redundant comments, defensive bloat, one-impl abstractions, generic names, banners, emoji, duplicate blocks — WITHOUT changing logic, control flow, or outputs. Audits first, shows a diff, requires the test suite after. Languages — JS/TS, Python, Go, Rust, Java, PHP.
---

# Code Deslop Command

You strip the machine-generated fingerprint out of code and leave behavior byte-for-byte identical.
This command edits. For detection only, use `/code-audit`.

This is not `simplify` (general quality) and not `code-reviewer` (bugs). You remove one layer — the
slop — and nothing else.

## Step 1 — Read the target and audit it first

Read the target (file, dir, diff, or "the file I just wrote"). Run the `/code-audit` logic first so you
know exactly what to strip and what the before-score is — run the deterministic scanner
(`python3 <code-slop skill dir>/scripts/scan_code.py <target> --json`), then read against the
`code-slop` catalog and the language-idioms baselines. Do not start rewriting until you have the audit.

## Step 2 — The HARD RULE (overrides every other instinct)

**Never alter logic, control flow, or outputs.** You touch the slop layer only. That means you may:

- delete `redundant_comment` and `banner_comment` lines, remove `emoji_in_source`
- remove defensive bloat that cannot change behavior (a guard for a case the caller already excludes,
  a re-check of something just checked) — only when you can prove it is dead
- inline a `single_impl_abstraction` that has exactly one implementation or one use
- rename `generic_name_density` / `long_identifier` offenders to concrete names
- collapse a `duplicate_block` into one parameterized unit **when the two blocks are truly identical
  bar one value**
- resolve a `todo_placeholder` only if the intended behavior is unambiguous; otherwise leave it and
  flag it

If a change would alter any observable output, an error path, evaluation order, or public API — **do
not make it.** When in doubt, leave the code and note it in the changelist. A behavior change is a
bug, not a deslop.

## Step 3 — Respect per-language idioms (do not "simplify" idiomatic code)

Never rewrite these — they are the language, not slop:

- **Go** — `if err != nil { return err }` and explicit error returns stay verbatim.
- **Rust** — `Result`/`Option`/`match`/`?`; `unwrap()`/`expect()` in tests stay.
- **Python** — linter-mandated docstrings stay.
- **TS/JS** — type guards at trust boundaries stay.

Do not "tidy" idiomatic error handling into something terser. That is a behavior-risking change and a
correctness failure of this tool.

## Step 4 — Show the diff

Present the rewrite as a diff so the change is auditable. Every removed line should be visibly slop
(comment, banner, emoji, dead guard, redundant abstraction) or a rename — never a logic edit. If the
diff contains a control-flow or output change, you broke the HARD RULE; roll it back.

## Step 5 — Require the test suite (behavior-preservation is a claim until proven)

After rewriting, **run the test suite** — `go test`, `pytest`, `cargo test`, `npm test`, whatever the
project uses. A behavior-preserving rewrite is only preserving if the tests still pass on the same
inputs.

- Tests pass → report it, deliver.
- Tests fail → your rewrite changed behavior. Revert the offending change and try again.
- **No tests exist → warn loudly.** State plainly: "behavior-preservation is UNVERIFIED — there are no
  tests, so I cannot prove this rewrite is safe." Do not present the rewrite as verified. Suggest the
  user run the code or add a characterization test before trusting it.

## Step 6 — Deliver

Return the rewritten code (or write it back if the user asked), then:

- a short **changelist** — 3-6 bullets, what fingerprint you removed and why it is behavior-neutral
- **before/after score** — "was N/100 → now M/100" from the scanner so the improvement is measurable
- the **test result** — passed / failed-and-reverted / no-tests-warning

Do not over-explain. The rewrite is the product; the changelist is a caption. If the file was already
clean (`>=85`), say so and change nothing rather than inventing edits.
