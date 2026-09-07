#!/usr/bin/env bash
# ===========================================================================
# Negative control for standalone-mirror-check.js
# ===========================================================================
# A gate nobody has watched fail is decoration. This drives the gate against
# deliberately broken fixtures and asserts it fires — and asserts the things
# that actually decide whether it worked, not merely that it printed something.
#
# Each must-fire case asserts FOUR properties:
#   1. exit code 1                      (it failed at all)
#   2. the exact problem CODE           (it failed for the right reason)
#   3. the offending path in the output (it names where, so a human can fix it)
#   4. a non-zero "sources scanned"     (it opened the fixture rather than
#                                        skipping it on a path typo — the way a
#                                        mis-pointed gate passes while checking nothing)
#
# Plus one must-NOT-fire case: a gate that fires on everything is as useless as
# one that never fires.
#
# LIVE MUTATION (run by a human, against the real tree — proves the gate works
# on production data, not only on fixtures):
#
#   printf '\nRun ${CLAUDE_PLUGIN_ROOT}/hooks/x.sh\n' \
#     >> plugins/forgeplan-orchestra/skills/orchestra-mcp/references/failure-modes.md
#   node scripts/ci/standalone-mirror-check.js   # MUST exit 1, naming that file and line
#   git checkout -- plugins/forgeplan-orchestra/skills/orchestra-mcp/references/failure-modes.md
# ===========================================================================
set -uo pipefail

CI_DIR="$(cd "$(dirname "$0")" && pwd)"
FIX="$CI_DIR/fixtures/standalone-mirrors"
GATE="$CI_DIR/standalone-mirror-check.js"

pass=0
fail=0

# must_fire <label> <manifest> <workflow> <expected-code> <expected-path-fragment>
must_fire() {
  local label="$1" manifest="$2" workflow="$3" code="$4" frag="$5"
  local out rc
  out="$(CI_STANDALONE_MIRRORS_PATH="$FIX/$manifest" \
         CI_STANDALONE_WORKFLOW_PATH="$FIX/$workflow" \
         node "$GATE" 2>&1)"
  rc=$?

  local problems=()
  [ "$rc" -eq 1 ] || problems+=("expected exit 1, got $rc")
  grep -q "\[$code\]" <<<"$out" || problems+=("expected problem code $code")
  grep -q "$frag" <<<"$out" || problems+=("expected the offending path to name '$frag'")
  # "sources scanned: 0" would mean the fixture was never opened — the gate would be
  # failing for a reason unrelated to what this case is testing.
  grep -qE 'sources scanned: [1-9]' <<<"$out" || problems+=("gate reported 0 sources scanned — fixture not opened")

  if [ ${#problems[@]} -eq 0 ]; then
    echo "  ok   must-fire  $label -> $code"
    pass=$((pass + 1))
  else
    echo "  FAIL must-fire  $label"
    printf '         - %s\n' "${problems[@]}"
    echo "$out" | sed 's/^/         | /'
    fail=$((fail + 1))
  fi
}

# must_not_fire <label> <manifest> <workflow>
must_not_fire() {
  local label="$1" manifest="$2" workflow="$3"
  local out rc
  out="$(CI_STANDALONE_MIRRORS_PATH="$FIX/$manifest" \
         CI_STANDALONE_WORKFLOW_PATH="$FIX/$workflow" \
         node "$GATE" 2>&1)"
  rc=$?

  local problems=()
  [ "$rc" -eq 0 ] || problems+=("expected exit 0, got $rc")
  grep -qE 'OK: [1-9][0-9]* source' <<<"$out" || problems+=("expected a non-zero scanned-source count")

  if [ ${#problems[@]} -eq 0 ]; then
    echo "  ok   must-NOT-fire  $label"
    pass=$((pass + 1))
  else
    echo "  FAIL must-NOT-fire  $label"
    printf '         - %s\n' "${problems[@]}"
    echo "$out" | sed 's/^/         | /'
    fail=$((fail + 1))
  fi
}

echo "standalone-mirror-check self-test"

must_fire "plugin-root variable in a mirrored file" \
  manifest-residue.json workflow-extra.yml PLUGIN-ROOT-RESIDUE "residue-skill/SKILL.md"

must_fire "ecosystem vocabulary in an ecosystem-free skill" \
  manifest-vocab.json workflow-extra.yml VOCABULARY-LEAK "vocab-skill/SKILL.md"

must_fire "frontmatter name disagrees with installedName" \
  manifest-name.json workflow-extra.yml NAME-MISMATCH "name-mismatch-skill/SKILL.md"

must_fire "symlink inside a mirrored source" \
  manifest-symlink.json workflow-extra.yml SYMLINK "symlink-skill/linked.md"

must_fire "mirror missing from the workflow entirely" \
  manifest-parity.json workflow-missing.yml WORKFLOW-PARITY "clean-skill"

must_fire "matrix row with no manifest entry" \
  manifest-clean.json workflow-extra.yml WORKFLOW-PARITY "ghost-skill"

must_not_fire "a clean mirror wired correctly" \
  manifest-clean.json workflow-clean.yml

echo
if [ "$fail" -gt 0 ]; then
  echo "self-test FAILED: $pass passed, $fail failed"
  echo "The gate did not behave as specified — fix the gate, never the fixtures."
  exit 1
fi
echo "self-test OK: $pass cases (6 must-fire, 1 must-not-fire)"
