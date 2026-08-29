#!/usr/bin/env node
'use strict';

/**
 * Assert the CI workflow and the local validation script run the SAME set of gates.
 *
 * WHY
 * ---
 * The gate list exists twice on purpose — `.github/workflows/validate-plugins.yml` runs
 * them as discrete CI steps for readable logs, `scripts/validate-all-plugins.sh` runs them
 * locally. Two hand-maintained lists of the same thing drift, and this one drifts silently
 * in the worst direction: a gate added to the script but not the workflow **passes locally
 * and never runs in CI**. The author sees green and ships an unchecked tree.
 *
 * That is not hypothetical. `omp-catalog-check` and `interop-skills-check` were both added
 * to the script, reported ALL PASSED locally, and were absent from CI until this gate was
 * written.
 *
 * Both files are parsed for `scripts/ci/<name>.js` references. The comparison is on the set
 * of gate script names, so ordering and label wording are free to differ.
 *
 * A third source is checked too: every gate that exists on disk in scripts/ci/ must appear
 * in both lists, so a newly written gate cannot sit unwired in either.
 *
 * Read-only. Exit 1 naming exactly which side is missing what.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const WORKFLOW = path.join(REPO_ROOT, '.github', 'workflows', 'validate-plugins.yml');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'validate-all-plugins.sh');
const CI_DIR = __dirname;

/** This checker is itself a gate but must not require itself to be listed. */
const SELF = path.basename(__filename);

function fail(lines) {
  console.error('gate-parity-check FAILED:\n');
  for (const l of lines) console.error(`  - ${l}`);
  console.error('\nAdd the missing gate(s) to both files. They are maintained separately;');
  console.error('a gate in only one of them passes locally and never runs in CI.');
  process.exit(1);
}

function gatesIn(file, label) {
  if (!fs.existsSync(file)) fail([`${label} not found at ${path.relative(REPO_ROOT, file)}`]);
  const text = fs.readFileSync(file, 'utf8');
  const found = new Set();
  // matches: scripts/ci/foo.js  and  "$CI_DIR/foo.js"
  for (const m of text.matchAll(/(?:scripts\/ci|\$CI_DIR|\$\{CI_DIR\})\/([A-Za-z0-9._-]+\.js)/g)) {
    found.add(m[1]);
  }
  return found;
}

const onDisk = new Set(
  fs.readdirSync(CI_DIR).filter((f) => f.endsWith('.js') && f !== SELF)
);

const inWorkflow = gatesIn(WORKFLOW, 'CI workflow');
const inScript = gatesIn(SCRIPT, 'validation script');
inWorkflow.delete(SELF);
inScript.delete(SELF);

const problems = [];

for (const g of [...onDisk].sort()) {
  const w = inWorkflow.has(g);
  const s = inScript.has(g);
  if (w && s) continue;
  if (!w && !s) problems.push(`${g} exists in scripts/ci/ but is wired into NEITHER the workflow nor the script — it never runs`);
  else if (!w) problems.push(`${g} runs locally but is MISSING from the CI workflow — it passes on your machine and never runs in CI`);
  else problems.push(`${g} runs in CI but is MISSING from scripts/validate-all-plugins.sh — you cannot reproduce a CI failure locally`);
}

// A list may also reference a gate that no longer exists on disk.
for (const [set, where] of [[inWorkflow, 'the CI workflow'], [inScript, 'scripts/validate-all-plugins.sh']]) {
  for (const g of [...set].sort()) {
    if (!onDisk.has(g)) problems.push(`${where} references ${g}, which does not exist in scripts/ci/`);
  }
}

if (problems.length > 0) fail(problems);

console.log(
  `Gate parity OK: ${onDisk.size} gate(s) in scripts/ci/, all wired into both the CI workflow ` +
  `and scripts/validate-all-plugins.sh.`
);
