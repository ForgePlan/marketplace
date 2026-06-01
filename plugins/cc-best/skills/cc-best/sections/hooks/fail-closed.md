# Fail-closed gates — blocking the right way

## The principle

A blocking `PreToolUse` hook is a security gate. A gate that fails open — allows the action when something goes wrong — is not a gate. So the rule is: **on any unexpected input, deny; never silently allow on error.** Allow only on a clean, explicitly-recognised "not applicable" case.

## Two ways a PreToolUse hook blocks

There are two distinct block mechanisms. Pick one per hook and be consistent.

| Mechanism | How | Used by |
|-----------|-----|---------|
| **exit 2 + stderr** | non-zero exit, reason on stderr | `safety-hook.sh` (dangerous-command blocklist) |
| **exit 0 + deny JSON** | exit 0, structured JSON on stdout | `tdd-gate.sh`, `bmad-gate.sh` (phase gates) |

The deny-JSON shape (richer — carries a reason back to Claude):

```json
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"<why, and how to proceed>"}}
```

The stderr shape (simpler — for hard blocklists):

```bash
echo "BLOCKED: 'git push --force' is not allowed. Use a feature branch + PR." >&2
exit 2
```

Note the asymmetry: with deny-JSON, **`exit 2` is reserved for fail-closed errors** (jq missing, unparseable input) and **`exit 0` carries the deny** in the JSON body. With the stderr style, `exit 2` *is* the block. Do not mix the two in one script.

## The fail-closed skeleton

Every phase gate in this marketplace opens the same way:

```bash
set -euo pipefail
set -f                                    # disable glob — hostile paths must not expand
command -v jq >/dev/null 2>&1 || exit 2   # no parser → cannot enforce → deny
STDIN_JSON="$(cat)"
printf '%s' "$STDIN_JSON" | jq -e . >/dev/null 2>&1 || exit 2   # bad input → deny
TOOL_NAME="$(printf '%s' "$STDIN_JSON" | jq -r '.tool_name // ""')" || exit 2
```

Then a **fast-path allow** for tools the gate does not care about, *before* loading any state:

```bash
case "$TOOL_NAME" in
  Write|Edit|MultiEdit|Bash) ;;   # write-capable → fall through to the gate
  *) exit 0 ;;                    # everything else → allow immediately
esac
```

Fast-path first keeps the gate cheap: a `Read` or `Grep` never pays the cost of reading the phase state.

## What "deny on error" means in practice

In `tdd-gate.sh` and `bmad-gate.sh`, these conditions all `exit 2` (deny):

- `jq` not installed
- stdin not parseable as JSON
- state file present but unparseable
- a required library or `stack.json` missing
- an **unknown phase** value (the `*)` case in the `case` statement)

A contradictory state denies too: in `tdd-gate.sh` GREEN phase, a frozen `spec_hash` with an empty `spec_path` means the oracle-drift check cannot run — so it denies rather than skip the check (a skip would be a fail-open bypass).

The one allow-on-"error" that is correct: **not in a git repo / detached HEAD / no state file** → `exit 0`. That is not an error — it is the legitimate "this gate does not apply here" case.

## Blocking vs advisory — pick deliberately

Not every hook should block. Most should not.

| Use a **blocking gate** (PreToolUse, deny) when | Use an **advisory hook** (any event, exit 0) when |
|---|---|
| The action is destructive or irreversible (`rm -rf`, force-push) | You want to nudge, not stop ("consider a test") |
| A discipline must bind humans too, not just dispatched agents | A false positive should never cost the user the action |
| Skipping it silently is a real risk | The hint is informational |

Advisory hooks **always `exit 0`** and emit a `message` or `additionalContext` field. `test-hint.sh`, `decay-reminder.sh`, and `prompt-router.sh` never block — `prompt-router.sh` even documents "you always override". The decision rule: if a false positive would wrongly block legitimate work, it must be advisory, not a gate.

## The trap

Do not write a gate that `exit 0`s on a parse failure "to be safe". That is exactly backwards — it is safe for the *hook* and unsafe for the *repo*. A gate that cannot determine the state must assume the worst and deny. The whole value of the gate is that it binds even when conditions are degraded.

## Related

- `types.md` — only `PreToolUse` can block
- `examples.md` — `bmad-gate.sh` walked through end to end
- `common-bugs.md` — the shell footguns that corrupt a gate's input parsing
