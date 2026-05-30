#!/usr/bin/env bash
# ============================================================================
# test-tdd-gate.sh — behavioral test suite for the enforced-TDD gate + lib
# ============================================================================
# Self-contained: builds a throwaway git repo under a temp dir, copies the
# shipped tdd-gate.sh + tdd-lib.sh into it, and exercises every phase rule,
# fail-closed path, the FR-6 oracle-drift checks, detect_stack, and
# normalized_spec_hash. Run from anywhere:
#
#     bash plugins/agents-tdd/tests/test-tdd-gate.sh
#
# Exit 0 = all pass; exit 1 = at least one failure. No external deps beyond
# bash + jq + a sha256 tool (the same the gate itself requires).
# ============================================================================

set -u

# Resolve the plugin root from this script's location (tests/ -> plugin root).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GATE="$PLUGIN_ROOT/hooks/tdd-gate.sh"
LIB="$PLUGIN_ROOT/scripts/tdd-lib.sh"

PASS=0
FAIL=0

ok()   { PASS=$((PASS+1)); printf '  ok   %s\n' "$1"; }
nok()  { FAIL=$((FAIL+1)); printf '  FAIL %s\n' "$1"; [ -n "${2:-}" ] && printf '       %s\n' "$2"; }

# ---------------------------------------------------------------------------
# Sandbox: a temp git repo on a feature branch with the plugin files copied in.
# ---------------------------------------------------------------------------
SB="$(mktemp -d "${TMPDIR:-/tmp}/tdd-gate-test.XXXXXX")"
cleanup() { rm -rf "$SB"; }
trap cleanup EXIT

(
  cd "$SB"
  git init -q
  git checkout -q -b feat/gate-test 2>/dev/null || git checkout -q -b feat/gate-test
  mkdir -p hooks scripts .forgeplan/tdd
  cp "$GATE" hooks/tdd-gate.sh
  cp "$LIB" scripts/tdd-lib.sh
)

# shellcheck disable=SC1091
. "$SB/scripts/tdd-lib.sh"
SLUG="$(cd "$SB" && branch_slug)"
STATE="$SB/.forgeplan/tdd/state-$SLUG.json"
STACK="$SB/.forgeplan/tdd/stack.json"
printf '%s' '{"test_file_glob":"test_*.py|*_test.py","source_file_glob":"*.py"}' > "$STACK"

# run_gate PHASE_JSON TOOL_JSON  -> sets $G_EXIT and $G_OUT
run_gate() {
  G_OUT="$(cd "$SB" && printf '%s' "$1" | bash hooks/tdd-gate.sh 2>/dev/null)"
  G_EXIT=$?
}
set_phase() { printf '%s' "$1" > "$STATE"; }
is_deny() { printf '%s' "$G_OUT" | grep -q '"permissionDecision":"deny"'; }

W_TEST='{"tool_name":"Write","tool_input":{"file_path":"test_x.py","content":"x"}}'
W_SRC='{"tool_name":"Write","tool_input":{"file_path":"x.py","content":"def f(): return 1"}}'
W_SRC_STUB='{"tool_name":"Write","tool_input":{"file_path":"x.py","content":"def f(): pass  # STUB:TDD"}}'
W_READ='{"tool_name":"Read","tool_input":{"file_path":"test_x.py"}}'
B_REDIR='{"tool_name":"Bash","tool_input":{"command":"echo hi > test_x.py"}}'

echo "== tdd-gate behavioral suite =="

# --- fail-closed + fast-path -------------------------------------------------
G_OUT="$(cd "$SB" && printf 'not json' | bash hooks/tdd-gate.sh 2>/dev/null)"; G_EXIT=$?
[ "$G_EXIT" -eq 2 ] && ok "bad stdin -> exit 2 (fail-closed)" || nok "bad stdin -> exit 2" "got exit=$G_EXIT"

rm -f "$STATE"
run_gate "$W_TEST" ; { [ "$G_EXIT" -eq 0 ] && ! is_deny; } && ok "no state file -> allow (TDD inactive)" || nok "no state -> allow" "exit=$G_EXIT out=$G_OUT"

set_phase '{"phase":"tdd-green","spec_hash":"","spec_path":""}'
run_gate "$W_READ" ; { [ "$G_EXIT" -eq 0 ] && ! is_deny; } && ok "non-write tool (Read) -> allow (fast-path)" || nok "Read fast-path" "exit=$G_EXIT"

# --- phase tdd-plan ----------------------------------------------------------
set_phase '{"phase":"tdd-plan","spec_hash":"","spec_path":""}'
run_gate "$W_TEST" ; is_deny && ok "tdd-plan: test write -> deny" || nok "tdd-plan test deny"
run_gate "$W_SRC"  ; is_deny && ok "tdd-plan: source write -> deny" || nok "tdd-plan source deny"

# --- phase tdd-red -----------------------------------------------------------
set_phase '{"phase":"tdd-red","spec_hash":"","spec_path":""}'
run_gate "$W_TEST"      ; { [ "$G_EXIT" -eq 0 ] && ! is_deny; } && ok "tdd-red: test write -> allow" || nok "tdd-red test allow" "out=$G_OUT"
run_gate "$W_SRC"       ; is_deny && ok "tdd-red: source without STUB -> deny" || nok "tdd-red source-no-stub deny"
run_gate "$W_SRC_STUB"  ; { [ "$G_EXIT" -eq 0 ] && ! is_deny; } && ok "tdd-red: source with STUB:TDD -> allow" || nok "tdd-red source-stub allow" "out=$G_OUT"

# --- phase tdd-green ---------------------------------------------------------
set_phase '{"phase":"tdd-green","spec_hash":"","spec_path":""}'
run_gate "$W_TEST" ; is_deny && ok "tdd-green: test edit -> deny (#1 control)" || nok "tdd-green test deny"
run_gate "$W_SRC"  ; { [ "$G_EXIT" -eq 0 ] && ! is_deny; } && ok "tdd-green: source write -> allow" || nok "tdd-green source allow" "out=$G_OUT"
run_gate "$B_REDIR"; is_deny && ok "tdd-green: Bash redirect to test -> deny (bypass coverage)" || nok "tdd-green bash-redirect deny"

# --- FR-6 oracle drift + EVID-137 #1 fail-closed -----------------------------
printf '%s\n' '#### Scenario: a' > "$SB/spec.md"
FROZEN="$(cd "$SB" && normalized_spec_hash spec.md)"
set_phase "{\"phase\":\"tdd-green\",\"spec_hash\":\"$FROZEN\",\"spec_path\":\"spec.md\"}"
run_gate "$W_SRC" ; { [ "$G_EXIT" -eq 0 ] && ! is_deny; } && ok "tdd-green: source allowed when oracle intact" || nok "oracle-intact allow" "out=$G_OUT"

printf '%s\n' '#### Scenario: a CHANGED' > "$SB/spec.md"
run_gate "$W_SRC"
if is_deny && printf '%s' "$G_OUT" | grep -q -i "supersede"; then
  ok "tdd-green: SPEC drift -> deny + message points to supersede"
else
  nok "drift deny+supersede" "out=$G_OUT"
fi

# EVID-137 finding #1: spec_hash frozen but spec_path empty must FAIL CLOSED
set_phase "{\"phase\":\"tdd-green\",\"spec_hash\":\"$FROZEN\",\"spec_path\":\"\"}"
run_gate "$W_SRC" ; is_deny && ok "tdd-green: frozen hash + empty spec_path -> deny (fail-closed, EVID-137 #1)" || nok "empty-spec_path fail-closed" "out=$G_OUT"

# --- tdd-lib: detect_stack ---------------------------------------------------
echo "== tdd-lib functions =="
DT="$(mktemp -d "${TMPDIR:-/tmp}/dt.XXXXXX")"
touch "$DT/pyproject.toml"; out="$(detect_stack "$DT")"; printf '%s' "$out" | grep -q "^python	pytest" && ok "detect_stack: python/pytest" || nok "detect python" "got=$out"; rm -rf "$DT"
DT="$(mktemp -d)"; touch "$DT/go.mod";   detect_stack "$DT" | grep -q "^go	go test" && ok "detect_stack: go" || nok "detect go"; rm -rf "$DT"
DT="$(mktemp -d)"; touch "$DT/Cargo.toml"; detect_stack "$DT" | grep -q "^rust	cargo test" && ok "detect_stack: rust" || nok "detect rust"; rm -rf "$DT"
DT="$(mktemp -d)"; detect_stack "$DT" >/dev/null 2>&1; [ $? -eq 1 ] && ok "detect_stack: empty repo -> exit 1 (ask user)" || nok "detect empty exit1"; rm -rf "$DT"

# --- tdd-lib: normalized_spec_hash idempotence + normalization ---------------
F1="$(mktemp)"; F2="$(mktemp)"
printf 'line one\nline two\n'        > "$F1"   # clean LF
printf 'line one  \r\nline two\r\n\n\n' > "$F2" # CRLF + trailing ws + trailing blanks
h1="$(normalized_spec_hash "$F1")"; h2="$(normalized_spec_hash "$F2")"
[ -n "$h1" ] && [ "$h1" = "$h2" ] && ok "normalized_spec_hash: CRLF+trailing-ws+blank-lines normalize equal" || nok "normalize equal" "h1=$h1 h2=$h2"
h1b="$(normalized_spec_hash "$F1")"; [ "$h1" = "$h1b" ] && ok "normalized_spec_hash: idempotent" || nok "hash idempotent"
rm -f "$F1" "$F2"

# ---------------------------------------------------------------------------
echo "== summary: $PASS passed, $FAIL failed =="
[ "$FAIL" -eq 0 ]
