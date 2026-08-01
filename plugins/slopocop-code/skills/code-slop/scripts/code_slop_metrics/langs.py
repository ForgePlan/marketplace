"""Per-language profile: comment syntax, scoping, idiom guards, thresholds.

Unknown extensions fall back to a generic C-like profile instead of failing,
so the scanner never refuses a file it merely doesn't recognise.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

IDENT = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")

# Names that carry no signal about what they hold. Density of these is a tell.
GENERIC_NAMES = frozenset({
    "data", "result", "temp", "tmp", "obj", "item", "value", "val",
    "helper", "util", "utils", "manager", "handler", "wrapper",
    "foo", "bar", "baz", "thing", "stuff", "info",
})


@dataclass(frozen=True)
class Lang:
    name: str
    line_comment: str
    block_open: str
    block_close: str
    brace_scoped: bool          # {} scoping vs. Python indentation
    comment_ratio_max: float    # above this the comment/code ratio starts to cost
    nesting_max: int            # depth above this starts to cost
    idioms: tuple = ()          # regexes whose lines are exempt from bloat/dup tells


_PY = Lang("python", "#", '"""', '"""', False, 0.45, 5,
           idioms=(re.compile(r'^\s*(#|""")'),))
_JS = Lang("javascript", "//", "/*", "*/", True, 0.30, 4)
_TS = Lang("typescript", "//", "/*", "*/", True, 0.30, 4)
_GO = Lang("go", "//", "/*", "*/", True, 0.38, 4,
           idioms=(re.compile(r'\bif\s+err\s*!=\s*nil\b'),
                   re.compile(r'\breturn\b.*\berr\b')))
_RS = Lang("rust", "//", "/*", "*/", True, 0.30, 5,
           idioms=(re.compile(r'\bmatch\b'), re.compile(r'\bResult<'),
                   re.compile(r'\bOk\(|\bErr\('), re.compile(r'\?;?\s*$')))
_C_LIKE = Lang("generic", "//", "/*", "*/", True, 0.30, 4)

_BY_EXT = {
    ".py": _PY,
    ".js": _JS, ".jsx": _JS, ".mjs": _JS, ".cjs": _JS,
    ".ts": _TS, ".tsx": _TS,
    ".go": _GO,
    ".rs": _RS,
}

SUPPORTED_EXTS = tuple(_BY_EXT.keys())


def for_path(path: str) -> Lang:
    for ext, lang in _BY_EXT.items():
        if path.endswith(ext):
            return lang
    return _C_LIKE


def is_idiom(lang: Lang, line: str) -> bool:
    return any(rx.search(line) for rx in lang.idioms)
