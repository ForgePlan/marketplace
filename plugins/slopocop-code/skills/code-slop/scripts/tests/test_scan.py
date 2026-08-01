#!/usr/bin/env python3
"""Regression: for every language, the slop fixture must land in the rewrite band
(< 60) and below its clean counterpart, and the clean fixture must land in the
clean band (>= 85). The clean Go/Rust fixtures keep their idioms (err-checks,
Result/match), so this also guards the "idioms are not slop" rule.

Run: python3 test_scan.py   (exit 0 = pass; no pytest needed)
"""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from code_slop_metrics import analyze  # noqa: E402

FIX = HERE / "fixtures"
LANGS = ["py", "ts", "go", "rs"]


def _score(name):
    p = FIX / name
    return analyze(p.read_text(encoding="utf-8"), str(p))["score"]


def _false_positive_checks(failures):
    # Regression for two false positives caught by dogfooding the scanner on its
    # own clean source: prose mentioning "TODO"/"stub" is not a placeholder tell,
    # and aligned multi-line continuations are not block nesting.
    doc = '"""Metrics: banners, TODO stubs, placeholders, emoji."""\ndef f(x):\n    return x\n'
    todo = analyze(doc, "fp_todo.py")["metrics"]["todo_placeholder"]
    if todo:
        failures.append("prose 'TODO stubs' wrongly flagged as todo_placeholder %s" % todo)
    cont = "def f():\n    return call(a, b,\n               c, d,\n               e, g)\n"
    depth = analyze(cont, "fp_nest.py")["metrics"]["max_nesting_depth"]
    if depth > 2:
        failures.append("aligned continuation wrongly counted as nesting depth %d" % depth)

    # duplicate_block must catch real content copy-paste but ignore structural
    # scaffolding (`try/except/return False` runs repeat naturally, not slop).
    real = ("def a(u):\n    total = compute_score(u)\n    save_score(u, total)\n"
            "    notify_user(u, total)\ndef b(u):\n    total = compute_score(u)\n"
            "    save_score(u, total)\n    notify_user(u, total)\n")
    scaf = ("def a(x):\n    try:\n        go(x)\n    except Exception:\n        return False\n"
            "def b(x):\n    try:\n        go2(x)\n    except Exception:\n        return False\n")
    real_dup = analyze(real, "fp_real.py")["metrics"]["duplicate_block"]
    scaf_dup = analyze(scaf, "fp_scaf.py")["metrics"]["duplicate_block"]
    if real_dup < 1:
        failures.append("real content copy-paste not caught (duplicate_block=%d)" % real_dup)
    if scaf_dup != 0:
        failures.append("structural scaffolding wrongly counted as duplicate_block=%d" % scaf_dup)

    print("fp   todo=%s  cont-nesting=%d  real-dup=%d  scaffolding-dup=%d"
          % (todo or "[]", depth, real_dup, scaf_dup))


def main() -> int:
    failures = []
    for ext in LANGS:
        slop = _score("slop." + ext)
        clean = _score("clean." + ext)
        if slop.score >= 60:
            failures.append("slop.%s scored %d, expected < 60" % (ext, slop.score))
        if clean.score < 85:
            failures.append("clean.%s scored %d, expected >= 85" % (ext, clean.score))
        if slop.score >= clean.score:
            failures.append("slop.%s (%d) not below clean.%s (%d)"
                            % (ext, slop.score, ext, clean.score))
        print("%-4s slop=%3d [%-8s]  clean=%3d [%s]"
              % (ext, slop.score, slop.band, clean.score, clean.band))
    _false_positive_checks(failures)
    if failures:
        print("\nFAIL:")
        for f in failures:
            print("  - " + f)
        return 1
    print("\nOK: slop < clean, bands correct, idioms protected across %d languages." % len(LANGS))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
