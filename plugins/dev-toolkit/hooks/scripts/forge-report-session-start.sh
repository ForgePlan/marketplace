#!/usr/bin/env bash
# forge-report-session-start.sh — inject reminder about forge-report format
# at the start of each Claude session.
# Exit 0 = success (output is sent as additional context to Claude).

set -uo pipefail

# Output additional context for the session via JSON.
# The systemMessage field is added to Claude's context as a system reminder.
cat <<'JSON'
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "## forge-report format reminder\n\nThis Claude Code session has the `forge-report` skill available (from `dev-toolkit` plugin).\n\nWhen finishing a multi-step task that meets ≥2 of these criteria:\n- ≥5 tool calls in this turn\n- ≥3 files created or modified\n- TaskList with ≥3 items\n- Cross-system effect (git push, PR, deploy, secret added)\n\n→ Output a structured report in **card-based format**:\n- TL;DR as italic blockquote at top (1-3 sentences)\n- Sections with `##` headings + section icons (✅📈⚪🔄⚠️➡️💰)\n- Cards with explicit labels: `Что: / Где: / Зачем: / Статус:`\n- Thin `─` lines between cards inside a section\n- Required sections: Что сделано, Что не сделано, Что откатить, Что поломается, Что дальше, Сколько стоило\n\nLoad full guide from skill `forge-report` (auto-discovered if dev-toolkit installed).\n\nFor small tasks (<5 calls, single file) — use plain prose, not reports."
  }
}
JSON
exit 0
