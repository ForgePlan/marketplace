#!/usr/bin/env node
'use strict';

/**
 * Cross-check the gate's hand-written frontmatter reader against a real YAML parser.
 *
 * WHY. `routing-profile-check.js` carries its own minimal frontmatter reader so the gate stays
 * dependency-free like every other script in `scripts/ci/`. That reader is the single point where
 * this gate can fail silently: if it mis-parses a `tools:` allowlist into null, every reachability
 * question answers "inherited, therefore yes", the profile checks stop constraining anything, and
 * the gate still prints OK. A green check asserting nothing is the exact defect the gate exists to
 * prevent, so the parser gets an independent verifier rather than trust.
 *
 * HOW. Emits the reader's view of every indexed agent as JSON on stdout. The self-test feeds the
 * same files to Python's PyYAML and diffs the two. Disagreement on any field fails the suite.
 * Generator != verifier, applied to the gate's own internals.
 */

const fs = require('fs');
const path = require('path');
const { readFrontmatter, parseRow } = require('../../routing-profile-check.js');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const MAP = path.join(REPO_ROOT, 'plugins', 'fpl-skills', 'skills', 'smith', 'routing-map.md');
const PLUGINS = path.join(REPO_ROOT, 'plugins');

const map = fs.readFileSync(MAP, 'utf8');
const section = map.slice(map.indexOf('## Agent index')).split('\n## ')[0];
const out = {};

for (const line of section.split('\n').filter((l) => l.trim().startsWith('| **'))) {
  const row = parseRow(line);
  if (!row || /^N\/A/i.test(row.profile)) continue;

  const found = [];
  (function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name === row.name + '.md') found.push(full);
    }
  })(path.join(PLUGINS, row.plugin, 'agents'));
  if (found.length !== 1) continue;

  const fm = readFrontmatter(found[0]);
  out[row.name] = {
    name: fm ? fm.name : null,
    tools: fm && fm.tools ? fm.tools.slice().sort() : null,
    disallowedTools: fm && fm.disallowedTools ? fm.disallowedTools.slice().sort() : null,
  };
}

process.stdout.write(JSON.stringify(out, null, 2) + '\n');
