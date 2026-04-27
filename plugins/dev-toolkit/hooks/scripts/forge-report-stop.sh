#!/usr/bin/env bash
# forge-report-stop.sh — Stop hook (runs when Claude finishes a turn).
# Checks if multi-step threshold was crossed; if so, reminds Claude
# to output structured report on the NEXT turn (current turn already finished).
#
# Exit 0 = allow Claude to stop normally.
# Exit 2 = blocks stop and feeds stdin back to Claude (use sparingly).

set -uo pipefail

INPUT=$(cat)

# Get session_id (same logic as counter hook)
if command -v jq &>/dev/null; then
  SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty' 2>/dev/null || true)
elif command -v python3 &>/dev/null; then
  SESSION_ID=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('session_id',''))" 2>/dev/null || true)
fi
[ -z "$SESSION_ID" ] && SESSION_ID="default-$PPID"

SESSION_ID=$(echo "$SESSION_ID" | tr -cd 'a-zA-Z0-9-')
[ -z "$SESSION_ID" ] && SESSION_ID="fallback"

STATE_FILE="/tmp/forge-report-counter-${SESSION_ID}.state"
ACK_FILE="/tmp/forge-report-stop-ack-${SESSION_ID}.flag"

# If counter doesn't exist or is below threshold — don't bother
[ ! -f "$STATE_FILE" ] && exit 0

COUNT=0
COUNT=$(cat "$STATE_FILE" 2>/dev/null || echo 0)
case "$COUNT" in
  ''|*[!0-9]*) COUNT=0 ;;
esac

# Threshold: 5 tool calls in this turn means a multi-step task
THRESHOLD=5

if [ "$COUNT" -lt "$THRESHOLD" ]; then
  # Reset counter for next turn (only count per-turn? actually per-session is OK)
  # We keep counter cumulative — still don't reset.
  exit 0
fi

# Check if we already nudged this turn (avoid double-nudge if Stop fires multiple times)
if [ -f "$ACK_FILE" ]; then
  exit 0
fi
touch "$ACK_FILE" 2>/dev/null || true

# Inject a soft reminder via JSON output. This appears as system context for the
# next turn (Claude will see it before responding).
cat <<JSON
{
  "hookSpecificOutput": {
    "hookEventName": "Stop",
    "additionalContext": "[forge-report stop check] This turn used ${COUNT} tool calls — definitely a multi-step task. Your final response should be a structured report from the forge-report skill (card-based format: TL;DR + ✅ Что сделано + ⚪ Что не сделано + 🔄 Откатить + ⚠️ Поломается + ➡️ Что дальше + 💰 Стоимость). If you already produced a structured report, ignore this. Counter resets for next significant turn."
  }
}
JSON

# Reset counter so next significant chunk of work re-triggers
echo 0 > "$STATE_FILE" 2>/dev/null || true
rm -f "$ACK_FILE" 2>/dev/null || true

exit 0
