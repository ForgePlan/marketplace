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

# Pull active ADRs (JSON output piped through python for date parsing)
ACTIVE_ADRS=$(forgeplan list --kind adr --status active --output json 2>/dev/null) || exit 0

# Parse + check using python (POSIX-safe, no jq dependency)
python3 - "$ACTIVE_ADRS" <<'PYEOF' 2>/dev/null || exit 0
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

exit 0
