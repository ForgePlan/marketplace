// Per-language conformance ADAPTER (F2: the adapter, not an LLM, is the sole test runner).
// Loads the read-only frozen corpus, drives the pure impl, emits a JSON result.
import { semverCompare } from "../impl/ts/semver.ts";
import * as fs from "node:fs";
import * as path from "node:path";

const corpusPath = path.join(import.meta.dirname, "..", "spec", "corpus.json");
const corpus = JSON.parse(fs.readFileSync(corpusPath, "utf8"));

const results: Record<string, number> = {};
const operands = new Set<string>();
for (const v of corpus.vectors) {
  results[v.id] = semverCompare(v.a, v.b);
  operands.add(v.a);
  operands.add(v.b);
}
const ops = [...operands];

const inv: Record<string, boolean> = {};
inv["INV-1"] = ops.every((x) => semverCompare(x, x) === 0);
inv["INV-2"] = corpus.vectors.every(
  (v: { a: string; b: string }) => semverCompare(v.a, v.b) === -semverCompare(v.b, v.a),
);
inv["INV-4"] = ops.every((x) => semverCompare(x, x + "+meta") === 0);
let transOk = true;
for (const i of ops)
  for (const j of ops)
    for (const k of ops) {
      if (semverCompare(i, j) <= 0 && semverCompare(j, k) <= 0 && !(semverCompare(i, k) <= 0)) {
        transOk = false;
      }
    }
inv["INV-3"] = transOk;

console.log(JSON.stringify({ lang: "ts", results, invariants: inv }));
