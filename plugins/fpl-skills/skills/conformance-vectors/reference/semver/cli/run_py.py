"""Python runner: reads TSV "a<TAB>b" lines from stdin, prints semver_compare per line."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "impl", "py"))
if os.environ.get("SEMVER_BREAK"):
    from semver_broken import semver_compare
else:
    from semver import semver_compare

out = []
for line in sys.stdin.read().split("\n"):
    if line == "":
        continue
    a, b = line.split("\t", 1)
    out.append(str(semver_compare(a, b)))
sys.stdout.write("\n".join(out) + "\n")
