# Hook configuration — hooks.json shape and placement

## The shape

Hooks are declared in JSON: a top-level `hooks` object keyed by event name, each event holding an array of matcher-groups, each group holding an array of command entries.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/safety-hook.sh", "timeout": 3 }
        ]
      }
    ]
  }
}
```

| Field | Meaning |
|-------|---------|
| `type` | Always `"command"`. (`"prompt"` exists but is **BANNED** here — see `common-bugs.md`.) |
| `command` | The shell line to run. Always start with `bash` explicitly — do not rely on the shebang. |
| `timeout` | Seconds before the hook is killed. Keep it tight: 1–5s for advisory, up to 10s for a gate. |
| `matcher` | Tool-name regex. Omit entirely for `SessionStart` / `UserPromptSubmit` / `Stop` / `SessionEnd`. |

## ${CLAUDE_PLUGIN_ROOT} — never hardcode paths

In a plugin, reference scripts via `${CLAUDE_PLUGIN_ROOT}` — Claude Code expands it to the installed plugin directory. A hardcoded absolute path breaks on every other machine.

```json
"command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/test-hint.sh"
```

## Where hooks.json lives — three locations

| Location | Scope | Committed? |
|----------|-------|-----------|
| `~/.claude/settings.json` (`hooks` key) | All your projects | No (user-global) |
| `<repo>/.claude/settings.json` (`hooks` key) | This repo, everyone | Yes |
| `<plugin>/hooks/hooks.json` | Anyone who installs the plugin | Yes (shipped) |

A project hook and a plugin hook are different files with different audiences. The local repo safety hook (`<repo>/.claude/hooks/safety-hook.sh`, wired from `.claude/settings.json`) protects this checkout; a plugin's `hooks/hooks.json` travels with the plugin to every user.

## Ordering — array order is run order

Multiple hooks on one event run **in the order they appear in the array**. This matters when one hook should gate before another does work.

```json
"SessionStart": [
  { "hooks": [
    { "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/session-start.sh",        "timeout": 3 },
    { "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/forge-report-session-start.sh", "timeout": 3 },
    { "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/decay-reminder.sh",        "timeout": 5 }
  ]}
]
```

These three run top-to-bottom every session start. For `PreToolUse`, put the cheapest fail-closed safety check first — there is no point running an expensive phase gate if a `git push --force` is about to be blocked anyway.

## Multiple plugins, same event

When two installed plugins both hook `PreToolUse` + `Bash` (e.g. `fpl-skills` and `forgeplan-workflow` each ship a safety hook), **both run**. Hooks compose across plugins; they do not override each other. Design each hook to be independently correct — never assume yours is the only one on the event.

## The trap

A valid-JSON `hooks.json` that points at a script which does not exist is worse than no hook: every matching tool call now fails when the missing script returns exit 127 (see `common-bugs.md`). CI here validates that `hooks.json` is parseable JSON — it does **not** verify the referenced scripts exist. Check the path yourself.

## Related

- `types.md` — which events accept a matcher
- `fail-closed.md` — what the gated command should return
- `common-bugs.md` — the exit-127 wired-but-missing failure
