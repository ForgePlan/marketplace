#!/bin/bash
# PreToolUse hook — blocks dangerous bash commands before execution
# Exit 0 = allow, Exit 2 = block with message to stderr

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

[ -z "$COMMAND" ] && exit 0

BLOCKED_PATTERNS=(
  "git push --force"
  "git push -f "
  "git push origin main"
  "git push origin dev"
  "git reset --hard"
  "git clean -fd"
  "rm -rf /"
  "rm -rf ~"
  "rm -rf ."
  "DROP TABLE"
  "DROP DATABASE"
  "git branch -D main"
  "git branch -D dev"
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qi "$pattern"; then
    echo "BLOCKED: '$pattern' is not allowed. Use feature branch + PR workflow instead." >&2
    exit 2
  fi
done

exit 0
