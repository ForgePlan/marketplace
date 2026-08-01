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
    if failures:
        print("\nFAIL:")
        for f in failures:
            print("  - " + f)
        return 1
    print("\nOK: slop < clean, bands correct, idioms protected across %d languages." % len(LANGS))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
