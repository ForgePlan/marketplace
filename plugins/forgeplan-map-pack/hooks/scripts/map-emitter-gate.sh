#!/usr/bin/env bash
# ============================================================================
# map-emitter-gate.sh -- PreToolUse write-path gate for forgeplan-map-pack
#                        (SPEC-003 SS C2 CTRL-2, RFC-023 SS3)
# ============================================================================
# The rule: no Write/Edit/MultiEdit under .forgeplan/ except exactly
# .forgeplan/map/map.json and .forgeplan/map/.work/** (scanner scratch).
# This is CONTROL 2 of the 3 EMITTER-safe controls -- the denylist (control 1,
# an agent frontmatter concern, not this hook) stops the TOOL category; this
# hook stops the PATH. Control 3 (map-guardian.mjs's single-write check,
# GC-5) catches after the fact whatever the first two structurally cannot see
# -- including this hook's own known blind spot: it governs Write/Edit/
# MultiEdit TOOL CALLS only, so it has no visibility into (and is not the
# enforcement mechanism for) map-guardian.mjs's own later `fs` write that
# flips meta.status on exit 0 (ADR-017, SPEC-003 SS C4 GC-5). That write is a
# plain Node filesystem call from a Bash-invoked script, not a tool call --
# by construction, not an oversight.
#
# Unlike CANVAS's canvas-gate.sh, this gate is STATELESS: there is no
# phase/tokens state machine to read, because map-pack has no design-then-
# unlock lifecycle -- the write-path rule holds unconditionally, on every
# run, for every branch. There is nothing to init and nothing to migrate.
#
# Identity check (SPEC-003 CTRL-2: "SHOULD deny ... when the hook payload
# exposes an identity signal"): best-effort only. If the PreToolUse stdin
# payload exposes a plausible agent-identity field, a write to map/map.json
# from an identity that is clearly not map-emitter is denied. If no such
# field is present (the common case -- Claude Code hooks are not guaranteed
# to expose subagent identity), this check is silently skipped: the
# single-writer guarantee for map.json is TRIANGULATED, not hook-only (SPEC-
# 003 CTRL-2) -- the EMITTER denylist (control 1) + the orchestrator's own
# dispatch discipline (only map-emitter runs during EMIT) + GC-5's after-the-
# fact audit (control 3) are what actually carry that guarantee end to end.
#
# Fail-closed: any unexpected condition -> exit 2 (deny), never exit 0 (allow)
# when the condition is an error rather than a clean "not our jurisdiction"
# case.
#
# Block mechanism: exit 0 + stdout JSON permissionDecision:deny.
# Allow: plain exit 0 (no stdout).
# Fail-closed cases -> exit 2: jq missing, unparseable stdin, missing lib.
# ============================================================================

set -euo pipefail
set -f   # disable glob expansion -- hostile paths must not expand

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
# Best-effort identity probe -- see header note. None of these field names are
# a documented contract; absence is normal and must not fail-closed.
AGENT_IDENTITY="$(printf '%s' "$STDIN_JSON" | jq -r '.agent_name // .subagent_type // .agent_type // ""' 2>/dev/null)" || AGENT_IDENTITY=""

# 2. Fast-path: non-write tools -> allow immediately.
#    The hook matcher is Write|Edit|MultiEdit; anything else is a no-op.
case "$TOOL_NAME" in
  Write|Edit|MultiEdit) ;;   # write tools -- fall through to gate
  *) exit 0 ;;               # all other tools -> allow
esac

# 3. Source map-lib.sh (provides canonicalize_path, repo_root, etc.)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAP_LIB="${SCRIPT_DIR}/map-lib.sh"
if [ ! -f "$MAP_LIB" ]; then
  exit 2   # library missing -- cannot enforce; fail-closed
fi
# shellcheck source=./map-lib.sh
. "$MAP_LIB"

# 4. No target path -> nothing for this gate to check -> allow
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Canonicalize before any matching (prevents path-traversal bypass)
TARGET_CANONICAL="$(canonicalize_path "$FILE_PATH")"
REL="$(repo_relative "$TARGET_CANONICAL")"
REL="${REL#./}"

# 5. Out of jurisdiction: anything outside .forgeplan/ is not this gate's
#    concern (map-pack agents are EMITTER-denied from mutating source files
#    in the first place via their tool grant -- see CTRL-1 -- but a path
#    outside .forgeplan/ is simply not what this hook exists to police).
case "/$REL/" in
  /.forgeplan/*) ;;   # falls under our jurisdiction -- continue
  *) exit 0 ;;
esac

_deny() {
  local reason="$1"
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}' \
    "$(printf '%s' "$reason" | sed 's/"/\\"/g')"
  exit 0
}

MAP_JSON_REL=".forgeplan/map/map.json"
MAP_WORK_PREFIX=".forgeplan/map/.work"

# 6. The one exact file: map.json content writes.
if [ "$REL" = "$MAP_JSON_REL" ]; then
  # Best-effort identity gate (SHOULD, not MUST -- see header note).
  # A dispatched subagent's identity is PLUGIN-QUALIFIED
  # ("forgeplan-map-pack:map-emitter"), so strip any leading "<plugin>:" prefix
  # (${var##*:} keeps the text after the last colon; a bare name with no colon
  # passes through unchanged) before comparing. An exact `!= "map-emitter"`
  # test wrongly denied the emitter's OWN write, because its dispatch identity
  # is never the bare string -- the first-dogfood F4 blocker. Accept the bare
  # name, its "*:map-emitter" plugin-qualified form, and an undeterminable
  # (empty) identity; deny any other clearly-non-emitter writer.
  AGENT_BARE="${AGENT_IDENTITY##*:}"
  if [ -n "$AGENT_IDENTITY" ] && [ "$AGENT_BARE" != "map-emitter" ]; then
    _deny "map-emitter-gate: map/map.json is single-writer -- only the map-emitter agent may write it (identity seen: ${AGENT_IDENTITY}). SPEC-003 SS C2 CTRL-2."
  fi
  exit 0   # allow (map-emitter, or identity undeterminable -- see triangulation note)
fi

# 7. The scratch subtree: any scanner/extractor/verifier scratch file.
if path_is_under "$REL" "$MAP_WORK_PREFIX"; then
  exit 0   # allow -- per-scanner file separation is convention-enforced, not
           # identity-gated here (SPEC-003 CTRL-2 honest-scope note; RFC-023
           # SS3 "Honest scope on scratch-file isolation")
fi

# 8. Everything else under .forgeplan/ is DENIED -- this is the whole point
#    of the hook: a stray Write to .forgeplan/prds/*.md or any other artifact
#    directory must never reach disk, regardless of which pipeline agent
#    attempted it (RED-LINE #11 -- LanceDB/markdown desync).
_deny "map-emitter-gate: writes under .forgeplan/ are restricted to exactly map/map.json and map/.work/** while forgeplan-map-pack is active. Path '${REL}' is outside both. SPEC-003 SS C2 CTRL-2 / RFC-023 SS3."
