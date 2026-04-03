#!/usr/bin/env bash
# safety-hook.sh — Universal safety hook for Claude Code
# Blocks dangerous bash commands before execution.
# Exit 0 = allow, Exit 2 = block (with JSON error message).

# Read tool input from stdin (JSON with "command" field)
INPUT=$(cat)

# Use jq if available for reliable JSON parsing, fallback to regex
if command -v jq &>/dev/null; then
  COMMAND=$(echo "$INPUT" | jq -r '.command // empty' 2>/dev/null || true)
else
  COMMAND=$(echo "$INPUT" | grep -o '"command"\s*:\s*"[^"]*"' | head -1 | sed 's/"command"\s*:\s*"//;s/"$//' 2>/dev/null || true)
fi

# If we couldn't parse the command, allow it (don't block on parse errors)
if [ -z "$COMMAND" ]; then
  exit 0
fi

# --- Dangerous git operations ---
if echo "$COMMAND" | grep -qiE 'git\s+push\s+.*(-f|--force)\b'; then
  echo '{"error":"Blocked: git push --force can destroy remote history. Use --force-with-lease for a safer alternative."}'
  exit 2
fi

if echo "$COMMAND" | grep -qiE 'git\s+reset\s+--hard'; then
  echo '{"error":"Blocked: git reset --hard discards all uncommitted changes permanently. Stash your changes first or use git reset --soft."}'
  exit 2
fi

# git clean with force flag — but allow dry-run (-n)
if echo "$COMMAND" | grep -qiE 'git\s+clean\s+-[a-z]*f' && ! echo "$COMMAND" | grep -qiE 'git\s+clean\s+-[a-z]*n'; then
  echo '{"error":"Blocked: git clean -f permanently deletes untracked files. Use git clean -n (dry run) first to review what would be removed."}'
  exit 2
fi

# --- Destructive filesystem operations ---
if echo "$COMMAND" | grep -qiE 'rm\s+(-rf|-fr|--recursive\s+--force)\s+(/|~|\$HOME|\.\.|\*)'; then
  echo '{"error":"Blocked: rm -rf on root, home, parent directory, or wildcard is catastrophically destructive."}'
  exit 2
fi

# --- Destructive database operations (only when piped to SQL clients) ---
if echo "$COMMAND" | grep -qiE '(mysql|psql|sqlite3|sqlcmd)\s.*DROP\s+(TABLE|DATABASE)|DROP\s+(TABLE|DATABASE).*\|\s*(mysql|psql|sqlite3)'; then
  echo '{"error":"Blocked: DROP TABLE/DATABASE detected in SQL client context. Please confirm manually if this is intentional."}'
  exit 2
fi

# Command is safe — allow execution
exit 0
