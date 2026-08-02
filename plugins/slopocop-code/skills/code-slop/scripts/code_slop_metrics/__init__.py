"""Deterministic AI-code-slop metrics with a 0-100 human-code score.

analyze(text, path) merges the comment / naming / structure metrics for one file
and scores them. Pure Python, no dependencies — regex + line-based heuristics.
"""
from __future__ import annotations

from . import comments, naming
from . import score as _score
from . import structure
from .langs import SUPPORTED_EXTS, for_path

__all__ = ["analyze", "SUPPORTED_EXTS"]


def analyze(text: str, path: str = "<stdin>"):
    lang = for_path(path)
    lines = text.splitlines()
    m = {}
    m.update(comments.scan(lines, lang))
    m.update(naming.scan(lines, lang))
    m.update(structure.scan(lines, lang))
    sc = _score.compute(m, lang)
    return {"path": path, "language": lang.name, "metrics": m, "score": sc}
