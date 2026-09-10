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

# 5. must-NOT-fire — a description that never says when to use it WARNS, it does not fail. Failing
#    on it would be a reform imposed by a gate rather than decided.
#
#    Asserting only the exit code here would prove nothing: the check could have been deleted and
#    this case would still pass. So the warning text itself must appear.
write "A probe plugin that does a thing and never says the w-word." "A probe plugin that does a thing and never says the w-word."
out="$(node "$work/scripts/ci/description-shape-check.js" 2>&1)"; rc=$?
if [ "$rc" -ne 0 ]; then
  fail "a missing when-to-use failed the build — that is a reform, not a gate"
elif ! grep -q "when to use it" <<<"$out"; then
  fail "no warning was emitted — the check is not running, and case 5 would pass with it deleted"
else
  pass "must-NOT-fire  a missing when-to-use warns (and the warning is emitted), it does not fail"
fi

# 6. must-NOT-fire — the check looks for the PROPERTY, not the phrase. "Use only if …" and
#    "Use before …" both tell a reader when to reach for the plugin; an earlier version demanded
#    the literal words "use when" and flagged two honest descriptions.
write "A probe plugin that does a thing. Use only if you already depend on it." "A probe plugin that does a thing. Use only if you already depend on it."
out="$(node "$work/scripts/ci/description-shape-check.js" 2>&1)"
if grep -q "when to use it" <<<"$out"; then
  fail "\"Use only if …\" was flagged — the check asserts wording, not the property"
else
  pass "must-NOT-fire  \"Use only if …\" counts as saying when"
fi

echo
if [ "$fails" -eq 0 ]; then
  echo "self-test OK: 6 cases (3 must-fire, 3 must-NOT-fire)"
  exit 0
fi
echo "self-test FAILED: $fails"
exit 1
