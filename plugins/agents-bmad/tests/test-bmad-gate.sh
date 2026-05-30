#!/usr/bin/env bash
# ============================================================================
# test-bmad-gate.sh — behavioral test suite for the no-code-before-plan gate
# ============================================================================
# Self-contained: builds a throwaway git repo under a temp dir, copies the
# shipped bmad-gate.sh + bmad-lib.sh into it, and exercises every phase rule,
# the scratch exemption, the human override (state + env), fail-closed paths,
# detect_stack, and the state CLI. Run from anywhere:
#
#     bash plugins/agents-bmad/tests/test-bmad-gate.sh
#
# Exit 0 = all pass; exit 1 = at least one failure. Deps: bash + jq.
# ============================================================================

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GATE="$PLUGIN_ROOT/hooks/bmad-gate.sh"
LIB="$PLUGIN_ROOT/scripts/bmad-lib.sh"

PASS=0
FAIL=0
ok()  { PASS=$((PASS+1)); printf '  ok   %s\n' "$1"; }
nok() { FAIL=$((FAIL+1)); printf '  FAIL %s\n' "$1"; [ -n "${2:-}" ] && printf '       %s\n' "$2"; }

# Sandbox: a temp git repo on a feature branch with the plugin files copied in.
SB="$(mktemp -d "${TMPDIR:-/tmp}/bmad-gate-test.XXXXXX")"
cleanup() { rm -rf "$SB"; }
trap cleanup EXIT

(
  cd "$SB"
  git init -q
  git checkout -q -b feat/gate-test 2>/dev/null || git checkout -q -b feat/gate-test
  mkdir -p hooks scripts .forgeplan/bmad
  cp "$GATE" hooks/bmad-gate.sh
  cp "$LIB" scripts/bmad-lib.sh
)

# shellcheck disable=SC1091
. "$SB/scripts/bmad-lib.sh"
SLUG="$(cd "$SB" && branch_slug)"
STATE="$SB/.forgeplan/bmad/state-$SLUG.json"
STACK="$SB/.forgeplan/bmad/stack.json"
printf '%s' '{"test_file_glob":"test_*.py|*_test.py","source_file_glob":"*.py"}' > "$STACK"

run_gate() {
  G_OUT="$(cd "$SB" && printf '%s' "$1" | bash hooks/bmad-gate.sh 2>/dev/null)"
  G_EXIT=$?
}
run_gate_env() {  # $1=env assignment, $2=tool json
  G_OUT="$(cd "$SB" && printf '%s' "$2" | env "$1" bash hooks/bmad-gate.sh 2>/dev/null)"
  G_EXIT=$?
}
# set_state PHASE DEV_UNLOCKED OVERRIDE
set_state() {
  printf '{"phase":"%s","dev_unlocked":%s,"governing_rfc":"","qa_attempt_count":0,"override":%s,"started_at":"","phase_entered_at":""}' \
    "$1" "$2" "$3" > "$STATE"
}
is_deny() { printf '%s' "$G_OUT" | grep -q '"permissionDecision":"deny"'; }

W_TEST='{"tool_name":"Write","tool_input":{"file_path":"test_x.py","content":"x"}}'
W_SRC='{"tool_name":"Write","tool_input":{"file_path":"x.py","content":"def f(): return 1"}}'
W_SCRATCH='{"tool_name":"Write","tool_input":{"file_path":".bmad-scratch/spike.py","content":"spike"}}'
W_DOC='{"tool_name":"Write","tool_input":{"file_path":"notes.md","content":"# design"}}'
W_READ='{"tool_name":"Read","tool_input":{"file_path":"x.py"}}'
B_REDIR='{"tool_name":"Bash","tool_input":{"command":"echo hi > x.py"}}'

echo "== bmad-gate behavioral suite =="

# --- fail-closed + fast-path -------------------------------------------------
G_OUT="$(cd "$SB" && printf 'not json' | bash hooks/bmad-gate.sh 2>/dev/null)"; G_EXIT=$?
[ "$G_EXIT" -eq 2 ] && ok "bad stdin -> exit 2 (fail-closed)" || nok "bad stdin -> exit 2" "got exit=$G_EXIT"

rm -f "$STATE"
run_gate "$W_SRC" ; { [ "$G_EXIT" -eq 0 ] && ! is_deny; } && ok "no state file -> allow (BMAD inactive)" || nok "no state -> allow" "exit=$G_EXIT out=$G_OUT"

set_state planning false false
run_gate "$W_READ" ; { [ "$G_EXIT" -eq 0 ] && ! is_deny; } && ok "non-write tool (Read) -> allow (fast-path)" || nok "Read fast-path" "exit=$G_EXIT"

# --- phase planning ----------------------------------------------------------
set_state planning false false
run_gate "$W_TEST" ; is_deny && ok "planning: test write -> deny" || nok "planning test deny"
run_gate "$W_SRC"  ; is_deny && ok "planning: source write -> deny" || nok "planning source deny"
run_gate "$W_DOC"  ; { [ "$G_EXIT" -eq 0 ] && ! is_deny; } && ok "planning: doc .md (other) -> allow" || nok "planning doc allow" "out=$G_OUT"

# --- phase solutioning -------------------------------------------------------
set_state solutioning false false
run_gate "$W_TEST" ; is_deny && ok "solutioning: test write -> deny" || nok "solutioning test deny"
run_gate "$W_SRC"  ; is_deny && ok "solutioning: source write -> deny" || nok "solutioning source deny"

# --- scratch exemption -------------------------------------------------------
set_state solutioning false false
run_gate "$W_SCRATCH" ; { [ "$G_EXIT" -eq 0 ] && ! is_deny; } && ok "solutioning: .bmad-scratch/ spike -> allow (exemption)" || nok "scratch exemption" "out=$G_OUT"

# --- phase implementation ----------------------------------------------------
set_state implementation false false
run_gate "$W_SRC" ; is_deny && ok "implementation + !dev_unlocked: source -> deny" || nok "impl locked source deny"
set_state implementation true false
run_gate "$W_SRC"  ; { [ "$G_EXIT" -eq 0 ] && ! is_deny; } && ok "implementation + dev_unlocked: source -> allow" || nok "impl unlocked source allow" "out=$G_OUT"
run_gate "$W_TEST" ; { [ "$G_EXIT" -eq 0 ] && ! is_deny; } && ok "implementation + dev_unlocked: test -> allow" || nok "impl unlocked test allow" "out=$G_OUT"

# --- phase done --------------------------------------------------------------
set_state done false false
run_gate "$W_SRC" ; { [ "$G_EXIT" -eq 0 ] && ! is_deny; } && ok "done: source -> allow (cycle complete)" || nok "done source allow"

# --- human override (state + env) --------------------------------------------
set_state planning false true
run_gate "$W_SRC" ; { [ "$G_EXIT" -eq 0 ] && ! is_deny; } && ok "planning + state.override=true: source -> allow (logged escape)" || nok "state override allow" "out=$G_OUT"
set_state planning false false
run_gate_env "BMAD_GATE_OVERRIDE=1" "$W_SRC" ; { [ "$G_EXIT" -eq 0 ] && ! is_deny; } && ok "planning + BMAD_GATE_OVERRIDE=1: source -> allow" || nok "env override allow" "out=$G_OUT"

# --- Bash write-redirect bypass coverage -------------------------------------
set_state planning false false
run_gate "$B_REDIR" ; is_deny && ok "planning: Bash redirect to source -> deny (bypass coverage)" || nok "planning bash-redirect deny" "out=$G_OUT"

# --- unknown phase fail-closed -----------------------------------------------
set_state bogus false false
run_gate "$W_SRC" ; [ "$G_EXIT" -eq 2 ] && ok "unknown phase -> exit 2 (fail-closed)" || nok "unknown phase exit2" "exit=$G_EXIT out=$G_OUT"

# --- bmad-lib: detect_stack --------------------------------------------------
echo "== bmad-lib functions =="
DT="$(mktemp -d "${TMPDIR:-/tmp}/dt.XXXXXX")"
touch "$DT/pyproject.toml"; out="$(detect_stack "$DT")"; printf '%s' "$out" | grep -q "^python	pytest" && ok "detect_stack: python/pytest" || nok "detect python" "got=$out"; rm -rf "$DT"
DT="$(mktemp -d)"; touch "$DT/go.mod";   detect_stack "$DT" | grep -q "^go	go test" && ok "detect_stack: go" || nok "detect go"; rm -rf "$DT"
DT="$(mktemp -d)"; touch "$DT/Cargo.toml"; detect_stack "$DT" | grep -q "^rust	cargo test" && ok "detect_stack: rust" || nok "detect rust"; rm -rf "$DT"
DT="$(mktemp -d)"; detect_stack "$DT" >/dev/null 2>&1; [ $? -eq 1 ] && ok "detect_stack: empty repo -> exit 1 (ask user)" || nok "detect empty exit1"; rm -rf "$DT"

# --- bmad-lib: state CLI -----------------------------------------------------
CLI="bash $SB/scripts/bmad-lib.sh"
( cd "$SB"
  $CLI init "cli-test" "RFC-013" >/dev/null 2>&1
)
CLI_STATE="$SB/.forgeplan/bmad/state-cli-test.json"
[ -f "$CLI_STATE" ] && [ "$(jq -r '.phase' "$CLI_STATE")" = "planning" ] && [ "$(jq -r '.dev_unlocked' "$CLI_STATE")" = "false" ] \
  && ok "state CLI: init -> phase=planning, dev_unlocked=false" || nok "cli init" "$(cat "$CLI_STATE" 2>/dev/null)"
[ "$(jq -r '.governing_rfc' "$CLI_STATE" 2>/dev/null)" = "RFC-013" ] && ok "state CLI: init records governing_rfc" || nok "cli init rfc"
( cd "$SB"; $CLI set-phase "cli-test" solutioning >/dev/null 2>&1 )
[ "$(jq -r '.phase' "$CLI_STATE")" = "solutioning" ] && ok "state CLI: set-phase -> solutioning" || nok "cli set-phase"
( cd "$SB"; $CLI unlock-dev "cli-test" >/dev/null 2>&1 )
[ "$(jq -r '.dev_unlocked' "$CLI_STATE")" = "true" ] && ok "state CLI: unlock-dev -> dev_unlocked=true" || nok "cli unlock-dev"
( cd "$SB"; $CLI bump-qa "cli-test" >/dev/null 2>&1 )
[ "$(jq -r '.qa_attempt_count' "$CLI_STATE")" = "1" ] && ok "state CLI: bump-qa -> qa_attempt_count=1" || nok "cli bump-qa"
( cd "$SB"; $CLI set-override "cli-test" true >/dev/null 2>&1 )
[ "$(jq -r '.override' "$CLI_STATE")" = "true" ] && ok "state CLI: set-override -> override=true" || nok "cli set-override"

# ---------------------------------------------------------------------------
echo "== summary: $PASS passed, $FAIL failed =="
[ "$FAIL" -eq 0 ]
