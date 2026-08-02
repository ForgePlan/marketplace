#!/usr/bin/env python3
"""Deterministic AI-code-slop scanner: a 0-100 human-code score per file.

Usage:
  python3 scan_code.py path/to/file.py
  python3 scan_code.py path/to/dir
  echo "code" | python3 scan_code.py - --lang python
  python3 scan_code.py file.go --json

The machine half of /code-audit. Prefers tree-sitter when grammars are present;
otherwise a pure-python heuristic runs with no packages. Exits non-zero when any
scanned file scores below --threshold (default 60), so it drops into pre-commit.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from code_slop_metrics import SUPPORTED_EXTS, analyze  # noqa: E402

_SKIP_DIRS = {".git", "node_modules", "venv", ".venv", "target", "dist",
              "build", "__pycache__", ".next", ".pytest_cache"}
_LANG_EXT = {"python": ".py", "js": ".js", "javascript": ".js",
             "ts": ".ts", "typescript": ".ts", "go": ".go", "rust": ".rs",
             "java": ".java", "php": ".php"}


def _iter_files(source):
    p = Path(source)
    if p.is_dir():
        for root, dirs, files in os.walk(p):
            dirs[:] = [d for d in dirs if d not in _SKIP_DIRS]
            for name in sorted(files):
                if name.endswith(SUPPORTED_EXTS):
                    yield os.path.join(root, name)
    else:
        yield str(p)


def _human(rep):
    m, sc = rep["metrics"], rep["score"]
    print("%s  [%s]" % (rep["path"], rep["language"]))
    print("  HUMAN-CODE: %d/100 [%s]" % (sc.score, sc.band))
    for pts, reason in sc.penalties:
        print("    %+d %s" % (pts, reason))
    if not sc.penalties:
        print("    no penalties")
    rows = [
        ("redundant comments", ", ".join("L%d" % n for n in m["redundant_comment"][:8])),
        ("banner comments", ", ".join("L%d" % n for n in m["banner_comment"][:8])),
        ("todo/placeholder", ", ".join("L%d" % n for n in m["todo_placeholder"][:8])),
        ("emoji in source", ", ".join("L%d" % n for n in m["emoji_in_source"][:8])),
        ("long identifiers", ", ".join("L%d %s" % (n, name) for n, name in m["long_identifier"][:4])),
        ("duplicate blocks", str(m["duplicate_block"]) if m["duplicate_block"] else ""),
        ("max nesting", str(m["max_nesting_depth"])),
        ("generic-name density", str(m["generic_name_density"]) if m["generic_name_density"] > 0.06 else ""),
    ]
    shown = [(k, v) for k, v in rows if v]
    if shown:
        print("  findings:")
        for k, v in shown:
            print("    %s: %s" % (k, v))
    print()


def main() -> int:
    ap = argparse.ArgumentParser(description="Deterministic AI-code-slop scanner")
    ap.add_argument("source", help="file, directory, or '-' for stdin")
    ap.add_argument("--lang", help="language for stdin (python|js|ts|go|rust)")
    ap.add_argument("--threshold", type=int, default=60, help="fail below this score")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    args = ap.parse_args()

    reports = []
    if args.source == "-":
        ext = _LANG_EXT.get((args.lang or "").lower(), "")
        reports.append(analyze(sys.stdin.read(), "<stdin>%s" % ext))
    else:
        if not Path(args.source).exists():
            print("[error] not found: %s" % args.source, file=sys.stderr)
            return 2
        for path in _iter_files(args.source):
            try:
                reports.append(analyze(_read_file(path), path))
            except OSError as exc:
                print("[warn] skip %s: %s" % (path, exc), file=sys.stderr)

    if not reports:
        print("No supported source files found (%s)." % ", ".join(SUPPORTED_EXTS))
        return 0

    worst = min(r["score"].score for r in reports)

    if args.json:
        out = [{"path": r["path"], "language": r["language"],
                "score": r["score"].as_dict(), "metrics": r["metrics"]} for r in reports]
        print(json.dumps({"files": out, "worst": worst,
                          "threshold": args.threshold}, ensure_ascii=False, indent=2))
        return 1 if worst < args.threshold else 0

    print("=== slopocop-code scan ===\n")
    for r in sorted(reports, key=lambda r: r["score"].score):
        _human(r)
    verdict = "PASS" if worst >= args.threshold else "FAIL"
    print("Summary: %d file(s), worst %d/100. %s (threshold %d)."
          % (len(reports), worst, verdict, args.threshold))
    print("  (>=85 clean - 60-84 spot-fix - <60 rewrite)")
    return 1 if worst < args.threshold else 0


def _read_file(path):
    return Path(path).read_text(encoding="utf-8", errors="replace")


if __name__ == "__main__":
    raise SystemExit(main())
