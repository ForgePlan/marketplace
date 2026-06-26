#!/usr/bin/env bash
# ============================================================================
# test-canvas-gate.sh — behavioral test suite for the CANVAS tokens-gate
# ============================================================================
# Self-contained: builds a throwaway git repo under a temp dir, copies the
# shipped canvas-gate.sh + canvas-lib.sh into it (same dir — the gate sources
# its sibling lib), seeds the per-branch state file, and exercises every gate
# decision branch from RFC-021 Testing/acceptance:
#
#   bad stdin                                      -> exit 2 (fail-closed)
#   no state file                                  -> exit 0 (CANVAS inactive)
#   non-matching tool (Read)                       -> exit 0 (fast-path)
#   tokens_active=false + Write packages/design-system/**  -> deny
#   tokens_active=false + Write framework-wrapper pkg path -> deny
#   tokens_active=false + Write under .canvas-scratch/     -> allow (exemption)
#   tokens_active=false + Write to a non-guarded path      -> allow
#   tokens_active=true  + guarded write            -> allow (C5 lever unlocked)
#   phase=done          + guarded write            -> allow (cycle complete)
#   state.override=true + guarded write            -> allow (logged escape)
#   CANVAS_GATE_OVERRIDE=1 + guarded write         -> allow (env escape)
#   empty phase                                    -> exit 2 (fail-closed)
#   path-traversal into a guarded dir              -> deny (canonicalized)
#   path-traversal OUT of a guarded dir            -> allow (canonicalized)
# Plus a canonicalize_path traversal unit check + path_is_guarded unit check.
#
# Run from anywhere:
#     bash plugins/agents-canvas/tests/test-canvas-gate.sh
#
# Exit 0 = all pass; exit 1 = at least one failure. Deps: bash + jq + git.
# ============================================================================

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GATE="$PLUGIN_ROOT/hooks/scripts/canvas-gate.sh"
LIB="$PLUGIN_ROOT/hooks/scripts/canvas-lib.sh"

PASS=0
FAIL=0
ok()  { PASS=$((PASS+1)); printf '  ok   %s\n' "$1"; }
nok() { FAIL=$((FAIL+1)); printf '  FAIL %s\n' "$1"; [ -n "${2:-}" ] && printf '       %s\n' "$2"; }

# Pre-flight: the files under test must exist.
[ -f "$GATE" ] || { echo "FATAL: gate not found: $GATE" >&2; exit 1; }
[ -f "$LIB" ]  || { echo "FATAL: lib not found: $LIB"   >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "FATAL: jq is required" >&2; exit 1; }

# Sandbox: a temp git repo on a feature branch with the plugin scripts copied
# in. Gate + lib MUST share one directory (the gate sources ${SCRIPT_DIR}/canvas-lib.sh).
SB="$(mktemp -d "${TMPDIR:-/tmp}/canvas-gate-test.XXXXXX")"
cleanup() { rm -rf "$SB"; }
trap cleanup EXIT

(
  cd "$SB"
  git init -q
  git checkout -q -b feat/canvas-gate-test 2>/dev/null || git checkout -q -b feat/canvas-gate-test
  mkdir -p hooks/scripts .forgeplan/canvas
  cp "$GATE" hooks/scripts/canvas-gate.sh
  cp "$LIB"  hooks/scripts/canvas-lib.sh
)

# Source the lib (for branch_slug + the canonicalize_path/path_is_guarded unit
# checks). Sourcing defines functions only — the CLI guard suppresses dispatch.
# shellcheck disable=SC1091
. "$SB/hooks/scripts/canvas-lib.sh"
SLUG="$(cd "$SB" && branch_slug)"
STATE="$SB/.forgeplan/canvas/state-${SLUG}.json"

# Canonical guarded-glob set (the default /canvas-init writes — design-system
# package + the framework-wrapper packages). Seeded into state so the test
# exercises the guarded_globs-from-state path the production gate reads. Derived
# from the lib's own default (single source of truth) so the suite tracks any
# change to CANVAS_DEFAULT_GUARDED_GLOBS instead of drifting from a stale copy.
GLOBS="$CANVAS_DEFAULT_GUARDED_GLOBS"

# set_state PHASE TOKENS_ACTIVE OVERRIDE [GUARDED_GLOBS]
set_state() {
  local globs="${4-$GLOBS}"
  printf '{"phase":"%s","tokens_rfc":"RFC-021","tokens_active":%s,"guarded_globs":"%s","override":%s,"started_at":"","phase_entered_at":""}' \
    "$1" "$2" "$globs" "$3" > "$STATE"
}

run_gate() {  # $1=tool json
  G_OUT="$(cd "$SB" && printf '%s' "$1" | bash hooks/scripts/canvas-gate.sh 2>/dev/null)"
  G_EXIT=$?
}
run_gate_env() {  # $1=env assignment, $2=tool json
  G_OUT="$(cd "$SB" && printf '%s' "$2" | env "$1" bash hooks/scripts/canvas-gate.sh 2>/dev/null)"
  G_EXIT=$?
}
is_deny() { printf '%s' "$G_OUT" | grep -q '"permissionDecision":"deny"'; }

# Tool-call fixtures (relative file_paths — the gate canonicalizes + makes them
# repo-relative; absolute paths are not required to drive the decision branches).
W_DS='{"tool_name":"Write","tool_input":{"file_path":"packages/design-system/foo.ts","content":"x"}}'
W_FW='{"tool_name":"Write","tool_input":{"file_path":"packages/canvas-react/Button.tsx","content":"x"}}'
E_DS='{"tool_name":"Edit","tool_input":{"file_path":"packages/design-system/tokens.ts","old_string":"a","new_string":"b"}}'
W_SCRATCH='{"tool_name":"Write","tool_input":{"file_path":".canvas-scratch/spike.ts","content":"spike"}}'
W_OTHER='{"tool_name":"Write","tool_input":{"file_path":"apps/web/page.tsx","content":"x"}}'
W_READ='{"tool_name":"Read","tool_input":{"file_path":"packages/design-system/foo.ts"}}'
W_TRAVERSE_IN='{"tool_name":"Write","tool_input":{"file_path":"foo/../packages/design-system/sneak.ts","content":"x"}}'
W_TRAVERSE_OUT='{"tool_name":"Write","tool_input":{"file_path":"packages/design-system/../safe.ts","content":"x"}}'

echo "== canvas-gate behavioral suite =="

# --- fail-closed + fast-path -------------------------------------------------
G_OUT="$(cd "$SB" && printf 'not json' | bash hooks/scripts/canvas-gate.sh 2>/dev/null)"; G_EXIT=$?
[ "$G_EXIT" -eq 2 ] && ok "bad stdin -> exit 2 (fail-closed)" || nok "bad stdin -> exit 2" "got exit=$G_EXIT"

rm -f "$STATE"
run_gate "$W_DS" ; { [ "$G_EXIT" -eq 0 ] && ! is_deny; } && ok "no state file -> allow (CANVAS inactive)" || nok "no state -> allow" "exit=$G_EXIT out=$G_OUT"

set_state design false false
run_gate "$W_READ" ; { [ "$G_EXIT" -eq 0 ] && ! is_deny; } && ok "non-write tool (Read) -> allow (fast-path)" || nok "Read fast-path" "exit=$G_EXIT out=$G_OUT"

# --- tokens_active=false: guarded paths blocked ------------------------------
set_state assemble false false
run_gate "$W_DS" ; is_deny && ok "tokens_active=false: Write packages/design-system/foo.ts -> deny" || nok "design-system deny" "exit=$G_EXIT out=$G_OUT"
run_gate "$W_FW" ; is_deny && ok "tokens_active=false: Write framework pkg packages/canvas-react/Button.tsx -> deny" || nok "framework-wrapper deny" "exit=$G_EXIT out=$G_OUT"
run_gate "$E_DS" ; is_deny && ok "tokens_active=false: Edit packages/design-system/tokens.ts -> deny (matcher covers Edit)" || nok "Edit guarded deny" "exit=$G_EXIT out=$G_OUT"

# --- tokens_active=false: non-guarded + scratch are allowed ------------------
run_gate "$W_SCRATCH" ; { [ "$G_EXIT" -eq 0 ] && ! is_deny; } && ok "tokens_active=false: .canvas-scratch/ spike -> allow (exemption)" || nok "scratch exemption" "exit=$G_EXIT out=$G_OUT"
run_gate "$W_OTHER" ;   { [ "$G_EXIT" -eq 0 ] && ! is_deny; } && ok "tokens_active=false: non-guarded apps/web/page.tsx -> allow (no over-deny)" || nok "non-guarded allow" "exit=$G_EXIT out=$G_OUT"

# --- tokens_active=true: C5 lever unlocked -----------------------------------
set_state assemble true false
run_gate "$W_DS" ; { [ "$G_EXIT" -eq 0 ] && ! is_deny; } && ok "tokens_active=true: guarded write -> allow (C5 unlocked)" || nok "tokens-active allow" "exit=$G_EXIT out=$G_OUT"
run_gate "$W_FW" ; { [ "$G_EXIT" -eq 0 ] && ! is_deny; } && ok "tokens_active=true: framework pkg write -> allow" || nok "tokens-active framework allow" "exit=$G_EXIT out=$G_OUT"

# --- phase=done -> cycle complete -> allow -----------------------------------
set_state done false false
run_gate "$W_DS" ; { [ "$G_EXIT" -eq 0 ] && ! is_deny; } && ok "phase=done: guarded write -> allow (sub-cycle complete)" || nok "done allow" "exit=$G_EXIT out=$G_OUT"

# --- human override (state + env) --------------------------------------------
set_state assemble false true
run_gate "$W_DS" ; { [ "$G_EXIT" -eq 0 ] && ! is_deny; } && ok "state.override=true: guarded write -> allow (logged escape)" || nok "state override allow" "exit=$G_EXIT out=$G_OUT"
set_state assemble false false
run_gate_env "CANVAS_GATE_OVERRIDE=1" "$W_DS" ; { [ "$G_EXIT" -eq 0 ] && ! is_deny; } && ok "CANVAS_GATE_OVERRIDE=1: guarded write before tokens -> allow" || nok "env override allow" "exit=$G_EXIT out=$G_OUT"

# --- empty phase -> fail-closed ----------------------------------------------
set_state "" false false
run_gate "$W_DS" ; [ "$G_EXIT" -eq 2 ] && ok "empty phase -> exit 2 (fail-closed)" || nok "empty phase exit2" "exit=$G_EXIT out=$G_OUT"

# --- path-traversal is canonicalized BEFORE matching (bypass class) ----------
set_state assemble false false
run_gate "$W_TRAVERSE_IN"  ; is_deny && ok "traversal INTO guarded dir (foo/../packages/design-system/sneak.ts) -> deny" || nok "traversal-in deny" "exit=$G_EXIT out=$G_OUT"
run_gate "$W_TRAVERSE_OUT" ; { [ "$G_EXIT" -eq 0 ] && ! is_deny; } && ok "traversal OUT of guarded dir (packages/design-system/../safe.ts) -> allow" || nok "traversal-out allow" "exit=$G_EXIT out=$G_OUT"

# ---------------------------------------------------------------------------
# canvas-lib unit checks (sourced functions — no subprocess)
# ---------------------------------------------------------------------------
echo "== canvas-lib functions =="

# canonicalize_path: load-bearing normalizer (a regression here opens a
# path-traversal bypass class).
u="$(canonicalize_path "a/b/../c")"
[ "$u" = "a/c" ] && ok "canonicalize_path: a/b/../c -> a/c" || nok "canon relative .." "got=$u"
u="$(canonicalize_path "packages/design-system/../../secret")"
[ "$u" = "secret" ] && ok "canonicalize_path: escapes guarded dir -> secret" || nok "canon escape" "got=$u"
u="$(canonicalize_path "/a/b/../../../x")"
[ "$u" = "/x" ] && ok "canonicalize_path: absolute .. cannot rise above root -> /x" || nok "canon absolute .." "got=$u"
u="$(canonicalize_path "")"
[ "$u" = "." ] && ok "canonicalize_path: empty input -> ." || nok "canon empty" "got=$u"
u1="$(canonicalize_path "x/y/../z/")"; u2="$(canonicalize_path "$u1")"
[ "$u1" = "$u2" ] && [ "$u1" = "x/z" ] && ok "canonicalize_path: idempotent (x/y/../z/ -> x/z)" || nok "canon idempotent" "u1=$u1 u2=$u2"

# path_is_guarded: the fixed guarded-glob check (default globs).
unset GUARDED_GLOBS 2>/dev/null || true
[ "$(path_is_guarded "packages/design-system/x.ts")" = "yes" ] && ok "path_is_guarded: packages/design-system/x.ts -> yes" || nok "guarded ds yes"
[ "$(path_is_guarded "packages/canvas-vue/Btn.vue")"  = "yes" ] && ok "path_is_guarded: packages/canvas-vue/Btn.vue -> yes" || nok "guarded fw yes"
[ "$(path_is_guarded "src/app.ts")" = "no" ] && ok "path_is_guarded: src/app.ts -> no" || nok "guarded src no"

# ---------------------------------------------------------------------------
echo "== summary: $PASS passed, $FAIL failed =="
[ "$FAIL" -eq 0 ]
