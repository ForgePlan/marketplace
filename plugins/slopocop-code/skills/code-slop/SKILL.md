---
name: code-slop
description: "Detect and strip AI-slop in source code without changing behavior. Use when the user asks to de-slop code, asks 'does this look AI-generated', wants to clean up AI code, run a code slop audit, or check whether a function reads as machine-written. Also fires on Russian requests: 'убери слоп из кода', 'выглядит как ИИ-код', 'почисти сгенерированный код'. Targets the machine-generated fingerprint — over-commenting, defensive bloat, single-use abstractions, generic naming, forced symmetry, ceremony — in JS/TS, Python, Go, Rust, Java, PHP. Pairs a deterministic 0-100 scanner (CI-gateable) with a rewrite mode. NOT a bug-finder (use code-reviewer) and NOT general quality (use simplify)."
license: MIT
---

# code-slop

The code sibling of slopocop (text) and slopocop-design (design). It finds the fingerprint that machine-generated code leaves behind and strips it **without changing behavior**.

## The one question

> **Does this code read as machine-generated or over-engineered, and how do we strip that without changing what it does?**

That is the whole scope. Not "is it correct", not "is it fast", not "is it good" — those are other tools' jobs. code-slop asks only whether the code carries the AI tell, and if so, how to remove the tell while keeping behavior byte-for-byte identical.

## What "slop" means here

AI coding assistants leave a recognizable residue: a comment on every line, a null-check for inputs that cannot be null, an interface with one implementation, three variables named `data`, `result`, and `temp`, a helper extracted for a single caller, and a banner comment fencing off each section. None of it is a bug. All of it is noise that a human author would not have written. code-slop targets exactly that residue.

## Boundary — what this is NOT

code-slop overlaps with three neighbors but is distinct from each. Keep the lanes separate.

| Tool | Question it answers | Changes behavior? | Deterministic score? |
|---|---|---|---|
| **code-slop** (this) | Does this read as machine-generated / over-engineered? | Never | Yes — 0-100 |
| **code-reviewer** | Is this correct? Are there bugs, races, security holes? | May propose logic fixes | No |
| **simplify** (built-in) | Is this good code by general quality standards? | May refactor for quality | No |
| **code-analyzer** | What is the structure / complexity / dependency shape? | No — reports only | Metrics, not a slop verdict |

The sharp line: a fully correct, well-structured, fast function can still be pure slop (over-commented, over-abstracted, generic-named). code-slop flags it; the other three pass it. Conversely, a buggy function with a human fingerprint scores clean on the slop scale — code-slop is silent, code-reviewer is not.

## The 6 tell groups (A-F)

Every slop signal falls into one of six groups. This is the mental index; the full ~35 patterns with before/after examples live in [`references/catalog.md`](references/catalog.md).

- **A · Comments** — a comment on every line, comments restating the code, decorative banner separators, emoji in source. The tell: the code narrates itself.
- **B · Defensive bloat** — null-checks for values that cannot be null, try/except around code that cannot throw, validating inputs already validated upstream, redundant guard clauses. The tell: fear of inputs that do not exist.
- **C · Abstraction** — interfaces/abstract classes/traits with one implementation, factories that build one type, wrappers that only forward, config for one caller. The tell: generality no caller asked for.
- **D · Naming** — generic names (`data`, `result`, `temp`, `obj`, `item`, `helper`, `util`, `manager`, `handler`), over-long descriptive identifiers, `Impl`/`Base` ceremony. The tell: names that describe the type, not the intent.
- **E · Symmetry / rule-of-three** — near-identical copy-pasted blocks with one value swapped, forced parallel structure, exhaustive enumeration where a loop would do. The tell: a template applied three times instead of factored once.
- **F · Ceremony** — `TODO: implement` / `your code here` stubs, empty placeholder bodies, deep nesting where early-return would flatten, wrapper layers with no behavior. The tell: scaffolding left standing after the work is done.

Read [`references/catalog.md`](references/catalog.md) for the exhaustive list, weights, and per-pattern rewrites before doing an audit or a de-slop.

## Language idioms are NOT slop (the #1 correctness rule)

The fastest way to make this skill useless is to flag idiomatic code as slop. Each supported language has patterns that **look** repetitive or defensive but are the correct, expected way to write it. Never flag:

- **Go** — `if err != nil { return err }` and explicit error returns. This is the language, not bloat.
- **Rust** — `Result`/`Option`/`match`/the `?` operator, and `unwrap()`/`expect()` **inside tests**.
- **Python** — required docstrings when a linter (pydocstyle, ruff D-rules) mandates them.
- **TS/JS** — type guards at trust boundaries (API responses, `unknown` narrowing, parse points).

Per-language thresholds apply throughout. The complete idiom allowlist and the threshold table are in [`references/language-idioms.md`](references/language-idioms.md) — consult it before scoring any file, and when in doubt, treat a language idiom as clean.

## The deterministic scanner

`scripts/scan_code.py` computes a 0-100 "human-code" score from exactly ten metrics. The scanner is the CI-gateable half of the skill — same input, same score, no LLM in the loop.

The ten metrics:

1. **comment_ratio** — comment-lines / code-lines, file-wide and per-function. High ratio = slop.
2. **redundant_comment** — a comment whose words are a subset of the next code line (restates the code).
3. **banner_comment** — decorative separator comments (`// =====`, `# -----`, `/* ---- */`).
4. **emoji_in_source** — emoji codepoints outside string literals.
5. **todo_placeholder** — `TODO: implement`, `your code here`, `stub`, empty placeholder bodies.
6. **max_nesting_depth** — deepest block nesting per function.
7. **long_identifier** — any identifier longer than 30 characters.
8. **generic_name_density** — frequency of `data`/`result`/`temp`/`tmp`/`obj`/`item`/`helper`/`util`/`manager`/`handler`/`foo`/`bar`.
9. **single_impl_abstraction** — an interface/abstract/trait declaration, counted at low weight (a heuristic; it does not count implementations across files).
10. **duplicate_block** — near-identical runs of >= 3 lines (copy-paste with one value changed).

**Scoring**: start at 100, apply weighted subtractions per metric, land in a band.

| Band | Score | Meaning |
|---|---|---|
| **clean** | >= 85 | ships as-is |
| **spot-fix** | 60-84 | targeted de-slop, no rewrite |
| **rewrite** | < 60 | pervasive slop, rework the file |

The scanner exits **non-zero when the score is < 60**, so a rewrite-band file fails a CI gate.

**Usage**:

```bash
python3 scan_code.py <file-or-dir>          # human-readable report
python3 scan_code.py <file-or-dir> --json   # machine-readable, for CI
git diff --name-only | python3 scan_code.py -   # score stdin file list
```

Every metric name above is the contract — commands, the agent, and the catalog all use these exact identifiers. Do not rename or invent metrics.

## The two modes

code-slop runs in one of two modes. Detection never edits; rewrite never guesses at behavior.

| Mode | Command | What it does |
|---|---|---|
| **detect-only** | `/code-audit <target>` | Runs the scanner + the A-F tell analysis, returns a ranked findings report with the 0-100 score and band. **Reads only. Never edits.** |
| **rewrite** | `/code-deslop <target>` | Strips the slop the audit found and rewrites the code with **behavior preserved**. |

Use `/code-audit` to see what is slop; use `/code-deslop` to remove it.

## The HARD behavior-preserving rule

This is non-negotiable and it is what separates code-slop from a general refactor tool.

1. **Never change logic.** De-slopping removes comments, collapses one-use abstractions, renames generics, flattens needless nesting, and de-duplicates copy-paste. It does **not** change control flow, alter outputs, "fix" a suspected bug, tighten a type in a way that rejects previously-valid input, or touch anything observable. If a change would alter behavior, it is out of scope — hand it to code-reviewer instead.

2. **After a rewrite, run the test suite.** A de-slop is not done until the existing tests pass on the rewritten code. Run them. If they pass, the behavior-preservation claim is evidenced; if they fail, revert and narrow the change.

3. **If there are no tests, warn loudly.** State explicitly, in the output, that the rewrite could not be verified because the target has no test coverage, and that the user must review the diff by hand before trusting it. Do not present an unverified de-slop as safe. Silence here is the failure mode.

When in doubt about whether a change preserves behavior, do less. A smaller, obviously-safe de-slop beats an aggressive one that might have moved behavior.

## Honest about false positives

Deterministic detection is blunt. A high comment_ratio can be a genuinely gnarly algorithm that earns its explanation. A single-impl interface can be a deliberate seam for a plugin boundary that will grow a second implementation next sprint. A duplicate block can be two cases that only look alike today. The scanner flags the shape; judgment decides. Report findings as "reads as slop, confirm before stripping", not as "this is wrong". The language-idiom allowlist exists precisely because the naive signal over-fires — respect it, and surface uncertainty rather than hiding it.

## Languages

JS/TS, Python, Go, Rust, Java, PHP. Other extensions get a generic C-like profile — the comment/banner/emoji/todo/naming/duplicate/nesting metrics still work; only the per-language idiom exemptions are absent.
