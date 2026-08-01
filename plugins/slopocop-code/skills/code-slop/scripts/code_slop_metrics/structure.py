"""Structural metrics: nesting depth, copy-paste blocks, one-impl abstractions.

Line-based fallback. When tree-sitter grammars are installed the scanner prefers
real AST depth and real implementation counts; this module is the floor that
runs everywhere with no dependency.
"""
from __future__ import annotations

import re

from .langs import Lang, is_idiom

_STRING = re.compile(r"""("([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`)""")
_TRAILING_LINE_COMMENT = re.compile(r"\s*//.*$|\s*#.*$")

_ABSTRACTION = {
    "typescript": re.compile(r"\b(interface|abstract\s+class)\s+\w"),
    "javascript": re.compile(r"\babstract\s+class\s+\w"),
    "go": re.compile(r"\btype\s+\w+\s+interface\b"),
    "rust": re.compile(r"\btrait\s+\w"),
    "python": re.compile(r"\bclass\s+\w+\s*\([^)]*\bABC\b|@abstractmethod"),
    "generic": re.compile(r"\binterface\b"),
}


def _clean(line: str) -> str:
    return _TRAILING_LINE_COMMENT.sub("", _STRING.sub('""', line)).strip()


def _nesting_brace(lines):
    depth = 0
    peak = 0
    for raw in lines:
        code = _STRING.sub('""', raw)
        depth += code.count("{") - code.count("}")
        peak = max(peak, depth)
    return max(peak, 0)


def _nesting_indent(lines):
    widths = []
    for raw in lines:
        if not raw.strip():
            continue
        expanded = raw.replace("\t", "    ")
        widths.append(len(expanded) - len(expanded.lstrip(" ")))
    unit = min((w for w in widths if w > 0), default=4) or 4
    return max((w // unit for w in widths), default=0)


def scan(lines, lang: Lang):
    max_nesting = _nesting_brace(lines) if lang.brace_scoped else _nesting_indent(lines)

    # Copy-paste: hash sliding windows of 3 normalised code lines. Idiom lines
    # (Go err-checks, Rust match/Result) are excluded so idiomatic repetition is
    # never mistaken for slop — the #1 false-positive we refuse to make.
    norm = []
    for raw in lines:
        if is_idiom(lang, raw):
            norm.append(None)
            continue
        c = _clean(raw)
        norm.append(c if c else None)
    seen = {}
    dup_blocks = 0
    for i in range(len(norm) - 2):
        window = norm[i:i + 3]
        if any(w is None for w in window):
            continue
        key = "\n".join(window)
        seen[key] = seen.get(key, 0) + 1
        if seen[key] == 2:
            dup_blocks += 1

    rx = _ABSTRACTION.get(lang.name, _ABSTRACTION["generic"])
    abstractions = [i for i, raw in enumerate(lines, 1) if rx.search(raw)]

    return {
        "max_nesting_depth": max_nesting,
        "duplicate_block": dup_blocks,
        "single_impl_abstraction": abstractions,
    }
