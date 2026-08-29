#!/usr/bin/env node
'use strict';

/**
 * Assert .omp-plugin/marketplace.json is in sync with .claude-plugin/marketplace.json (#213).
 *
 * READ-ONLY by construction. This gate never writes: the repo's rule is that a
 * CI gate asserts on drift and the human runs the fixer. The fixer here is
 * `node scripts/gen-omp-catalog.js`.
 *
 * Both files share ONE transform function, imported from the generator, so the
 * assertion and the fix cannot disagree about what "in sync" means. (A guard
 * that computes the expected value independently of its fixer eventually
 * becomes a drift source itself — that failure has been seen in this repo.)
 *
 * Checks:
 *   1. .omp-plugin/marketplace.json exists at all
 *   2. its bytes equal the generator's output for the current source catalog
 *   3. its name, and every plugin name, satisfies OMP's validator
 *
 * Exit 1 with the fix command on any violation; exit 0 clean.
 */

const fs = require('fs');
const path = require('path');

const { toOmpCatalog, assertOmpName, serialize, SOURCE, TARGET } = require('../gen-omp-catalog.js');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const rel = (p) => path.relative(REPO_ROOT, p);
const FIX = 'node scripts/gen-omp-catalog.js';

function fail(message) {
  console.error(`omp-catalog-check FAILED: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(SOURCE)) {
  fail(`${rel(SOURCE)} not found`);
}

let source;
try {
  source = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
} catch (err) {
  fail(`${rel(SOURCE)} is not valid JSON: ${err.message}`);
}

if (!fs.existsSync(TARGET)) {
  fail(
    `${rel(TARGET)} is missing — OMP reads it before ${rel(SOURCE)} and rejects this ` +
    `marketplace without it. Run: ${FIX}`
  );
}

const expected = serialize(toOmpCatalog(source));
const actual = fs.readFileSync(TARGET, 'utf8');

if (actual !== expected) {
  let detail = 'content differs';
  try {
    const actualJson = JSON.parse(actual);
    const expectedJson = JSON.parse(expected);
    if (actualJson.name !== expectedJson.name) {
      detail = `name is "${actualJson.name}", expected "${expectedJson.name}"`;
    } else if ((actualJson.plugins || []).length !== (expectedJson.plugins || []).length) {
      detail =
        `${(actualJson.plugins || []).length} plugins, source has ` +
        `${(expectedJson.plugins || []).length} — the catalogs have drifted`;
    } else if (JSON.stringify(actualJson.metadata) !== JSON.stringify(expectedJson.metadata)) {
      detail = `metadata differs (catalog version bumped in one file only)`;
    }
  } catch {
    detail = 'not valid JSON';
  }
  fail(`${rel(TARGET)} is stale — ${detail}. Run: ${FIX}`);
}

// The point of the file is that OMP accepts it. Check that directly rather than
// trusting the generator ran at some point in the past.
const omp = JSON.parse(actual);
try {
  assertOmpName(omp.name, rel(TARGET));
  for (const plugin of omp.plugins || []) {
    assertOmpName(plugin.name, `plugin "${plugin.name}" in ${rel(TARGET)}`);
  }
} catch (err) {
  fail(err.message);
}

console.log(
  `OMP catalog OK: ${rel(TARGET)} in sync with ${rel(SOURCE)} ` +
  `(name "${omp.name}", ${(omp.plugins || []).length} plugins, all names OMP-valid).`
);
