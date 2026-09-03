#!/usr/bin/env bash
# ===========================================================================
# field-map.sh — dump the Orchestra field and option UID map
# ===========================================================================
# Every write to Orchestra needs field UIDs and, for option fields, OPTION
# UIDs. They are per-workspace and must never be hardcoded. Sending an option
# NAME where a UID is required fails silently into failedFields for custom
# fields, and succeeds by coincidence for Status/Priority/Tags — which makes a
# name-based implementation look half-working rather than broken.
#
# This script exists because that resolution is otherwise re-derived by hand
# every session.
#
# Usage:
#   ./field-map.sh <workspace-uid> [task|project]
#   ./field-map.sh <workspace-uid> task --json     # raw, for piping
#
# Requires: curl, python3. Orchestra desktop app running.
# ENDPOINT — the default is the Orchestra desktop app on this machine.
#
#   ORCH_MCP_URL=https://orchestra.example.com/mcp ./field-map.sh
#
# The address is NOT hardcoded: `http://localhost:28173/mcp` is only the fallback, used when
# ORCH_MCP_URL is unset. Point it anywhere your Orchestra MCP server actually listens.
# ===========================================================================
set -euo pipefail

URL="${ORCH_MCP_URL:-http://localhost:28173/mcp}"
WS="${1:-}"
TARGET="${2:-task}"
RAW="${3:-}"

if [ -z "$WS" ]; then
  echo "usage: $0 <workspace-uid> [task|project] [--json]" >&2
  echo "  find the workspace uid with the get_current_context tool" >&2
  exit 64
fi

HDR="$(mktemp)"; trap 'rm -f "$HDR"' EXIT

# --- handshake: streamable-http needs an initialize + a session id ---------
curl -sS -D "$HDR" -o /dev/null -m 10 "$URL" -X POST \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{
        "protocolVersion":"2025-03-26","capabilities":{},
        "clientInfo":{"name":"field-map","version":"1.0"}}}' \
  || { echo "cannot reach $URL — is the Orchestra app running?" >&2; exit 69; }

# `|| true` is load-bearing: under `set -euo pipefail` a grep that matches nothing kills the
# pipeline, the assignment never happens, and the script exits 1 before the message below can
# print. The check on the next line was unreachable without it.
SID="$(grep -i '^mcp-session-id:' "$HDR" | tr -d '\r' | cut -d' ' -f2 || true)"
[ -n "$SID" ] || { echo "no session id returned by $URL" >&2; exit 69; }

curl -sS -m 10 "$URL" -X POST \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H "Mcp-Session-Id: $SID" \
  -d '{"jsonrpc":"2.0","method":"notifications/initialized"}' >/dev/null

# --- the actual call -------------------------------------------------------
RESP="$(curl -sS -m 30 "$URL" -X POST \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H "Mcp-Session-Id: $SID" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":
       {\"name\":\"list_fields\",\"arguments\":
        {\"contextUid\":\"$WS\",\"targetType\":\"$TARGET\"}}}")"

BODY="$(mktemp)"; trap 'rm -f "$HDR" "$BODY"' EXIT
printf '%s' "$RESP" > "$BODY"

python3 - "$BODY" "$RAW" <<'PY'
import sys, json

body = open(sys.argv[1], encoding="utf-8").read()
raw_flag = sys.argv[2] if len(sys.argv) > 2 else ""

# streamable-http may answer as SSE; take the first data: line if so
if body.lstrip().startswith("event:") or "\ndata:" in body:
    for line in body.splitlines():
        if line.startswith("data:"):
            body = line[5:].strip()
            break

try:
    env = json.loads(body)
except json.JSONDecodeError:
    sys.exit("unparseable response:\n" + body[:400])

if env.get("result", {}).get("isError"):
    sys.exit("server error: " + json.dumps(env["result"], ensure_ascii=False)[:400])

blocks = env.get("result", {}).get("content", [])
text = next((b["text"] for b in blocks if b.get("type") == "text"), None)
if text is None:
    sys.exit("no text content in response")

fields = json.loads(text)

if raw_flag == "--json":
    print(json.dumps(fields, ensure_ascii=False, indent=2))
    sys.exit(0)

custom = [f for f in fields if not f.get("isSystem")]
system = [f for f in fields if f.get("isSystem")]

def show(group, label):
    if not group:
        return
    print(f"\n=== {label} ===")
    for f in sorted(group, key=lambda x: x.get("name", "")):
        multi = " multi" if f.get("isMulti") else ""
        ro = " read-only" if f.get("isReadOnly") else ""
        print(f"  {f['name']:<14} {f['uid']:<24} {f.get('dataType','')}{multi}{ro}")
        for o in f.get("options", []):
            print(f"      {o['name']:<12} {o['uid']}")

show(custom, "custom — writable")
show(system, "system — do NOT write Assignee, Members, Owner, or any counter")

print(f"\n{len(custom)} custom, {len(system)} system.")
print("Option fields take the OPTION uid as a value, never the option name.")
PY
