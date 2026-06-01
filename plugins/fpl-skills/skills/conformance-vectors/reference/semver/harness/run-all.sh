#!/usr/bin/env bash
# Deterministic SDD+TDD increment, 4 languages (TS/Py/Go/Rust) against ONE frozen corpus.
# Corpus + SPEC are unchanged from the 2-language run — only the harness/runners grew.
set -u
cd "$(dirname "$0")"

echo "== 0. compile Rust runner (once) =="
if rustc -O ../cli/run_rs.rs -o ../cli/run_rs_bin 2>/tmp/rs.err; then echo "  rust compiled"; else echo "  RUST COMPILE FAILED"; cat /tmp/rs.err; exit 3; fi

echo
echo "== 1. verify-hash (freeze/hash-pin gate) =="
node verify-hash.mjs || { echo "HASH MISMATCH -> BLOCKER"; exit 2; }

echo
echo "== 2. clean equivalence run (4 languages vs frozen corpus) =="
node equiv-check.mjs

echo
echo "== 3. equivalence x10 (plumbing smoke; pure fns are identical by construction) =="
v=""
for i in $(seq 1 10); do node equiv-check.mjs >/dev/null 2>&1 && v="$v PASS" || v="$v FAIL"; done
echo "  10-run:$v"

echo
echo "== 4. negative control — break EACH language in turn (env-injected bug) =="
allbad=0
for L in ts py go rs; do
  if node equiv-check.mjs --break "$L" >/dev/null 2>&1; then echo "  break $L -> UNEXPECTED PASS (BAD)"; allbad=$((allbad+1)); else echo "  break $L -> correctly RED (GOOD)"; fi
done

echo
echo "== SUMMARY =="
if node equiv-check.mjs >/dev/null 2>&1; then clean="PASS"; else clean="FAIL"; fi
echo "  clean 4-lang: $clean"
echo "  10-run:$v"
echo "  negative-controls-all-correct: $([ $allbad -eq 0 ] && echo yes || echo NO)"
[ "$clean" = "PASS" ] && [ $allbad -eq 0 ] && echo "  OVERALL: 4-LANGUAGE EQUIVALENCE PROVEN" || echo "  OVERALL: NOT PROVEN"
