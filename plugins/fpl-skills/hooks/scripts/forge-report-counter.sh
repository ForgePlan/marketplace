#!/usr/bin/env bash
# forge-report-counter.sh — PostToolUse counter
# Increments per-session tool call counter, injects reminder every 5 calls.
# Exit 0 = success.

set -uo pipefail

INPUT=$(cat)

# Get session_id from JSON input (Claude Code provides it). Fallback to pid-based id.
if command -v jq &>/dev/null; then
  SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty' 2>/dev/null || true)
elif command -v python3 &>/dev/null; then
  SESSION_ID=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('session_id',''))" 2>/dev/null || true)
fi
[ -z "$SESSION_ID" ] && SESSION_ID="default-$PPID"

# Sanitize session_id (only alphanumeric and dashes)
SESSION_ID=$(echo "$SESSION_ID" | tr -cd 'a-zA-Z0-9-')
[ -z "$SESSION_ID" ] && SESSION_ID="fallback"

STATE_FILE="/tmp/forge-report-counter-${SESSION_ID}.state"

# Read current count, default to 0
COUNT=0
if [ -f "$STATE_FILE" ]; then
  COUNT=$(cat "$STATE_FILE" 2>/dev/null || echo 0)
  # Ensure it's a number
  case "$COUNT" in
    ''|*[!0-9]*) COUNT=0 ;;
  esac
fi

COUNT=$((COUNT + 1))
echo "$COUNT" > "$STATE_FILE" 2>/dev/null || true

# Reminder thresholds: at 5, 15, 30 — escalating
REMIND=""
if [ "$COUNT" -eq 5 ]; then
  REMIND="multi-step task threshold reached (5 tool calls). When finishing this turn, consider outputting a structured report using forge-report skill — card-based format with TL;DR, sections, etc. Skip if task is still simple."
elif [ "$COUNT" -eq 15 ]; then
  REMIND="significant work this turn (15 tool calls). Final answer should almost certainly be a structured report — use forge-report templates (build-summary / decision-summary / etc.) with all required sections."
elif [ "$COUNT" -eq 30 ]; then
  REMIND="extensive multi-step work (30 tool calls). Structured report is required — without it the user cannot scan what was done. Pick template from forge-report skill and produce TL;DR + cards + reversibility + drift risks + next steps."
fi

if [ -n "$REMIND" ]; then
  cat <<JSON
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "[forge-report counter] $REMIND"
  }
}
JSON
fi

exit 0
