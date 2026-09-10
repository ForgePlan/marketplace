#!/usr/bin/env bash
# Does memory-denylist-check actually fail when it should?
#
# A gate that has only ever been run against a passing tree proves nothing about whether it CAN
# fail. This repository has shipped gates that reported "passed" while asserting nothing; the cure
# is a control that breaks the property on a COPY and requires the checker to notice.
#
# Four cases: one must-fire, one must-refuse (a rule it cannot load), and two must-NOT-fire
# (legitimate shapes that would be false positives if the checker were too eager).
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GATE="$REPO_ROOT/scripts/ci/memory-denylist-check.js"

fails=0
pass() { echo "  ok   $1"; }
fail() { echo "  FAIL $1"; fails=$((fails + 1)); }

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# Build a miniature repo the gate can walk: it resolves everything from its own location, so the
# copy has to carry the script, the registry it reads, and an agents tree.
mkdir -p "$work/scripts/ci" "$work/plugins/fpl-hsmem/src/lib" "$work/plugins/probe/agents"
cp "$GATE" "$work/scripts/ci/"
cp "$REPO_ROOT/plugins/fpl-hsmem/src/lib/tool-names.ts" "$work/plugins/fpl-hsmem/src/lib/"

write_agent() {  # $1 = filename, $2 = extra denylist entries (comma-separated, may be empty)
  local extra="$2"
  {
    echo "---"
    echo "name: probe"
    echo "description: probe agent"
    echo "disallowedTools: Write, Edit, ${extra}"
    echo "---"
    echo
    echo "# probe"
  } > "$work/plugins/probe/agents/$1"
}

full_deny() {
  python3 - "$work/plugins/fpl-hsmem/src/lib/tool-names.ts" <<'PY'
import re, sys
src = open(sys.argv[1], encoding="utf-8").read()
block = re.search(r"export const MEMORY_WRITE_TOOLS = \[(.*?)\] as const;", src, re.S).group(1)
print(", ".join("mcp__plugin_fpl-hsmem_hindsight__" + n for n in re.findall(r'"([a-z0-9_]+)"', block)))
PY
}

ALL="$(full_deny)"

# 1. must-NOT-fire — a complete denylist is the healthy shape.
write_agent "complete.md" "$ALL"
if node "$work/scripts/ci/memory-denylist-check.js" >/dev/null 2>&1; then
  pass "must-NOT-fire  a complete denylist passes"
else
  fail "a complete denylist was rejected — false positive"
fi

# 2. must-fire — drop exactly ONE required tool. This is the defect the gate exists for.
write_agent "complete.md" "${ALL%,*}"   # strip the last entry
if node "$work/scripts/ci/memory-denylist-check.js" >/dev/null 2>&1; then
  fail "gate PASSED with a required tool missing — it is not checking anything"
else
  pass "must-fire      one missing write tool is caught"
fi

# 3. must-NOT-fire — an agent with no memory restriction at all is out of scope, deliberately.
#    Flagging it would turn this gate into a different, unstated policy.
write_agent "complete.md" "$ALL"
write_agent "unrestricted.md" "Bash"
if node "$work/scripts/ci/memory-denylist-check.js" >/dev/null 2>&1; then
  pass "must-NOT-fire  an agent with no memory denial is out of scope"
else
  fail "an unrestricted agent was flagged — scope creep"
fi
rm -f "$work/plugins/probe/agents/unrestricted.md"

# 4. must-refuse — an empty rule would make every agent pass. Refusing beats a vacuous green.
cp "$work/plugins/fpl-hsmem/src/lib/tool-names.ts" "$work/registry.bak"
python3 - "$work/plugins/fpl-hsmem/src/lib/tool-names.ts" <<'PY'
import re, sys
p = sys.argv[1]
src = open(p, encoding="utf-8").read()
src = re.sub(r"export const MEMORY_WRITE_TOOLS = \[.*?\] as const;",
             "export const MEMORY_WRITE_TOOLS = [] as const;", src, flags=re.S)
open(p, "w", encoding="utf-8").write(src)
PY
if node "$work/scripts/ci/memory-denylist-check.js" >/dev/null 2>&1; then
  fail "gate PASSED on an EMPTY required set — every agent would pass forever"
else
  pass "must-refuse    an empty rule is refused, not reported as a pass"
fi
cp "$work/registry.bak" "$work/plugins/fpl-hsmem/src/lib/tool-names.ts"

echo
if [ "$fails" -eq 0 ]; then
  echo "self-test OK: 4 cases (1 must-fire, 1 must-refuse, 2 must-NOT-fire)"
  exit 0
fi
echo "self-test FAILED: $fails"
exit 1
