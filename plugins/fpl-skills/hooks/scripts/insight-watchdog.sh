#!/usr/bin/env bash
# insight-watchdog.sh — SessionStart anomaly watchdog (PRD-074 / RFC-019 brick 1, Layer 3).
#
# Surfaces ONLY real, actionable forgeplan anomalies (severity >= medium) and
# stays SILENT on a clean tree. Filters the two known-noise classes
# (weakest_link_unresolvable per forgeplan#325 + benign phase_mismatch
# advisories) so a genuine signal is never buried under low-severity noise.
#
# Design: RFC-019 Layer 3 deterministic watchdog. Hooks cannot call MCP, so this
# shells out to the `forgeplan` CLI (`forgeplan anomalies --json`, landed in
# forgeplan#289) and filters with python3 — matching the existing fpl-skills
# hook convention (decay-reminder.sh / session-start.sh both parse with python3,
# not jq, since jq is not guaranteed present). This is the only deviation from
# RFC-019's "jq" wording, taken for parity + portability.
#
# Invariants honoured: INV-1 numbers come from live forgeplan only; INV-3 silent
# when no medium+ survives; INV-6 fails OPEN (never blocks SessionStart).
#
# Exit codes: 0 always (a watchdog must never break the session it watches).
# Budget: declared `timeout: 5` in hooks.json.

set -uo pipefail

# ─── Preconditions — silent skip if forgeplan/workspace/python absent ───────
command -v forgeplan >/dev/null 2>&1 || exit 0
[ -d ".forgeplan" ] || exit 0
command -v python3 >/dev/null 2>&1 || exit 0

# ─── Pull anomalies (best-effort, time-boxed, never fail the session) ───────
# `timeout` is GNU coreutils — present on Linux + homebrew macOS, absent on bare
# macOS; fall back to a direct call when it's missing (same pattern as
# session-start.sh's health probe).
if command -v timeout >/dev/null 2>&1; then
  ANOM_JSON=$(timeout 4 forgeplan anomalies --json 2>/dev/null || echo "")
else
  ANOM_JSON=$(forgeplan anomalies --json 2>/dev/null || echo "")
fi
[ -n "$ANOM_JSON" ] || exit 0

# ─── Filter + rank + digest (deterministic; python3, no jq dependency) ──────
# Drop known-noise kinds, keep severity in {medium,high}, rank high-first then
# newest, cap at 5 observations. Print NOTHING when zero survive (silence
# policy). All numbers come straight from the detector payload — no cached or
# invented counts (the "30 stale/draft of 334" class of falsehood cannot recur
# here because this hook reports anomaly survivors, not file-grep guesses).
printf '%s' "$ANOM_JSON" | python3 -c '
import json, sys

# RFC-019 Choice 2b filter rule. weakest_link_unresolvable = forgeplan#325
# structural noise (leaf artifacts with no child evidence score 0).
# phase_mismatch = benign "active but early-cycle phase" advisory (every live
# instance is benign for brick 1; narrows to a subset later if PRD-074 Q4 finds
# a non-benign combination).
KNOWN_NOISE = {"weakest_link_unresolvable", "phase_mismatch"}
KEEP_SEVERITY = {"medium", "high"}
CAP = 5

try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)

anomalies = data.get("anomalies", []) if isinstance(data, dict) else []
total = data.get("total", len(anomalies)) if isinstance(data, dict) else len(anomalies)

real = [
    a for a in anomalies
    if a.get("severity") in KEEP_SEVERITY and a.get("kind") not in KNOWN_NOISE
]

# INV-3: silent when nothing real survives.
if not real:
    sys.exit(0)

# Rank: high before medium, then most-recent first. Two stable passes so a
# missing observed_at sorts LAST within its severity (reverse=True puts "" last)
# rather than jumping ahead of timestamped peers.
real.sort(key=lambda a: str(a.get("observed_at", "")), reverse=True)
real.sort(key=lambda a: 0 if a.get("severity") == "high" else 1)
shown = real[:CAP]

noise = total - len(real)
hdr = "🔭 forgeplan insight: %d issue(s) need attention" % len(real)
if noise > 0:
    hdr += " (%d more are known low-severity noise)" % noise
print(hdr)
for a in shown:
    sev = a.get("severity", "?")
    kind = a.get("kind", "?")
    affected = ",".join((a.get("affected") or [])[:3])
    desc = (a.get("description") or "")[:80]
    line = "   [%s] %s" % (sev, kind)
    if affected:
        line += " — " + affected
    if desc:
        line += " — " + desc
    print(line)
if len(real) > CAP:
    print("   … and %d more" % (len(real) - CAP))
print("   → run /forge-insight for the full digest")
' 2>/dev/null

exit 0
