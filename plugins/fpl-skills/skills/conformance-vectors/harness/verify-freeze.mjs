// Generic freeze / hash-pin gate (corpus-agnostic).
//
// With --pin <sha256>:  exit 0 iff sha256(corpus) === pin (VERIFY mode — the freeze gate).
//                       A mismatch means the frozen oracle drifted -> BLOCKER.
// Without --pin:        print the sha256 (COMPUTE mode — capture it into the SPEC's
//                       `## Conformance Vectors` -> `corpus_sha256:` pin, and/or a
//                       `spec/corpus.sha256` sidecar that run.sh reads).
//
// This is the abort-on-oracle-edit guarantee: an implementer who edits corpus.json to make
// a test pass changes its hash, and the freeze gate fails (ADR-008 read-only-oracle invariant).
//
// Usage: node verify-freeze.mjs --corpus <corpus.json> [--pin <sha256>]
import { createHash } from "node:crypto";
import * as fs from "node:fs";

function arg(name, fb = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fb;
}

const corpusPath = arg("--corpus");
const pin = arg("--pin");
if (!corpusPath) {
  console.error("usage: verify-freeze.mjs --corpus <corpus.json> [--pin <sha256>]");
  process.exit(2);
}

const buf = fs.readFileSync(corpusPath);
const sha = createHash("sha256").update(buf).digest("hex");

if (pin == null) {
  console.log(JSON.stringify({ corpus: corpusPath, sha256: sha, mode: "compute" }));
  process.exit(0);
}

const ok = sha === pin;
console.log(JSON.stringify({ corpus: corpusPath, pinned: pin, actual: sha, frozen_match: ok }));
process.exit(ok ? 0 : 1);
