"""Naming metrics: over-long identifiers and generic-name density."""
from __future__ import annotations

from .langs import GENERIC_NAMES, IDENT, Lang

LONG = 30  # identifiers longer than this read as AI over-description


def scan(lines, lang: Lang):
    long_ids = []
    generic = 0
    total = 0
    for i, raw in enumerate(lines, 1):
        for ident in IDENT.findall(raw):
            total += 1
            if ident.lower() in GENERIC_NAMES:
                generic += 1
            if len(ident) > LONG:
                long_ids.append((i, ident))
    return {
        "long_identifier": long_ids,
        "generic_name_count": generic,
        "generic_name_density": round(generic / total, 4) if total else 0.0,
        "identifier_count": total,
    }
