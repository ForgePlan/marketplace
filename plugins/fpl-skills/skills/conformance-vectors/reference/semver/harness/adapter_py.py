"""Per-language conformance ADAPTER (F2: the adapter, not an LLM, is the sole test runner).
Loads the read-only frozen corpus, drives the pure impl, emits a JSON result."""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "impl", "py"))
from semver import semver_compare  # noqa: E402

with open(os.path.join(HERE, "..", "spec", "corpus.json"), encoding="utf-8") as _f:
    corpus = json.load(_f)  # F5: explicit context manager + encoding

results = {}
operands = set()
for v in corpus["vectors"]:
    results[v["id"]] = semver_compare(v["a"], v["b"])
    operands.add(v["a"])
    operands.add(v["b"])
ops = list(operands)

inv = {}
inv["INV-1"] = all(semver_compare(x, x) == 0 for x in ops)
inv["INV-2"] = all(
    semver_compare(v["a"], v["b"]) == -semver_compare(v["b"], v["a"]) for v in corpus["vectors"]
)
inv["INV-4"] = all(semver_compare(x, x + "+meta") == 0 for x in ops)
trans_ok = True
for i in ops:
    for j in ops:
        for k in ops:
            if semver_compare(i, j) <= 0 and semver_compare(j, k) <= 0 and not (semver_compare(i, k) <= 0):
                trans_ok = False
inv["INV-3"] = trans_ok

print(json.dumps({"lang": "py", "results": results, "invariants": inv}))
