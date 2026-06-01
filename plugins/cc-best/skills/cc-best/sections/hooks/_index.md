# hooks — router

Five content files. Each is self-contained — load one based on the user's intent, do not pre-load the rest.

## Intent to file

| User asks about | Load |
|---|---|
| "what hook events exist", "matchers", "when does each fire", "PreToolUse vs PostToolUse" | `types.md` |
| "hooks.json shape", "where do hooks live", "settings.json vs plugin", "timeout", "ordering" | `config.md` |
| "blocking gate", "deny a tool", "exit 2", "fail-closed", "blocking vs advisory" | `fail-closed.md` |
| "my hook breaks every Bash", "exit 127", "shell noise", "set -u fatal", "git in a hook" | `common-bugs.md` |
| "show me a real gate", "walk through a working hook", "annotated example" | `examples.md` |

## Cross-references

- `fail-closed.md` is the design pattern; `examples.md` walks a real fail-closed gate (`bmad-gate.sh`) line by line. Load `examples.md` for the concrete read, `fail-closed.md` for the rule set.
- `common-bugs.md` references `config.md` (where `timeout` and `${CLAUDE_PLUGIN_ROOT}` are defined) and `fail-closed.md` (why a missing wired hook becomes exit 127 on every Bash).
- `types.md` explains which events can block (`PreToolUse` only) — `fail-closed.md` builds on that.

## When the user's question spans multiple files

Pick the file with the most direct answer first. Cite the others by relative path (`see config.md`) — do not concatenate them into one response.

## When in doubt

Default to `types.md` for "what are hooks / which event do I use". Default to `examples.md` for "show me one that works".
