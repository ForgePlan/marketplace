#!/usr/bin/env bash
# Hint about tests only when a new public function is added. Silent otherwise.

INPUT=$(cat)

if command -v jq &>/dev/null; then
  FILE=$(echo "$INPUT" | jq -r '.file_path // .file // empty' 2>/dev/null || true)
else
  FILE=$(echo "$INPUT" | grep -o '"file_path"\s*:\s*"[^"]*"' | head -1 | sed 's/"file_path"\s*:\s*"//;s/"$//' 2>/dev/null \
    || echo "$INPUT" | grep -o '"file"\s*:\s*"[^"]*"' | head -1 | sed 's/"file"\s*:\s*"//;s/"$//' 2>/dev/null || true)
fi

[ -z "$FILE" ] && exit 0

# Sanitize: reject paths with shell metacharacters
[[ "$FILE" =~ ^[a-zA-Z0-9_./@:\ -]+$ ]] || exit 0

case "$FILE" in
  *.js|*.jsx|*.ts|*.tsx|*.py|*.rs|*.go|*.java|*.rb|*.php|*.cs|*.swift)
    DIFF=$(git diff HEAD -- "$FILE" 2>/dev/null || true)
    if echo "$DIFF" | grep -qE '^\+.*(export function|export const|pub fn|def |public |func |function )'; then
      echo '{"message":"New public function — consider adding a test."}'
    fi
    exit 0
    ;;
  *)
    exit 0
    ;;
esac
