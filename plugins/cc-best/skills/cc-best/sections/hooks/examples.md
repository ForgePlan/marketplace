# Examples — real hooks walked through

Two annotated hooks: one blocking gate, one advisory. Both are shipped in this marketplace.

## A fail-closed gate — `bmad-gate.sh` (PreToolUse)

Job: deny source/test writes until the plan is done. It binds humans too — agent dispatch discipline only binds dispatched agents, but a `PreToolUse` deny binds every edit.

**1. Lock the shell down.**

```bash
set -euo pipefail
set -f                                     # no glob expansion — hostile paths can't expand
command -v jq >/dev/null 2>&1 || exit 2    # no jq → can't parse → deny (fail-closed)
```

**2. Read stdin once, parse the fields, deny on bad input.**

```bash
STDIN_JSON="$(cat)"
printf '%s' "$STDIN_JSON" | jq -e . >/dev/null 2>&1 || exit 2
TOOL_NAME="$(printf '%s' "$STDIN_JSON" | jq -r '.tool_name // ""')" || exit 2
FILE_PATH="$(printf '%s' "$STDIN_JSON" | jq -r '.tool_input.file_path // ""')" || exit 2
```

**3. Fast-path allow — before touching state.**

```bash
case "$TOOL_NAME" in
  Write|Edit|MultiEdit|Bash) ;;   # write-capable → gate it
  *) exit 0 ;;                    # Read, Grep, etc. → allow, cheaply
esac
```

**4. The "not applicable" allows — these are clean, not errors.**

```bash
REPO_ROOT="$(repo_root 2>/dev/null)" || exit 0     # not a git repo → BMAD not active → allow
SLUG="$(branch_slug 2>/dev/null)"   || exit 0       # detached HEAD → allow
[ -f "$STATE_FILE" ] || exit 0                       # no state file → BMAD not active → allow
```

**5. Read the phase, deny on a value you don't recognise.**

```bash
PHASE="$(jq -r '.phase // ""' "$STATE_FILE")" || exit 2
[ -z "$PHASE" ] && exit 2
```

**6. The deny is exit 0 + JSON — with a reason that tells the user how to proceed.**

```bash
_deny() {
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}' \
    "$(printf '%s' "$1" | sed 's/"/\\"/g')"
  exit 0
}
case "$PHASE" in
  planning|solutioning)
    if [ "$FILE_KIND" = "test" ] || [ "$FILE_KIND" = "source" ]; then
      _deny "BMAD phase '${PHASE}': no application code before the plan is done. For a throwaway spike write under .bmad-scratch/ ; for a legitimate edit set BMAD_GATE_OVERRIDE=1."
    fi ;;                       # docs/config ('other') fall through → allow
  *) exit 2 ;;                  # unknown phase → fail-closed
esac
exit 0                          # default allow — only reached for 'other' kinds
```

What makes this fail-closed: every error path denies (exit 2), every deny carries a reason **and an escape hatch** (`.bmad-scratch/`, an override env var), and the only allows are the explicit not-applicable cases plus non-code files.

## An advisory hook — `test-hint.sh` (PostToolUse)

Job: after a file write, if a new public function was added, suggest a test. It must never block — a false positive should cost the user nothing.

```bash
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.file_path // .file // empty' 2>/dev/null || true)
[ -z "$FILE" ] && exit 0
[[ "$FILE" =~ ^[a-zA-Z0-9_./@:\ -]+$ ]] || exit 0      # reject paths with shell metachars

case "$FILE" in
  *.js|*.ts|*.py|*.rs|*.go|*.java|*.rb|*.php)
    DIFF=$(git diff HEAD -- "$FILE" 2>/dev/null || true)
    if echo "$DIFF" | grep -qE '^\+.*(export function |pub fn |^def |public [a-zA-Z])'; then
      echo '{"message":"New public function — consider adding a test."}'
    fi ;;
esac
exit 0                                                  # ALWAYS exit 0 — advisory
```

The contrast with the gate: it **always exits 0**, it emits a `message` (a hint, not a `permissionDecision`), and its own comment says "false positives are expected and harmless — this is a hint, not a block." That sentence is the whole design choice.

## Reading the two side by side

| | `bmad-gate.sh` (gate) | `test-hint.sh` (advisory) |
|---|---|---|
| Event | `PreToolUse` | `PostToolUse` |
| On error | `exit 2` (deny) | `exit 0` (stay quiet) |
| On match | deny JSON | `message` hint |
| False positive cost | blocks a write — so it has escape hatches | none — just an unhelpful hint |

Pick the gate shape when skipping the check is a real risk and you can afford an escape hatch. Pick the advisory shape for everything else. When unsure — advisory.

## Related

- `fail-closed.md` — the gate rule set this example follows
- `common-bugs.md` — the shell footguns both examples defend against
- `config.md` — how each is wired into `hooks.json`
