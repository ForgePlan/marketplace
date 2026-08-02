"""Structural metrics: nesting depth, copy-paste blocks, one-impl abstractions.

Line-based, dependency-free heuristics. max_nesting_depth and
single_impl_abstraction are approximations (no AST) — enough for a slop signal
and they run everywhere with no packages.
"""
from __future__ import annotations

import re

from .langs import IDENT, Lang, is_idiom

# A line that carries no identifier beyond structural scaffolding — a bare brace,
# a control-transfer, a catch/else header — is not "content". Runs of these repeat
# naturally in any non-trivial code (`} catch { / return false; / }`), so counting
# them as copy-paste is a false positive. duplicate_block ignores them.
_STRUCT_TOKENS = frozenset({
    "return", "continue", "break", "catch", "else", "finally", "try", "do",
    "if", "for", "while", "case", "default", "switch", "match",
    "true", "false", "null", "nil", "none", "undefined",
})

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


def _scaffolding(cleaned: str) -> bool:
    return not [t for t in IDENT.findall(cleaned) if t.lower() not in _STRUCT_TOKENS]


def _nesting_brace(lines):
    depth = 0
    peak = 0
    for raw in lines:
        code = _STRING.sub('""', raw)
        depth += code.count("{") - code.count("}")
        peak = max(peak, depth)
    return max(peak, 0)


def _nesting_indent(lines):
    # True block depth via an indentation-level stack, not indent/unit division
    # (a single misaligned line poisons a fixed unit and inflates every depth).
    # Continuation lines entered while brackets are open — multi-line calls, dicts,
    # lists aligned far right — are skipped, the classic flat-code-looks-nested tell.
    levels = [0]
    peak = 0
    bracket = 0
    for raw in lines:
        stripped = raw.strip()
        if bracket <= 0 and stripped and not stripped.startswith("#"):
            expanded = raw.replace("\t", "    ")
            width = len(expanded) - len(expanded.lstrip(" "))
            if width > levels[-1]:
                levels.append(width)
            else:
                while len(levels) > 1 and width < levels[-1]:
                    levels.pop()
            peak = max(peak, len(levels) - 1)
        code = _TRAILING_LINE_COMMENT.sub("", _STRING.sub('""', raw))
        bracket += code.count("(") + code.count("[") + code.count("{")
        bracket -= code.count(")") + code.count("]") + code.count("}")
    return peak


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
        norm.append(c if c and not _scaffolding(c) else None)
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
