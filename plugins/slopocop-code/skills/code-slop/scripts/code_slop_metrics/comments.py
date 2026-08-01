"""Comment-layer metrics: ratio, redundant restating, banners, TODO stubs, emoji.

Line-based and approximate by design: it strips obvious string literals before
looking for comment markers, which is enough for a slop signal without a full
lexer. tree-sitter (when grammars are present) supersedes this via structure.py.
"""
from __future__ import annotations

import re

from .langs import IDENT, Lang

_STRING = re.compile(r"""("([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`)""")
_BANNER = re.compile(r"(.)\1{3,}")           # 4+ repeats of one char: ==== ---- ####
_TODO = re.compile(
    r"\b(todo|fixme)\b\s*:?\s*(implement|add|fill|finish|your code|here)?"
    r"|your\s+code\s+here|implement\s+me|\bstub\b|\bplaceholder\b",
    re.IGNORECASE,
)
_EMOJI = re.compile(
    "["
    "\U0001F300-\U0001FAFF"
    "\U00002600-\U000027BF"
    "\U0001F000-\U0001F0FF"
    "\U00002190-\U000021FF"
    "\U00002B00-\U00002BFF"
    "]"
)
_STOP = frozenset({"the", "a", "an", "to", "of", "is", "in", "for", "and", "this", "that", "we", "it"})


def _strip_strings(line: str) -> str:
    return _STRING.sub('""', line)


def _words(text: str) -> set:
    return {w.lower() for w in IDENT.findall(text) if w.lower() not in _STOP and len(w) > 1}


def scan(lines, lang: Lang):
    """Return a dict of comment findings, each a list of 1-based line numbers."""
    lc = lang.line_comment
    bopen, bclose = lang.block_open, lang.block_close
    py_doc = lang.name == "python"

    code_lines = 0
    comment_lines = 0
    redundant, banner, todo, emoji = [], [], [], []

    in_block = False
    prev_comment_text = None
    prev_comment_line = 0

    for i, raw in enumerate(lines, 1):
        line = raw.rstrip("\n")
        stripped = line.strip()
        if not stripped:
            prev_comment_text = None
            continue

        # Block comments (and Python docstrings) count as comment lines but are
        # never "redundant" — a docstring restating a signature is a weak tell we
        # leave to the catalog, not the deterministic gate.
        if in_block:
            comment_lines += 1
            if bclose in stripped:
                in_block = False
            continue
        if not py_doc and stripped.startswith(bopen) and bclose not in stripped:
            in_block = True
            comment_lines += 1
            continue

        is_comment = stripped.startswith(lc) or (py_doc and stripped.startswith('"""'))
        if _EMOJI.search(_strip_strings(line)):
            emoji.append(i)

        if is_comment:
            comment_lines += 1
            body = stripped[len(lc):] if stripped.startswith(lc) else stripped.strip('"')
            if _BANNER.search(body.strip()) and len(_words(body)) <= 1:
                banner.append(i)
            if _TODO.search(body):
                todo.append(i)
            prev_comment_text = body
            prev_comment_line = i
            continue

        code_lines += 1
        code = _strip_strings(line)

        # Trailing comment on a code line.
        idx = code.find(lc)
        trailing = code[idx + len(lc):] if idx != -1 else ""
        if trailing and _TODO.search(trailing):
            todo.append(i)

        code_words = _words(code[:idx] if idx != -1 else code)
        # A comment (above or trailing) whose words are a subset of the code it
        # annotates is restating the code — the classic AI redundant comment.
        for ctext, cline in ((prev_comment_text, prev_comment_line), (trailing, i)):
            if not ctext:
                continue
            cw = _words(ctext)
            if len(cw) >= 2 and cw <= code_words:
                redundant.append(cline)
        prev_comment_text = None

    return {
        "code_lines": code_lines,
        "comment_lines": comment_lines,
        "comment_ratio": round(comment_lines / code_lines, 3) if code_lines else 0.0,
        "redundant_comment": sorted(set(redundant)),
        "banner_comment": banner,
        "todo_placeholder": sorted(set(todo)),
        "emoji_in_source": emoji,
    }
