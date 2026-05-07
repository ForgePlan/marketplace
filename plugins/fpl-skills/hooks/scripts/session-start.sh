#!/usr/bin/env bash
# fpl-skills SessionStart hook
# Prints a brief greeting + project status when Claude Code starts in a project.
# Output goes to stdout; Claude Code surfaces it as session context.

set -uo pipefail

# Probe project state (all best-effort, never fail)
HAS_FORGEPLAN_DIR=$([ -d ".forgeplan" ] && echo "yes" || echo "no")
HAS_DOCS_AGENTS=$([ -d "docs/agents" ] && echo "yes" || echo "no")
HAS_CLAUDE_MD=$([ -f "CLAUDE.md" ] && echo "yes" || echo "no")
BRANCH=$(git branch --show-current 2>/dev/null || echo "—")
ARTIFACT_COUNT=0
if [ "$HAS_FORGEPLAN_DIR" = "yes" ]; then
  ARTIFACT_COUNT=$(find .forgeplan -name "*.md" -not -path "*/lance/*" 2>/dev/null | wc -l | tr -d ' ')
fi

# Compose a one-line status
STATUS_BITS=()
[ "$HAS_FORGEPLAN_DIR" = "yes" ] && STATUS_BITS+=(".forgeplan/ ($ARTIFACT_COUNT artifacts)")
[ "$HAS_DOCS_AGENTS" = "yes" ] && STATUS_BITS+=("docs/agents/ configured")
[ "$HAS_CLAUDE_MD" = "yes" ] && STATUS_BITS+=("CLAUDE.md present")
[ "$BRANCH" != "—" ] && STATUS_BITS+=("branch: $BRANCH")

# Joining with " · "
STATUS=""
for bit in "${STATUS_BITS[@]+"${STATUS_BITS[@]}"}"; do
  if [ -z "$STATUS" ]; then STATUS="$bit"; else STATUS="$STATUS · $bit"; fi
done

echo "🛠  fpl-skills active${STATUS:+ — $STATUS}"

# Suggest next action based on what's missing
if [ "$HAS_FORGEPLAN_DIR" = "no" ] && [ "$HAS_DOCS_AGENTS" = "no" ] && [ "$HAS_CLAUDE_MD" = "no" ]; then
  echo "   New project? Run /fpl-init to bootstrap forgeplan + CLAUDE.md + docs/agents/."
elif [ "$HAS_FORGEPLAN_DIR" = "no" ]; then
  echo "   Tip: \`forgeplan init\` to set up artifact storage, or run /fpl-init for full setup."
elif [ "$HAS_DOCS_AGENTS" = "no" ]; then
  echo "   Tip: run /setup to configure project paths and tracker for skills."
else
  echo "   Quick start: /restore (recover context) · /briefing (today's tasks) · /research <topic>"
fi

exit 0
