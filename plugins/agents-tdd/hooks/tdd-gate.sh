#!/usr/bin/env bash
# ============================================================================
# tdd-gate.sh — PreToolUse gate for enforced-TDD (RFC-012 FR-5, ADR-010 C5)
# ============================================================================
# Fail-closed: any unexpected condition → exit 2 (deny), never exit 0 (allow)
# when the condition is an error rather than a clean "TDD not active" case.
#
# Phase enforcement (DESIGN D3, RFC-012 FR-5):
#   tdd-plan  → deny source AND test writes
#   tdd-red   → allow test writes; deny source writes unless content has STUB:TDD
#   tdd-green → DENY test writes (#1 control per NOTE-021 B2); allow source writes;
#               if live normalized SPEC hash ≠ frozen spec_hash in state → BLOCK
#
# Block mechanism (DESIGN D2):
#   exit 0 + stdout JSON {"hookSpecificOutput":{"hookEventName":"PreToolUse",
#     "permissionDecision":"deny","permissionDecisionReason":"<why>"}}
# Allow:
#   plain exit 0 (no stdout)
#
# Fail-closed cases → exit 2:
#   * jq not available
#   * stdin not parseable as JSON
#   * state file present but not parseable
#   * SHA-256 tool not available when oracle check is needed
# ============================================================================

set -euo pipefail
set -f   # disable glob expansion — hostile paths must not expand

# ---------------------------------------------------------------------------
# 0. Sanity: require jq (fail-closed if missing)
# ---------------------------------------------------------------------------
if ! command -v jq >/dev/null 2>&1; then
  # jq absent — cannot parse hook input; fail-closed
  exit 2
fi

# ---------------------------------------------------------------------------
# 1. Read stdin once, bulk-parse all fields we need
# ---------------------------------------------------------------------------
# On unparseable stdin → exit 2 (fail-closed; never allow on bad input)
STDIN_JSON="$(cat)"

# Validate it parses as JSON
if ! printf '%s' "$STDIN_JSON" | jq -e . >/dev/null 2>&1; then
  exit 2
fi

TOOL_NAME="$(printf '%s' "$STDIN_JSON" | jq -r '.tool_name // ""' 2>/dev/null)" || exit 2
FILE_PATH="$(printf '%s' "$STDIN_JSON" | jq -r '.tool_input.file_path // ""' 2>/dev/null)" || exit 2
COMMAND="$(printf '%s' "$STDIN_JSON" | jq -r '.tool_input.command // ""' 2>/dev/null)" || exit 2
# content covers Write; new_string covers Edit
CONTENT="$(printf '%s' "$STDIN_JSON" | jq -r '(.tool_input.content // .tool_input.new_string // "")' 2>/dev/null)" || exit 2

# ---------------------------------------------------------------------------
# 2. Fast-path: non-write tools → allow immediately (before loading state)
# ---------------------------------------------------------------------------
case "$TOOL_NAME" in
  Write|Edit|MultiEdit|Bash) ;;   # write-capable tools — fall through to gate
  *) exit 0 ;;                    # all other tools → allow
esac

# ---------------------------------------------------------------------------
# 3. Source tdd-lib.sh (provides classify_file, normalized_spec_hash, etc.)
# ---------------------------------------------------------------------------
# Resolve the lib relative to this script's location.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TDD_LIB="${SCRIPT_DIR}/../scripts/tdd-lib.sh"

if [ ! -f "$TDD_LIB" ]; then
  # Library missing — cannot enforce; fail-closed
  exit 2
fi
# shellcheck source=../scripts/tdd-lib.sh
. "$TDD_LIB"

# ---------------------------------------------------------------------------
# 4. Locate state file — if absent, TDD not active on this branch → allow
# ---------------------------------------------------------------------------
REPO_ROOT="$(repo_root 2>/dev/null)" || exit 0   # not in a git repo → allow
SLUG="$(branch_slug 2>/dev/null)" || exit 0       # detached HEAD → allow

STATE_FILE="${REPO_ROOT}/${FORGEPLAN_TDD_DIR}/state-${SLUG}.json"

if [ ! -f "$STATE_FILE" ]; then
  # No state file → TDD not active on this branch → allow
  exit 0
fi

# ---------------------------------------------------------------------------
# 5. Read phase from state file (fail-closed on parse error)
# ---------------------------------------------------------------------------
PHASE="$(jq -r '.phase // ""' "$STATE_FILE" 2>/dev/null)" || exit 2
if [ -z "$PHASE" ]; then
  exit 2
fi

# Phase "done" → TDD cycle complete → allow all writes
if [ "$PHASE" = "done" ]; then
  exit 0
fi

# ---------------------------------------------------------------------------
# 6. Load patterns from stack.json and classify the target file
# ---------------------------------------------------------------------------
STACK_FILE="${REPO_ROOT}/${FORGEPLAN_TDD_DIR}/stack.json"

if [ ! -f "$STACK_FILE" ]; then
  # No stack.json — cannot classify; fail-closed
  exit 2
fi

TEST_PATTERN="$(jq -r '.test_file_glob // ""' "$STACK_FILE" 2>/dev/null)" || exit 2
SOURCE_PATTERN="$(jq -r '.source_file_glob // ""' "$STACK_FILE" 2>/dev/null)" || exit 2
export TEST_PATTERN SOURCE_PATTERN

# Determine the target path:
# * For Write/Edit/MultiEdit: use file_path from tool_input
# * For Bash: inspect command for write-redirects and extract target file
TARGET_FILE=""
BASH_WRITE=0

if [ "$TOOL_NAME" = "Bash" ]; then
  if [ -n "$COMMAND" ] && _has_write_pattern "$COMMAND"; then
    BASH_WRITE=1
    # Extract all candidate file paths from the command
    TARGET_FILE="$(get_target_file "$COMMAND" | head -1)"
  fi
  # Bash with no write pattern → allow
  if [ "$BASH_WRITE" = "0" ]; then
    exit 0
  fi
else
  TARGET_FILE="$FILE_PATH"
fi

# If we still have no target to classify → allow (conservative; we can't
# block an unknown target without false-positive risk)
if [ -z "$TARGET_FILE" ]; then
  exit 0
fi

# Canonicalize before classifying (prevents path-traversal bypass)
TARGET_CANONICAL="$(canonicalize_path "$TARGET_FILE")"
FILE_KIND="$(classify_file "$TARGET_CANONICAL")"

# ---------------------------------------------------------------------------
# 7. Phase-specific enforcement (DESIGN D3)
# ---------------------------------------------------------------------------
_deny() {
  local reason="$1"
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}' \
    "$(printf '%s' "$reason" | sed 's/"/\\"/g')"
  exit 0
}

case "$PHASE" in

  # -------------------------------------------------------------------------
  tdd-plan)
    # Plan phase: deny ALL source and test writes — only the planner writes
    # its plan artifact (via forgeplan MCP, not file tools).
    if [ "$FILE_KIND" = "test" ] || [ "$FILE_KIND" = "source" ]; then
      _deny "TDD phase tdd-plan: source and test writes are blocked. Only tdd-planner may write a plan artifact (via forgeplan MCP). Wait for tdd-red phase to write tests. (RFC-012 FR-5 / ADR-010 C5)"
    fi
    ;;

  # -------------------------------------------------------------------------
  tdd-red)
    # RED phase: allow test writes; deny source writes unless STUB:TDD marker.
    if [ "$FILE_KIND" = "source" ]; then
      # Allow only if content contains the STUB:TDD marker
      if printf '%s' "$CONTENT" | grep -qF 'STUB:TDD' 2>/dev/null; then
        exit 0   # STUB marker present — allow the stub
      else
        _deny "TDD phase tdd-red: source file writes are blocked unless the content contains a 'STUB:TDD' marker. coder-tdd writes tests only; minimal stubs in source require the STUB:TDD marker. (RFC-012 FR-5 / ADR-010 C5)"
      fi
    fi
    if [ "$FILE_KIND" = "test" ]; then
      exit 0   # allow — this is exactly what coder-tdd should do
    fi
    ;;

  # -------------------------------------------------------------------------
  tdd-green)
    # GREEN phase: the #1 control — DENY test writes (NOTE-021 B2, RFC-012 FR-5).
    # Allow source writes. Additionally: if SPEC hash has drifted → BLOCK.
    if [ "$FILE_KIND" = "test" ]; then
      _deny "TDD phase tdd-green: test file writes are BLOCKED. The oracle is frozen after tdd-test-validator PASS. If a test is wrong, STOP and emit TEST_BUG: {file}:{line} — {description}. Do not edit the frozen tests. (RFC-012 FR-4/FR-5 / ADR-010 C5)"
    fi

    if [ "$FILE_KIND" = "source" ] || [ "$FILE_KIND" = "other" ]; then
      # Oracle drift check (FR-6): only when spec_hash is stamped in state.
      FROZEN_HASH="$(jq -r '.spec_hash // ""' "$STATE_FILE" 2>/dev/null)" || exit 2

      if [ -n "$FROZEN_HASH" ]; then
        SPEC_PATH="$(jq -r '.spec_path // ""' "$STATE_FILE" 2>/dev/null)" || exit 2

        # Fail-closed: a frozen hash with no spec_path is a contradictory state —
        # the oracle-drift check cannot run, so we must NOT silently allow the
        # write (that would be a fail-open bypass of FR-6). Deny until restored.
        if [ -z "$SPEC_PATH" ]; then
          _deny "TDD tdd-green: spec_hash is frozen but spec_path is empty in state — the oracle drift check (FR-6) cannot run. Refusing source writes until spec_path is restored in .forgeplan/tdd/state. (RFC-012 FR-6 / ADR-010 C5)"
        fi

        if [ -n "$SPEC_PATH" ]; then
          # Resolve spec path relative to repo root if not absolute
          case "$SPEC_PATH" in
            /*) ABS_SPEC_PATH="$SPEC_PATH" ;;
            *)  ABS_SPEC_PATH="${REPO_ROOT}/${SPEC_PATH}" ;;
          esac

          if [ -f "$ABS_SPEC_PATH" ]; then
            LIVE_HASH="$(normalized_spec_hash "$ABS_SPEC_PATH" 2>/dev/null)"
            HASH_RC=$?

            if [ "$HASH_RC" -eq 2 ]; then
              # No SHA-256 tool — cannot verify oracle; fail-closed
              _deny "TDD phase tdd-green: SPEC oracle drift check FAILED — no SHA-256 tool available (sha256sum / shasum / openssl). Cannot verify SPEC integrity. Resolve tool availability first. (RFC-012 FR-6 / ADR-010 C5)"
            fi

            if [ "$HASH_RC" -ne 0 ] || [ -z "$LIVE_HASH" ]; then
              # Could not hash the live SPEC — fail-closed
              _deny "TDD phase tdd-green: SPEC oracle drift check FAILED — could not hash the live SPEC at '${SPEC_PATH}'. SPEC may have been moved or deleted. (RFC-012 FR-6 / ADR-010 C5)"
            fi

            if [ "$LIVE_HASH" != "$FROZEN_HASH" ]; then
              _deny "TDD phase tdd-green: SPEC oracle drift DETECTED. The SPEC '${SPEC_PATH}' changed after the oracle was frozen at tdd-test-validator PASS (frozen ${FROZEN_HASH:0:12}… vs live ${LIVE_HASH:0:12}…). Do NOT edit the SPEC in place — that erases requirement history. The SPEC is immutable once frozen; if it genuinely must change, SUPERSEDE it with a delta-spec (ADDED/MODIFIED/REMOVED) via /supersede (S12 OpenSpec discipline), then restart the TDD cycle so a fresh oracle is frozen. If the change was accidental, restore the SPEC to its frozen content. (RFC-012 FR-6 / ADR-010 C5)"
            fi
          fi
          # spec_path set but file absent → allow (may be a forgeplan artifact
          # path not on disk; do not block on an unresolvable path)
        fi
      fi

      # Source write in GREEN, oracle intact → allow
      exit 0
    fi
    ;;

  *)
    # Unknown phase — fail-closed
    exit 2
    ;;
esac

# Default: allow (only reached for "other" file kinds in tdd-plan/tdd-red
# where no deny rule fired)
exit 0
