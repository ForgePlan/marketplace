#!/usr/bin/env bash
# Hint about tests only when a new public function is added. Silent otherwise.
# Checks file extension and diff for public function patterns.

INPUT=$(cat)

if command -v jq &>/dev/null; then
  FILE=$(echo "$INPUT" | jq -r '.file_path // .file // empty' 2>/dev/null || true)
else
  FILE=$(echo "$INPUT" | grep -o '"file_path"\s*:\s*"[^"]*"' | head -1 | sed 's/"file_path"\s*:\s*"//;s/"$//' 2>/dev/null || true)
fi

[ -z "$FILE" ] && exit 0

# Only check source code files
case "$FILE" in
  *.js|*.jsx|*.ts|*.tsx|*.py|*.rs|*.go|*.java|*.rb|*.php|*.cs|*.swift)
    # Check if git diff shows new public function
    DIFF=$(git diff HEAD -- "$FILE" 2>/dev/null || true)
    if echo "$DIFF" | grep -qE '^\+.*(export function|export const|pub fn|def |public |func |function )'; then
      echo '{"message":"New public function — consider adding a test."}'
    fi
    ;;
  *)
    exit 0
    ;;
esac
