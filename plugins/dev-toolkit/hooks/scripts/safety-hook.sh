#!/usr/bin/env bash
# safety-hook.sh — Universal safety hook for Claude Code
# Blocks dangerous bash commands before execution.
# Exit 0 = allow, Exit 2 = block (with JSON error message).

set -euo pipefail

# Read tool input from stdin (JSON with "command" field)
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | grep -oP '"command"\s*:\s*"(.*?)"' | head -1 | sed 's/"command"\s*:\s*"//;s/"$//' 2>/dev/null || echo "$INPUT")

# If we couldn't parse the command, allow it (don't block on parse errors)
if [ -z "$COMMAND" ]; then
  exit 0
fi

# --- Dangerous git operations ---
if echo "$COMMAND" | grep -qiE 'git\s+push\s+.*(-f|--force)'; then
  echo '{"error":"Blocked: git push --force can destroy remote history. Use --force-with-lease for a safer alternative."}'
  exit 2
fi

if echo "$COMMAND" | grep -qiE 'git\s+reset\s+--hard'; then
  echo '{"error":"Blocked: git reset --hard discards all uncommitted changes permanently. Stash your changes first or use git reset --soft."}'
  exit 2
fi

if echo "$COMMAND" | grep -qiE 'git\s+clean\s+-f'; then
  echo '{"error":"Blocked: git clean -f permanently deletes untracked files. Use git clean -n (dry run) first to review what would be removed."}'
  exit 2
fi

# --- Destructive filesystem operations ---
if echo "$COMMAND" | grep -qiE 'rm\s+-rf\s+(/|~|\$HOME)\b'; then
  echo '{"error":"Blocked: rm -rf on root or home directory is catastrophically destructive. This command has been blocked for safety."}'
  exit 2
fi

# --- Destructive database operations ---
if echo "$COMMAND" | grep -qiE 'DROP\s+(TABLE|DATABASE)'; then
  echo '{"error":"Blocked: DROP TABLE/DATABASE detected. This is a destructive database operation. Please confirm manually if this is intentional."}'
  exit 2
fi

# Command is safe — allow execution
exit 0
