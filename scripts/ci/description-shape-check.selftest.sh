#!/usr/bin/env bash
# Can description-shape-check actually fail?
#
# The gate it guards was written because a truncating slice shipped three mangled descriptions past
# every existing check. A gate that has only ever run on a healthy tree proves nothing about that,
# so this breaks the property on a COPY and requires the checker to notice.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GATE="$REPO_ROOT/scripts/ci/description-shape-check.js"

fails=0
pass() { echo "  ok   $1"; }
fail() { echo "  FAIL $1"; fails=$((fails + 1)); }

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/scripts/ci" "$work/plugins/probe/.claude-plugin" "$work/.claude-plugin"
cp "$GATE" "$work/scripts/ci/"

write() {  # $1 = manifest description, $2 = catalog description
  python3 - "$work" "$1" "$2" <<'PY'
import json, pathlib, sys
root, manifest_desc, catalog_desc = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3]
(root / "plugins/probe/.claude-plugin/plugin.json").write_text(
    json.dumps({"name": "probe", "version": "1.0.0", "description": manifest_desc}, indent=2), encoding="utf-8")
(root / ".claude-plugin/marketplace.json").write_text(
    json.dumps({"metadata": {"version": "1.0.0"},
                "plugins": [{"name": "probe", "version": "1.0.0", "description": catalog_desc}]}, indent=2),
    encoding="utf-8")
PY
}

GOOD="A probe plugin that does a thing. Use when you need the thing done."

# 1. must-NOT-fire — a whole description in the house shape passes.
write "$GOOD" "$GOOD"
if node "$work/scripts/ci/description-shape-check.js" >/dev/null 2>&1; then
  pass "must-NOT-fire  a whole description passes"
else
  fail "a whole description was rejected — false positive"
fi

# 2. must-fire — the exact accident: a slice landing mid-word.
write "A probe plugin that does a thing. Use when you need the StructuredOutput-" "$GOOD"
if node "$work/scripts/ci/description-shape-check.js" >/dev/null 2>&1; then
  fail "gate PASSED on a description cut mid-word — it is not checking anything"
else
  pass "must-fire      a mid-word cut is caught"
fi

# 3. must-fire — the catalog is what users read; a row out of step ships the wrong text.
write "$GOOD" "A probe plugin that does something ELSE entirely. Use when."
if node "$work/scripts/ci/description-shape-check.js" >/dev/null 2>&1; then
  fail "gate PASSED with the catalog out of step with the manifest"
else
  pass "must-fire      a catalog row that disagrees with its manifest is caught"
fi

# 4. must-fire — an empty description is not a short description.
write "" "$GOOD"
if node "$work/scripts/ci/description-shape-check.js" >/dev/null 2>&1; then
  fail "gate PASSED on an empty description"
else
  pass "must-fire      an empty description is caught"
fi

# 5. must-NOT-fire — no "Use when" is a WARNING, not a failure. 18 of 23 descriptions here are in
#    that state; failing on them would be a reform imposed by a gate rather than decided.
write "A probe plugin that does a thing and says nothing about when." "A probe plugin that does a thing and says nothing about when."
if node "$work/scripts/ci/description-shape-check.js" >/dev/null 2>&1; then
  pass "must-NOT-fire  a missing \"Use when\" warns, it does not fail"
else
  fail "a missing \"Use when\" failed the build — that is a reform, not a gate"
fi

echo
if [ "$fails" -eq 0 ]; then
  echo "self-test OK: 5 cases (3 must-fire, 2 must-NOT-fire)"
  exit 0
fi
echo "self-test FAILED: $fails"
exit 1
