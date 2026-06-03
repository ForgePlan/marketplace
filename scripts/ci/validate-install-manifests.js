#!/usr/bin/env node
'use strict';

/**
 * Validate the install-profiles metadata in .claude-plugin/marketplace.json (#150).
 *
 * Each plugin entry must carry four install fields:
 *   cost          one of {light, medium, heavy}
 *   stability     one of {stable, beta, experimental, deprecated}
 *   dependencies  array of plugin names; every name must resolve to a real
 *                 plugin in this catalog (the shared external forgeplan MCP is
 *                 NOT a plugin dependency, so it never appears here)
 *   targets       non-empty array of CLI target strings
 *
 * The catalog must also carry a top-level `profiles` object: a map of profile
 * name -> array of plugin names. Every member of every profile must resolve to
 * a real plugin, and the `full` profile must contain ALL plugins (drift guard:
 * a new plugin not added to `full` fails this gate).
 *
 * This is a zero-dependency hand-validator (Node builtins only) - it does not
 * load a JSON-Schema library. The companion schema lives at
 * scripts/ci/schemas/install-manifest.schema.json for documentation/reuse.
 *
 * Exit 1 with a precise file/field message on any violation; exit 0 clean.
 *
 * Manifest path override (for tests / negative controls):
 *   CI_INSTALL_MANIFEST_PATH (defaults to the repo's marketplace.json).
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const MANIFEST_PATH = process.env.CI_INSTALL_MANIFEST_PATH
  ? path.resolve(process.env.CI_INSTALL_MANIFEST_PATH)
  : path.join(REPO_ROOT, '.claude-plugin', 'marketplace.json');

const COST_VALUES = new Set(['light', 'medium', 'heavy']);
const STABILITY_VALUES = new Set(['stable', 'beta', 'experimental', 'deprecated']);

const FULL_PROFILE = 'full';

function rel(file) {
  return path.relative(REPO_ROOT, file).split(path.sep).join('/') || file;
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  console.error(`\nInstall-manifest validation failed (${rel(MANIFEST_PATH)}).`);
  process.exit(1);
}

let raw;
try {
  raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
} catch (err) {
  fail(`cannot read marketplace manifest: ${err.message}`);
}

let manifest;
try {
  manifest = JSON.parse(raw);
} catch (err) {
  fail(`marketplace manifest is not valid JSON: ${err.message}`);
}

if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
  fail('marketplace manifest must be a JSON object');
}

const plugins = manifest.plugins;
if (!Array.isArray(plugins) || plugins.length === 0) {
  fail('`plugins` must be a non-empty array');
}

// Build the set of known plugin names first - needed to resolve dependency and
// profile members against the catalog.
const knownNames = new Set();
for (let i = 0; i < plugins.length; i += 1) {
  const entry = plugins[i];
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    fail(`plugins[${i}] must be an object`);
  }
  if (typeof entry.name !== 'string' || entry.name.length === 0) {
    fail(`plugins[${i}] has a missing or non-string \`name\``);
  }
  if (knownNames.has(entry.name)) {
    fail(`plugins[${i}] duplicate plugin name "${entry.name}"`);
  }
  knownNames.add(entry.name);
}

// --- Per-plugin install fields -------------------------------------------
for (const entry of plugins) {
  const where = `plugin "${entry.name}"`;

  if (!COST_VALUES.has(entry.cost)) {
    fail(`${where}: \`cost\` must be one of {light, medium, heavy} (got ${JSON.stringify(entry.cost)})`);
  }

  if (!STABILITY_VALUES.has(entry.stability)) {
    fail(`${where}: \`stability\` must be one of {stable, beta, experimental, deprecated} (got ${JSON.stringify(entry.stability)})`);
  }

  if (!Array.isArray(entry.dependencies)) {
    fail(`${where}: \`dependencies\` must be an array (got ${JSON.stringify(entry.dependencies)})`);
  }
  for (const dep of entry.dependencies) {
    if (typeof dep !== 'string') {
      fail(`${where}: \`dependencies\` must contain only strings (got ${JSON.stringify(dep)})`);
    }
    if (!knownNames.has(dep)) {
      fail(`${where}: dependency "${dep}" does not resolve to any plugin in the catalog`);
    }
    if (dep === entry.name) {
      fail(`${where}: \`dependencies\` must not list the plugin itself`);
    }
  }

  if (!Array.isArray(entry.targets) || entry.targets.length === 0) {
    fail(`${where}: \`targets\` must be a non-empty array (got ${JSON.stringify(entry.targets)})`);
  }
  for (const target of entry.targets) {
    if (typeof target !== 'string' || target.length === 0) {
      fail(`${where}: \`targets\` must contain only non-empty strings (got ${JSON.stringify(target)})`);
    }
  }
}

// --- Profiles -------------------------------------------------------------
const profiles = manifest.profiles;
if (!profiles || typeof profiles !== 'object' || Array.isArray(profiles)) {
  fail('top-level `profiles` must be an object (map of profile name -> array of plugin names)');
}

const profileNames = Object.keys(profiles);
if (profileNames.length === 0) {
  fail('`profiles` must declare at least one profile');
}

for (const profileName of profileNames) {
  const members = profiles[profileName];
  if (!Array.isArray(members) || members.length === 0) {
    fail(`profile "${profileName}" must be a non-empty array of plugin names`);
  }
  const seen = new Set();
  for (const member of members) {
    if (typeof member !== 'string') {
      fail(`profile "${profileName}" must contain only strings (got ${JSON.stringify(member)})`);
    }
    if (seen.has(member)) {
      fail(`profile "${profileName}" lists "${member}" more than once`);
    }
    seen.add(member);
    if (!knownNames.has(member)) {
      fail(`profile "${profileName}" member "${member}" does not resolve to any plugin in the catalog`);
    }
  }
}

// `full` profile must exist and cover every plugin (drift guard).
if (!Object.prototype.hasOwnProperty.call(profiles, FULL_PROFILE)) {
  fail(`profile "${FULL_PROFILE}" is required and must list every plugin`);
}
const fullSet = new Set(profiles[FULL_PROFILE]);
const missingFromFull = [];
for (const name of knownNames) {
  if (!fullSet.has(name)) {
    missingFromFull.push(name);
  }
}
if (missingFromFull.length > 0) {
  fail(`profile "${FULL_PROFILE}" is missing ${missingFromFull.length} plugin(s): ${missingFromFull.sort().join(', ')} (every plugin must appear in "${FULL_PROFILE}")`);
}

console.log(
  `Install-manifest OK: ${plugins.length} plugins with valid cost/stability/dependencies/targets; ` +
  `${profileNames.length} profiles resolved; "${FULL_PROFILE}" covers all ${plugins.length} plugins.`
);
