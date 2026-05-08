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

# ─── forgeplan health next-action surfacing ───────────────────────────────
# When forgeplan is present and the artifact graph is non-clean (orphans,
# stubs, dups, or stale), print one concrete next-action line. Fail silently
# on any error — the hook must never block session start.
if [ "$HAS_FORGEPLAN_DIR" = "yes" ] && command -v forgeplan >/dev/null 2>&1 && command -v python3 >/dev/null 2>&1; then
  # `timeout` is GNU coreutils — present on Linux + homebrew macOS, missing on bare macOS.
  # Fall back to running forgeplan directly when timeout is absent.
  if command -v timeout >/dev/null 2>&1; then
    HEALTH_JSON=$(timeout 2 forgeplan health --json 2>/dev/null || echo "")
  else
    HEALTH_JSON=$(forgeplan health --json 2>/dev/null || echo "")
  fi
  if [ -n "$HEALTH_JSON" ]; then
    NEXT_ACTION=$(printf '%s' "$HEALTH_JSON" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
    if d.get("verdict") == "healthy":
        sys.exit(0)
    parts = []
    orphans = d.get("orphans") or []
    if orphans:
        suffix = "s" if len(orphans) != 1 else ""
        parts.append(str(len(orphans)) + " orphan" + suffix)
    stubs = d.get("active_stubs") or []
    if stubs:
        ids = [s["id"] for s in stubs[:3]]
        more = "..." if len(stubs) > 3 else ""
        parts.append(str(len(stubs)) + " stub(s) (" + ", ".join(ids) + more + ")")
    dups = d.get("possible_duplicates") or []
    if dups:
        parts.append(str(len(dups)) + " possible-dup pair(s)")
    stale = d.get("stale_count", 0) or 0
    if stale > 0:
        parts.append(str(stale) + " stale evidence")
    if parts:
        print("   ⚠ forgeplan health: " + " / ".join(parts) + " — close before new work")
        nxt = d.get("next_actions") or []
        if nxt:
            line = nxt[0]
            if "`" in line:
                line = line.split("`")[1]
            print("   → " + line[:90])
except Exception:
    pass
' 2>/dev/null)
    [ -n "$NEXT_ACTION" ] && printf '%s\n' "$NEXT_ACTION"
  fi
fi

exit 0
