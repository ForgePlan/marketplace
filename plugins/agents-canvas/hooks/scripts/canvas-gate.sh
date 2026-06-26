#!/usr/bin/env bash
# ============================================================================
# canvas-gate.sh — PreToolUse gate for the CANVAS tokens-gate (spec section 9
#                  LOCKED DECISION 5, ADR-010 C5)
# ============================================================================
# The hook-gate rule: NO write to packages/design-system/** (or the framework
# wrapper packages) until the **tokens RFC is active**. CANVAS's #1 anti-pattern
# is hand-writing component/source code against an unfrozen, un-traceable token
# set — that forks the single-source-of-truth (one tokens.json, never forked,
# LOCKED DECISION 3). A PreToolUse deny is the only thing that binds human edits
# too — the canvas-coordinator's dispatch discipline only binds dispatched
# sub-agents.
#
# Fail-closed: any unexpected condition -> exit 2 (deny), never exit 0 (allow)
# when the condition is an error rather than a clean "CANVAS not active" case.
#
# Gate semantics (canvas-lib.sh state):
#   no state file        -> allow (CANVAS not active on this branch)
#   phase == done        -> allow (sub-cycle complete)
#   override == true      -> allow (logged human escape hatch)
#   tokens_active == true -> allow (C5 lever unlocked: Coder/Framework-Porter)
#   tokens_active == false:
#       target under a guarded glob -> DENY
#       target elsewhere            -> allow
#
# Exemptions (always allowed, any state): a path under a `.canvas-scratch/`
# segment — throwaway spikes are not the committed design-system (gitignored).
#
# Block mechanism: exit 0 + stdout JSON permissionDecision:deny.
# Allow: plain exit 0 (no stdout).
# Fail-closed cases -> exit 2: jq missing, unparseable stdin, unparseable state,
#   missing lib, empty phase.
# ============================================================================

set -euo pipefail
set -f   # disable glob expansion — hostile paths must not expand

# 0. Sanity: require jq (fail-closed if missing)
if ! command -v jq >/dev/null 2>&1; then
  exit 2
fi

# 1. Read stdin once, bulk-parse the fields we need
STDIN_JSON="$(cat)"
if ! printf '%s' "$STDIN_JSON" | jq -e . >/dev/null 2>&1; then
  exit 2
fi
TOOL_NAME="$(printf '%s' "$STDIN_JSON" | jq -r '.tool_name // ""' 2>/dev/null)" || exit 2
FILE_PATH="$(printf '%s' "$STDIN_JSON" | jq -r '.tool_input.file_path // ""' 2>/dev/null)" || exit 2

# 2. Fast-path: non-write tools -> allow immediately (before loading state).
#    The hook matcher is Write|Edit|MultiEdit; anything else is a no-op.
case "$TOOL_NAME" in
  Write|Edit|MultiEdit) ;;   # write tools — fall through to gate
  *) exit 0 ;;               # all other tools -> allow
esac

# 3. Source canvas-lib.sh (provides canonicalize_path, path_is_guarded, etc.)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CANVAS_LIB="${SCRIPT_DIR}/canvas-lib.sh"
if [ ! -f "$CANVAS_LIB" ]; then
  exit 2   # library missing — cannot enforce; fail-closed
fi
# shellcheck source=./canvas-lib.sh
. "$CANVAS_LIB"

# 4. Locate state file — if absent, CANVAS not active on this branch -> allow
REPO_ROOT="$(repo_root 2>/dev/null)" || exit 0   # not in a git repo -> allow
SLUG="$(branch_slug 2>/dev/null)" || exit 0       # detached HEAD -> allow
STATE_FILE="${REPO_ROOT}/${FORGEPLAN_CANVAS_DIR}/state-${SLUG}.json"
if [ ! -f "$STATE_FILE" ]; then
  exit 0   # no state file -> CANVAS not active on this branch -> allow
fi

# 5. Read phase from state (fail-closed on parse error)
PHASE="$(jq -r '.phase // ""' "$STATE_FILE" 2>/dev/null)" || exit 2
if [ -z "$PHASE" ]; then
  exit 2
fi

# Phase "done" -> CANVAS cycle complete -> allow all writes
if [ "$PHASE" = "done" ]; then
  exit 0
fi

# 6. Human override — a logged escape for legitimate non-DS edits.
OVERRIDE_STATE="$(jq -r '.override // false' "$STATE_FILE" 2>/dev/null)" || exit 2
if [ "$OVERRIDE_STATE" = "true" ] || [ "${CANVAS_GATE_OVERRIDE:-}" = "1" ]; then
  exit 0   # override active -> allow
fi

# 7. Tokens-active is the C5 lever — once the tokens RFC is active, the Coder
#    and Framework-Porter may write design-system source.
TOKENS_ACTIVE="$(jq -r '.tokens_active // false' "$STATE_FILE" 2>/dev/null)" || exit 2
if [ "$TOKENS_ACTIVE" = "true" ]; then
  exit 0   # tokens contract active -> allow all writes
fi

# 8. tokens_active=false — only guarded paths are blocked. No target -> allow.
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Canonicalize before any matching (prevents path-traversal bypass)
TARGET_CANONICAL="$(canonicalize_path "$FILE_PATH")"
REL="$(repo_relative "$TARGET_CANONICAL")"

# Scratch exemption — a `.canvas-scratch/` segment is always writable so
# throwaway spikes during design/port are not blocked.
case "/$REL/" in
  */.canvas-scratch/*) exit 0 ;;
esac

# Load the per-branch guarded globs (fall back to the lib default).
GUARDED_GLOBS="$(jq -r '.guarded_globs // ""' "$STATE_FILE" 2>/dev/null)" || exit 2
export GUARDED_GLOBS

# 9. Guarded-path enforcement (spec section 9 / ADR-010 C5)
_deny() {
  local reason="$1"
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}' \
    "$(printf '%s' "$reason" | sed 's/"/\\"/g')"
  exit 0
}

if [ "$(path_is_guarded "$REL")" = "yes" ]; then
  _deny "CANVAS tokens-gate: writes to the design-system / framework packages are BLOCKED until the tokens RFC is active. The Style-Dictionary token contract (single tokens.json -> CSS custom properties) must pass Gate V and be activated before any component/source code is written against it — otherwise the single source of truth forks. Path '${REL}' is guarded. To unlock: complete Capture -> Audit -> Norm-check -> Vectorize, get the tokens RFC activated, then 'canvas-lib.sh set-tokens <slug> RFC-NNN true'. For a throwaway spike write under .canvas-scratch/ ; for a legitimate non-DS edit set a logged override (CANVAS_GATE_OVERRIDE=1 or canvas-lib.sh set-override <slug> true). (spec section 9 LOCKED DECISION 5 / ADR-010 C5)"
fi

# Default: allow (target is not under a guarded package subtree)
exit 0
