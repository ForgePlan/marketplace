#!/usr/bin/env bash
# ===========================================================================
# Negative control for validate-no-personal-paths.js
# ===========================================================================
# The gate used to report "Validated: no personal absolute home paths" without
# saying how many files it read. Over zero files that sentence is still true
# and completely worthless. It now counts its coverage and refuses a
# zero-coverage pass; this proves all three behaviours.
#
# TWO PROPERTIES OF THIS FILE ARE DELIBERATE:
#
#   1. Fixtures live in a temp directory, never committed — a committed file
#      holding a real home path would be found by the REAL gate on every run.
#   2. The offending path is ASSEMBLED FROM PARTS at runtime and never written
#      literally here, the same defence the gate's own source uses on itself
#      ("USERS_PREFIX = ['', 'Users', ''].join('/')"). A negative control that
#      trips the gate it is testing is not a control.
#
# Cases:
#   1. must-NOT-fire  a clean docs tree        -> exit 0, non-zero file count
#   2. must-fire      a real home path         -> exit 1, names the file
#   3. must-refuse    an empty scan root       -> exit 1, says it found none
#   4. must-NOT-fire  a placeholder username   -> exit 0  (the deliberate
#                     carve-out: examples and templates legitimately ship
#                     "username"/"you"/"example", so the gate must not treat a
#                     documentation placeholder as a leak.)
# ===========================================================================
set -uo pipefail

CI_DIR="$(cd "$(dirname "$0")" && pwd)"
GATE="$CI_DIR/validate-no-personal-paths.js"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

pass=0
fail=0

# The gate walks a fixed TARGETS list; `docs` is one of them, so fixtures go there.
HOME_PREFIX="$(printf '/%s/' Users)"     # "/Users/" without ever writing it literally

mkdir -p "$TMP/clean/docs" "$TMP/leak/docs" "$TMP/empty" "$TMP/placeholder/docs"
printf '# Clean doc\n\nPaths here are relative: `docs/INDEX.md`.\n' > "$TMP/clean/docs/a.md"
printf '# Doc with a leak\n\nRun the script at %ssomebody/Work/thing/run.sh\n' \
  "$HOME_PREFIX" > "$TMP/leak/docs/a.md"
printf '# Template\n\nReplace with your own: %susername/Work/your-project\n' \
  "$HOME_PREFIX" > "$TMP/placeholder/docs/a.md"

check() { # check <label> <root> <expect-rc> <must-contain>
  local label="$1" root="$2" want="$3" frag="$4" out rc
  out="$(CI_PERSONAL_PATH_SCAN_ROOT="$root" node "$GATE" 2>&1)"; rc=$?
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

echo "validate-no-personal-paths self-test"
check "must-NOT-fire  a clean docs tree (and reports its coverage)" "$TMP/clean"       0 "1 shipped file(s) scanned"
check "must-fire      a real home path"                             "$TMP/leak"        1 "docs/a.md"
check "must-refuse    an empty scan root"                           "$TMP/empty"       1 "No scannable files"
check "must-NOT-fire  a placeholder username (carve-out)"           "$TMP/placeholder" 0 "scanned"

echo
if [ "$fail" -gt 0 ]; then
  echo "self-test FAILED: $pass passed, $fail failed"
  echo "The gate did not behave as specified — fix the gate, never the fixtures."
  exit 1
fi
echo "self-test OK: $pass cases (1 must-fire, 1 must-refuse, 2 must-NOT-fire)"
