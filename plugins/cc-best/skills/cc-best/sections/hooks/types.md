# Hook types — events and matchers

## The six events

A hook is a shell command Claude Code runs when a lifecycle event fires. There are six events. Only one of them can block.

| Event | Fires when | Can block? | Matcher applies? |
|-------|-----------|:----------:|:----------------:|
| `PreToolUse` | Before a tool runs | **Yes** | Yes (by tool name) |
| `PostToolUse` | After a tool returns | No | Yes (by tool name) |
| `SessionStart` | New or resumed session | No | No |
| `UserPromptSubmit` | User submits a prompt, before Claude sees it | No (can inject context) | No |
| `Stop` | Claude finishes a response | No | No |
| `SessionEnd` | Session closes | No | No |

Rule: if you want to **prevent** an action, the only event that works is `PreToolUse`. Everything else observes or augments — it cannot stop the action.

## Matchers — PreToolUse and PostToolUse only

The `matcher` field selects which tool the hook reacts to. It is a regex over the tool name.

| Matcher | Matches |
|---------|---------|
| `Bash` | only the Bash tool |
| `Write\|Edit\|MultiEdit` | any of the three file-write tools |
| `.*` | every tool (catch-all) |

Example — the fpl-skills `PostToolUse` block runs a test-hint on file writes and a counter on everything:

```json
"PostToolUse": [
  { "matcher": "Write|Edit|MultiEdit", "hooks": [ /* test-hint */ ] },
  { "matcher": ".*",                    "hooks": [ /* counter   */ ] }
]
```

`SessionStart`, `UserPromptSubmit`, `Stop`, `SessionEnd` have no tool to match — omit the `matcher` key entirely (see `config.md`).

## What each event is good for

| Event | Real use in this marketplace |
|-------|------------------------------|
| `PreToolUse` + `Bash` | Block dangerous commands — `git push --force`, `rm -rf /` (`safety-hook.sh`) |
| `PreToolUse` + `Write\|Edit\|MultiEdit\|Bash` | Phase gate — deny source/test writes before the plan is done (`tdd-gate.sh`, `bmad-gate.sh`) |
| `PostToolUse` + `Write\|Edit\|MultiEdit` | Non-blocking hint — "new public function, consider a test" (`test-hint.sh`) |
| `SessionStart` | Surface project state + fired decay triggers (`session-start.sh`, `decay-reminder.sh`) |
| `UserPromptSubmit` | Inject a routing suggestion or recall memory into context (`prompt-router.sh`, hsmem `recall.mjs`) |
| `Stop` / `SessionEnd` | Persist conversation memory once per N turns / at close (hsmem `retain.mjs`, `session-end.mjs`) |

## The trap

Do not reach for `PostToolUse` to "undo" a bad write — by the time it fires, the file is already written and the tool already returned. Validation that must prevent the action belongs in `PreToolUse`; `PostToolUse` can only warn, count, or trigger follow-up. The same applies to `Stop`: you cannot block Claude from finishing, only react after it has.

## Related

- `config.md` — the `hooks.json` shape that wires these events
- `fail-closed.md` — how a `PreToolUse` hook actually denies a tool
- `examples.md` — a real `PreToolUse` gate walked through
