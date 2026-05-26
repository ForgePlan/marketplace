#!/usr/bin/env bash
# decay-reminder.sh — SessionStart hook for ADR Revisit Trigger surveillance.
#
# Authored Sprint Z2 (PRD-053) as part of Evidence Decay enforcement.
# Runs at every SessionStart; silent if no triggers fired; one-line alert per
# fired trigger otherwise. The alert points the user to /decay-watch for full
# report.
#
# Exit codes:
#   0  — always (we never block SessionStart)
#
# Output (stdout):
#   silent (nothing) if no fired triggers
#   "🔔 ADR-XXX trigger fired: <one-line>" per fired trigger
#   final "Run /decay-watch for the full report." if anything fired

set -uo pipefail

# Check forgeplan CLI presence — silent skip if not installed
if ! command -v forgeplan >/dev/null 2>&1; then
    exit 0
fi

# Check we're in a forgeplan workspace — silent skip if not
if [ ! -d ".forgeplan" ]; then
    exit 0
fi

# Pull active ADRs (JSON output piped through python for date parsing).
# If the CLI call fails (uninitialized workspace, stale state) we still want
# Layer 3 to run — it is filesystem-only — so do NOT exit on failure here.
ACTIVE_ADRS=$(forgeplan list --kind adr --status active --output json 2>/dev/null || echo "[]")

# Parse + check using python (POSIX-safe, no jq dependency). Any python error
# is swallowed; Layer 3 below still runs (filesystem-only, no Python).
python3 - "$ACTIVE_ADRS" <<'PYEOF' 2>/dev/null || true
import json
import re
import subprocess
import sys
from datetime import datetime, date

raw = sys.argv[1] if len(sys.argv) > 1 else "[]"
try:
    payload = json.loads(raw)
except json.JSONDecodeError:
    sys.exit(0)

# Payload shape may vary; try common variants
adrs = payload if isinstance(payload, list) else payload.get("artifacts", [])
if not adrs:
    sys.exit(0)

# Trigger patterns
ADR_TRIGGER_RE = re.compile(r'^- \[([ x])\] \*\*Type\*\*:\s*(date|metric|event)\s*[—\-]\s*(.+)$', re.MULTILINE)
NOTE_DEFER_RE = re.compile(r'^- \[([ x])\] \*\*Kind\*\*:\s*(issue|metric|date|event)\s*[—\-]\s*(.+)$', re.MULTILINE)
ISO_DATE_RE = re.compile(r'\b(\d{4}-\d{2}-\d{2})\b')
ISSUE_NUM_RE = re.compile(r'(?:forgeplan)?#(\d+)')

today = date.today()
fired_lines = []

# Layer 1 — ADR Revisit Triggers (Sprint Z2)
for adr in adrs:
    adr_id = adr.get("id") or adr.get("id_display", "ADR-???")
    try:
        body_proc = subprocess.run(
            ["forgeplan", "get", adr_id, "--output", "json"],
            capture_output=True, text=True, timeout=10,
        )
        body_payload = json.loads(body_proc.stdout)
        body = body_payload.get("body", "")
    except Exception:
        continue

    for match in ADR_TRIGGER_RE.finditer(body):
        checked, kind, desc = match.groups()
        desc_short = desc.strip()[:60]

        if checked == 'x':
            fired_lines.append(f"🔔 {adr_id} trigger fired ({kind}): {desc_short}")
        elif kind == "date":
            iso_match = ISO_DATE_RE.search(desc)
            if iso_match:
                try:
                    trig_date = datetime.strptime(iso_match.group(1), "%Y-%m-%d").date()
                    if trig_date <= today:
                        fired_lines.append(f"🔔 {adr_id} date trigger past due ({iso_match.group(1)}): {desc_short}")
                except ValueError:
                    pass

# Layer 2 — NOTE-013 deferred items (Sprint Z5 PRD-056)
try:
    note_proc = subprocess.run(
        ["forgeplan", "get", "NOTE-013", "--output", "json"],
        capture_output=True, text=True, timeout=10,
    )
    note_payload = json.loads(note_proc.stdout)
    note_body = note_payload.get("body", "")
except Exception:
    note_body = ""

for match in NOTE_DEFER_RE.finditer(note_body):
    checked, kind, desc = match.groups()
    if checked == 'x':
        continue  # Already closed deferred items — skip
    desc_short = desc.strip()[:70]

    if kind == "date":
        iso_match = ISO_DATE_RE.search(desc)
        if iso_match:
            try:
                trig_date = datetime.strptime(iso_match.group(1), "%Y-%m-%d").date()
                if trig_date <= today:
                    fired_lines.append(f"🔔 NOTE-013 deferred date trigger past due: {desc_short}")
            except ValueError:
                pass
    elif kind == "issue":
        # Check upstream issue state via gh CLI
        issue_match = ISSUE_NUM_RE.search(desc)
        if issue_match:
            issue_num = issue_match.group(1)
            try:
                gh_proc = subprocess.run(
                    ["gh", "issue", "view", issue_num, "--repo", "ForgePlan/forgeplan", "--json", "state"],
                    capture_output=True, text=True, timeout=10,
                )
                gh_data = json.loads(gh_proc.stdout) if gh_proc.stdout else {}
                if gh_data.get("state") == "CLOSED":
                    fired_lines.append(f"🔔 NOTE-013 deferred issue CLOSED — forgeplan#{issue_num}: {desc_short}")
            except Exception:
                pass

if fired_lines:
    for line in fired_lines:
        print(line)
    print("Run /decay-watch for the full report.")

PYEOF

# ─── Layer 3 (Sprint AA / PRD-070 / G8): supersede chain delta scan ──────────
# For each active ADR with a `supersedes` link, verify the body declares a
# Delta-spec block (## Delta-spec heading OR one of the four sub-section
# headings: ### ADDED / ### MODIFIED / ### REMOVED / ### UNCHANGED).
# Cutoff: only count ADRs created on or after the Sprint Z8 effective date
# (2026-05-25). Pre-Z8 supersedes are warned by /decay-watch but not by this
# hook (back-compat: don't spam every SessionStart for historical decisions).
# Filesystem-only — no forgeplan CLI invocation. Budget: <30ms on 50 ADRs.
#
# Sprint BB Wave 1B (EVID-110/111): replaced per-file grep loop (3-4 forks×N
# files → ~430ms at 50 ADRs) with a single awk pass (~10ms at 50 ADRs, ~45×
# faster). Functional equivalence verified against the previous loop on 5
# synthetic cases + real repo. State is reset per file via FNR==1; the
# previous file's state is "flushed" (evaluated and counted) before reset.
LAYER3_COUNT=0
LAYER3_CUTOFF="2026-05-25"
if [ -d ".forgeplan/adrs" ]; then
    # Use a nullglob-style guard so an empty directory doesn't pass the
    # literal pattern through to awk.
    shopt -s nullglob 2>/dev/null || true
    LAYER3_ADR_FILES=(.forgeplan/adrs/*.md)
    if [ ${#LAYER3_ADR_FILES[@]} -gt 0 ]; then
        LAYER3_COUNT=$(awk -v cutoff="$LAYER3_CUTOFF" '
            function flush(   d) {
                # Evaluate the file we just finished. Same predicate order
                # as the previous shell loop: active status → has supersede
                # → on/after cutoff (created or last_modified_at fallback)
                # → no delta-spec section.
                if (FILENAME_PREV == "") return
                if (!status_active) return
                if (!had_supersede) return
                d = (created_date != "" ? created_date : last_modified_date)
                if (d == "") return
                if (d < cutoff) return
                if (had_delta) return
                violations++
            }
            FNR == 1 {
                flush()
                FILENAME_PREV = FILENAME
                status_active = 0
                had_supersede = 0
                had_delta = 0
                created_date = ""
                last_modified_date = ""
            }
            /^status: active$/ { status_active = 1 }
            /^[[:space:]]+relation: supersedes[[:space:]]*$/ { had_supersede = 1 }
            /^## Supersedes/ { had_supersede = 1 }
            /^## Delta-spec/ { had_delta = 1 }
            /^### ADDED/ { had_delta = 1 }
            /^### MODIFIED/ { had_delta = 1 }
            /^### REMOVED/ { had_delta = 1 }
            /^### UNCHANGED/ { had_delta = 1 }
            /^created:/ {
                v = $0
                sub(/^created:[[:space:]]*/, "", v)
                gsub(/["[:space:]]/, "", v)
                # YYYY-MM-DD prefix (split on T for ISO timestamps).
                n = split(v, parts, "T")
                created_date = parts[1]
            }
            /^last_modified_at:/ {
                v = $0
                sub(/^last_modified_at:[[:space:]]*/, "", v)
                gsub(/["[:space:]]/, "", v)
                n = split(v, parts, "T")
                last_modified_date = parts[1]
            }
            END {
                flush()
                print violations + 0
            }
        ' "${LAYER3_ADR_FILES[@]}" 2>/dev/null)
        # Defensive: if awk failed for any reason, fall back to 0 (silent,
        # don't break SessionStart on a parsing edge case).
        [ -z "$LAYER3_COUNT" ] && LAYER3_COUNT=0
    fi
fi

if [ "$LAYER3_COUNT" -gt 0 ]; then
    echo "🔔 $LAYER3_COUNT supersede ADR(s) missing ## Delta-spec section (Sprint Z8 / PRD-058)"
    echo "Run /decay-watch for the full report."
fi

exit 0
