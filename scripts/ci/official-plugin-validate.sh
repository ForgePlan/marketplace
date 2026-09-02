#!/usr/bin/env bash
# ============================================================================
# official-plugin-validate.sh — run the runtime's OWN validator, not ours
# ============================================================================
# We ship eleven hand-written gates in scripts/ci/. None of them knows the
# plugin-manifest schema; they know what we thought to check. `claude plugin
# validate` ships with the runtime, tracks the schema, and updates when the
# schema does.
#
# It has already earned its place twice:
#   - It found 16 files loading with empty metadata while all eight gates then
#     in place reported ALL PASSED (marketplace#245).
#   - It named `components` as an unknown field, which is how we learned that
#     the manifests carried four fields nobody reads (marketplace#246).
#
# WHAT IT RUNS
# ------------
#   plugins/*/            --strict   Warnings are errors. All 23 pass as of
#                                    marketplace#246; a new unknown field or a
#                                    component file with unparseable frontmatter
#                                    fails the build.
#   .claude-plugin/       (lenient)  The catalog CANNOT be --strict-clean, by
#                                    design: it deliberately carries ForgePlan's
#                                    own install metadata (cost / stability /
#                                    targets / requires / supersedes) that Claude
#                                    Code does not know and ignores at load time.
#                                    Those fields are governed by our schema at
#                                    scripts/ci/schemas/install-manifest.schema.json.
#                                    Running --strict here would demand we delete
#                                    metadata we deliberately keep.
#
# WHEN THE CLI IS ABSENT
# ----------------------
# Skips loudly and exits 0. A developer without the CLI is not blocked, and CI
# without it prints a visible SKIPPED line rather than a silent pass — so the
# difference between "validated" and "did not run" stays readable in the log.
# ============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT" || exit 1

if ! command -v claude >/dev/null 2>&1; then
  echo "official-plugin-validate: SKIPPED — the \`claude\` CLI is not on PATH."
  echo "  This gate runs the runtime's own manifest validator. Without the CLI it"
  echo "  cannot run, and a skip is reported rather than a pass."
  exit 0
fi

echo "official-plugin-validate: using $(claude --version 2>/dev/null || echo 'claude (version unknown)')"

fails=0
checked=0

for dir in plugins/*/; do
  [ -d "$dir" ] || continue
  name="$(basename "$dir")"
  checked=$((checked + 1))
  if out="$(claude plugin validate "$dir" --strict 2>&1)"; then
    continue
  fi
  fails=$((fails + 1))
  echo ""
  echo "FAIL (--strict): $name"
  printf '%s\n' "$out" | sed 's/^/    /'
done

# The catalog runs lenient — see the header for why --strict is unreachable here
# on purpose. A hard failure (malformed JSON, missing required field) still fails.
if ! out="$(claude plugin validate .claude-plugin/marketplace.json 2>&1)"; then
  fails=$((fails + 1))
  echo ""
  echo "FAIL: .claude-plugin/marketplace.json"
  printf '%s\n' "$out" | sed 's/^/    /'
fi

echo ""
if [ "$fails" -ne 0 ]; then
  echo "official-plugin-validate FAILED: $fails of $checked plugin manifest(s) rejected."
  echo ""
  echo "If the finding is an unknown field carrying ForgePlan's own meaning, the fix is to move it"
  echo "to the catalog entry in .claude-plugin/marketplace.json — where our schema governs it —"
  echo "not to add an exemption here. That is what marketplace#246 did with category / requires /"
  echo "supersedes, and it is why plugin manifests can hold --strict at all."
  exit 1
fi

echo "Official validator OK: $checked plugin manifest(s) pass --strict; catalog validated lenient."
