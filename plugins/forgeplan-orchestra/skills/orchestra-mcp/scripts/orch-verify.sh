#!/usr/bin/env bash
# ===========================================================================
# orch-verify.sh — deterministic Orchestra server resolution + write handshake
# ===========================================================================
# One command replaces the prose: it finds the project's orchestra.json pin
# file, resolves the requested role to a server, performs the MCP handshake,
# and compares the server's live get_current_context against the pinned
# workspace and user. Agents run this BEFORE the first write and stop on any
# non-zero exit. No judgement calls, no name-guessing.
#
# Usage:
#   ./orch-verify.sh [role] [--runtime claude-code|omp|codex|gemini] [--json]
#   ./orch-verify.sh --config /path/to/orchestra.json [role]
#
# Config discovery (first hit wins), walking UP from the current directory:
#   <dir>/docs/agents/orchestra.json  <- canonical: project configuration, runtime-neutral
#   <dir>/.agents/orchestra.json      <- legacy; .agents/ is the runtime SKILL surface
#   <dir>/.claude/orchestra.json      <- legacy / Claude-specific fallback
# The two legacy paths still work and print a one-line deprecation notice on stderr.
#
# Exit codes:
#   0   resolved + workspace and user MATCH — safe to write
#   65  MISMATCH — the server answers as a different space/user; DO NOT WRITE
#   66  no orchestra.json found (single-server fallback applies; see docs)
#   69  server unreachable / handshake failed
#   75  server reachable but NOT READY — its workspace data is still loading. Every
#       tool refuses while this holds. Observed to persist >10 min and clear only
#       once a human opened that workspace in the app: surface it, do not spin.
#   78  config invalid, role missing, or the token env var is not set
#
# Schema v2 (per role): url (required), auth ("bearer"|"none"), tokenEnv,
# names {runtime -> registered server name}, spaceUid, spaceName, userUid.
# v1's `mcp` key is honoured as an alias for names["claude-code"].
# ===========================================================================
set -euo pipefail

ROLE="default"; RUNTIME="claude-code"; JSON=0; CONFIG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --json) JSON=1 ;;
    --runtime) RUNTIME="${2:?--runtime needs a value}"; shift ;;
    --config) CONFIG="${2:?--config needs a path}"; shift ;;
    -h|--help) sed -n '2,30p' "$0"; exit 0 ;;
    *) ROLE="$1" ;;
  esac
  shift
done

if [ -z "$CONFIG" ]; then
  DIR="$PWD"
  while :; do
    # Canonical first. The two legacy paths keep working so an existing project does not
    # break on upgrade — but they are announced, so the drift does not stay invisible.
    for cand in "$DIR/docs/agents/orchestra.json" "$DIR/.agents/orchestra.json" "$DIR/.claude/orchestra.json"; do
      if [ -f "$cand" ]; then CONFIG="$cand"; break 2; fi
    done
    [ "$DIR" = "/" ] && break
    DIR="$(dirname "$DIR")"
  done
fi
if [ -z "$CONFIG" ]; then
  echo "orch-verify: no orchestra.json found (searched docs/agents/, .agents/ and .claude/ up from $PWD)" >&2
  echo "orch-verify: fallback rule — exactly ONE connected Orchestra server may be used; several => ask the user" >&2
  exit 66
fi

# Deprecation notice goes to stderr only, so --json stdout stays machine-parseable.
case "$CONFIG" in
  */.agents/orchestra.json|*/.claude/orchestra.json)
    echo "orch-verify: NOTE — reading a legacy pin path ($CONFIG)." >&2
    echo "orch-verify:   Move it to docs/agents/orchestra.json, beside docs/agents/issue-tracker.md." >&2
    echo "orch-verify:   .agents/ is the runtime skill surface; project configuration does not belong there." >&2
    ;;
esac

export ORCH_VERIFY_CONFIG="$CONFIG" ORCH_VERIFY_ROLE="$ROLE" ORCH_VERIFY_RUNTIME="$RUNTIME" ORCH_VERIFY_JSON="$JSON"
exec python3 - <<'PY'
import json, os, sys, urllib.request

cfg_path = os.environ["ORCH_VERIFY_CONFIG"]
role     = os.environ["ORCH_VERIFY_ROLE"]
runtime  = os.environ["ORCH_VERIFY_RUNTIME"]
as_json  = os.environ["ORCH_VERIFY_JSON"] == "1"

def die(code, **fields):
    if as_json:
        print(json.dumps(fields, ensure_ascii=False))
    else:
        for k, v in fields.items():
            print(f"{k}: {v}", file=(sys.stderr if code else sys.stdout))
    sys.exit(code)

try:
    cfg = json.load(open(cfg_path))
except Exception as e:
    die(78, verdict="CONFIG_INVALID", config=cfg_path, error=f"{type(e).__name__}: {e}")

servers = cfg.get("servers") or {}
if role not in servers:
    die(78, verdict="ROLE_MISSING", config=cfg_path, role=role, available=", ".join(sorted(servers)))
s = servers[role]

url = s.get("url")
if not url:
    die(78, verdict="CONFIG_INVALID", config=cfg_path, role=role,
        error="server entry has no `url` — schema v2 requires it (v1 files: add the url from .mcp.json)")

names = dict(s.get("names") or {})
if "mcp" in s and "claude-code" not in names:      # v1 compatibility
    names["claude-code"] = s["mcp"]
mcp_name = names.get(runtime)

headers = {"Content-Type": "application/json", "Accept": "application/json, text/event-stream"}
if (s.get("auth") or ("bearer" if s.get("tokenEnv") else "none")) == "bearer":
    env = s.get("tokenEnv")
    tok = os.environ.get(env or "", "")
    if not tok:
        die(78, verdict="TOKEN_MISSING", config=cfg_path, role=role,
            error=f"auth is bearer but ${env or '<tokenEnv unset>'} is empty — export it (see .claude/settings.local.json env)")
    headers["Authorization"] = f"Bearer {tok}"

def rpc(payload, session=None, notify=False):
    h = dict(headers)
    if session: h["Mcp-Session-Id"] = session
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=h, method="POST")
    with urllib.request.urlopen(req, timeout=15) as r:
        sid = r.headers.get("Mcp-Session-Id")
        body = r.read().decode()
    if notify or not body.strip():
        return sid, None
    if body.lstrip().startswith(("event:", "data:")):
        body = "".join(l[5:].strip() for l in body.splitlines() if l.startswith("data:"))
    return sid, json.loads(body)

try:
    sid, init = rpc({"jsonrpc": "2.0", "id": 1, "method": "initialize",
                     "params": {"protocolVersion": "2025-06-18", "capabilities": {},
                                "clientInfo": {"name": "orch-verify", "version": "1.0"}}})
    rpc({"jsonrpc": "2.0", "method": "notifications/initialized"}, session=sid, notify=True)
    _, res = rpc({"jsonrpc": "2.0", "id": 2, "method": "tools/call",
                  "params": {"name": "get_current_context", "arguments": {}}}, session=sid)
except Exception as e:
    die(69, verdict="UNREACHABLE", url=url, error=f"{type(e).__name__}: {e}")

server_info = ((init or {}).get("result") or {}).get("serverInfo") or {}
raw = ""
try:
    raw = res["result"]["content"][0]["text"]
except Exception:
    die(69, verdict="UNREACHABLE", url=url, error=f"get_current_context returned no content: {str(res)[:200]}")

# The server answers every tool with this while its workspace data loads. It is reachable and
# correctly configured — just not usable yet — so it is neither UNREACHABLE nor a MISMATCH.
if "still loading" in raw:
    die(75, verdict="NOT_READY", url=url,
        serverName=server_info.get("name"), serverVersion=server_info.get("version"),
        error=raw.strip()[:300],
        hint="Every tool refuses while this holds, and it has been seen to persist >10 min. "
             "Ask the human to open this workspace in the Orchestra app; do not spin on retries.")

try:
    ctx = json.loads(raw)
except Exception:
    die(69, verdict="UNREACHABLE", url=url, error=f"get_current_context returned no parseable context: {raw[:200]}")

pin_space, pin_user = s.get("spaceUid"), s.get("userUid")
space_ok = (not pin_space) or ctx.get("spaceUid") == pin_space
user_ok  = (not pin_user)  or ctx.get("userUid")  == pin_user

out = {
    "verdict": "MATCH" if (space_ok and user_ok) else "MISMATCH",
    "config": cfg_path, "role": role, "url": url,
    "serverName": server_info.get("name"), "serverVersion": server_info.get("version"),
    "endpointVariant": s.get("endpointVariant"),
    "mcpName": mcp_name, "runtime": runtime,
    "toolPrefixHint": (f"mcp__{mcp_name}__<tool>" if mcp_name else "resolve by tool signature — no name pinned for this runtime"),
    "pinnedSpace": f"{s.get('spaceName') or ''} ({pin_space})".strip(), "liveSpace": f"{ctx.get('spaceName')} ({ctx.get('spaceUid')})",
    "pinnedUser": pin_user, "liveUser": f"{ctx.get('userName')} ({ctx.get('userUid')})",
    "chatWriting": bool(cfg.get("chatWriting", False)),
}
if as_json:
    print(json.dumps(out, ensure_ascii=False, indent=2))
else:
    width = max(len(k) for k in out)
    for k, v in out.items():
        print(f"{k.ljust(width)}  {v}")
if not (space_ok and user_ok):
    print("\norch-verify: MISMATCH — the server answers as a different workspace/user. DO NOT WRITE.", file=sys.stderr)
    print("orch-verify: fix the config, switch_workspace (agent endpoint), or ask the user. Never retarget silently.", file=sys.stderr)
    sys.exit(65)
PY
