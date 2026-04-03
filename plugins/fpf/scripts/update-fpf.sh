#!/usr/bin/env bash
# update-fpf.sh — Pull latest FPF spec and regenerate sections
#
# Usage:
#   ./scripts/update-fpf.sh              # pull + regenerate
#   ./scripts/update-fpf.sh --regen-only # regenerate without pulling
#
# After running:
#   1. Review changes in sections/ (git diff)
#   2. Check if SKILL.md router needs updating (new/removed sections)
#   3. Verify applied-patterns/ was NOT overwritten (it's preserved)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FPF_DIR="$PLUGIN_ROOT/FPF"
SECTIONS_DIR="$PLUGIN_ROOT/skills/fpf-knowledge/sections"
APPLIED_PATTERNS="$SECTIONS_DIR/applied-patterns"

# Step 1: Backup applied-patterns (our additions, not from FPF spec)
if [ -d "$APPLIED_PATTERNS" ]; then
  BACKUP_DIR=$(mktemp -d)
  echo "Backing up applied-patterns to $BACKUP_DIR..."
  cp -R "$APPLIED_PATTERNS" "$BACKUP_DIR/applied-patterns"
fi

# Step 2: Pull latest FPF (unless --regen-only)
if [ "${1:-}" != "--regen-only" ]; then
  echo "Pulling latest FPF spec..."
  cd "$PLUGIN_ROOT"
  git submodule update --remote FPF
  echo "FPF updated to: $(cd FPF && git log --oneline -1)"
fi

# Step 3: Regenerate sections from spec
echo "Regenerating sections..."
python3 "$SCRIPT_DIR/split_spec.py"
echo "Generated: $(find "$SECTIONS_DIR" -name '*.md' -not -path '*/applied-patterns/*' | wc -l | tr -d ' ') section files"

# Step 4: Restore applied-patterns
if [ -n "${BACKUP_DIR:-}" ] && [ -d "$BACKUP_DIR/applied-patterns" ]; then
  echo "Restoring applied-patterns..."
  rm -rf "$APPLIED_PATTERNS"
  mv "$BACKUP_DIR/applied-patterns" "$APPLIED_PATTERNS"
  rm -rf "$BACKUP_DIR"
fi

echo ""
echo "Done! Next steps:"
echo "  1. git diff plugins/fpf/skills/fpf-knowledge/sections/ — review changes"
echo "  2. Check if SKILL.md Section INDEX needs updating"
echo "  3. git add -A && git commit -m 'chore(fpf): update FPF spec to latest'"
