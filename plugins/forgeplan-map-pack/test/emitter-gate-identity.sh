#!/usr/bin/env bash
# ============================================================================
# test/emitter-gate-identity.sh -- regression test for map-emitter-gate.sh's
# identity normalization (first-dogfood F4).
# ============================================================================
# A dispatched subagent's identity is PLUGIN-QUALIFIED
# ("forgeplan-map-pack:map-emitter"), so an exact `!= "map-emitter"` check
# denied the emitter's OWN write of map.json -- the pipeline could not write
# its one output file at all. The gate now strips the "<plugin>:" prefix
# before comparing. This test feeds the hook realistic PreToolUse stdin
# payloads in a real temp git repo and asserts allow/deny for each identity.
#
# The hook signals DENY via stdout JSON (`permissionDecision":"deny"`) + exit 0;
# ALLOW is a plain exit 0 with no stdout. So we distinguish by stdout content.
# ============================================================================
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GATE="${HERE}/../hooks/scripts/map-emitter-gate.sh"

command -v jq >/dev/null 2>&1 || { echo "SKIP: jq not installed"; exit 0; }

# Resolve to the PHYSICAL path (pwd -P): on macOS mktemp yields /var/folders/…
# but `git rev-parse --show-toplevel` (which the hook's repo_root uses) returns
# the symlink-resolved /private/var/folders/…; if the two disagree the hook's
# repo_relative can't strip the root and every path reads as out-of-jurisdiction.
REPO="$(cd "$(mktemp -d)" && pwd -P)"
git -C "$REPO" init -q
mkdir -p "$REPO/.forgeplan/map/.work" "$REPO/.forgeplan/prds"

pass=0; fail=0
# run_case <expect: allow|deny> <name> <json-stdin>
run_case() {
  local expect="$1" name="$2" json="$3" out
  out="$(printf '%s' "$json" | (cd "$REPO" && bash "$GATE") 2>/dev/null)"
  local got="allow"
  printf '%s' "$out" | grep -q '"permissionDecision":"deny"' && got="deny"
  if [ "$got" = "$expect" ]; then
    pass=$((pass+1)); echo "  ok  $name ($got)"
  else
    fail=$((fail+1)); echo "  FAIL $name -- expected $expect, got $got :: $out"
  fi
}

MAP="$REPO/.forgeplan/map/map.json"
WORK="$REPO/.forgeplan/map/.work/.scan.code.json"
PRD="$REPO/.forgeplan/prds/PRD-1.md"
mk() { printf '{"tool_name":"Write","tool_input":{"file_path":"%s"}%s}' "$1" "$2"; }

# F4: the plugin-qualified emitter identity must be ALLOWED to write map.json
run_case allow "plugin-qualified map-emitter -> map.json" "$(mk "$MAP" ',"subagent_type":"forgeplan-map-pack:map-emitter"')"
run_case allow "bare map-emitter -> map.json"             "$(mk "$MAP" ',"subagent_type":"map-emitter"')"
run_case allow "no identity field -> map.json"            "$(mk "$MAP" '')"
run_case deny  "plugin-qualified non-emitter -> map.json" "$(mk "$MAP" ',"subagent_type":"forgeplan-map-pack:zone-extractor"')"
run_case deny  "any identity -> .forgeplan/prds/ (outside map)" "$(mk "$PRD" ',"subagent_type":"forgeplan-map-pack:map-emitter"')"
run_case allow "non-emitter -> map/.work/ scratch"        "$(mk "$WORK" ',"subagent_type":"forgeplan-map-pack:zone-extractor"')"

rm -rf "$REPO"
echo ""
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
