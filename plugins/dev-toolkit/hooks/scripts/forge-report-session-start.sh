#!/usr/bin/env bash
# forge-report-session-start.sh — inject reminder about forge-report format
# at the start of each Claude session.
#
# Per Claude Code hook schema, SessionStart supports hookSpecificOutput
# with additionalContext (string added to Claude's context, visible to model).
#
# Exit 0 = success.

set -uo pipefail

# Use python3 for safe JSON encoding of multi-line message.
if command -v python3 &>/dev/null; then
  python3 <<'PY'
import json
msg = (
    "## forge-report format reminder\n\n"
    "This Claude Code session has the `forge-report` skill available "
    "(from `dev-toolkit` plugin).\n\n"
    "When finishing a multi-step task that meets >=2 of these criteria:\n"
    "- >=5 tool calls in this turn\n"
    "- >=3 files created or modified\n"
    "- TaskList with >=3 items\n"
    "- Cross-system effect (git push, PR, deploy, secret added)\n\n"
    "-> Output a structured report in card-based format:\n"
    "- TL;DR as italic blockquote at top (1-3 sentences)\n"
    "- Sections with `##` headings + section icons\n"
    "- Cards with explicit labels: `Что: / Где: / Зачем: / Статус:`\n"
    "- Thin lines between cards inside a section\n"
    "- Required sections: Что сделано, Что не сделано, Что откатить, "
    "Что поломается, Что дальше, Сколько стоило\n\n"
    "Load full guide from skill `forge-report` (auto-discovered if dev-toolkit installed).\n\n"
    "For small tasks (<5 calls, single file) - use plain prose, not reports."
)
print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": msg
    }
}))
PY
else
  # Fallback: minimal valid JSON
  printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"forge-report skill available - use card-based structured reports for multi-step tasks (>=2 of 4 criteria). Load skill forge-report from dev-toolkit for full guide."}}\n'
fi

exit 0
