---
name: code-audit
description: Read-only AI-slop detection for source code. Runs the deterministic 0-100 human-code scanner, then reads the target against the code-slop catalog respecting per-language idioms, and returns a ranked Critical/Warning/Suggestion punch list. Never edits. Languages — JS/TS, Python, Go, Rust.
---

# Code Audit Command

You detect the AI-authorship fingerprint in source code and report it — you do **not** rewrite. The
user gets a diagnosis and a score, not an edit. Rewriting is `/code-deslop`.

This is distinct from `code-reviewer` (which hunts bugs) and the built-in `simplify` (general
quality). You target one thing: the machine-generated tells, and you give a deterministic CI score.

## Step 1 — Get the target

The target is whatever the user passed: a file, a directory, a diff, or "the file I just wrote". If a
path is given, use it. For a diff, audit the changed files (or the changed hunks when the user scopes
it that way). If nothing is given, ask what to audit and stop.

## Step 2 — Detect the language

By file extension: `.js/.jsx/.ts/.tsx` → JS/TS, `.py` → Python, `.go` → Go, `.rs` → Rust. A mixed
directory is fine — the scanner and the catalog are per-language. Anything outside the v1 set (JS/TS,
Python, Go, Rust) — say so and skip it rather than guess.

## Step 3 — Run the machine half (the scanner is the base)

Before your own reading, run the deterministic scanner that ships with the `code-slop` skill:

```
python3 <code-slop skill dir>/scripts/scan_code.py <target> --json
# single file, dir, or diff-changed files; stdin via:  cat file.py | python3 <...>/scan_code.py -
```

- If it runs, take its output as the numeric base — the **0-100 human-code score**, the band
  (`>=85` clean / `60-84` spot-fix / `<60` rewrite), and the per-line findings tagged with the
  metric that fired. Exit code is non-zero when the score is `<60` — that is the CI gate signal;
  quote it. Layer your own reading on top for the semantic tells the regex/tree-sitter base can't
  judge (false positives, single_impl_abstraction with one real use, dup blocks that are coincidence).
- If `python3` is missing or the scanner errors, tell the user once, then **audit by catalog anyway**
  — the audit must happen regardless. Estimate the score by the same weighting the scanner uses
  (start 100, weighted subtractions per metric), and say the score is your estimate, not the
  scanner's.

The scanner computes exactly these ten metrics — name them identically in your report:

| Metric | Fires on |
|---|---|
| `comment_ratio` | comment-lines / code-lines too high (file or per-function) |
| `redundant_comment` | a comment whose words are a subset of the next code line |
| `banner_comment` | decorative separators (`// =====`, `# -----`, `/* ---- */`) |
| `emoji_in_source` | emoji codepoints outside string literals |
| `todo_placeholder` | "TODO: implement", "your code here", "stub", empty placeholder bodies |
| `max_nesting_depth` | deepest block nesting per function too deep |
| `long_identifier` | identifier longer than 30 chars |
| `generic_name_density` | data/result/temp/tmp/obj/item/helper/util/manager/handler/foo/bar |
| `single_impl_abstraction` | interface/abstract/trait with exactly ONE impl or use |
| `duplicate_block` | near-identical runs of >=3 lines (copy-paste, one value changed) |

## Step 4 — Read against the catalog, honoring idioms

Load the `code-slop` skill, its catalog, and the language-idioms baselines. Walk the tells the scanner
flagged plus the semantic ones it can't score. Mark concrete instances only — the ones actually there.

**The #1 correctness rule: idiomatic code is NOT slop.** Never flag these:

- **Go** — `if err != nil { return err }` and explicit error returns. This is the language, not bloat.
- **Rust** — `Result`/`Option`/`match`/`?`, and `unwrap()`/`expect()` *inside tests*.
- **Python** — required docstrings when a linter mandates them.
- **TS/JS** — type guards at trust boundaries (parsing input, API edges).

Per-language thresholds apply — a comment_ratio that is slop in Go may be normal in a documented
Python module. If the scanner flagged an idiom as a finding, drop it and note the false positive.
Over-flagging is itself a failure.

## Step 5 — Report (no edits)

```
# Code Audit

**Target**: [file / dir / diff]
**Language**: [JS/TS | Python | Go | Rust | mixed]
**Human-code score**: [N]/100 — [clean >=85 / spot-fix 60-84 / rewrite <60]
**Scanner**: [ran (exit N) / estimated: reason]

## Critical  (drags the score into rewrite territory)
- `file:line` — **metric_name** — what it is, one-line fix

## Warning
- `file:line` — **metric_name** — ...

## Suggestion
- `file:line` — **metric_name** — ...

## Verdict
1-3 sentences: is this human-written or machine-fingerprinted? The 2-3 tells that most give it away.
If it's clean, say so plainly and stop.
```

Rules:
- Every finding carries `file:line`, the exact `metric_name` that fired, and a one-line fix.
- Group by severity, worst first. A `<60` score means the file needs a rewrite pass, not spot-fixes.
- Never edit here. For the fix, point to `/code-deslop`.
- Honor false positives out loud — a clean, idiomatic file gets a clean verdict. Do not manufacture
  findings to justify a lower score, and do not flag Go/Rust idioms as tells.
