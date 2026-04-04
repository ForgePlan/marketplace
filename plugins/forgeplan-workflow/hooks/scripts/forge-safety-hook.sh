#!/usr/bin/env bash
# forge-safety-hook.sh — Delegates to dev-toolkit safety hook + forgeplan fallback
# This avoids duplicating the safety logic maintained in dev-toolkit.
# Exit 0 = allow, Exit 2 = block (with JSON error message).

set -uo pipefail

# Delegate to the canonical safety hook.
# When both plugins are installed, dev-toolkit's hook runs first via its own hooks.json.
# This wrapper only runs its own checks if dev-toolkit is NOT installed.

DEVTOOLKIT_HOOK="${CLAUDE_PLUGIN_ROOT:-}/../../dev-toolkit/hooks/scripts/safety-hook.sh"
if [ -f "$DEVTOOLKIT_HOOK" ]; then
  # dev-toolkit is installed — its hook handles safety, we skip to avoid double-checking
  exit 0
fi

# --- Fallback: dev-toolkit not installed, run safety checks inline ---

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
if echo "$COMMAND" | grep -qiE '(sudo\s+)?rm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r|-r\s+-f|-f\s+-r)\s+(/(\s|$|\*)|~|\.\.|\$HOME|\*)'; then
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
