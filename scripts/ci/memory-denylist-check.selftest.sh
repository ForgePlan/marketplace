#!/usr/bin/env bash
# Does memory-denylist-check actually fail when it should?
#
# A gate that has only ever been run against a passing tree proves nothing about whether it CAN
# fail. This repository has shipped gates that reported "passed" while asserting nothing; the cure
# is a control that breaks the property on a COPY and requires the checker to notice.
#
# WHY THIS FILE WAS REWRITTEN. Its first version had four cases and every fixture was generated with
# ONE hard-coded prefix. So it could not tell a both-prefix denylist from a single-prefix one — the
# exact property the gate exists to enforce — and it passed while the gate implemented the opposite
# of the rule it was written for. A negative control that does not test the DECIDING property
# constrains nothing (EVID-257 F2). Case 5 below is that missing control.
#
# Sixteen cases: ten must-fire, three must-refuse (rules it cannot trust), three must-NOT-fire
# (legitimate shapes that would be false positives if the checker were too eager). The count is
# stated here and printed at the end; if those two disagree, the summary is lying about its own work.
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

write_agent() {  # $1 = filename, $2 = denylist entries, $3 = field name (default disallowedTools)
  local key="${3:-disallowedTools}"
  {
    echo "---"
    echo "name: probe"
    echo "description: probe agent"
    echo "${key}: Write, Edit, $2"
    echo "---"
    echo
    echo "# probe"
  } > "$work/plugins/probe/agents/$1"
}

# $1 = "both" | "plugin" | "manual"
deny_set() {
  python3 - "$work/plugins/fpl-hsmem/src/lib/tool-names.ts" "$1" <<'PY'
import re, sys
src = open(sys.argv[1], encoding="utf-8").read()
block = re.search(r"export const MEMORY_WRITE_TOOLS = \[(.*?)\] as const;", src, re.S).group(1)
names = re.findall(r'"([a-z0-9_]+)"', block)
which = sys.argv[2]
prefixes = {"both": ["mcp__hindsight__", "mcp__plugin_fpl-hsmem_hindsight__"],
            "plugin": ["mcp__plugin_fpl-hsmem_hindsight__"],
            "manual": ["mcp__hindsight__"]}[which]
print(", ".join(p + n for n in names for p in prefixes))
PY
}

BOTH="$(deny_set both)"
PLUGIN_ONLY="$(deny_set plugin)"
MANUAL_ONLY="$(deny_set manual)"

# 1. must-NOT-fire — a complete denylist naming both spellings is the healthy shape.
write_agent "complete.md" "$BOTH"
if node "$work/scripts/ci/memory-denylist-check.js" >/dev/null 2>&1; then
  pass "must-NOT-fire  a complete both-prefix denylist passes"
else
  fail "a complete denylist was rejected — false positive"
fi

# 2. must-fire — drop exactly ONE required entry. This is the defect the gate exists for.
write_agent "complete.md" "${BOTH%,*}"   # strip the last entry
if node "$work/scripts/ci/memory-denylist-check.js" >/dev/null 2>&1; then
  fail "gate PASSED with a required tool missing — it is not checking anything"
else
  pass "must-fire      one missing write tool is caught"
fi

# 3. must-NOT-fire — an agent with no memory restriction at all is out of scope, deliberately.
#    Flagging it would turn this gate into a different, unstated policy.
write_agent "complete.md" "$BOTH"
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

# 5. must-fire ×2 — THE DECIDING PROPERTY. A denylist matches an exact string, so naming only one
#    spelling denies nothing under the other wiring. Both single-prefix shapes must be caught, and
#    the check runs in BOTH directions so a gate hard-coded to one prefix cannot pass this case.
write_agent "complete.md" "$PLUGIN_ONLY"
if node "$work/scripts/ci/memory-denylist-check.js" >/dev/null 2>&1; then
  fail "gate PASSED on a plugin-prefix-only denylist — it denies nothing under .mcp.json wiring"
else
  pass "must-fire      plugin-prefix-only denylist is caught"
fi
write_agent "complete.md" "$MANUAL_ONLY"
if node "$work/scripts/ci/memory-denylist-check.js" >/dev/null 2>&1; then
  fail "gate PASSED on a manual-prefix-only denylist — it denies nothing under a plugin install"
else
  pass "must-fire      manual-prefix-only denylist is caught"
fi

# 6. must-fire — the SKILL spelling of the key. `disallowed-tools` on a subagent restricts nothing
#    and would silently drop the agent out of scope; a repo-wide rename would leave CI green with
#    zero agents checked.
write_agent "complete.md" "$BOTH"
write_agent "kebab.md" "$BOTH" "disallowed-tools"
if node "$work/scripts/ci/memory-denylist-check.js" >/dev/null 2>&1; then
  fail "gate PASSED on an agent whose restricting key is the skill spelling — silent scope loss"
else
  pass "must-fire      the skill spelling of the key is caught, not skipped"
fi
rm -f "$work/plugins/probe/agents/kebab.md"

# 7. must-refuse — scanned > 0, required > 0, but NOTHING in scope. The gate examined nothing and
#    must say so rather than print a success sentence about zero agents.
rm -f "$work/plugins/probe/agents/complete.md"
write_agent "nobody.md" "Bash"
if node "$work/scripts/ci/memory-denylist-check.js" >/dev/null 2>&1; then
  fail "gate PASSED with ZERO agents in scope — a success message about nothing"
else
  pass "must-refuse    zero in-scope agents is refused, not reported as a pass"
fi
rm -f "$work/plugins/probe/agents/nobody.md"

# 8. prefix symmetry OUTSIDE the completeness scope — the case the old gate could not see at all.
#    An agent that legitimately retains (so it never enters scope) but denies some destructive tool
#    must still name both spellings. `fpl-hsmem`'s own memory-curator is exactly this shape, and
#    before this check nothing in the repository watched the file with the most bank-write authority
#    in it (EVID-257 F3).
write_agent "complete.md" "$BOTH"
write_agent "curator.md" "mcp__plugin_fpl-hsmem_hindsight__document_delete, mcp__hindsight__document_delete"
if node "$work/scripts/ci/memory-denylist-check.js" >/dev/null 2>&1; then
  pass "must-NOT-fire  an out-of-scope agent denying one tool under BOTH spellings passes"
else
  fail "a symmetric partial denial was flagged — false positive on a legitimate shape"
fi
write_agent "curator.md" "mcp__plugin_fpl-hsmem_hindsight__document_delete"
if node "$work/scripts/ci/memory-denylist-check.js" >/dev/null 2>&1; then
  fail "gate PASSED on a half-written denial outside the completeness scope — nothing watches it"
else
  pass "must-fire      a one-spelling denial outside the completeness scope is caught"
fi
rm -f "$work/plugins/probe/agents/curator.md"

# 9. must-fire — shrinking the registry makes this gate GREENER, never redder. The pinned count is
#    the only thing that turns a silent shrink into a deliberate two-file edit.
write_agent "complete.md" "$BOTH"
python3 - "$work/plugins/fpl-hsmem/src/lib/tool-names.ts" <<'PY'
import re, sys
p = sys.argv[1]
src = open(p, encoding="utf-8").read()
block = re.search(r"export const MEMORY_WRITE_TOOLS = \[(.*?)\] as const;", src, re.S)
names = re.findall(r'"([a-z0-9_]+)"', block.group(1))[:-1]          # drop one
body = ",\n  ".join('"%s"' % n for n in names)
src = src[:block.start()] + "export const MEMORY_WRITE_TOOLS = [\n  %s,\n] as const;" % body + src[block.end():]
open(p, "w", encoding="utf-8").write(src)
PY
if node "$work/scripts/ci/memory-denylist-check.js" >/dev/null 2>&1; then
  fail "gate PASSED on a SHRUNK registry — the one edit the control can never catch"
else
  pass "must-fire      a shrunk registry is refused by the pinned count"
fi
cp "$work/registry.bak" "$work/plugins/fpl-hsmem/src/lib/tool-names.ts"

# 10. must-refuse — a shrink that HIDES behind an unchanged count. Deleting a line is caught by the
#     pin; substituting a duplicate keeps the count at 12 and silently stops requiring the tool that
#     was replaced. The first version of the pin caught only the first shape (EVID-258 N1).
write_agent "complete.md" "$BOTH"
python3 - "$work/plugins/fpl-hsmem/src/lib/tool-names.ts" <<'PY'
import re, sys
p = sys.argv[1]
src = open(p, encoding="utf-8").read()
block = re.search(r"export const MEMORY_WRITE_TOOLS = \[(.*?)\] as const;", src, re.S)
names = re.findall(r'"([a-z0-9_]+)"', block.group(1))
names[-1] = names[0]                                   # same count, one tool no longer required
body = ",\n  ".join('"%s"' % n for n in names)
open(p, "w", encoding="utf-8").write(
    src[:block.start()] + "export const MEMORY_WRITE_TOOLS = [\n  %s,\n] as const;" % body + src[block.end():])
PY
if node "$work/scripts/ci/memory-denylist-check.js" >/dev/null 2>&1; then
  fail "gate PASSED on a duplicate-substituted registry — the count pin can be walked around"
else
  pass "must-refuse    a duplicate hiding a shrink is refused, not counted as 12"
fi
cp "$work/registry.bak" "$work/plugins/fpl-hsmem/src/lib/tool-names.ts"

# 11. must-fire — a complete denylist written as a valid YAML list at COLUMN 0. The earlier parser
#     required indentation and treated a non-indented line as the end of the block, so this shape
#     parsed as empty and the agent left scope in silence, complete or not (EVID-258 N2a).
write_agent "complete.md" "$BOTH"
{
  echo "---"
  echo "name: col0"
  echo "description: column-zero list"
  echo "disallowedTools:"
  echo "- mcp__hindsight__memory_retain"
  echo "- mcp__plugin_fpl-hsmem_hindsight__memory_retain"
  echo "---"
  echo
  echo "# col0"
} > "$work/plugins/probe/agents/col0.md"
if node "$work/scripts/ci/memory-denylist-check.js" >/dev/null 2>&1; then
  fail "gate PASSED over a column-0 denylist missing 11 tools — the agent was silently skipped"
else
  pass "must-fire      a column-0 YAML list is read, not silently skipped"
fi
rm -f "$work/plugins/probe/agents/col0.md"

# 12. must-fire — one stray blank line before `---` made the file frontmatter-less and dropped the
#     agent out of scope with no output at all (EVID-258 N2b).
write_agent "complete.md" "$BOTH"
{
  echo ""
  echo "---"
  echo "name: blankfirst"
  echo "description: leading blank line"
  echo "disallowedTools: mcp__hindsight__memory_retain, mcp__plugin_fpl-hsmem_hindsight__memory_retain"
  echo "---"
  echo
  echo "# blankfirst"
} > "$work/plugins/probe/agents/blankfirst.md"
if node "$work/scripts/ci/memory-denylist-check.js" >/dev/null 2>&1; then
  fail "gate PASSED over a file whose --- is not at byte 0 — scope silently reduced"
else
  pass "must-fire      a leading blank line no longer hides an agent from the gate"
fi
rm -f "$work/plugins/probe/agents/blankfirst.md"

# 13. must-fire — denials written under a THIRD server name bind under no wiring this repository
#     ships. The earlier tally counted such an agent inside a sentence promising both known
#     spellings, so the summary line asserted more than the code checked (EVID-258 N3).
write_agent "complete.md" "$BOTH"
write_agent "third.md" "mcp__hs__document_delete, mcp__hs__memory_retain"
if node "$work/scripts/ci/memory-denylist-check.js" >/dev/null 2>&1; then
  fail "gate PASSED counting an unknown-prefix agent as compliant — the summary line can lie"
else
  pass "must-fire      an unknown relay prefix is reported, not counted as compliant"
fi
rm -f "$work/plugins/probe/agents/third.md"

# 14. must-fire, and it checks the REPORT rather than the verdict — two unrelated defects at once
#     must both be named. Reporting only the first made an operator find the second on the next run
#     (EVID-258 N6).
write_agent "complete.md" "${BOTH%,*}"                                  # incomplete
write_agent "half.md" "mcp__plugin_fpl-hsmem_hindsight__memory_retain"  # asymmetric
out="$(node "$work/scripts/ci/memory-denylist-check.js" 2>&1 || true)"
if grep -q "ONE relay spelling only" <<<"$out" && grep -q "does not mention" <<<"$out"; then
  pass "must-fire      both failure classes are reported in one run, not one per round-trip"
else
  fail "only one failure class was reported — the gate understates its own work"
fi
rm -f "$work/plugins/probe/agents/half.md"

echo
if [ "$fails" -eq 0 ]; then
  echo "self-test OK: 16 cases (10 must-fire, 3 must-refuse, 3 must-NOT-fire)"
  exit 0
fi
echo "self-test FAILED: $fails"
exit 1
