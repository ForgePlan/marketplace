#!/usr/bin/env node
/**
 * Verify marketplace catalog counts against tracked documentation.
 *
 * This repo is MULTI-plugin: components live under plugins/<name>/{agents,commands,skills},
 * and .claude-plugin/marketplace.json is the catalog of plugins. Counts are derived from
 * disk at runtime (disk = ground truth); the documented numbers are what gets asserted and,
 * with --write, corrected in place.
 *
 * Derived counts:
 *   - plugins            plugins/<name>/.claude-plugin/plugin.json
 *   - agents (total)     plugins/<name>/agents/*.md
 *   - commands (total)   plugins/<name>/commands/*.md
 *   - skills (total)     plugins/<name>/skills/<skill>/SKILL.md
 *   - forgeplan-aware    agents whose body carries a disallowedTools denylist
 *                        (the B2 paradigm; this is the count CLAUDE.md / both READMEs document)
 *   - per-plugin agents  agent count for each plugin (used by the README pack tables)
 *   - per-plugin skills  skill count for each plugin (fpl-skills drives the "38 skills" claim)
 *
 * Asserted markers, per file:
 *   - CLAUDE.md           "**Plugins**: N"; "**Agents**: F of T forgeplan-aware";
 *                         "**Catalog version**: X" === marketplace.json metadata.version
 *                         (exact string match — a fixed version, not a count or floor)
 *   - README.md           header "N plugins | F marketplace-aware agents (T total) | S+ skills";
 *                         pack table rows "| [<plugin>](...) | N |"
 *   - README-RU.md        header "N плагинов | F marketplace-aware агентов (T всего) | S+ скиллов";
 *                         pack table rows "| [<plugin>](...) | N |"
 *   - AGENTS.md           "**Plugins**: N"
 *   - .claude-plugin/marketplace.json   plugins[] length === plugin count, and the plugin
 *                         names match the on-disk plugin directories (structural, not regex)
 *
 * Usage:
 *   node scripts/ci/catalog-check.js          # human text (default)
 *   node scripts/ci/catalog-check.js --json    # machine-readable
 *   node scripts/ci/catalog-check.js --text     # explicit text
 *   node scripts/ci/catalog-check.js --write    # autosync doc numbers in place
 *
 * Exit code: 0 when documentation matches disk, 1 on any drift or a missing marker.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

const CLAUDE_PATH = path.join(ROOT, 'CLAUDE.md');
const README_PATH = path.join(ROOT, 'README.md');
const README_RU_PATH = path.join(ROOT, 'README-RU.md');
const AGENTS_PATH = path.join(ROOT, 'AGENTS.md');
const MARKETPLACE_JSON_PATH = path.join(ROOT, '.claude-plugin', 'marketplace.json');

const WRITE_MODE = process.argv.includes('--write');
const OUTPUT_MODE = process.argv.includes('--json')
  ? 'json'
  : 'text';

// --- disk: discovery -------------------------------------------------------

function listDirNames(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
}

function listMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
    .map(entry => entry.name)
    .sort();
}

function listSkillDirs(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory()
      && fs.existsSync(path.join(dir, entry.name, 'SKILL.md')))
    .map(entry => entry.name)
    .sort();
}

// An agent is "forgeplan-aware" when its body carries the PRD-026 B2 paradigm marker:
// a `disallowedTools` denylist. CLAUDE.md ("**Agents**: 25 of 75 forgeplan-aware — B2
// paradigm `disallowedTools` denylist") and both README headers count it this way.
// A bare "Profile A/B/C/D" mention is NOT sufficient — several agents (debugger,
// production-validator, tdd-london, pseudocode, refinement) cite a CRUD-R-A profile as
// methodology context without carrying a denylist, and are not forgeplan-aware in this sense.
const FORGEPLAN_AWARE_PATTERN = /disallowedTools/;

function isForgeplanAware(filePath) {
  let body;
  try {
    body = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return false;
  }
  return FORGEPLAN_AWARE_PATTERN.test(body);
}

function readMarketplaceVersion(root) {
  // The catalog's canonical version string lives in metadata.version. CLAUDE.md mirrors it
  // in its "**Catalog version**: <X>" header; the version assertion below holds them in sync.
  const marketplacePath = path.join(root, '.claude-plugin', 'marketplace.json');
  try {
    const parsed = JSON.parse(fs.readFileSync(marketplacePath, 'utf8'));
    const version = parsed && parsed.metadata && parsed.metadata.version;
    return typeof version === 'string' ? version : null;
  } catch (error) {
    return null;
  }
}

function buildCatalog(root = ROOT) {
  const pluginsDir = path.join(root, 'plugins');
  const pluginNames = listDirNames(pluginsDir).filter(name => (
    fs.existsSync(path.join(pluginsDir, name, '.claude-plugin', 'plugin.json'))
  ));

  const plugins = {};
  let agentsTotal = 0;
  let commandsTotal = 0;
  let skillsTotal = 0;
  let forgeplanAware = 0;

  for (const name of pluginNames) {
    const base = path.join(pluginsDir, name);
    const agentFiles = listMarkdownFiles(path.join(base, 'agents'));
    const commandFiles = listMarkdownFiles(path.join(base, 'commands'));
    const skillDirs = listSkillDirs(path.join(base, 'skills'));

    const awareInPlugin = agentFiles.filter(file => (
      isForgeplanAware(path.join(base, 'agents', file))
    )).length;

    plugins[name] = {
      agents: agentFiles.length,
      commands: commandFiles.length,
      skills: skillDirs.length,
      forgeplanAware: awareInPlugin,
    };

    agentsTotal += agentFiles.length;
    commandsTotal += commandFiles.length;
    skillsTotal += skillDirs.length;
    forgeplanAware += awareInPlugin;
  }

  return {
    pluginNames,
    plugins,
    // The catalog's canonical version string (marketplace.json metadata.version). Unlike the
    // count fields this is not derived from a directory scan; CLAUDE.md's "**Catalog version**"
    // header is asserted equal to it (exact string match — a fixed version, not a floor).
    metadataVersion: readMarketplaceVersion(root),
    counts: {
      plugins: pluginNames.length,
      agents: agentsTotal,
      commands: commandsTotal,
      skills: skillsTotal,
      forgeplanAware,
    },
  };
}

// --- file io ---------------------------------------------------------------

function readFileOrThrow(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read ${path.basename(filePath)}: ${error.message}`);
  }
}

function writeFileOrThrow(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
  } catch (error) {
    throw new Error(`Failed to write ${path.basename(filePath)}: ${error.message}`);
  }
}

function replaceOrThrow(content, regex, replacer, source) {
  if (!regex.test(content)) {
    throw new Error(`${source} is missing the expected catalog marker`);
  }
  return content.replace(regex, replacer);
}

// --- expectation helpers ---------------------------------------------------
//
// An expectation compares one documented number against one derived count.
// `mode` is 'exact' (===) or 'minimum' (doc value <= actual, for "38+" style claims).
// `actual` resolves the derived value from the catalog at evaluation time.

function exact(label, expected, source, getActual) {
  return { label, mode: 'exact', expected, source, getActual };
}

function minimum(label, expected, source, getActual) {
  return { label, mode: 'minimum', expected, source, getActual };
}

// Single source of truth for the value a documented marker should hold after --write.
// The write path MUST mirror the read path's pass/fail semantics so the two cannot
// diverge (the bug fixed in W1.6: --write rewrote satisfied "N+" floors to the exact
// disk count, churning "38+ skills" -> "68+ skills" on a clean tree).
//   - exact   : always the disk count.
//   - minimum : a documented floor (the "N+" form). Preserve the documented value while
//               the floor is satisfied (documented <= actual); only rewrite — down to the
//               actual — when the floor is VIOLATED (documented > actual, i.e. over-claim).
function resolveDocValue(mode, documented, actual) {
  if (mode === 'minimum') {
    return documented <= actual ? documented : actual;
  }
  return actual;
}

// --- CLAUDE.md -------------------------------------------------------------

function parseClaudeExpectations(content, catalog) {
  const expectations = [];

  const pluginsMatch = content.match(/\*\*Plugins\*\*:\s*(\d+)\b/);
  if (!pluginsMatch) {
    throw new Error('CLAUDE.md is missing the "**Plugins**: N" header marker');
  }
  expectations.push(exact(
    'plugins', Number(pluginsMatch[1]), 'CLAUDE.md header',
    () => catalog.counts.plugins,
  ));

  const agentsMatch = content.match(/\*\*Agents\*\*:\s*(\d+)\s+of\s+(\d+)\s+forgeplan-aware/i);
  if (!agentsMatch) {
    throw new Error('CLAUDE.md is missing the "**Agents**: F of T forgeplan-aware" header marker');
  }
  expectations.push(exact(
    'forgeplan-aware agents', Number(agentsMatch[1]), 'CLAUDE.md header',
    () => catalog.counts.forgeplanAware,
  ));
  expectations.push(exact(
    'agents total', Number(agentsMatch[2]), 'CLAUDE.md header',
    () => catalog.counts.agents,
  ));

  // Catalog version: CLAUDE.md's canonical "**Catalog version**: <X>" line must EXACTLY equal
  // marketplace.json metadata.version. This is a fixed string (not a count, not a floor), so the
  // 'exact' mode does plain === — every catalog bump must update this CLAUDE.md line in lockstep.
  // catalog-check.js previously asserted counts but not this version string, so it drifted unguarded.
  const versionMatch = content.match(/\*\*Catalog version\*\*:\s*(\S+)/);
  if (!versionMatch) {
    throw new Error('CLAUDE.md is missing the "**Catalog version**: <X>" header marker');
  }
  expectations.push(exact(
    'catalog version', versionMatch[1], 'CLAUDE.md header',
    () => catalog.metadataVersion,
  ));

  return expectations;
}

function syncClaude(content, catalog) {
  let next = content;
  next = replaceOrThrow(
    next,
    /(\*\*Plugins\*\*:\s*)(\d+)\b/,
    (_, prefix) => `${prefix}${catalog.counts.plugins}`,
    'CLAUDE.md header (plugins)',
  );
  next = replaceOrThrow(
    next,
    /(\*\*Agents\*\*:\s*)(\d+)(\s+of\s+)(\d+)(\s+forgeplan-aware)/i,
    (_, prefix, __, mid, ___, suffix) =>
      `${prefix}${catalog.counts.forgeplanAware}${mid}${catalog.counts.agents}${suffix}`,
    'CLAUDE.md header (agents)',
  );
  // Autosync the canonical catalog-version line to marketplace.json metadata.version.
  if (catalog.metadataVersion) {
    next = replaceOrThrow(
      next,
      /(\*\*Catalog version\*\*:\s*)(\S+)/,
      (_, prefix) => `${prefix}${catalog.metadataVersion}`,
      'CLAUDE.md header (catalog version)',
    );
  }
  return next;
}

// --- README headers (EN + RU share the same shape) -------------------------
//
// EN: "**18 plugins** | **25 marketplace-aware agents (75 total)** | **38+ skills** | ..."
// RU: "**18 плагинов** | **25 marketplace-aware агентов (75 всего)** | **38+ скиллов** | ..."

function buildReadmeHeaderRegex(pluginsWord, totalWord, skillsWord) {
  return new RegExp(
    `(\\*\\*)(\\d+)(\\s+${pluginsWord}\\*\\*\\s*\\|\\s*\\*\\*)`
    + `(\\d+)(\\s+marketplace-aware\\s+\\S+\\s*\\()`
    + `(\\d+)(\\s+${totalWord}\\)\\*\\*\\s*\\|\\s*\\*\\*)`
    + `(\\d+)(\\+?\\s+${skillsWord}\\*\\*)`,
    'i',
  );
}

const README_HEADER_EN = buildReadmeHeaderRegex('plugins', 'total', 'skills');
const README_HEADER_RU = buildReadmeHeaderRegex('плагинов', 'всего', 'скиллов');

function parseReadmeHeaderExpectations(content, catalog, regex, sourceLabel) {
  const match = content.match(regex);
  if (!match) {
    throw new Error(`${sourceLabel} is missing the header catalog summary`);
  }
  return [
    exact('plugins', Number(match[2]), `${sourceLabel} header`,
      () => catalog.counts.plugins),
    exact('forgeplan-aware agents', Number(match[4]), `${sourceLabel} header`,
      () => catalog.counts.forgeplanAware),
    exact('agents total', Number(match[6]), `${sourceLabel} header`,
      () => catalog.counts.agents),
    // The header writes "38+ skills" — a floor, not an exact count.
    minimum('skills total', Number(match[8]), `${sourceLabel} header (skills floor)`,
      () => catalog.counts.skills),
  ];
}

function syncReadmeHeader(content, catalog, regex, sourceLabel) {
  return replaceOrThrow(
    content,
    regex,
    (_, p1, __, p3, ___, p5, ____, p7, documentedSkills, p9) => {
      // Skills is a documented floor ("N+ skills"): keep it when satisfied, lower it
      // only when over-claimed. The exact fields always take the disk count.
      const skills = resolveDocValue('minimum', Number(documentedSkills), catalog.counts.skills);
      return `${p1}${catalog.counts.plugins}${p3}`
        + `${catalog.counts.forgeplanAware}${p5}`
        + `${catalog.counts.agents}${p7}`
        + `${skills}${p9}`;
    },
    `${sourceLabel} header`,
  );
}

// --- README pack tables (EN + RU) ------------------------------------------
//
// Rows look like: "| [agents-pro](plugins/agents-pro/) | 30 | focus... |"
// One row per agent pack; the second cell is that plugin's agent count.

function packRowRegex(pluginName) {
  // eslint-disable-next-line no-useless-escape
  const escaped = pluginName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `(\\|\\s*\\[${escaped}\\]\\(plugins/${escaped}/\\)\\s*\\|\\s*)(\\d+)(\\s*\\|)`,
  );
}

// Packs documented with an explicit agent-count column in the README tables.
const PACK_PLUGINS = [
  'agents-core',
  'agents-domain',
  'agents-pro',
  'agents-github',
  'agents-sparc',
  'agents-tdd',
  'agents-bmad',
];

function parseReadmePackExpectations(content, catalog, sourceLabel) {
  const expectations = [];
  for (const pluginName of PACK_PLUGINS) {
    const regex = packRowRegex(pluginName);
    const match = content.match(regex);
    if (!match) {
      throw new Error(`${sourceLabel} pack table is missing the "${pluginName}" agent-count row`);
    }
    const plugin = catalog.plugins[pluginName];
    if (!plugin) {
      throw new Error(`${sourceLabel} references plugin "${pluginName}" which is not on disk`);
    }
    expectations.push(exact(
      `${pluginName} agents`,
      Number(match[2]),
      `${sourceLabel} pack table`,
      () => catalog.plugins[pluginName].agents,
    ));
  }
  return expectations;
}

function syncReadmePackTable(content, catalog, sourceLabel) {
  let next = content;
  for (const pluginName of PACK_PLUGINS) {
    if (!catalog.plugins[pluginName]) {
      continue;
    }
    next = replaceOrThrow(
      next,
      packRowRegex(pluginName),
      (_, prefix, __, suffix) => `${prefix}${catalog.plugins[pluginName].agents}${suffix}`,
      `${sourceLabel} pack table (${pluginName})`,
    );
  }
  return next;
}

// --- AGENTS.md -------------------------------------------------------------

function parseAgentsExpectations(content, catalog) {
  const match = content.match(/\*\*Plugins\*\*:\s*(\d+)\b/);
  if (!match) {
    throw new Error('AGENTS.md is missing the "**Plugins**: N" header marker');
  }
  return [
    exact('plugins', Number(match[1]), 'AGENTS.md header',
      () => catalog.counts.plugins),
  ];
}

function syncAgents(content, catalog) {
  return replaceOrThrow(
    content,
    /(\*\*Plugins\*\*:\s*)(\d+)\b/,
    (_, prefix) => `${prefix}${catalog.counts.plugins}`,
    'AGENTS.md header (plugins)',
  );
}

// --- marketplace.json (structural: plugins[] vs disk) ----------------------

function parseMarketplace(content) {
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`.claude-plugin/marketplace.json is not valid JSON: ${error.message}`);
  }
}

function evaluateMarketplace(content, catalog) {
  const parsed = parseMarketplace(content);
  const plugins = Array.isArray(parsed.plugins) ? parsed.plugins : null;
  if (!plugins) {
    throw new Error('.claude-plugin/marketplace.json is missing a plugins[] array');
  }

  const checks = [];

  checks.push({
    label: 'plugins',
    mode: 'exact',
    source: '.claude-plugin/marketplace.json plugins[]',
    expected: plugins.length,
    actual: catalog.counts.plugins,
    ok: plugins.length === catalog.counts.plugins,
  });

  const catalogNames = [...catalog.pluginNames].sort();
  const declaredNames = plugins
    .map(plugin => plugin && plugin.name)
    .filter(name => typeof name === 'string')
    .sort();

  const missingOnDisk = declaredNames.filter(name => !catalogNames.includes(name));
  const missingInCatalogFile = catalogNames.filter(name => !declaredNames.includes(name));
  const namesMatch = missingOnDisk.length === 0 && missingInCatalogFile.length === 0;

  let detail = '';
  if (!namesMatch) {
    const parts = [];
    if (missingInCatalogFile.length) {
      parts.push(`on disk but not declared: ${missingInCatalogFile.join(', ')}`);
    }
    if (missingOnDisk.length) {
      parts.push(`declared but not on disk: ${missingOnDisk.join(', ')}`);
    }
    detail = parts.join('; ');
  }

  checks.push({
    label: 'plugin names',
    mode: 'set',
    source: '.claude-plugin/marketplace.json plugins[].name',
    expected: catalogNames.length,
    actual: declaredNames.length,
    ok: namesMatch,
    detail,
  });

  return checks;
}

// marketplace.json carries no aggregate counts to autosync — the plugins[] array
// is the catalog itself. --write is a no-op here; drift means a hand-edit is required.
function syncMarketplace(content) {
  return content;
}

// --- document specs --------------------------------------------------------

function createDocumentSpecs(paths = {}) {
  const {
    claudePath = CLAUDE_PATH,
    readmePath = README_PATH,
    readmeRuPath = README_RU_PATH,
    agentsPath = AGENTS_PATH,
    marketplaceJsonPath = MARKETPLACE_JSON_PATH,
  } = paths;

  return [
    {
      filePath: claudePath,
      parseExpectations: (content, catalog) => parseClaudeExpectations(content, catalog),
      syncContent: syncClaude,
    },
    {
      filePath: readmePath,
      parseExpectations: (content, catalog) => [
        ...parseReadmeHeaderExpectations(content, catalog, README_HEADER_EN, 'README.md'),
        ...parseReadmePackExpectations(content, catalog, 'README.md'),
      ],
      syncContent: (content, catalog) => {
        let next = syncReadmeHeader(content, catalog, README_HEADER_EN, 'README.md');
        next = syncReadmePackTable(next, catalog, 'README.md');
        return next;
      },
    },
    {
      filePath: readmeRuPath,
      parseExpectations: (content, catalog) => [
        ...parseReadmeHeaderExpectations(content, catalog, README_HEADER_RU, 'README-RU.md'),
        ...parseReadmePackExpectations(content, catalog, 'README-RU.md'),
      ],
      syncContent: (content, catalog) => {
        let next = syncReadmeHeader(content, catalog, README_HEADER_RU, 'README-RU.md');
        next = syncReadmePackTable(next, catalog, 'README-RU.md');
        return next;
      },
    },
    {
      filePath: agentsPath,
      parseExpectations: (content, catalog) => parseAgentsExpectations(content, catalog),
      syncContent: syncAgents,
    },
    {
      // Structural spec: no regex expectations, evaluated directly against plugins[].
      filePath: marketplaceJsonPath,
      structural: true,
      evaluate: (content, catalog) => evaluateMarketplace(content, catalog),
      syncContent: syncMarketplace,
    },
  ];
}

function createDocumentSpecsForRoot(root) {
  return createDocumentSpecs({
    claudePath: path.join(root, 'CLAUDE.md'),
    readmePath: path.join(root, 'README.md'),
    readmeRuPath: path.join(root, 'README-RU.md'),
    agentsPath: path.join(root, 'AGENTS.md'),
    marketplaceJsonPath: path.join(root, '.claude-plugin', 'marketplace.json'),
  });
}

// --- evaluation ------------------------------------------------------------

function evaluateExpectations(expectations) {
  return expectations.map(expectation => {
    const actual = expectation.getActual();
    // A marker is OK when --write would leave its documented value unchanged — i.e. the
    // value the doc holds already equals what resolveDocValue would write. Reusing the
    // same helper as the write path guarantees the read/write paths agree by construction.
    const ok = resolveDocValue(expectation.mode, expectation.expected, actual) === expectation.expected;
    return {
      label: expectation.label,
      mode: expectation.mode,
      source: expectation.source,
      expected: expectation.expected,
      actual,
      ok,
    };
  });
}

function formatCheck(check) {
  // The catalog-version check compares CLAUDE.md against marketplace.json metadata.version
  // (not a disk-scan count), so it gets a precise message naming both sides of the mismatch.
  if (check.label === 'catalog version') {
    return `CLAUDE.md catalog version ${check.expected} vs metadata.version ${check.actual}`;
  }
  const comparator = check.mode === 'minimum' ? '>=' : '=';
  const base = `${check.source} -> ${check.label} claimed ${comparator} ${check.expected} vs disk ${check.actual}`;
  return check.detail ? `${base} (${check.detail})` : base;
}

function runCatalogCheck(options = {}) {
  const root = options.root || ROOT;
  const writeMode = options.writeMode ?? WRITE_MODE;
  const documentSpecs = options.documentSpecs || (
    root === ROOT ? DOCUMENT_SPECS : createDocumentSpecsForRoot(root)
  );
  const catalog = buildCatalog(root);

  if (writeMode) {
    for (const spec of documentSpecs) {
      const currentContent = readFileOrThrow(spec.filePath);
      const nextContent = spec.syncContent(currentContent, catalog);
      if (nextContent !== currentContent) {
        writeFileOrThrow(spec.filePath, nextContent);
      }
    }
  }

  const checks = [];
  for (const spec of documentSpecs) {
    const content = readFileOrThrow(spec.filePath);
    if (spec.structural) {
      checks.push(...spec.evaluate(content, catalog));
    } else {
      checks.push(...evaluateExpectations(spec.parseExpectations(content, catalog)));
    }
  }

  return { catalog, checks };
}

// --- rendering -------------------------------------------------------------

function renderText(result) {
  const { counts } = result.catalog;
  console.log('Catalog counts (disk = ground truth):');
  console.log(`- plugins:          ${counts.plugins}`);
  console.log(`- agents (total):   ${counts.agents}`);
  console.log(`- forgeplan-aware:  ${counts.forgeplanAware}`);
  console.log(`- commands (total): ${counts.commands}`);
  console.log(`- skills (total):   ${counts.skills}`);
  console.log('');

  const mismatches = result.checks.filter(check => !check.ok);
  if (mismatches.length === 0) {
    console.log(`Documentation matches disk (${result.checks.length} assertions across 5 files).`);
    return;
  }

  console.error(`Documentation drift found (${mismatches.length} of ${result.checks.length} assertions failed):`);
  for (const mismatch of mismatches) {
    console.error(`- ${formatCheck(mismatch)}`);
  }
}

function main(options = {}) {
  const outputMode = options.outputMode || OUTPUT_MODE;
  const result = runCatalogCheck(options);

  if (outputMode === 'json') {
    console.log(JSON.stringify(result, null, 2));
  } else {
    renderText(result);
  }

  if (result.checks.some(check => !check.ok)) {
    process.exit(1);
  }
}

const DOCUMENT_SPECS = createDocumentSpecs();

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  buildCatalog,
  createDocumentSpecs,
  createDocumentSpecsForRoot,
  evaluateExpectations,
  evaluateMarketplace,
  formatCheck,
  isForgeplanAware,
  main,
  parseAgentsExpectations,
  parseClaudeExpectations,
  parseReadmeHeaderExpectations,
  parseReadmePackExpectations,
  runCatalogCheck,
  syncAgents,
  syncClaude,
  syncReadmeHeader,
  syncReadmePackTable,
};
