#!/usr/bin/env bash
# pre-code-check.sh
# PreToolUse hook for Edit/Write. Warns (does not block) if no active PRD exists.
# Only runs if forgeplan is installed and .forgeplan/ directory exists.
# Exit 0 = allow (always), prints warning to stdout if no active PRD.

set -euo pipefail

# Skip if forgeplan is not installed
if ! command -v forgeplan &>/dev/null; then
  exit 0
fi

# Skip if no .forgeplan directory in project
if [ ! -d ".forgeplan" ]; then
  exit 0
fi

# Check for active PRDs
ACTIVE_PRDS=$(forgeplan list --status active --type prd 2>/dev/null || true)

if [ -z "$ACTIVE_PRDS" ] || echo "$ACTIVE_PRDS" | grep -qi "no.*found\|no.*active\|empty\|0 artifacts"; then
  echo '{"warning": "No active PRD found. Consider running forge-cycle or creating a PRD with forgeplan new prd before making code changes."}'
fi

exit 0
