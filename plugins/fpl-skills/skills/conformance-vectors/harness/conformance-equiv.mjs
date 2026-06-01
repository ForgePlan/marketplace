// Generic conformance + cross-language equivalence comparator (corpus-agnostic).
//
// Reads a frozen corpus (vectors: [{id, input, expected}]) and a runners manifest
// (runners.json: { "<lang>": {"cmd": "...", "args": [...]} }), feeds each runner the
// vector inputs on stdin (one `input` per line), collects one stdout line per input,
// then asserts:
//   (a) conformance  — every language's output[i] === String(expected[i]) for all vectors;
//   (b) equivalence  — all languages produce the SAME output for every vector.
// The comparator OWNS the oracle + the verdict (exit code). Each runner is a dumb
// stdin->stdout worker that never sees `expected` (generator != verifier, ADR-009).
//
// Usage:
//   node conformance-equiv.mjs --corpus <corpus.json> --runners <runners.json> [--break <lang>]
//
// Negative control: --break <lang> sets CONFORMANCE_BREAK=1 in that language's env only;
// a conformant runner honors it by loading a deliberately-broken implementation, so the
// comparator MUST go RED. A gate that never fails is a null gate (PROB-002 gap-test).
//
// Exit 0 iff conformance AND equivalence hold for every language; non-zero otherwise.
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const corpusPath = arg("--corpus");
const runnersPath = arg("--runners");
const breakLang = arg("--break");
if (!corpusPath || !runnersPath) {
  console.error("usage: conformance-equiv.mjs --corpus <corpus.json> --runners <runners.json> [--break <lang>]");
  process.exit(2);
}

const corpus = JSON.parse(fs.readFileSync(corpusPath, "utf8"));
const runners = JSON.parse(fs.readFileSync(runnersPath, "utf8"));
const runnersDir = path.dirname(path.resolve(runnersPath));

const vectors = corpus.vectors;
if (!Array.isArray(vectors) || vectors.length === 0) {
  console.error("corpus has no vectors[] — nothing to check");
  process.exit(2);
}
const stdin = vectors.map((v) => v.input).join("\n") + "\n";
const expected = vectors.map((v) => String(v.expected));
const langs = Object.keys(runners);

function run(lang) {
  const r = runners[lang];
  const env = { ...process.env };
  if (breakLang === lang) env.CONFORMANCE_BREAK = "1";
  else delete env.CONFORMANCE_BREAK;
  // Resolve relative path-args (those containing "/") against the runners.json dir;
  // leave bare flags/tokens (no "/") and absolute paths untouched.
  const args = (r.args || []).map((a) =>
    a.startsWith("/") || !a.includes("/") ? a : path.resolve(runnersDir, a)
  );
  const out = execFileSync(r.cmd, args, { input: stdin, encoding: "utf8", env, cwd: runnersDir });
  return out.replace(/\n$/, "").split("\n");
}

const outputs = {};
for (const l of langs) {
  try { outputs[l] = run(l); }
  catch (e) { outputs[l] = { error: String((e && e.message) || e) }; }
}

const report = { langs, breakLang, conformance: {}, equivalence: { mismatches: [] }, pass: true };

for (const l of langs) {
  const o = outputs[l];
  if (!Array.isArray(o)) { report.conformance[l] = { ok: false, error: o.error || "no output" }; report.pass = false; continue; }
  if (o.length !== expected.length) { report.conformance[l] = { ok: false, error: `got ${o.length} lines, expected ${expected.length}` }; report.pass = false; continue; }
  const misses = [];
  for (let i = 0; i < expected.length; i++) if (o[i] !== expected[i]) misses.push({ vector: vectors[i].id, got: o[i], want: expected[i] });
  report.conformance[l] = { ok: misses.length === 0, misses };
  if (misses.length) report.pass = false;
}

// Equivalence: all languages with a well-formed output agree on every vector.
const arrLangs = langs.filter((l) => Array.isArray(outputs[l]) && outputs[l].length === expected.length);
for (let i = 0; i < expected.length; i++) {
  const vals = new Set(arrLangs.map((l) => outputs[l][i]));
  if (vals.size > 1) {
    report.equivalence.mismatches.push({ vector: vectors[i].id, values: Object.fromEntries(arrLangs.map((l) => [l, outputs[l][i]])) });
    report.pass = false;
  }
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.pass ? 0 : 1);
