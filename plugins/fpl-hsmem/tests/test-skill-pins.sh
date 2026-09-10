#!/usr/bin/env bash
# Every skill's allowed-tools must match what the generator produces from its bare tool list.
#
# The failure this guards against is silent: a pin naming a tool the runtime does not have is not
# an error, it is a withheld tool. All five original skills pinned `mcp__hindsight__*`, which binds
# only in a project that hand-wires that server name — so a plugin install denied every skill its
# tools and nothing anywhere said so.
set -uo pipefail

PLUGIN="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PLUGIN" || exit 1

fails=0
pass() { echo "  ok   $1"; }
fail() { echo "  FAIL $1"; fails=$((fails + 1)); }

echo "skill pins"

# 1. The generator agrees with what is on disk.
if node scripts/gen-skill-pins.mjs --check >/dev/null 2>&1; then
  pass "allowed-tools matches the generated form in every skill"
else
  fail "a skill's allowed-tools has drifted — run: node scripts/gen-skill-pins.mjs"
  node scripts/gen-skill-pins.mjs --check 2>&1 | sed 's/^/       /'
fi

# 2. Negative control. A test that only ever runs the happy path proves nothing about whether the
#    check CAN fail, so break a pin on a copy and require the checker to notice.
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
cp -R "$PLUGIN/skills" "$tmp/skills-backup"
victim="$PLUGIN/skills/status/SKILL.md"
cp "$victim" "$tmp/victim.orig"
# Drop the plugin-install prefix — precisely the defect this exists to catch.
sed 's/, mcp__plugin_fpl-hsmem_hindsight__memory_status//' "$tmp/victim.orig" > "$victim"
if node scripts/gen-skill-pins.mjs --check >/dev/null 2>&1; then
  fail "checker PASSED on a skill missing the plugin-install prefix — it is not checking anything"
else
  pass "checker fails when a plugin-install prefix is dropped"
fi
cp "$tmp/victim.orig" "$victim"

# 3. And it is clean again after restoring, so the negative control left nothing behind.
if node scripts/gen-skill-pins.mjs --check >/dev/null 2>&1; then
  pass "restored cleanly after the negative control"
else
  fail "the negative control left the tree dirty"
fi

# 4. Every skill names at least one tool, and every named tool exists. The generator enforces this,
#    but assert it here too: a generator that silently produced empty pins would pass check mode.
missing=0
for f in skills/*/SKILL.md; do
  if ! grep -q '^hindsight-tools: \[[a-z]' "$f"; then
    fail "$(basename "$(dirname "$f")"): no non-empty hindsight-tools list"
    missing=$((missing + 1))
  fi
done
[ "$missing" -eq 0 ] && pass "all $(ls -d skills/*/ | wc -l | tr -d ' ') skills declare a non-empty tool list"

echo
if [ "$fails" -eq 0 ]; then
  echo "skill pins OK"
  exit 0
fi
echo "skill pins FAILED: $fails"
exit 1
