#!/usr/bin/env bash
# Tests for templates/hooks/pre-pr-evidence-check.sh — the SHIPPED file, driven
# end to end: a throwaway git repo, a fake `forgeplan` on PATH, and the hook's
# real stdin protocol.
#
# The hook's existing test file (workspace-side) covers the bypass logic and
# stops there: "exit 0 — not testing exact value". That is a trap that holds
# nothing — it passes whether the hook blocks correctly or never blocks at all.
# These cases assert the DECIDING property instead: the exit code AND which IDs
# appear under which heading.
#
# Two behaviours are pinned here (both found 2026-09-03, marketplace#233 session):
#
#   1. SCOPE — artifact IDs are collected from `base..HEAD`, not a flat
#      `git log -20`. The flat range reaches past the branch point into commits
#      other PRs already merged, and blocked a PR on an artifact reference in
#      somebody else's commit.
#
#   2. DANGLING — an ID that is not in the graph is reported as not-found and
#      does NOT block. It used to fall through to the evidence check, come out
#      "evidence missing", and be handed a remedy that cannot work: you cannot
#      link an EVID to an artifact that does not exist.
#
# Run:  bash plugins/fpl-skills/tests/test-pre-pr-evidence-check.sh

set -uo pipefail

# HOOK_OVERRIDE points the suite at a mutated copy — that is how these cases were
# checked to constrain anything at all (a passing suite proves nothing until a
# broken hook makes it fail).
HOOK="${HOOK_OVERRIDE:-$(cd "$(dirname "$0")/.." && pwd)/templates/hooks/pre-pr-evidence-check.sh}"
[[ -f "$HOOK" ]] || { echo "FAIL: hook not found at $HOOK"; exit 1; }

failures=0
ran=0

# --- fixture -----------------------------------------------------------------

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

BIN="$WORK/bin"
mkdir -p "$BIN"

# Fake forgeplan. Two knobs, both env-driven so each case can set its own world:
#   FAKE_KNOWN  — space-separated IDs that exist
#   FAKE_EVID   — space-separated IDs that have an EVID informs-edge
cat > "$BIN/forgeplan" <<'FAKE'
#!/usr/bin/env bash
set -uo pipefail
case "${1:-}" in
  get)
    id="${2:-}"
    for known in ${FAKE_KNOWN:-}; do
      if [[ "$known" == "$id" ]]; then
        printf '# %s\n\nbody text\n\n## Related\n\n(none)\n' "$id"
        exit 0
      fi
    done
    echo "Error: Artifact '$id' not found" >&2
    exit 1
    ;;
  graph)
    edges=""
    for id in ${FAKE_EVID:-}; do
      edges="${edges}{\"source\":\"EVID-001\",\"target\":\"$id\",\"relation\":\"informs\"},"
    done
    printf '{"edges":[%s]}\n' "${edges%,}"
    exit 0
    ;;
esac
exit 0
FAKE
chmod +x "$BIN/forgeplan"

REPO="$WORK/repo"
mkdir -p "$REPO"
git -C "$REPO" init -q -b main
git -C "$REPO" config user.email t@example.com
git -C "$REPO" config user.name test
echo one > "$REPO/a.txt"
git -C "$REPO" add a.txt
# Pre-branch commit — cites PRD-900. Nothing on the branch touches it.
git -C "$REPO" commit -q -m "chore: earlier merged work

Refs: PRD-900"
git -C "$REPO" checkout -q -b feat/x
echo two > "$REPO/b.txt"
git -C "$REPO" add b.txt
git -C "$REPO" commit -q -m "feat: this branch

Refs: PRD-901"

PAYLOAD='{"tool_input":{"command":"gh pr create --title t --body b"}}'

# --- harness -----------------------------------------------------------------

# run <known-ids> <evid-ids> -> sets RC / OUT
run() {
  local out_file="$WORK/out.$$"
  ( cd "$REPO" \
    && PATH="$BIN:$PATH" FAKE_KNOWN="$1" FAKE_EVID="$2" \
       bash "$HOOK" <<<"$PAYLOAD" >/dev/null 2>"$out_file" )
  RC=$?
  OUT="$(cat "$out_file")"
  rm -f "$out_file"
}

check() {
  local name="$1" cond="$2"
  ran=$((ran + 1))
  if [[ "$cond" == "ok" ]]; then
    echo "PASS: $name"
  else
    echo "FAIL: $name"
    echo "      rc=$RC"
    echo "      stderr: $OUT"
    failures=$((failures + 1))
  fi
}

echo "=== pre-pr-evidence-check.sh — shipped template ==="
echo "hook: $HOOK"
echo ""

# 1. True positive must survive every fix below: PRD-901 exists on this branch,
#    has no evidence → BLOCK, and say so by name.
run "PRD-901 PRD-900" ""
c=ok
[[ "$RC" -eq 2 ]] || c=bad
grep -q "evidence missing" <<<"$OUT" || c=bad
grep -q "PRD-901" <<<"$OUT" || c=bad
check "branch artifact without evidence blocks (rc=2, named)" "$c"

# 2. Evidence present → allowed. Without this the "blocks" case above would also
#    pass on a hook that blocks unconditionally.
run "PRD-901 PRD-900" "PRD-901"
c=ok
[[ "$RC" -eq 0 ]] || c=bad
grep -q "evidence missing" <<<"$OUT" && c=bad
check "branch artifact WITH evidence is allowed (rc=0)" "$c"

# 3. SCOPE. PRD-900 is cited only in the pre-branch commit and has no evidence.
#    Under `git log -20` it is in range and blocks; under base..HEAD it is not.
#    Case 1 already proved the hook can block, so a pass here is scope, not
#    a hook that stopped working.
run "PRD-901 PRD-900" "PRD-901"
c=ok
grep -q "PRD-900" <<<"$OUT" && c=bad
[[ "$RC" -eq 0 ]] || c=bad
check "pre-branch commit's artifact is out of scope (PRD-900 unmentioned)" "$c"

# 4. DANGLING. PROB-999 is cited on the branch and does not exist.
git -C "$REPO" commit -q --allow-empty -m "docs: mention PROB-999 in prose"
run "PRD-901" "PRD-901"
c=ok
[[ "$RC" -eq 0 ]] || c=bad                       # warns, never blocks
grep -q "PROB-999" <<<"$OUT" || c=bad            # ...but is not silent about it
grep -q "not found in the graph" <<<"$OUT" || c=bad
grep -q "evidence missing" <<<"$OUT" && c=bad    # and never under the wrong heading
check "unknown ID warns as not-found, does not block, is not called 'evidence missing'" "$c"

# 5. Silence control. A non-pr-create command must exit 0 AND print nothing —
#    a hook that crashed early also exits 0, and only empty stderr tells them
#    apart.
out_file="$WORK/out.silent"
( cd "$REPO" && PATH="$BIN:$PATH" FAKE_KNOWN="" FAKE_EVID="" \
    bash "$HOOK" <<<'{"tool_input":{"command":"git status"}}' >/dev/null 2>"$out_file" )
RC=$?
OUT="$(cat "$out_file")"
c=ok
[[ "$RC" -eq 0 ]] || c=bad
[[ -z "$OUT" ]] || c=bad
check "non-pr-create command: exit 0 and stderr empty" "$c"

echo ""
if (( failures > 0 )); then
  echo "$failures of $ran failed."
  exit 1
fi
echo "All $ran tests passed."
