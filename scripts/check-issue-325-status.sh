#!/usr/bin/env bash
# check-issue-325-status.sh
# One-shot status check for the upstream forgeplan#325 issue.
# Authored Sprint W (PRD-051) as part of the post-#325 readiness pack.
#
# Usage:
#   ./scripts/check-issue-325-status.sh
#
# Exit codes:
#   0  — successful API call (issue OPEN or CLOSED)
#   1  — gh CLI not installed or GitHub API failure
#
# Output format (stdout):
#   state=OPEN|CLOSED
#   filed=<ISO 8601>
#   updated=<ISO 8601>
#   comments=<integer>
#   closed_at=<ISO 8601 or "n/a">
#   days_since_filed=<integer>
#   days_since_close=<integer or "n/a">
#
# When CLOSED, the script also writes a hint to stderr suggesting next action:
#   "→ Issue closed. Run docs/POST-325-ACTIONS.md Phase 1 verification."

set -euo pipefail

ISSUE_URL="ForgePlan/forgeplan"
ISSUE_NUMBER=325

# Check gh CLI presence
if ! command -v gh >/dev/null 2>&1; then
    echo "ERROR: gh CLI not installed. Install via 'brew install gh' or visit https://cli.github.com/" >&2
    exit 1
fi

# Fetch issue state from GitHub API
RAW_JSON=$(gh issue view "$ISSUE_NUMBER" --repo "$ISSUE_URL" --json state,createdAt,updatedAt,closedAt,comments 2>&1) || {
    echo "ERROR: GitHub API call failed. Output: $RAW_JSON" >&2
    exit 1
}

# Parse with python (POSIX-safe — no jq dependency required)
parsed=$(python3 - <<PYEOF
import json, sys
from datetime import datetime, timezone

raw = """$RAW_JSON"""
data = json.loads(raw)

state = data.get("state", "UNKNOWN")
filed = data.get("createdAt", "")
updated = data.get("updatedAt", "")
closed = data.get("closedAt") or "n/a"
comments = len(data.get("comments", []))

def days_since(iso_str):
    if not iso_str or iso_str == "n/a":
        return "n/a"
    dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
    delta = datetime.now(timezone.utc) - dt
    return str(delta.days)

print(f"state={state}")
print(f"filed={filed}")
print(f"updated={updated}")
print(f"comments={comments}")
print(f"closed_at={closed}")
print(f"days_since_filed={days_since(filed)}")
print(f"days_since_close={days_since(closed) if closed != 'n/a' else 'n/a'}")
PYEOF
)

echo "$parsed"

# Stderr hint if closed — suggests next action
STATE_LINE=$(echo "$parsed" | grep "^state=")
if [[ "$STATE_LINE" == "state=CLOSED" ]]; then
    echo "" >&2
    echo "→ Issue #325 is CLOSED. Run the post-fix verification checklist:" >&2
    echo "   cat docs/POST-325-ACTIONS.md" >&2
    echo "   Start with Phase 1 — Verification (~10 min)." >&2
fi

exit 0
