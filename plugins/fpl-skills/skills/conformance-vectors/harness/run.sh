#!/usr/bin/env bash
# Generic conformance run: freeze gate -> conformance + cross-language equivalence -> negative controls.
# Corpus-agnostic: drive ANY frozen corpus + per-language runners (see harness/README.md).
#
# Usage: run.sh <corpus-dir>
#   expects <corpus-dir>/spec/corpus.json  (the frozen oracle)
#           <corpus-dir>/runners.json      (the per-language runner manifest)
#           <corpus-dir>/spec/corpus.sha256 (OPTIONAL freeze pin; if absent, the hash is
#                                            computed + printed so you can record it)
#
# Exit 0 iff freeze + conformance + equivalence all pass AND every negative control goes RED.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
DIR="${1:?usage: run.sh <corpus-dir>}"
CORPUS="$DIR/spec/corpus.json"
RUNNERS="$DIR/runners.json"
PINFILE="$DIR/spec/corpus.sha256"

[ -f "$CORPUS" ]  || { echo "no corpus at $CORPUS"; exit 2; }
[ -f "$RUNNERS" ] || { echo "no runners manifest at $RUNNERS"; exit 2; }

echo "== 1. freeze / hash-pin gate =="
if [ -f "$PINFILE" ]; then
  node "$HERE/verify-freeze.mjs" --corpus "$CORPUS" --pin "$(tr -d '[:space:]' < "$PINFILE")" || { echo "FREEZE MISMATCH -> BLOCKER (oracle drifted)"; exit 2; }
else
  echo "  no pin file ($PINFILE) — COMPUTE mode (record this into the SPEC corpus_sha256):"
  node "$HERE/verify-freeze.mjs" --corpus "$CORPUS"
fi

echo
echo "== 2. conformance + cross-language equivalence =="
node "$HERE/conformance-equiv.mjs" --corpus "$CORPUS" --runners "$RUNNERS" || { echo "CONFORMANCE/EQUIVALENCE FAIL -> BLOCKER"; exit 1; }

echo
echo "== 3. negative control — break each language in turn (each MUST go RED) =="
allbad=0
LANGS=$(node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))).join(' '))" "$RUNNERS")
for L in $LANGS; do
  if node "$HERE/conformance-equiv.mjs" --corpus "$CORPUS" --runners "$RUNNERS" --break "$L" >/dev/null 2>&1; then
    echo "  break $L -> UNEXPECTED PASS (BAD — does the runner honor CONFORMANCE_BREAK?)"; allbad=$((allbad+1))
  else
    echo "  break $L -> correctly RED (GOOD)"
  fi
done

echo
if [ "$allbad" -eq 0 ]; then
  echo "OVERALL: PASS (freeze + conformance + equivalence + negative-controls all green)"
else
  echo "OVERALL: FAIL (a negative control did not go RED — the gate is not load-bearing)"; exit 1
fi
