#!/usr/bin/env bash
# Hint about /sync only after forgeplan activate or forgeplan new. Silent otherwise.

INPUT=$(cat)

if command -v jq &>/dev/null; then
  CMD=$(echo "$INPUT" | jq -r '.command // empty' 2>/dev/null || true)
else
  CMD=$(echo "$INPUT" | grep -o '"command"\s*:\s*"[^"]*"' | head -1 | sed 's/"command"\s*:\s*"//;s/"$//' 2>/dev/null || true)
fi

[ -z "$CMD" ] && exit 0

case "$CMD" in
  *"forgeplan activate"*|*"forgeplan new"*)
    echo '{"message":"Consider /sync to keep Orchestra in sync."}'
    exit 0
    ;;
  *)
    exit 0
    ;;
esac
