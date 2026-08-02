# slopocop-code

**Slop cop for source code.** Detects the machine-generated fingerprint in code and strips it
*without changing behavior*. The code counterpart to [`slopocop`](../slopocop) (text) and
[`slopocop-design`](../slopocop-design) (design) — same cop shape, different beat.

## What it does

- **Detect** AI-slop tells in code — over-commenting, comments that restate the next line, decorative
  banner separators, emoji in source, `TODO: implement` placeholders, deep nesting, 30+ char
  identifiers, `data`/`result`/`temp`/`manager`/`handler` name soup, single-implementation
  abstractions, and copy-paste duplicate blocks — and score human-authorship 0–100.
- **De-slop** — rewrite the fingerprint away while preserving behavior exactly: no API changes, no
  logic changes, no renamed public symbols. Cosmetic and structural cleanup only.
- **Review** — an on-demand `code-slop-cop` agent that runs the scanner and reports a ranked punch list.

**Languages:** JavaScript / TypeScript, Python, Go, Rust, Java, PHP.

## Components

| Kind | Name | Purpose |
|------|------|---------|
| Skill | `code-slop` | Knowledge base: the 10-metric slop contract, per-language thresholds, language-idiom allowlist, de-slop playbook |
| Command | `/code-audit` | Read-only detection pass. Runs the scanner, returns a ranked findings report + 0–100 score. No edits |
| Command | `/code-deslop` | Behavior-preserving rewrite. Strips the fingerprint, keeps the code doing exactly what it did |
| Agent | `code-slop-cop` | On-demand code reviewer — scanner + findings, ranked most-severe first |
| Scanner | `scripts/scan_code.py` | Deterministic 0–100 scorer, CI-gateable, exits non-zero under threshold |

## Install (marketplace)

```
/plugin marketplace add ForgePlan/marketplace
/plugin install slopocop-code@ForgePlan-marketplace
```

## Use

Skills trigger on natural language — "is this code AI-generated", "clean up this slop", "de-slop this
file". Call by name when they don't fire: "run code-slop on this".

Explicit commands:

- `/code-audit <file-or-dir>` — detection report + score, no edits.
- `/code-deslop <file-or-dir>` — rewrite that removes the fingerprint without changing behavior.

## The scanner

The detection half is deterministic — `scripts/scan_code.py`. It computes exactly ten metrics:

1. **comment_ratio** — comment-lines / code-lines (whole file and per-function). High = slop.
2. **redundant_comment** — a comment whose words are a subset of the next code line (restates the code).
3. **banner_comment** — decorative separator comments (`// =====`, `# -----`, `/* ---- */`).
4. **emoji_in_source** — emoji codepoints outside string literals.
5. **todo_placeholder** — `TODO: implement`, `your code here`, `stub`, empty placeholder bodies.
6. **max_nesting_depth** — deepest block nesting per function.
7. **long_identifier** — identifier longer than 30 characters.
8. **generic_name_density** — frequency of `data`/`result`/`temp`/`tmp`/`obj`/`item`/`helper`/`util`/`manager`/`handler`/`foo`/`bar`.
9. **single_impl_abstraction** — interface/abstract/trait with exactly one implementation or use.
10. **duplicate_block** — near-identical runs of ≥3 lines (copy-paste with one value changed).

Score starts at 100; weighted subtractions produce a band: **≥85 clean** / **60–84 spot-fix** /
**<60 rewrite**. The scanner exits non-zero when the score is below 60.

```
python3 <plugin>/skills/code-slop/scripts/scan_code.py file.py
python3 <plugin>/skills/code-slop/scripts/scan_code.py src/ --json
cat file.py | python3 <plugin>/skills/code-slop/scripts/scan_code.py -
```

Because a low score exits non-zero, wire it into pre-commit or CI to keep slop out of the repo.

### Dependencies

None. The scanner is a self-contained regex/heuristic analyzer — pure Python 3, no packages to
install — so it drops straight into pre-commit or CI. `single_impl_abstraction` is a low-weight
declaration-count heuristic (it flags an interface/abstract/trait declaration without cross-scope
implementation counting); an AST-backed pass could sharpen that metric later, but nothing extra is
required today.

## Honest about false positives

Some idioms look like slop but are correct, and the scanner is tuned to **never** flag them:

- **Go** — `if err != nil { return err }` and explicit error returns.
- **Rust** — `Result`/`Option`/`match`/`?`, and `unwrap()`/`expect()` inside tests.
- **Python** — required docstrings when a linter mandates them.
- **TS/JS** — type guards at trust boundaries.

Per-language thresholds apply. When the scanner and your judgment disagree on an idiom, your judgment
wins — the score is a signal, not a verdict.

## The boundary vs code-reviewer and simplify

Different tools, different questions:

- **`code-reviewer`** — finds bugs. *Is it correct?*
- **`simplify`** — general code quality. *Is it well-written?*
- **`slopocop-code`** — the machine-generated fingerprint + a deterministic CI score. *Was this written
  by a human or by a model?*

slopocop-code does not hunt bugs and does not chase general quality. It targets the AI tells and gives
you one gateable number. Run it alongside the other two, not instead of them.

## Not a repackage

slopocop-code is original ForgePlan authorship — the scanner, the metric contract, the skill, the
commands, and the agent were all written for this plugin. There is no upstream project and no upstream
license to preserve.

- **License:** MIT
- **Author:** ForgePlan
