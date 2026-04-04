#!/usr/bin/env bash
# UX hint — only speaks for frontend files, silent otherwise.

INPUT=$(cat)

if command -v jq &>/dev/null; then
  FILE=$(echo "$INPUT" | jq -r '.file_path // .file // empty' 2>/dev/null || true)
else
  FILE=$(echo "$INPUT" | grep -o '"file_path"\s*:\s*"[^"]*"' | head -1 | sed 's/"file_path"\s*:\s*"//;s/"$//' 2>/dev/null \
    || echo "$INPUT" | grep -o '"file"\s*:\s*"[^"]*"' | head -1 | sed 's/"file"\s*:\s*"//;s/"$//' 2>/dev/null || true)
fi

[ -z "$FILE" ] && exit 0

# Sanitize path
[[ "$FILE" =~ ^[a-zA-Z0-9_./@:\ -]+$ ]] || exit 0

case "$FILE" in
  *.html|*.css|*.scss|*.sass|*.less|*.js|*.jsx|*.ts|*.tsx|*.vue|*.svelte|*.astro)
    echo '{"message":"UX reminder: check touch targets (Fitts), nav items count (Hick), form chunking (Miller), loading states (Doherty)."}'
    exit 0
    ;;
  *)
    exit 0
    ;;
esac
