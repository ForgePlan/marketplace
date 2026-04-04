#!/usr/bin/env bash
# forge-safety-hook.sh
# PreToolUse hook for Bash commands. Blocks dangerous operations.
# Reads tool input JSON from stdin, checks the command against a blacklist.
# Exit 0 = allow, Exit 2 = block (with JSON error message).

set -uo pipefail

INPUT=$(cat)
# Use jq if available for reliable JSON parsing, fallback to python3, fail-closed otherwise
if command -v jq &>/dev/null; then
  COMMAND=$(echo "$INPUT" | jq -r '.command // empty' 2>/dev/null || true)
elif command -v python3 &>/dev/null; then
  COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('command',''))" 2>/dev/null || true)
else
  echo '{"error":"Safety hook: neither jq nor python3 available. Install jq."}'
  exit 2
fi

if [ -z "$COMMAND" ]; then
  exit 0
fi

# Normalize: lowercase for matching
CMD_LOWER=$(echo "$COMMAND" | tr '[:upper:]' '[:lower:]')

# Blocked patterns
BLOCKED=0
REASON=""

# git push --force (any variant)
if echo "$CMD_LOWER" | grep -qE 'git\s+push\s+.*--force|git\s+push\s+-f\b'; then
  BLOCKED=1
  REASON="Force push is blocked. Use regular push or discuss with your team first."
fi

# git reset --hard
if echo "$CMD_LOWER" | grep -qE 'git\s+reset\s+--hard'; then
  BLOCKED=1
  REASON="Hard reset is blocked. This can destroy uncommitted work. Use git stash instead."
fi

# rm -rf / or rm -rf /*
if echo "$CMD_LOWER" | grep -qE '(sudo\s+)?rm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r|-r\s+-f|-f\s+-r)\s+(/(\s|$|\*)|~|\.\.|\$HOME|\*)'; then
  BLOCKED=1
  REASON="Recursive deletion of root filesystem is blocked."
fi

# DROP TABLE / DROP DATABASE (only when piped to SQL clients)
if echo "$CMD_LOWER" | grep -qiE '(mysql|psql|sqlite3|sqlcmd)\s.*drop\s+(table|database)|drop\s+(table|database).*\|\s*(mysql|psql|sqlite3)'; then
  BLOCKED=1
  REASON="DROP TABLE/DATABASE detected. This is a destructive database operation. Run it manually if intentional."
fi

# git clean -fd / -ffd (removes untracked files)
if echo "$CMD_LOWER" | grep -qE 'git\s+clean\s+-[a-z]*f' && ! echo "$CMD_LOWER" | grep -qE 'git\s+clean\s+-[a-z]*n'; then
  BLOCKED=1
  REASON="git clean with force flag is blocked. This permanently deletes untracked files."
fi

if [ "$BLOCKED" -eq 1 ]; then
  ESCAPED_REASON=$(printf '%s' "$REASON" | sed 's/\\/\\\\/g; s/"/\\"/g')
  echo "{\"error\": \"BLOCKED: $ESCAPED_REASON\"}"
  exit 2
fi

exit 0
