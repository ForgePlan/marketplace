#!/usr/bin/env bash
# ===========================================================================
# Negative control for check-unicode-safety.js
# ===========================================================================
# The gate used to report "passed" without saying over how many files. That
# reads identically whether it scanned the whole repository or nothing at all,
# which is how a scan gate goes quietly blind. It now counts its coverage and
# refuses a zero-coverage pass; this proves all three behaviours.
#
# TWO PROPERTIES OF THIS FILE ARE DELIBERATE:
#
#   1. Fixtures are generated into a temp directory, never committed. A
#      committed fixture holding a smuggling codepoint would be found by the
#      REAL gate on every run — the test material would break the thing it
#      tests.
#   2. This file is pure ASCII. Every fixture character is built from its
#      CODEPOINT at runtime, never typed literally. Writing the zero-width
#      space directly here poisoned the repository on the first attempt and
#      the real gate caught it at line 38 — the same trick the gate's own
#      source uses when it assembles "/Users/" from parts so its scan does not
#      flag itself.
#
# Cases:
#   1. must-NOT-fire  a clean tree              -> exit 0, non-zero file count
#   2. must-fire      a zero-width space        -> exit 1, names the codepoint
#   3. must-refuse    an empty scan root        -> exit 1, says it scanned none
#   4. must-NOT-fire  VS16 after a status emoji -> exit 0  (the deliberate
#                     carve-out: U+FE0F legitimately follows the warn/arrow
#                     icons in this repo's house style, so banning it would
#                     break our own docs. Guarding the exclusion stops someone
#                     "tightening" the gate and reintroducing that bug.)
# ===========================================================================
set -uo pipefail

CI_DIR="$(cd "$(dirname "$0")" && pwd)"
GATE="$CI_DIR/check-unicode-safety.js"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

pass=0
fail=0

# write <path> <python-string-literal-body> — the body may use \u escapes, so the
# dangerous characters exist only at runtime and never in this file.
write() {
  mkdir -p "$(dirname "$1")"
  python3 - "$1" "$2" <<'PY'
import io, sys
path, body = sys.argv[1], sys.argv[2]
io.open(path, "w", encoding="utf-8").write(body.encode("utf-8").decode("unicode_escape"))
PY
}

mkdir -p "$TMP/clean" "$TMP/dirty" "$TMP/empty" "$TMP/vs16"
write "$TMP/clean/doc.md" '# Ordinary document\n\nNothing hidden here.\n'
write "$TMP/dirty/doc.md" '# Looks ordinary\n\nThis line hides a zero-width space: a\u200bb\n'
write "$TMP/vs16/doc.md"  '# House style\n\nA warning icon with its emoji selector: \u26a0\ufe0f and an arrow \u27a1\ufe0f.\n'

check() { # check <label> <root> <expect-rc> <must-contain>
  local label="$1" root="$2" want="$3" frag="$4" out rc
  out="$(CI_UNICODE_SCAN_ROOT="$root" node "$GATE" 2>&1)"; rc=$?
  local problems=()
  [ "$rc" -eq "$want" ] || problems+=("expected exit $want, got $rc")
  [ -z "$frag" ] || grep -q "$frag" <<<"$out" || problems+=("expected output to contain '$frag'")
  if [ ${#problems[@]} -eq 0 ]; then
    echo "  ok   $label"; pass=$((pass + 1))
  else
    echo "  FAIL $label"; printf '         - %s\n' "${problems[@]}"
    echo "$out" | sed 's/^/         | /'; fail=$((fail + 1))
  fi
}

echo "check-unicode-safety self-test"
check "must-NOT-fire  a clean tree (and reports its coverage)"  "$TMP/clean" 0 "1 text file(s) scanned"
check "must-fire      a zero-width space"                       "$TMP/dirty" 1 "U+200B"
check "must-refuse    an empty scan root"                       "$TMP/empty" 1 "scanned NO files"
check "must-NOT-fire  VS16 after a status emoji (carve-out)"     "$TMP/vs16"  0 "scanned"

echo
if [ "$fail" -gt 0 ]; then
  echo "self-test FAILED: $pass passed, $fail failed"
  echo "The gate did not behave as specified — fix the gate, never the fixtures."
  exit 1
fi
echo "self-test OK: $pass cases (1 must-fire, 1 must-refuse, 2 must-NOT-fire)"
