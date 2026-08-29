#!/usr/bin/env node
'use strict';

/**
 * Generate .omp-plugin/marketplace.json from .claude-plugin/marketplace.json (#213).
 *
 * WHY THIS EXISTS
 * ---------------
 * OMP (`oh-my-pi`) reads Claude Code marketplace catalogs, checking
 * `.omp-plugin/marketplace.json` first and falling back to
 * `.claude-plugin/marketplace.json`. It should therefore install this
 * marketplace as-is. It does not, for one reason:
 *
 *   $ omp plugin marketplace add ~/.claude/plugins/marketplaces/ForgePlan-marketplace
 *   ✘ Failed to add marketplace: Error: Missing or invalid field "name" in catalog
 *
 * OMP validates `name` against /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/ — no `i` flag.
 * `ForgePlan-marketplace` fails on the capital F and P. The error says "missing
 * or invalid" without distinguishing the two, which is why it reads as a
 * malformed file rather than a naming rule. Claude Code accepts the name.
 *
 * Verified: an identical copy with the name lowercased is accepted by
 * omp v18.0.8. The capitals are the entire incompatibility.
 *
 * WHY GENERATE INSTEAD OF RENAME
 * ------------------------------
 * Renaming `name` in the existing catalog would break every installed plugin ID
 * carrying the marketplace suffix (`@ForgePlan-marketplace`). Shipping a second
 * catalog costs nothing: Claude Code never looks at `.omp-plugin/`.
 *
 * WHY COMMITTED INSTEAD OF BUILT IN CI
 * ------------------------------------
 * OMP reads the marketplace from a CLONE of this repo
 * (~/.claude/plugins/marketplaces/<name>/). A file generated only inside a CI
 * runner would never reach a user's disk. So the generated file is committed,
 * and CI ASSERTS it is in sync rather than writing it — matching this repo's
 * rule that gates never mutate tracked files.
 *
 * Run this after any change to .claude-plugin/marketplace.json:
 *   node scripts/gen-omp-catalog.js
 *
 * The sync gate (scripts/ci/omp-catalog-check.js) fails the build if you forget.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(REPO_ROOT, '.claude-plugin', 'marketplace.json');
const TARGET_DIR = path.join(REPO_ROOT, '.omp-plugin');
const TARGET = path.join(TARGET_DIR, 'marketplace.json');

/**
 * The ONLY transform between the two catalogs.
 *
 * Kept as a single exported function so the generator and the CI gate cannot
 * disagree about what "in sync" means. A drift-guard whose fixer and whose
 * assertion compute the expected value differently becomes a drift source
 * itself.
 */
function toOmpCatalog(source) {
  return { ...source, name: String(source.name).toLowerCase() };
}

/** OMP's own validator, transcribed. Lowercase kebab, max 64 chars. */
const OMP_NAME_RE = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/;
const OMP_NAME_MAX = 64;

function assertOmpName(name, label) {
  if (typeof name !== 'string' || name.length === 0) {
    throw new Error(`${label}: name must be a non-empty string`);
  }
  if (name.length > OMP_NAME_MAX) {
    throw new Error(`${label}: name "${name}" exceeds OMP's ${OMP_NAME_MAX}-char limit`);
  }
  if (!OMP_NAME_RE.test(name)) {
    throw new Error(
      `${label}: name "${name}" fails OMP's ${OMP_NAME_RE} — lowercase letters, digits, dot and hyphen only, ` +
      `and it may not start or end with a separator`
    );
  }
}

function serialize(catalog) {
  return JSON.stringify(catalog, null, 2) + '\n';
}

module.exports = { toOmpCatalog, assertOmpName, serialize, SOURCE, TARGET, OMP_NAME_RE, OMP_NAME_MAX };

if (require.main === module) {
  const source = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
  const omp = toOmpCatalog(source);

  // Fail loudly rather than emit a catalog OMP will reject for a second reason.
  assertOmpName(omp.name, '.omp-plugin/marketplace.json');
  for (const plugin of omp.plugins || []) {
    assertOmpName(plugin.name, `plugin "${plugin.name}"`);
  }

  fs.mkdirSync(TARGET_DIR, { recursive: true });
  fs.writeFileSync(TARGET, serialize(omp), 'utf8');

  console.log(
    `Wrote .omp-plugin/marketplace.json — name "${source.name}" -> "${omp.name}", ` +
    `${(omp.plugins || []).length} plugins carried over unchanged.`
  );
}
