"""Weighted 0-100 human-code score from merged metrics, per-language aware."""
from __future__ import annotations

from dataclasses import dataclass

from .langs import Lang


@dataclass
class Score:
    score: int
    band: str
    penalties: list  # (points:int negative, reason:str)

    def as_dict(self):
        return {
            "score": self.score,
            "band": self.band,
            "penalties": [{"points": p, "reason": r} for p, r in self.penalties],
        }


def _cap(count, per, limit):
    return min(count * per, limit)


def compute(m, lang: Lang) -> Score:
    pen = []

    def add(pts, reason):
        if pts > 0:
            pen.append((-int(pts), reason))

    over_ratio = m["comment_ratio"] - lang.comment_ratio_max
    if over_ratio > 0:
        add(min(round(over_ratio * 60), 20),
            "comment/code ratio %.2f > %.2f" % (m["comment_ratio"], lang.comment_ratio_max))

    add(_cap(len(m["redundant_comment"]), 3, 15), "%d redundant comment(s)" % len(m["redundant_comment"]))
    add(_cap(len(m["banner_comment"]), 3, 9), "%d banner comment(s)" % len(m["banner_comment"]))
    add(_cap(len(m["todo_placeholder"]), 4, 12), "%d TODO/placeholder(s)" % len(m["todo_placeholder"]))
    add(_cap(len(m["emoji_in_source"]), 5, 10), "%d emoji in source" % len(m["emoji_in_source"]))

    over_nest = m["max_nesting_depth"] - lang.nesting_max
    if over_nest > 0:
        add(_cap(over_nest, 4, 16), "nesting depth %d > %d" % (m["max_nesting_depth"], lang.nesting_max))

    add(_cap(len(m["long_identifier"]), 2, 8), "%d identifier(s) > 30 chars" % len(m["long_identifier"]))

    gd = m["generic_name_density"]
    if gd > 0.06:
        add(min(round((gd - 0.06) * 200), 10), "generic-name density %.3f" % gd)

    add(_cap(m["duplicate_block"], 4, 16), "%d duplicate block(s)" % m["duplicate_block"])
    add(_cap(len(m["single_impl_abstraction"]), 2, 6),
        "%d abstraction(s) to verify (>1 impl?)" % len(m["single_impl_abstraction"]))

    score = max(0, 100 + sum(p for p, _ in pen))
    band = "clean" if score >= 85 else ("spot-fix" if score >= 60 else "rewrite")
    pen.sort()
    return Score(score, band, pen)
