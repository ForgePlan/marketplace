#!/usr/bin/env bash
# One version, everywhere it is stated.
#
# THE DEFECT THIS EXISTS TO CATCH. Three places carried a version and all three disagreed:
# plugin.json 3.2.0, package.json 2.0.0, and the string the MCP server hands the client at
# handshake 3.0.0 — hardcoded, updated by hand only when someone remembered. The gap widened with
# every release, and this plugin's own ARCHITECTURE.md had already recorded the same defect two
# versions earlier without it being fixed.
#
# It matters because the handshake version is the only thing that says WHICH BUNDLE IS LOADED. When
# hooks and tools disagree — a stale binary pinned in a plugin cache, which has happened here — that
# string is the evidence, and a hardcoded one lies exactly when someone needs it.
set -uo pipefail

PLUGIN="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PLUGIN" || exit 1

fails=0
pass() { echo "  ok   $1"; }
fail() { echo "  FAIL $1"; fails=$((fails + 1)); }

echo "version consistency"

CANON="$(python3 -c "import json;print(json.load(open('.claude-plugin/plugin.json'))['version'])")"
if [ -z "$CANON" ]; then
  echo "  FAIL cannot read the version from .claude-plugin/plugin.json"
  exit 1
fi
echo "  canonical (.claude-plugin/plugin.json): $CANON"

PKG="$(python3 -c "import json;print(json.load(open('package.json'))['version'])")"
[ "$PKG" = "$CANON" ] && pass "package.json matches" || fail "package.json is $PKG, expected $CANON"

# The source must not hardcode a version at all — a literal here is the defect, not a mismatch.
if grep -qE 'name: "hindsight-mcp", version: "[0-9]' src/index.ts; then
  fail "src/index.ts hardcodes the server version — it must read it (see src/lib/version.ts)"
else
  pass "src/index.ts does not hardcode the server version"
fi

# What the client actually receives. This is the number that matters, and it is the one that was
# wrong: everything above can agree while the shipped bundle still reports something else.
if [ ! -f dist/index.mjs ]; then
  fail "dist/index.mjs missing — run npm run build"
else
  REPORTED="$(HINDSIGHT_URL=http://127.0.0.1:1 HINDSIGHT_BANK_ID=probe node -e '
    const {spawn}=require("child_process");
    const c=spawn("node",["dist/index.mjs"],{stdio:["pipe","pipe","ignore"],env:process.env});
    let buf="";
    c.stdout.on("data",d=>{buf+=d});
    c.stdin.write(JSON.stringify({jsonrpc:"2.0",id:1,method:"initialize",params:{protocolVersion:"2025-06-18",capabilities:{},clientInfo:{name:"t",version:"0"}}})+"\n");
    setTimeout(()=>{
      const line=buf.split("\n").find(l=>l.includes("serverInfo"));
      try{process.stdout.write(JSON.parse(line).result.serverInfo.version)}catch{process.stdout.write("PARSE-FAILED")}
      c.kill();
    },2500);
  ' 2>/dev/null)"
  if [ "$REPORTED" = "$CANON" ]; then
    pass "the running server reports $REPORTED at handshake"
  else
    fail "the running server reports '$REPORTED', expected $CANON — rebuild, or the source is stale"
  fi
fi

# Negative control: a checker that has only seen a passing tree proves nothing about failing.
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
cp package.json "$tmp/package.json.orig"
python3 -c "
import json,pathlib
p=pathlib.Path('package.json'); d=json.loads(p.read_text())
d['version']='0.0.1-sabotage'
p.write_text(json.dumps(d,indent=2)+chr(10))
"
BAD="$(python3 -c "import json;print(json.load(open('package.json'))['version'])")"
if [ "$BAD" = "$CANON" ]; then
  fail "negative control did not take effect"
elif [ "$BAD" = "0.0.1-sabotage" ]; then
  pass "negative control: a mismatched package.json is detectable"
fi
cp "$tmp/package.json.orig" package.json
RESTORED="$(python3 -c "import json;print(json.load(open('package.json'))['version'])")"
[ "$RESTORED" = "$CANON" ] && pass "restored cleanly" || fail "negative control left package.json at $RESTORED"

echo
if [ "$fails" -eq 0 ]; then
  echo "version consistency OK"
  exit 0
fi
echo "version consistency FAILED: $fails"
exit 1
