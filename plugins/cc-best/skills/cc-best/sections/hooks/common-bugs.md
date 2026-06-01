# Common hook bugs — hard lessons

Each bug is a real incident from this marketplace. Symptom, cause, fix.

## Bug 1 — exit 127 on every matching tool call (wired-but-missing)

**Symptom**: after wiring a new hook, every Bash command (or every Write) starts failing — the tool returns before doing anything.

**Cause**: `hooks.json` references a command that the shell cannot run, so it exits **127** (command not found). Two flavours seen here:
- The script path is wrong / the file does not exist — the hook is wired but the target is missing.
- The script calls a binary that is not on `$PATH`. The real incident (v1.20.1): `session-start.sh` wrapped a probe in GNU `timeout`, which is **not installed on bare macOS** — exit 127, and the health warning silently never surfaced.

**Fix**: gate on tool availability before using it, and degrade instead of failing.

```bash
if command -v timeout >/dev/null 2>&1; then
  timeout 3 forgeplan health --json
else
  forgeplan health --json        # CLI is fast; hooks.json timeout still protects us
fi
```

CI here validates that `hooks.json` is valid JSON — it does **not** check that referenced scripts exist. Verify the path yourself before committing.

## Bug 2 — zsh rc noise corrupts hook output (`_encode: command not found`)

**Symptom**: a hook or a git probe emits junk like `zsh: command not found: _encode` / `_decode` to stderr, and downstream parsing (jq, line counts) breaks.

**Cause**: the hook ran under an interactive shell that sourced the user's `~/.zshrc`, which had a stale completion plugin defining `_encode`/`_decode`. The noise is **user-side** (confirmed Anomaly #19 — not a tool bug), but it still pollutes any command that inherits that environment.

**Fix**: run git and probes under a clean, non-interactive shell — no rc files, no profile:

```bash
bash --noprofile --norc -c 'git -C "$REPO" diff --stat base..head'
```

This is the standing rule for any hook or agent that shells out to git: `bash --noprofile --norc` sidesteps both the rc-hook stderr noise **and** the `set -u` footguns below.

## Bug 3 — `set -u` fatals inside a hook

**Symptom**: the hook dies on a line that references an unset variable — often an env var Claude Code did not export in this version.

**Cause**: `set -u` (part of `set -euo pipefail`) turns any unset-variable reference into a fatal error. Hooks read env vars like `$CLAUDE_USER_PROMPT` that may be absent on some Claude Code versions.

**Fix**: guard optional env reads with `${VAR:-}` and bail cleanly:

```bash
if [ -z "${CLAUDE_USER_PROMPT:-}" ]; then exit 0; fi
```

For array expansion under `set -u`, use `"${ARR[@]+"${ARR[@]}"}"` — a bare `"${ARR[@]}"` on an empty array is fatal.

## Bug 4 — `type: "prompt"` hooks (BANNED here)

**Symptom**: a hook declared with `"type": "prompt"` instead of `"type": "command"`.

**Cause**: prompt-type hooks inject text that is processed as a model instruction — an unvetted instruction-injection surface. This marketplace classes it as a security regression.

**Fix**: only ever use `"type": "command"`. A CI check named `Ban prompt-type hooks` fails the build on any `"type": "prompt"` in a `hooks.json`. To inject context, use a `command` hook that emits an `additionalContext` field (the `prompt-router.sh` pattern) — vetted shell, not free-form prompt text.

## Bug 5 — fail-open on parse failure

**Symptom**: a gate stops blocking; bad actions slip through when input is malformed.

**Cause**: the hook `exit 0`s when jq fails or stdin is unparseable — "to avoid breaking the tool". That is fail-open: the gate silently allows exactly when it cannot verify.

**Fix**: a gate must `exit 2` (deny) on any unexpected input. See `fail-closed.md`. Allow only on the clean not-applicable case (not a git repo, no state file).

## The meta-lesson

A hook runs on **every** matching event, in an environment you do not fully control (the user's shell, their `$PATH`, their rc files, the running Claude Code version's env vars). Defensive shell is not optional: explicit `bash`, `--noprofile --norc` for git, `${VAR:-}` guards, tool-availability checks, and fail-closed on the unexpected.

## Related

- `config.md` — `${CLAUDE_PLUGIN_ROOT}`, `timeout`, where scripts live
- `fail-closed.md` — why Bug 5 is the most dangerous one
- `examples.md` — a hook that gets all of this right
