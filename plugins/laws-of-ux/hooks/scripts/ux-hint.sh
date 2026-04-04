#!/usr/bin/env bash
# UX hint hook — only speaks for frontend files, silent for everything else.
# Reads tool input JSON from stdin.

INPUT=$(cat)

# Extract file path from JSON
if command -v jq &>/dev/null; then
  FILE=$(echo "$INPUT" | jq -r '.file_path // .file // empty' 2>/dev/null || true)
else
  FILE=$(echo "$INPUT" | grep -o '"file_path"\s*:\s*"[^"]*"' | head -1 | sed 's/"file_path"\s*:\s*"//;s/"$//' 2>/dev/null || true)
fi

[ -z "$FILE" ] && exit 0

# Check extension
case "$FILE" in
  *.html|*.css|*.scss|*.sass|*.less|*.js|*.jsx|*.ts|*.tsx|*.vue|*.svelte|*.astro)
    echo '{"message":"UX reminder: check touch targets (Fitts), nav items count (Hick), form chunking (Miller), loading states (Doherty)."}'
    ;;
  *)
    # Silent for non-frontend files
    exit 0
    ;;
esac
