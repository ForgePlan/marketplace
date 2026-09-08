# -*- coding: utf-8 -*-
"""The independent half of the parser cross-check: the same agents, read by a real YAML parser.

Emits the identical JSON shape as parser-crosscheck.js so the two can be diffed byte for byte.
If PyYAML is unavailable the caller is told to SKIP loudly rather than silently pass — an
unavailable verifier is not a passing verifier.
"""
import json, os, pathlib, re, sys

try:
    import yaml
except ImportError:
    print("SKIP: PyYAML not installed — the cross-check cannot run", file=sys.stderr)
    sys.exit(3)

REPO = pathlib.Path(__file__).resolve().parents[4]
MAP = REPO / "plugins/fpl-skills/skills/smith/routing-map.md"
PLUGINS = REPO / "plugins"

text = MAP.read_text(encoding="utf-8")
section = text[text.index("## Agent index"):].split("\n## ")[0]

out = {}
for line in section.split("\n"):
    if not line.strip().startswith("| **"):
        continue
    cells = [c.strip() for c in line.strip().strip("|").split("|")]
    if len(cells) < 3:
        continue
    name = cells[0].replace("*", "").replace("`", "").strip()
    plugin = cells[1].replace("`", "").strip()
    profile = re.sub(r"\s*\(.*\)\s*$", "", cells[2].replace("*", "").replace("†", "").strip())
    if profile.upper().startswith("N/A"):
        continue

    found = sorted((PLUGINS / plugin / "agents").rglob(name + ".md"))
    if len(found) != 1:
        continue

    raw = found[0].read_text(encoding="utf-8")
    fm = yaml.safe_load(raw[3:raw.index("\n---", 3)]) if raw.startswith("---") else None

    def as_list(v):
        if v is None:
            return None
        if isinstance(v, list):
            return sorted(str(x).strip() for x in v)
        return sorted(x.strip() for x in str(v).replace("\n", " ").split(",") if x.strip())

    out[name] = {
        "name": (fm or {}).get("name"),
        "tools": as_list((fm or {}).get("tools")),
        "disallowedTools": as_list((fm or {}).get("disallowedTools")),
    }

print(json.dumps(out, indent=2, ensure_ascii=False))
