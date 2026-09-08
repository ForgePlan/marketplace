#!/usr/bin/env bash
# ===========================================================================
# Negative control for routing-profile-check.js
# ===========================================================================
# A gate nobody has watched fail is decoration. This drives the gate against
# deliberately broken fixtures and asserts the properties that decide whether
# it worked — not merely that it printed something.
#
# Each must-fire case asserts FOUR things:
#   1. exit code 1                 (it failed at all)
#   2. the exact problem CODE      (it failed for the right reason)
#   3. the offending agent named   (a human can act on it)
#   4. a non-zero "rows seen"      (it opened the fixture rather than skipping
#                                   it on a path typo — the way a mis-pointed
#                                   gate passes while checking nothing)
#
# Two must-NOT-fire cases, and the second is the load-bearing one:
#   - a clean map across every profile
#   - THE SAME broken agent as case 1, under a dagger row. Together those two
#     form a controlled pair: the only difference is the dagger, so the pair
#     proves the advisory-skip is real and is not "the gate passes everything".
#
# Plus a parser cross-check. The gate carries its own frontmatter reader so it
# stays dependency-free; that reader is the one place it can fail silently. If
# it mis-parsed an allowlist into null, every reachability question would
# answer "inherited, therefore yes" and the gate would print OK while
# constraining nothing. So the reader is diffed against a real YAML parser over
# every indexed agent — generator != verifier, applied to the gate's own guts.
#
# LIVE MUTATION (run by a human, against the real tree):
#   sed -i '' 's/^  - mcp__forgeplan__forgeplan_activate$//' \
#     plugins/agents-pro/agents/guardian.md
#   node scripts/ci/routing-profile-check.js    # MUST exit 1, naming guardian
#   git checkout -- plugins/agents-pro/agents/guardian.md
# ===========================================================================
set -uo pipefail

CI_DIR="$(cd "$(dirname "$0")" && pwd)"
FIX="$CI_DIR/fixtures/routing-profiles"
GATE="$CI_DIR/routing-profile-check.js"

pass=0
fail=0

run_gate() {
  CI_ROUTING_MAP_PATH="$FIX/$1" CI_ROUTING_PLUGINS_ROOT="$FIX/plugins" node "$GATE" 2>&1
}

# must_fire <label> <map> <expected-code> <expected-name-fragment>
must_fire() {
  local label="$1" map="$2" code="$3" frag="$4"
  local out rc
  out="$(run_gate "$map")"
  rc=$?

  local problems=()
  [ "$rc" -eq 1 ] || problems+=("expected exit 1, got $rc")
  grep -q "\[$code\]" <<<"$out" || problems+=("expected problem code $code")
  grep -q "$frag" <<<"$out" || problems+=("expected the output to name '$frag'")
  grep -qE 'rows seen: [1-9]' <<<"$out" || problems+=("gate reported 0 rows seen — fixture not opened")

  if [ ${#problems[@]} -eq 0 ]; then
    echo "  ok   must-fire      $label -> $code"
    pass=$((pass + 1))
  else
    echo "  FAIL must-fire      $label"
    printf '         - %s\n' "${problems[@]}"
    echo "$out" | sed 's/^/         | /'
    fail=$((fail + 1))
  fi
}

# must_refuse <label> <map> <expected-message-fragment>   (vacuous-pass guards)
must_refuse() {
  local label="$1" map="$2" frag="$3"
  local out rc
  out="$(run_gate "$map")"
  rc=$?

  local problems=()
  [ "$rc" -eq 1 ] || problems+=("expected exit 1, got $rc")
  grep -q "$frag" <<<"$out" || problems+=("expected the refusal to mention '$frag'")

  if [ ${#problems[@]} -eq 0 ]; then
    echo "  ok   must-refuse    $label"
    pass=$((pass + 1))
  else
    echo "  FAIL must-refuse    $label"
    printf '         - %s\n' "${problems[@]}"
    echo "$out" | sed 's/^/         | /'
    fail=$((fail + 1))
  fi
}

# must_not_fire <label> <map> <min-surfaces-checked>
must_not_fire() {
  local label="$1" map="$2" minchecked="$3"
  local out rc checked
  out="$(run_gate "$map")"
  rc=$?
  checked="$(grep -oE '[0-9]+ profile surface' <<<"$out" | grep -oE '^[0-9]+' || echo 0)"

  local problems=()
  [ "$rc" -eq 0 ] || problems+=("expected exit 0, got $rc")
  [ "${checked:-0}" -ge "$minchecked" ] \
    || problems+=("expected >= $minchecked profile surfaces checked, got ${checked:-0}")

  if [ ${#problems[@]} -eq 0 ]; then
    echo "  ok   must-NOT-fire  $label (${checked} surfaces verified)"
    pass=$((pass + 1))
  else
    echo "  FAIL must-NOT-fire  $label"
    printf '         - %s\n' "${problems[@]}"
    echo "$out" | sed 's/^/         | /'
    fail=$((fail + 1))
  fi
}

echo "routing-profile-check self-test"

must_fire "B labelled but cannot create an EVID (the DEFER-033 defect)" \
  map-evidenceless-b.md PROFILE-SURFACE "evidenceless-b"

must_fire "B labelled but can reach forgeplan_activate" \
  map-activating-b.md PROFILE-SURFACE "activating-b"

must_fire "profile label the gate does not understand" \
  map-unknown-profile.md UNKNOWN-PROFILE "good-b"

must_fire "row names an agent with no file" \
  map-missing-agent.md ROW-UNRESOLVED "ghost-agent"

must_fire "agent file has no parseable frontmatter" \
  map-no-frontmatter.md FRONTMATTER "no-frontmatter"

must_fire "frontmatter name disagrees with the index" \
  map-renamed.md NAME-MISMATCH "renamed-agent"

must_refuse "an index with no rows" \
  map-no-rows.md "no rows"

must_refuse "a map whose Agent index section is gone" \
  map-no-section.md "Agent index"

must_not_fire "a clean map across every profile" \
  map-clean.md 6

must_not_fire "the same broken agent under a dagger row (advisory letter)" \
  map-dagger.md 6

# --- parser cross-check ------------------------------------------------------
echo
echo "  parser cross-check (hand-written reader vs a real YAML parser)"
JS_OUT="$(node "$FIX/parser-crosscheck.js" 2>/dev/null)"
PY_OUT="$(python3 "$FIX/parser-crosscheck.py" 2>/dev/null)"
PY_RC=$?

if [ "$PY_RC" -eq 3 ]; then
  echo "  SKIP parser cross-check — PyYAML not installed (announced, not silently passed)"
elif [ -z "$JS_OUT" ] || [ -z "$PY_OUT" ]; then
  # An empty-vs-empty comparison is the vacuous pass this whole gate exists to
  # prevent; it is a failure here, not a match.
  echo "  FAIL parser cross-check — one side produced no output (js=${#JS_OUT}B py=${#PY_OUT}B)"
  fail=$((fail + 1))
elif [ "$(python3 -c 'import json,sys; print(len(json.load(open(sys.argv[1]))))' <(printf '%s' "$JS_OUT"))" -lt 10 ]; then
  echo "  FAIL parser cross-check — fewer than 10 agents compared; the map or tree was not read"
  fail=$((fail + 1))
elif [ "$JS_OUT" = "$PY_OUT" ]; then
  n="$(python3 -c 'import json,sys; print(len(json.load(open(sys.argv[1]))))' <(printf '%s' "$JS_OUT"))"
  echo "  ok   parser cross-check — both readers agree on all $n indexed agents"
  pass=$((pass + 1))
else
  echo "  FAIL parser cross-check — the readers disagree:"
  diff <(printf '%s' "$JS_OUT") <(printf '%s' "$PY_OUT") | head -20 | sed 's/^/         | /'
  fail=$((fail + 1))
fi

echo
if [ "$fail" -gt 0 ]; then
  echo "self-test FAILED: $pass passed, $fail failed"
  echo "The gate did not behave as specified — fix the gate, never the fixtures."
  exit 1
fi
echo "self-test OK: $pass cases (6 must-fire, 2 must-refuse, 2 must-NOT-fire, 1 parser cross-check)"
