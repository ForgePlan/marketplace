// Cross-language behavioral-equivalence comparator (4 languages).
// The comparator OWNS the frozen corpus + invariant definitions + verdict (exit code).
// Each language is a dumb worker: given TSV "a<TAB>b" lines, print compare(a,b) per line.
// Adding a language = add a RUNNERS entry + a ~15-line cli runner. Corpus/SPEC unchanged.
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const here = import.meta.dirname;
const root = path.join(here, "..");
const corpus = JSON.parse(fs.readFileSync(path.join(root, "spec", "corpus.json"), "utf8"));

const args = process.argv.slice(2);
const bi = args.indexOf("--break");
const breakLang = bi >= 0 ? args[bi + 1] : null;

const vectors = corpus.vectors;
const operands = [...new Set(vectors.flatMap((v) => [v.a, v.b]))];
const N = operands.length;

// Build the probe set (all pairs any check needs). Index ranges tracked.
const probes = [];
const idx = { vec: [], ident: [], build: [], anti: [] };
vectors.forEach((v) => { idx.vec.push(probes.length); probes.push([v.a, v.b]); });
operands.forEach((x) => { idx.ident.push(probes.length); probes.push([x, x]); });
operands.forEach((x) => { idx.build.push(probes.length); probes.push([x, x + "+meta"]); });
vectors.forEach((v) => { idx.anti.push(probes.length); probes.push([v.b, v.a]); });
const pairStart = probes.length;
for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) probes.push([operands[i], operands[j]]);

const tsv = probes.map(([a, b]) => a + "\t" + b).join("\n") + "\n";

const RUNNERS = {
  ts: { cmd: "node", args: ["--experimental-strip-types", path.join(root, "cli", "run_ts.ts")] },
  py: { cmd: "python3", args: [path.join(root, "cli", "run_py.py")] },
  go: { cmd: "go", args: ["run", path.join(root, "cli", "run_go.go")] },
  rs: { cmd: path.join(root, "cli", "run_rs_bin"), args: [] },
};
const langs = ["ts", "py", "go", "rs"];

function run(lang) {
  const r = RUNNERS[lang];
  const env = { ...process.env };
  if (breakLang === lang) env.SEMVER_BREAK = "1";
  else delete env.SEMVER_BREAK;
  const out = execFileSync(r.cmd, r.args, { input: tsv, encoding: "utf8", env });
  return out.trim().split("\n").map((s) => parseInt(s, 10));
}

const res = {};
for (const l of langs) res[l] = run(l);

const expected = vectors.map((v) => v.expected);
const report = { langs, breakLang, conformance: {}, invariants: {}, equivalence: { mismatches: {} }, pass: true };

for (const l of langs) {
  const r = res[l];
  let conf = true;
  idx.vec.forEach((p, k) => { if (r[p] !== expected[k]) conf = false; });
  report.conformance[l] = conf;

  const inv = {};
  inv["INV-1"] = idx.ident.every((p) => r[p] === 0);
  inv["INV-4"] = idx.build.every((p) => r[p] === 0);
  inv["INV-2"] = idx.vec.every((p, k) => r[p] === -r[idx.anti[k]]);
  const cmpOf = (i, j) => r[pairStart + i * N + j];
  let trans = true;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) for (let k = 0; k < N; k++) {
    if (cmpOf(i, j) <= 0 && cmpOf(j, k) <= 0 && !(cmpOf(i, k) <= 0)) trans = false;
  }
  inv["INV-3"] = trans;
  const invAll = Object.values(inv).every(Boolean);
  report.invariants[l] = { ...inv, all: invAll };
  if (!conf || !invAll) report.pass = false;
}

let equiv = true;
idx.vec.forEach((p, k) => {
  const vals = langs.map((l) => res[l][p]);
  if (new Set(vals).size > 1) {
    equiv = false;
    report.equivalence.mismatches[vectors[k].id] = Object.fromEntries(langs.map((l) => [l, res[l][p]]));
  }
});
report.equivalence.all = equiv;
if (!equiv) report.pass = false;

fs.writeFileSync(path.join(root, "spec", "equiv.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  langs, breakLang,
  conformance: report.conformance,
  invariants_all: Object.fromEntries(langs.map((l) => [l, report.invariants[l].all])),
  equivalence: report.equivalence.all,
  pass: report.pass,
}));
process.exit(report.pass ? 0 : 1);
