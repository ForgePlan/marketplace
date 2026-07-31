#!/usr/bin/env bash
# Slop hint — only speaks for prose files, silent otherwise.
# Skips docs that are almost always intentional boilerplate (README, CHANGELOG, LICENSE).

INPUT=$(cat)

if command -v jq &>/dev/null; then
  FILE=$(echo "$INPUT" | jq -r '.file_path // .file // empty' 2>/dev/null || true)
else
  FILE=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:[[:space:]]*"//;s/"$//' 2>/dev/null \
    || echo "$INPUT" | grep -o '"file"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:[[:space:]]*"//;s/"$//' 2>/dev/null || true)
fi

[ -z "$FILE" ] && exit 0

# Sanitize path — refuse anything with shell-unsafe characters.
[[ "$FILE" =~ ^[a-zA-Z0-9_./@:\ -]+$ ]] || exit 0

BASE=$(basename "$FILE")

# Skip conventional boilerplate docs — hinting on these is noise.
case "$BASE" in
  README*|CHANGELOG*|LICENSE*|CONTRIBUTING*|CODE_OF_CONDUCT*) exit 0 ;;
esac

case "$FILE" in
  *.md|*.mdx|*.markdown|*.txt|*.rst)
    echo '{"message":"slopocop: prose edited — run /slop-audit to check for AI tells, or /slop-humanize to rewrite."}'
    exit 0
    ;;
  *)
    exit 0
    ;;
esac
