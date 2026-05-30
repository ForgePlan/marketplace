#!/usr/bin/env bash
# ============================================================================
# bmad-gate.sh — PreToolUse gate for the BMAD pipeline (RFC-013 FR-4, ADR-010 C5)
# ============================================================================
# The острый rule: NO application source/test code may be written until the
# planning artifacts are done and the readiness gate has unlocked dev. This is
# BMAD's #1 anti-pattern (jumping to code before the PRD/architecture/stories
# exist). A PreToolUse deny is the only thing that binds human edits too — the
# master's dispatch discipline only binds dispatched agents.
#
# Fail-closed: any unexpected condition → exit 2 (deny), never exit 0 (allow)
# when the condition is an error rather than a clean "BMAD not active" case.
#
# Phase enforcement (RFC-013 FR-4, BMAD-DESIGN D2/D3):
#   planning       → deny source AND test writes (only forgeplan-MCP artifacts
#                    + design .md; the planning personas write via MCP)
#   solutioning    → deny source AND test writes (still planning-level: ADR/RFC
#                    + story RFCs via MCP)
#   implementation → dev_unlocked? allow source+test (Dev/QA work)
#                                : deny (readiness gate not PASSed yet)
#   done           → allow all (sub-cycle complete)
#
# Exemptions (always allowed, any phase):
#   * a path under a `.bmad-scratch/` segment — architectural spikes during
#     solutioning are not the committed feature (gitignored). RFC-013 FR-4.
#   * an active human override — state.override==true OR env BMAD_GATE_OVERRIDE=1
#     — a logged escape for legitimate non-feature edits during the long
#     planning arc. RFC-013 FR-4 (operability).
#
# Block mechanism: exit 0 + stdout JSON permissionDecision:deny.
# Allow: plain exit 0 (no stdout).
# Fail-closed cases → exit 2: jq missing, unparseable stdin, unparseable state,
#   missing lib, missing stack.json, unknown phase.
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
COMMAND="$(printf '%s' "$STDIN_JSON" | jq -r '.tool_input.command // ""' 2>/dev/null)" || exit 2

# 2. Fast-path: non-write tools → allow immediately (before loading state)
case "$TOOL_NAME" in
  Write|Edit|MultiEdit|Bash) ;;   # write-capable tools — fall through to gate
  *) exit 0 ;;                    # all other tools → allow
esac

# 3. Source bmad-lib.sh (provides classify_file, canonicalize_path, etc.)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BMAD_LIB="${SCRIPT_DIR}/../scripts/bmad-lib.sh"
if [ ! -f "$BMAD_LIB" ]; then
  exit 2   # library missing — cannot enforce; fail-closed
fi
# shellcheck source=../scripts/bmad-lib.sh
. "$BMAD_LIB"

# 4. Locate state file — if absent, BMAD not active on this branch → allow
REPO_ROOT="$(repo_root 2>/dev/null)" || exit 0   # not in a git repo → allow
SLUG="$(branch_slug 2>/dev/null)" || exit 0       # detached HEAD → allow
STATE_FILE="${REPO_ROOT}/${FORGEPLAN_BMAD_DIR}/state-${SLUG}.json"
if [ ! -f "$STATE_FILE" ]; then
  exit 0   # no state file → BMAD not active on this branch → allow
fi

# 5. Read phase from state (fail-closed on parse error)
PHASE="$(jq -r '.phase // ""' "$STATE_FILE" 2>/dev/null)" || exit 2
if [ -z "$PHASE" ]; then
  exit 2
fi

# Phase "done" → BMAD cycle complete → allow all writes
if [ "$PHASE" = "done" ]; then
  exit 0
fi

# 6. Human override — a logged escape for legitimate non-feature edits.
#    state.override==true (set by the master/CLI for audit) OR env override.
OVERRIDE_STATE="$(jq -r '.override // false' "$STATE_FILE" 2>/dev/null)" || exit 2
if [ "$OVERRIDE_STATE" = "true" ] || [ "${BMAD_GATE_OVERRIDE:-}" = "1" ]; then
  exit 0   # override active → allow
fi

# 7. Load patterns from stack.json and classify the target file
STACK_FILE="${REPO_ROOT}/${FORGEPLAN_BMAD_DIR}/stack.json"
if [ ! -f "$STACK_FILE" ]; then
  exit 2   # no stack.json — cannot classify; fail-closed
fi
TEST_PATTERN="$(jq -r '.test_file_glob // ""' "$STACK_FILE" 2>/dev/null)" || exit 2
SOURCE_PATTERN="$(jq -r '.source_file_glob // ""' "$STACK_FILE" 2>/dev/null)" || exit 2
export TEST_PATTERN SOURCE_PATTERN

# Determine the target path (Write/Edit/MultiEdit → file_path; Bash → redirect target)
TARGET_FILE=""
if [ "$TOOL_NAME" = "Bash" ]; then
  if [ -n "$COMMAND" ] && _has_write_pattern "$COMMAND"; then
    TARGET_FILE="$(get_target_file "$COMMAND" | head -1)"
  fi
  # Bash with no write pattern → allow. KNOWN-OPEN GAP (conservative, mirrors
  # the TDD gate): a write-pattern command whose target get_target_file cannot
  # extract (no recognized extension) yields an empty TARGET_FILE and is
  # allowed — blocking an unextractable target would false-positive on benign
  # commands. The agent-path discipline + the readiness gate cover this case.
  if [ -z "$TARGET_FILE" ]; then
    exit 0
  fi
else
  TARGET_FILE="$FILE_PATH"
fi

# No target to classify → allow (conservative; can't block an unknown target)
if [ -z "$TARGET_FILE" ]; then
  exit 0
fi

# Canonicalize before any matching (prevents path-traversal bypass)
TARGET_CANONICAL="$(canonicalize_path "$TARGET_FILE")"

# 8. Scratch exemption — a `.bmad-scratch/` segment is always writable so
#    architectural spikes during solutioning are not blocked (RFC-013 FR-4).
case "/$TARGET_CANONICAL/" in
  */.bmad-scratch/*) exit 0 ;;
esac

FILE_KIND="$(classify_file "$TARGET_CANONICAL")"

# 9. Phase-specific enforcement (RFC-013 FR-4 / BMAD-DESIGN D3)
_deny() {
  local reason="$1"
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}' \
    "$(printf '%s' "$reason" | sed 's/"/\\"/g')"
  exit 0
}

case "$PHASE" in

  planning|solutioning)
    # No application code before the plan. Only the planning personas write —
    # and they write forgeplan artifacts via MCP, not source/test files.
    if [ "$FILE_KIND" = "test" ] || [ "$FILE_KIND" = "source" ]; then
      _deny "BMAD phase '${PHASE}': source and test writes are blocked — no application code before the plan is done. The planning personas (Analyst/PM/Architect/Scrum-Master) write forgeplan artifacts via MCP, not source files. Code is unlocked only after the Implementation-Readiness gate (guardian) PASSes and dev is unlocked. For a throwaway architectural spike, write under .bmad-scratch/ ; for a legitimate non-feature edit, set a logged override (BMAD_GATE_OVERRIDE=1 or the bmad-lib.sh set-override CLI). (RFC-013 FR-4 / ADR-010 C5)"
    fi
    # 'other' (docs, config, design .md) → allow
    ;;

  implementation)
    DEV_UNLOCKED="$(jq -r '.dev_unlocked // false' "$STATE_FILE" 2>/dev/null)" || exit 2
    if [ "$DEV_UNLOCKED" = "true" ]; then
      exit 0   # readiness gate PASSed — Dev/QA may write source + tests
    fi
    # dev not yet unlocked — still block code writes
    if [ "$FILE_KIND" = "test" ] || [ "$FILE_KIND" = "source" ]; then
      _deny "BMAD phase 'implementation' but dev is NOT unlocked: source and test writes are blocked until the Implementation-Readiness gate (guardian) PASSes and the master unlocks dev (bmad-lib.sh unlock-dev). (RFC-013 FR-4 / ADR-010 C5)"
    fi
    # 'other' → allow
    ;;

  *)
    exit 2   # unknown phase — fail-closed
    ;;
esac

# Default: allow (only reached for 'other' file kinds where no deny rule fired)
exit 0
