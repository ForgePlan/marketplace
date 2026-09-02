#!/usr/bin/env bash
# ============================================================================
# test-insight-watchdog.sh — behavioral suite for the SessionStart watchdog
# ============================================================================
# Exercises the SHIPPED hooks/scripts/insight-watchdog.sh (never a copy of its
# logic) by putting a fake `forgeplan` on PATH that prints a fixture payload.
# Run from anywhere:
#
#     bash plugins/fpl-skills/tests/test-insight-watchdog.sh
#
# Exit 0 = all pass; exit 1 = at least one failure. Deps: bash + python3 —
# the same the hook itself requires.
#
# WHY THIS SUITE EXISTS
# ---------------------
# ADR-022 narrowed the filter: `phase_mismatch` is no longer dropped by kind,
# only when the artifact's lifecycle marker is benign (`shape` / `validate`).
# A marker outside that set surfaces AT ANY SEVERITY, because the detector
# stamps every `phase_mismatch` `low` — measured 306 of 306 on the live tree —
# so the severity floor alone would swallow the one case worth reading.
#
# The deciding property is therefore NOT "does the hook mention phase_mismatch"
# but "does a low-severity NON-benign marker survive a floor set to medium+".
# Case 2 asserts exactly that, and case 1 asserts the benign twin stays silent.
# Asserting only one direction would pass on a hook that surfaces everything.
#
# The hook pipes into `python3 -c ... 2>/dev/null`, so a syntax error inside the
# python block prints nothing and exits 0 — which would silently satisfy every
# expect-silence case. That is why the suite is not built out of silence checks:
# cases 2, 3 and 4 demand output, so a broken block fails the run rather than
# sailing through it.
# ============================================================================

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOOK="$PLUGIN_ROOT/hooks/scripts/insight-watchdog.sh"

PASS=0
FAIL=0

ok()  { PASS=$((PASS+1)); printf '  ok   %s\n' "$1"; }
nok() { FAIL=$((FAIL+1)); printf '  FAIL %s\n' "$1"; [ -n "${2:-}" ] && printf '       %s\n' "$2"; }

[ -f "$HOOK" ] || { printf 'FATAL: hook not found at %s\n' "$HOOK"; exit 1; }
command -v python3 >/dev/null 2>&1 || { printf 'SKIP: python3 absent\n'; exit 0; }

SB="$(mktemp -d "${TMPDIR:-/tmp}/insight-watchdog-test.XXXXXX")"
cleanup() { rm -rf "$SB"; }
trap cleanup EXIT

mkdir -p "$SB/.forgeplan" "$SB/bin"

# Fake `forgeplan`: prints whatever fixture the current case wrote. `timeout`
# resolves it through PATH exactly as the real binary would be resolved.
cat > "$SB/bin/forgeplan" <<'FAKE'
#!/usr/bin/env bash
cat "$FIXTURE_FILE"
FAKE
chmod +x "$SB/bin/forgeplan"

# run <json> — sets OUT (stdout), ERR (stderr) and RC (exit code).
# Command substitution would run the hook in a subshell and lose RC, so the
# streams go to files and the parent reads them back.
run() {
  printf '%s' "$1" > "$SB/fixture.json"
  ( cd "$SB" && PATH="$SB/bin:$PATH" FIXTURE_FILE="$SB/fixture.json" bash "$HOOK" ) \
    > "$SB/out.txt" 2> "$SB/err.txt"
  RC=$?
  OUT="$(cat "$SB/out.txt")"
  ERR="$(cat "$SB/err.txt")"
}

pm() {  # pm <id> <marker-json> <severity>
  printf '{"kind":"phase_mismatch","severity":"%s","affected":["%s"],
           "description":"%s: status=active but phase=X","observed_at":"2026-09-02T00:00:00Z",
           "evidence":%s}' "$3" "$1" "$1" "$2"
}

wrap() { printf '{"total":%s,"anomalies":[%s]}' "$1" "$2"; }

printf 'insight-watchdog filter suite\n'

# --- 0. the script parses at all -------------------------------------------
# The embedded `python3 -c '...'` block is one single-quoted shell string; an
# apostrophe inside it (an English possessive in a comment is the easy way in)
# ends the string and the hook dies with a shell syntax error. That error goes
# to stderr while stdout stays empty — indistinguishable, on stdout alone, from
# a correct silent run. Assert stderr directly instead of inferring it.
run "$(wrap 0 '')"
if [ -z "$ERR" ]; then
  ok "hook parses and runs without shell errors"
else
  nok "hook emitted shell errors" "$ERR"
fi

# --- 1. benign markers stay silent -----------------------------------------
run "$(wrap 2 "$(pm ADR-001 '{"current_phase":"validate","status":"active"}' low),
                $(pm PRD-002 '{"current_phase":"shape","status":"active"}' low)")"
if [ -z "$OUT" ] && [ "$RC" -eq 0 ]; then
  ok "benign shape/validate markers produce no output"
else
  nok "benign markers leaked" "rc=$RC out=<$OUT> err=<$ERR>"
fi

# --- 2. THE DECIDING CASE: non-benign marker beats the severity floor -------
run "$(wrap 1 "$(pm PRD-003 '{"current_phase":"adi","status":"active"}' low)")"
if printf '%s' "$OUT" | grep -q 'phase_mismatch' \
   && printf '%s' "$OUT" | grep -q 'PRD-003' \
   && printf '%s' "$OUT" | grep -q 'set by hand'; then
  ok "low-severity NON-benign marker surfaces despite the medium+ floor"
else
  nok "non-benign marker was swallowed" "rc=$RC out=<$OUT> err=<$ERR>"
fi

# --- 3. missing evidence block surfaces rather than vanishing ---------------
run "$(wrap 1 '{"kind":"phase_mismatch","severity":"low","affected":["PRD-004"],
                "description":"no evidence block","observed_at":"2026-09-02T00:00:00Z"}')"
if printf '%s' "$OUT" | grep -q 'PRD-004'; then
  ok "phase_mismatch with no evidence block surfaces (fails visible)"
else
  nok "missing marker vanished silently" "rc=$RC out=<$OUT> err=<$ERR>"
fi

# --- 4. unrelated medium anomaly still surfaces (no regression) -------------
run "$(wrap 1 '{"kind":"duplicate_artifact","severity":"medium","affected":["EVID-124"],
                "description":"similar titles","observed_at":"2026-09-02T00:00:00Z"}')"
if printf '%s' "$OUT" | grep -q 'duplicate_artifact'; then
  ok "medium anomaly of another kind still surfaces"
else
  nok "medium anomaly lost" "rc=$RC out=<$OUT> err=<$ERR>"
fi

# --- 5. severity floor still applies to every other kind -------------------
run "$(wrap 1 '{"kind":"duplicate_artifact","severity":"low","affected":["EVID-999"],
                "description":"low dup","observed_at":"2026-09-02T00:00:00Z"}')"
if [ -z "$OUT" ]; then
  ok "low-severity non-phase anomaly stays filtered"
else
  nok "severity floor stopped applying to other kinds" "out=<$OUT>"
fi

# --- 6. weakest_link_unresolvable is still a WHOLESALE drop ----------------
# Pinned at HIGH on purpose: if the wholesale drop were ever downgraded to a
# severity check, this case would start firing.
run "$(wrap 1 '{"kind":"weakest_link_unresolvable","severity":"high","affected":["EVID-050"],
                "description":"leaf scores 0","observed_at":"2026-09-02T00:00:00Z"}')"
if [ -z "$OUT" ]; then
  ok "weakest_link_unresolvable dropped wholesale even at high severity"
else
  nok "forgeplan#325 noise resurfaced" "out=<$OUT>"
fi

# --- 7. malformed payload never breaks the session -------------------------
run 'not json at all'
if [ -z "$OUT" ] && [ "$RC" -eq 0 ]; then
  ok "malformed payload: silent, exit 0 (INV-6 fail-open)"
else
  nok "malformed payload broke the hook" "rc=$RC out=<$OUT>"
fi

printf '\n%d passed, %d failed\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
