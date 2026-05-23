# hooks — STUB

> **Status**: not yet authored. Coming in **RFC-007**.

This section will cover:

- Hook types (PreToolUse, PostToolUse, SessionStart, UserPromptSubmit, Stop, SessionEnd)
- Ordering and short-circuit behaviour
- BANNED patterns (our hard lessons — e.g., the `prompt-type` hook anti-pattern from fpl-hsmem)
- Configuration locations (`.claude/settings.json` vs `~/.claude/settings.json` vs plugin `hooks/hooks.json`)
- Examples with input/output JSON shapes

Until shipped, see:

- Anthropic docs on hook events.
- `plugins/fpl-hsmem/hooks/` for real-world hook scripts with auto-recall / auto-retain semantics.
- `plugins/forgeplan-workflow/hooks/` for orchestrator-side hook examples.
