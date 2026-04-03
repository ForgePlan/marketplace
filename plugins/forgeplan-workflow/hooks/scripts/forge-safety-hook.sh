#!/usr/bin/env bash
# forge-safety-hook.sh
# PreToolUse hook for Bash commands. Blocks dangerous operations.
# Reads tool input JSON from stdin, checks the command against a blacklist.
# Exit 0 = allow, Exit 2 = block (with JSON error message).

set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | grep -o '"command"\s*:\s*"[^"]*"' | head -1 | sed 's/"command"\s*:\s*"//;s/"$//' || true)

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
if echo "$CMD_LOWER" | grep -qE 'rm\s+-rf\s+/\s*$|rm\s+-rf\s+/\*|rm\s+-rf\s+/$'; then
  BLOCKED=1
  REASON="Recursive deletion of root filesystem is blocked."
fi

# DROP TABLE / DROP DATABASE
if echo "$CMD_LOWER" | grep -qiE 'drop\s+table|drop\s+database'; then
  BLOCKED=1
  REASON="DROP TABLE/DATABASE detected. This is a destructive database operation. Run it manually if intentional."
fi

# git clean -fd / -ffd (removes untracked files)
if echo "$CMD_LOWER" | grep -qE 'git\s+clean\s+-[a-z]*f'; then
  BLOCKED=1
  REASON="git clean with force flag is blocked. This permanently deletes untracked files."
fi

if [ "$BLOCKED" -eq 1 ]; then
  echo "{\"error\": \"BLOCKED: $REASON\"}"
  exit 2
fi

exit 0
