#!/usr/bin/env bash
# prompt-router.sh — UserPromptSubmit hook
# Classifies user prompt intent and emits a non-blocking recommendation
# in additionalContext. Never auto-invokes a skill; user always overrides.
#
# Part of PRD-029 (Sprint A — UX-layer autonomy skills).
# Closes Gap A from the autonomy vision: "knowing which command".
#
# Performance budget: NFR-002 caps execution at 100ms.
# Output budget: NFR-003 caps additionalContext at 500 chars.
#
# Contract:
# - Input: $CLAUDE_USER_PROMPT (the raw text user submitted)
# - Output: JSON to stdout with "additionalContext" field, or empty for silence
# - Exit code: always 0 (never blocks user prompt)
#
# Classifier is keyword-based (regex). No LLM calls, no network, no MCP.
# False positives are acceptable — hint is informational only.

set -e

# Guard: silence if no prompt available (some Claude Code versions may not export)
if [ -z "${CLAUDE_USER_PROMPT:-}" ]; then
  exit 0
fi

# Skip very short prompts (greetings, single words, confirmations)
prompt_len=${#CLAUDE_USER_PROMPT}
if [ "$prompt_len" -lt 12 ]; then
  exit 0
fi

# Skip prompts that already invoke a slash command (user knows what they want)
if echo "$CLAUDE_USER_PROMPT" | head -c 200 | grep -qE '^\s*/[a-z][a-z0-9-]+'; then
  exit 0
fi

# Lowercase for matching
prompt_lc=$(echo "$CLAUDE_USER_PROMPT" | tr '[:upper:]' '[:lower:]')

# Classification: first match wins (ordered by specificity)
suggestion=""

# Pattern: STATUS QUERY (least disruptive — read-only)
if echo "$prompt_lc" | grep -qE '\b(status|state|health|where (am i|are we)|что я делал|что у нас|recall|remind me|напомни|что сделано)\b'; then
  suggestion="**Suggestion**: this looks like a status/recall query. Consider \`/restore\` (session context recall) or \`forgeplan_health\` (project state) before doing work."

# Pattern: RAW IDEA (most ambiguous — needs shape)
elif echo "$prompt_lc" | grep -qE '\b(have an idea|thinking about|what if|идея|задумался|хочу сделать|можно ли|рассмотреть|brainstorm|думаю)\b'; then
  suggestion="**Suggestion**: this sounds like a raw idea. Consider \`/shape\` (interview-from-scratch → PRD draft) or dispatch \`agents-pro:brief-intake\` to capture as Brief NOTE first."

# Pattern: AUDIT / REVIEW
elif echo "$prompt_lc" | grep -qE '\b(audit|review|check (the )?code|security review|owasp|проверь код|ревью|аудит|find bugs|find vulnerabilities)\b'; then
  suggestion="**Suggestion**: this is an audit/review task. Consider \`/audit\` (multi-expert review) or dispatch a specialist: \`agents-pro:security-expert\` (OWASP), \`agents-core:code-reviewer\` (general), \`agents-pro:architect-reviewer\` (design fitness)."

# Pattern: BUG FIX
elif echo "$prompt_lc" | grep -qE '\b(fix (the )?bug|debug|broken|not working|crashes|exception|error in|почини|сломалось|не работает|падает)\b'; then
  suggestion="**Suggestion**: this is a bug fix. Consider dispatching \`agents-core:debugger\` (root cause analysis) or running \`/forge-cycle\` if scope > one file (Tactical bugs can skip PRD per CLAUDE.md route rules)."

# Pattern: NEW FEATURE / IMPLEMENT
elif echo "$prompt_lc" | grep -qE '\b(implement|build (a |the )?feature|add (a |the )?feature|create (a |the )?feature|реализуй|добавь фичу|сделай фичу)\b'; then
  suggestion="**Suggestion**: this is a feature build. Consider \`/forge-cycle\` (full SDLC: route → shape → build → audit → evidence → activate) or \`/autorun\` (autopilot, no approval checkpoints)."

# Pattern: DECISION / TRADEOFF
elif echo "$prompt_lc" | grep -qE '\b(should i|какой выбрать|выбрать (между|из)|vs (другой)?|tradeoff|trade-off|choice between|pick|decide)\b'; then
  suggestion="**Suggestion**: this is a decision. Consider \`/fpf evaluate\` (FPF trust calculus + F-G-R scoring → ADR) or dispatch \`agents-pro:adr-architect\` (MADR 3.0 ADR creation)."

# Pattern: RESEARCH / EXPLORE
elif echo "$prompt_lc" | grep -qE '\b(research|investigate|explore|prior art|compare|what does (everyone|other) use|изучи|исследуй|сравни)\b'; then
  suggestion="**Suggestion**: this is research/exploration. Consider \`/research\` (deep multi-agent investigation) or dispatch \`agents-pro:research-analyst\` (read-only synthesis)."

# Pattern: AGENT QUESTION
elif echo "$prompt_lc" | grep -qE '\b(which agent|what agent|какого агента|какой агент|посоветуй агента|recommend an? agent)\b'; then
  suggestion="**Suggestion**: this asks about agent choice. Consider \`/agent-advisor\` (consults mm-agent-selection mental model → specific recommendation with profile + invocation snippet)."

# Pattern: SETUP / BOOTSTRAP
elif echo "$prompt_lc" | grep -qE '\b(new project|setup|bootstrap|init project|start (a |the )?new|поставь все|инициализируй|разверни)\b'; then
  suggestion="**Suggestion**: this is project bootstrap. Consider \`/fpl-init\` (one-shot: forgeplan init + .mcp.json + CLAUDE.md + agent matrix + contract v3 marker)."

fi

# Emit nothing if no match
if [ -z "$suggestion" ]; then
  exit 0
fi

# Cap output at 500 BYTES per NFR-003 (use python3 for multibyte-safe truncation —
# Sprint E EVID-060 finding #3 fix: awk length() counts characters not bytes, would
# overflow on Cyrillic / CJK content)
suggestion=$(printf '%s' "$suggestion" | python3 -c "
import sys
data = sys.stdin.buffer.read()
if len(data) > 500:
    # Truncate to 500 bytes, decode safely to avoid mid-character splits
    data = data[:500].decode('utf-8', errors='ignore').encode('utf-8')
sys.stdout.buffer.write(data)
" 2>/dev/null || printf '%s' "$suggestion" | head -c 500)

# Emit as JSON with additionalContext field
# Sprint E EVID-060 finding #1 fix: pass suggestion via env var instead of interpolating
# into triple-quoted Python string (was brittle if suggestion contained literal ''')
SUGGESTION_TEXT="$suggestion" python3 - <<'PY' 2>/dev/null
import json, os
suggestion = os.environ.get('SUGGESTION_TEXT', '')
ctx = suggestion + "\n\n(Hint from prompt-router hook. You always override — pick whatever fits.)"
print(json.dumps({'hookSpecificOutput': {'additionalContext': ctx}}))
PY
PY_EXIT=$?
if [ $PY_EXIT -ne 0 ]; then
  # Fallback if python3 unavailable: bare echo (Claude Code accepts plain text in additionalContext too)
  # Use printf for safety; escape backslashes + double-quotes minimally
  escaped=$(printf '%s' "$suggestion" | sed 's/\\/\\\\/g; s/"/\\"/g')
  printf '{"hookSpecificOutput":{"additionalContext":"%s (prompt-router hint; override anytime)."}}\n' "$escaped"
fi

exit 0
