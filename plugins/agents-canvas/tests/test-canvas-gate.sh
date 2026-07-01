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
# RFC-022 острый-gate tests — AC-2 / AC-10 / AC-9 / AC-11
# ---------------------------------------------------------------------------
echo "== RFC-022 острый-gate additions =="

# AC-2: native in-app layout fail-closed deny
# A React-native design-system at src/components/** must be denied while
# tokens_active != true (the gate fails OPEN under the old packages/** default
# for this layout — the verified DD-7 hazard that RFC-022 exists to fix).
W_SRC_BTN='{"tool_name":"Write","tool_input":{"file_path":"src/components/Button.tsx","content":"x"}}'
set_state assemble false false "src/components/**|app/**|components/**"
run_gate "$W_SRC_BTN"
is_deny && ok "AC-2: tokens_active=false + Write src/components/Button.tsx -> deny (native layout)" \
          || nok "AC-2 native deny" "exit=$G_EXIT out=$G_OUT"

set_state assemble true false "src/components/**|app/**|components/**"
run_gate "$W_SRC_BTN"
{ [ "$G_EXIT" -eq 0 ] && ! is_deny; } && ok "AC-2: tokens_active=true + Write src/components/Button.tsx -> allow (C5 unlocked)" \
                                         || nok "AC-2 native allow after unlock" "exit=$G_EXIT out=$G_OUT"

# AC-10 / F-1 / F-3: zero-match self-check — FAIL-TO-PROTECTED.
# When no conventional component directory exists on disk, init-framework must
# NOT leave the gate unarmed (a fail-OPEN window). It arms the fail-SAFE
# catch-all (over-guard) AND emits <<NEED_USER_INPUT>> to confirm the real dir.
# Guard: remove any src/app/components dirs so the zero-match path is exercised.
rm -rf "$SB/src" "$SB/app" "$SB/components" 2>/dev/null || true
rm -f "$STATE"
AC10_OUT="$(cd "$SB" && bash hooks/scripts/canvas-lib.sh init-framework "$SLUG" react 2>&1)" || true
printf '%s' "$AC10_OUT" | grep -q "NEED_USER_INPUT" \
  && ok "AC-10: zero-match on-disk -> <<NEED_USER_INPUT>> emitted" \
  || nok "AC-10 NEED_USER_INPUT" "out=$AC10_OUT"
[ -f "$STATE" ] \
  && ok "AC-10/F-3: zero-match -> state ARMED with fail-safe over-guard (no fail-open window)" \
  || nok "AC-10/F-3 state armed" "state missing"
AC10_GLOBS="$(cd "$SB" && bash hooks/scripts/canvas-lib.sh get "$SLUG" guarded_globs 2>/dev/null)"
printf '%s' "$AC10_GLOBS" | grep -q 'src/\*\*' \
  && ok "AC-10/F-1: armed globs are the fail-safe over-guard (src/** present)" \
  || nok "AC-10/F-1 catch-all globs" "globs=$AC10_GLOBS"
# F-1: a write under a NON-conventional dir (src/ui/) is still denied pre-token.
W_SRC_UI='{"tool_name":"Write","tool_input":{"file_path":"src/ui/Button.tsx","content":"x"}}'
run_gate "$W_SRC_UI"
is_deny \
  && ok "AC-10/F-1: non-conventional src/ui/Button.tsx denied by catch-all (tokens_active=false)" \
  || nok "AC-10/F-1 non-conventional deny" "exit=$G_EXIT out=$G_OUT"

# AC-9: stale pre-RFC-022 state migration
# Seed a v0.3.0-style state (wrapper-only globs, no state_schema_version).
# After migrate, guarded_globs must be re-derived to the native React set.
mkdir -p "$SB/src/components"
printf '{"phase":"design","tokens_rfc":"","tokens_active":false,"guarded_globs":"packages/design-system/**|packages/design-system-*/**|packages/canvas-*/**|packages/*-canvas/**","override":false,"started_at":"","phase_entered_at":""}' \
  > "$STATE"
AC9_OUT="$(cd "$SB" && bash hooks/scripts/canvas-lib.sh migrate "$SLUG" react 2>&1)"
printf '%s' "$AC9_OUT" | grep -qiE "stale|migrat" \
  && ok "AC-9: stale state -> migration message emitted" \
  || nok "AC-9 stale message" "out=$AC9_OUT"
AC9_GLOBS="$(cd "$SB" && bash hooks/scripts/canvas-lib.sh get "$SLUG" guarded_globs 2>/dev/null)"
printf '%s' "$AC9_GLOBS" | grep -q "src/components" \
  && ok "AC-9: migrated guarded_globs contain src/components/**" \
  || nok "AC-9 migrated globs" "globs=$AC9_GLOBS"
AC9_SV="$(cd "$SB" && bash hooks/scripts/canvas-lib.sh get "$SLUG" state_schema_version 2>/dev/null)"
[ -n "$AC9_SV" ] && [ "$AC9_SV" != "null" ] \
  && ok "AC-9: migrated state has state_schema_version='${AC9_SV}'" \
  || nok "AC-9 schema_version stamped" "got='$AC9_SV'"

# AC-11: end-to-end derivation -> persisted state -> gate integration
# This is the seam test: the deny must come from REAL canvas-lib.sh init-framework
# output, not a hand-built state literal. A glob-format bug that passes AC-1
# (unit) and AC-2 (unit) in isolation must fail here.
rm -f "$STATE"
# src/components already exists from AC-9
AC11_INIT="$(cd "$SB" && bash hooks/scripts/canvas-lib.sh init-framework "$SLUG" react 2>&1)"
[ -f "$STATE" ] \
  && ok "AC-11: init-framework wrote state file" \
  || nok "AC-11 state created" "init output: $AC11_INIT"

AC11_GLOBS="$(cd "$SB" && bash hooks/scripts/canvas-lib.sh get "$SLUG" guarded_globs 2>/dev/null)"
printf '%s' "$AC11_GLOBS" | grep -q "src/components" \
  && ok "AC-11: real init-framework persisted src/components/** in guarded_globs" \
  || nok "AC-11 glob in state" "globs=$AC11_GLOBS"

# Gate must deny src/components/Button.tsx from real init-framework state
# (tokens_active=false by design of init-framework).
run_gate "$W_SRC_BTN"
is_deny \
  && ok "AC-11 e2e: real init-framework state -> gate denies src/components/Button.tsx (tokens_active=false)" \
  || nok "AC-11 e2e deny" "exit=$G_EXIT out=$G_OUT"

# Unlock via set-tokens and assert gate then allows the same path.
(cd "$SB" && bash hooks/scripts/canvas-lib.sh set-tokens "$SLUG" "RFC-TEST" true) >/dev/null 2>&1
run_gate "$W_SRC_BTN"
{ [ "$G_EXIT" -eq 0 ] && ! is_deny; } \
  && ok "AC-11 e2e: after set-tokens true -> gate allows src/components/Button.tsx" \
  || nok "AC-11 e2e allow after unlock" "exit=$G_EXIT out=$G_OUT"

# --- F-2: the gate fails-CLOSED on STALE pre-RFC-022 state (no migrate run) ---
# A v0.3.0 install that upgraded but never re-ran /canvas-init keeps wrapper-only
# globs with no state_schema_version; on a native layout those guard nothing, so
# the gate would silently fail OPEN. canvas_effective_guarded_globs must detect
# the stale state and substitute the fail-SAFE catch-all -> the gate DENIES.
# (EVID-194 F-2 — the only silent fail-open. canvas-gate.sh logic is unchanged.)
rm -f "$STATE"
printf '{"phase":"assemble","tokens_rfc":"","tokens_active":false,"guarded_globs":"packages/design-system/**|packages/design-system-*/**|packages/canvas-*/**|packages/*-canvas/**","override":false,"started_at":"","phase_entered_at":""}' \
  > "$STATE"
run_gate "$W_SRC_BTN"
is_deny \
  && ok "F-2: stale pre-RFC-022 state -> gate denies native src/components/Button.tsx (fail-safe substitution)" \
  || nok "F-2 stale-state native deny" "exit=$G_EXIT out=$G_OUT"
run_gate "$W_DS"
is_deny \
  && ok "F-2: stale state still denies packages/design-system (catch-all superset, no regression)" \
  || nok "F-2 stale packages deny" "exit=$G_EXIT out=$G_OUT"
# Current (schema-stamped) state must NOT trigger the stale substitution:
# packages-only globs with schema_version -> a src/ write stays ALLOWED.
set_state assemble false false "packages/design-system/**"
(cd "$SB" && bash hooks/scripts/canvas-lib.sh get "$SLUG" >/dev/null 2>&1)
# stamp schema_version onto the current state so it is NOT treated as stale
tmp_cur="$(jq '. + {state_schema_version:"1"}' "$STATE")" && printf '%s' "$tmp_cur" > "$STATE"
run_gate "$W_SRC_BTN"
{ [ "$G_EXIT" -eq 0 ] && ! is_deny; } \
  && ok "F-2: current schema state + packages-only globs -> src/components write still ALLOWED (no over-trigger to catch-all)" \
  || nok "F-2 current-state no over-trigger" "exit=$G_EXIT out=$G_OUT"

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
