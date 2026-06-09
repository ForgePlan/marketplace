#!/usr/bin/env bash
# fpl-skills SessionStart hook
# Prints a brief greeting + project status when Claude Code starts in a project.
# Output goes to stdout; Claude Code surfaces it as session context.
#
# EPIC-002 Wave 3-C2: extended with Smith greeting — surfaces the master
# orchestrator's presence, project state, and recommended next action.
# Must stay under ~3s budget (declared `timeout: 3` in hooks.json).

set -uo pipefail

# ─── Probe project state (all best-effort, never fail, all <100ms each) ────
HAS_FORGEPLAN_DIR=$([ -d ".forgeplan" ] && echo "yes" || echo "no")
HAS_DOCS_AGENTS=$([ -d "docs/agents" ] && echo "yes" || echo "no")
HAS_CLAUDE_MD=$([ -f "CLAUDE.md" ] && echo "yes" || echo "no")
BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "—")

ARTIFACT_COUNT=0
DRAFT_COUNT=0
ACTIVE_COUNT=0
if [ "$HAS_FORGEPLAN_DIR" = "yes" ]; then
  # Counts come from the forgeplan CLI (LanceDB truth) in ONE call, NOT from
  # grepping the markdown projections. The projection body carries a frozen
  # `status:` frontmatter that is NOT rewritten on activation — so
  # `grep "^status: draft"` over-counts drafts (it catches activated artifacts
  # whose body still reads "draft", plus soft-deleted rows under
  # .forgeplan/trash/). That stale-grep is the source of the historical
  # "NN stale/draft of NNN" falsehood. Ask forgeplan instead; parse total +
  # draft + active from a single `forgeplan list --json` (flag is `--json`,
  # NOT `--output json`). Best-effort + time-boxed; never fail SessionStart.
  if command -v forgeplan >/dev/null 2>&1 && command -v python3 >/dev/null 2>&1; then
    if command -v timeout >/dev/null 2>&1; then
      _FP_JSON=$(timeout 2 forgeplan list --json 2>/dev/null || echo "")
    else
      _FP_JSON=$(forgeplan list --json 2>/dev/null || echo "")
    fi
    _FP_COUNTS=$(printf '%s' "$_FP_JSON" | python3 -c 'import json,sys
try:
    d = json.load(sys.stdin)
    a = d if isinstance(d, list) else d.get("artifacts", [])
    print(len(a),
          sum(1 for x in a if x.get("status") == "draft"),
          sum(1 for x in a if x.get("status") == "active"))
except Exception:
    pass' 2>/dev/null)
    if [ -n "$_FP_COUNTS" ]; then
      ARTIFACT_COUNT=$(printf '%s\n' "$_FP_COUNTS" | awk '{print $1}')
      DRAFT_COUNT=$(printf '%s\n' "$_FP_COUNTS" | awk '{print $2}')
      ACTIVE_COUNT=$(printf '%s\n' "$_FP_COUNTS" | awk '{print $3}')
    fi
  fi
  # Fallback ONLY if forgeplan was unavailable/failed: count files for the total
  # (excluding lance index + trash receipts), report 0 drafts rather than grep
  # the stale projections (an honest "unknown→0" beats a false "30"), and treat
  # all non-draft as active for the greeting.
  if ! [[ "$ARTIFACT_COUNT" =~ ^[0-9]+$ ]]; then
    ARTIFACT_COUNT=$( { find .forgeplan -maxdepth 2 -name "*.md" -not -path "*/lance/*" -not -path "*/trash/*" 2>/dev/null || true; } | wc -l | tr -d ' ')
    DRAFT_COUNT=0
    ACTIVE_COUNT=$ARTIFACT_COUNT
  fi
fi
# Sanitise to integers (defensive — guards arithmetic below).
[[ "$ARTIFACT_COUNT" =~ ^[0-9]+$ ]] || ARTIFACT_COUNT=0
[[ "$DRAFT_COUNT" =~ ^[0-9]+$ ]] || DRAFT_COUNT=0
[[ "$ACTIVE_COUNT" =~ ^[0-9]+$ ]] || ACTIVE_COUNT=0

# ─── Smith state classification ────────────────────────────────────────────
# GREENFIELD: no .forgeplan/ or no CLAUDE.md → user should bootstrap
# ATTENTION:  drafts present (any count >0) → user should triage
# HEALTHY:    .forgeplan/ + CLAUDE.md + no drafts → normal session
SMITH_STATE="healthy"
if [ "$HAS_FORGEPLAN_DIR" = "no" ] || [ "$HAS_CLAUDE_MD" = "no" ]; then
  SMITH_STATE="greenfield"
elif [ "${DRAFT_COUNT:-0}" -gt 0 ] 2>/dev/null; then
  SMITH_STATE="attention"
fi

# ─── Compose status fragments (preserve legacy format) ─────────────────────
STATUS_BITS=()
[ "$HAS_FORGEPLAN_DIR" = "yes" ] && STATUS_BITS+=(".forgeplan/ ($ARTIFACT_COUNT artifacts)")
[ "$HAS_DOCS_AGENTS" = "yes" ] && STATUS_BITS+=("docs/agents/ configured")
[ "$HAS_CLAUDE_MD" = "yes" ] && STATUS_BITS+=("CLAUDE.md present")
[ "$BRANCH" != "—" ] && STATUS_BITS+=("branch: $BRANCH")

STATUS=""
for bit in "${STATUS_BITS[@]+"${STATUS_BITS[@]}"}"; do
  if [ -z "$STATUS" ]; then STATUS="$bit"; else STATUS="$STATUS · $bit"; fi
done

# ─── Smith greeting line (replaces the prior bare "active" line) ───────────
case "$SMITH_STATE" in
  greenfield)
    echo "🛠  fpl-skills active — Smith greeting: greenfield repo detected${STATUS:+ ($STATUS)}. Run /smith-bootstrap to scaffold."
    ;;
  attention)
    echo "🛠  fpl-skills active — Smith alert: $DRAFT_COUNT draft artifact(s) of $ARTIFACT_COUNT total ($ACTIVE_COUNT active, branch: $BRANCH). Run /forge-progress or /smith for details."
    ;;
  healthy)
    echo "🛠  fpl-skills active — Smith ready ($ARTIFACT_COUNT artifacts, $ACTIVE_COUNT active, branch: $BRANCH). Say \"smith\" or \"/smith\" for routing."
    ;;
esac

# ─── Smith-aware tip line ──────────────────────────────────────────────────
case "$SMITH_STATE" in
  greenfield)
    echo "   Tip: \`/smith-bootstrap\` to scaffold the project."
    ;;
  attention)
    echo "   Tip: \`/smith\` to see what needs attention."
    ;;
  healthy)
    echo "   Tip: \`/smith\` for status + recommended next action."
    ;;
esac

# ─── forgeplan health next-action surfacing (opt-in via env-var) ──
# When forgeplan is present and the artifact graph is non-clean (orphans,
# stubs, dups, or stale), print one concrete next-action line. Gated behind
# FPL_SHOW_HEALTH=1 to keep default SessionStart fast (<100ms). The cheap
# filesystem probes above already classify greenfield / healthy / attention.
# Fail silently on any error — the hook must never block session start.
if [ "${FPL_SHOW_HEALTH:-}" = "1" ] && [ "$HAS_FORGEPLAN_DIR" = "yes" ] && command -v forgeplan >/dev/null 2>&1 && command -v python3 >/dev/null 2>&1; then
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
