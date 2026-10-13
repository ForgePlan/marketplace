#!/usr/bin/env node
// Независимый content census. Не назначает профиль по имени и не объявляет inventory frozen.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = fs.realpathSync(process.cwd());
const allowed = new Set(['.md', '.sh', '.js', '.mjs', '.ts', '.json', '.yaml', '.yml', '.toml']);
const exclude = new Set(['.git', 'node_modules', '.forgeplan', 'lance', '.tgrep', '.chunkhound', 'dev']);
const pattern = /\b(?:EvidencePack|Evidence[ -]Pack|evidence_type|congruence_level|review_verdict|NEEDS_ACTIVATION|EVID-\w+|forgeplan_(?:new|update|link|activate|supersede|deprecate|claim|release|validate|score|unlink))\b|forgeplan\s+(?:new\s+evidence|activate|supersede|deprecate|link)\b/i;
const records = new Map();
const aliases = [];
const errors = [];
const visitedDirectories = new Set();
const inside = (target) => target === root || target.startsWith(root + path.sep);
const relative = (target) => path.relative(root, target).split(path.sep).join('/');
function visit(visible) {
  const stat = fs.lstatSync(visible);
  if (stat.isSymbolicLink()) {
    let canonical;
    try { canonical = fs.realpathSync(visible); } catch (error) { errors.push({ path: relative(visible), reason: 'dangling_alias', error: error.code }); return; }
    aliases.push({ path: relative(visible), canonical_path: inside(canonical) ? relative(canonical) : null, outside_root: !inside(canonical) });
    if (!inside(canonical)) return;
    visitTarget(visible, canonical);
    return;
  }
  visitTarget(visible, visible);
}
function visitTarget(visible, canonical) {
  const stat = fs.statSync(canonical);
  if (stat.isDirectory()) {
    if (visitedDirectories.has(canonical)) return;
    visitedDirectories.add(canonical);
    for (const entry of fs.readdirSync(canonical).sort()) {
      if (exclude.has(entry)) continue;
      visit(path.join(visible, entry));
    }
    return;
  }
  if (!stat.isFile() || !allowed.has(path.extname(visible))) return;
  // Context files уже загружены host; census не читает их как agent implementation.
  if (/^(?:AGENTS|CLAUDE|GEMINI)\.md$|^\.cursorrules$/.test(path.basename(visible))) return;
  const bytes = fs.readFileSync(canonical);
  const content = bytes.toString('utf8');
  const lines = content.split('\n');
  const hits = [];
  for (let index = 0; index < lines.length; index++) {
    if (pattern.test(lines[index])) hits.push({ line: index + 1, text: lines[index].slice(0, 1000), line_truncated: lines[index].length > 1000 });
  }
  if (!hits.length) return;
  const key = relative(canonical);
  if (records.has(key)) { records.get(key).alias_paths.push(relative(visible)); return; }
  const plugin = key.startsWith('plugins/') ? key.split('/')[1] : null;
  let version = null;
  if (plugin) {
    const manifest = path.join(root, 'plugins', plugin, '.claude-plugin', 'plugin.json');
    if (fs.existsSync(manifest)) version = JSON.parse(fs.readFileSync(manifest, 'utf8')).version ?? null;
  }
  records.set(key, {
    canonical_path: key, alias_paths: relative(visible) === key ? [] : [relative(visible)], plugin, plugin_version: version,
    bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
    declared_profiles: [...new Set([...content.matchAll(/Profile\s+(B-orchestrator|B-gate|C-coder|Runtime|[ABCD])\b/g)].map((match) => match[1]))].sort(),
    artifact_profile: null, primary_responsibility: null,
    classification_state: 'requires_manual_reconciliation',
    capability: 'uncertified', protocol: 'not_declared_as_evidencepack_v1',
    observed_operations: [...new Set([...content.matchAll(/forgeplan_(new|update|link|activate|supersede|deprecate|claim|release|validate|score|unlink)\b/g)].map((match) => match[1]))].sort(),
    hits,
  });
}
for (const directory of ['plugins', 'scripts', 'docs', '.claude-plugin', '.omp-plugin']) {
  const target = path.join(root, directory);
  if (fs.existsSync(target)) visit(target);
}
const sorted = [...records.values()].sort((a, b) => a.canonical_path.localeCompare(b.canonical_path, 'en'));
const report = {
  census: 'evidencepack-independent-content-v1', root, checked_at: new Date().toISOString(),
  candidate_count: sorted.length, alias_count: aliases.length,
  normative_inventory_complete: false,
  limitations: ['Content-pattern census is independent of inventory; profile/responsibility/indirect operations require manual reconciliation.', 'Aliases outside repository are recorded, not traversed; installed cached plugins are separate runtime inputs.', 'Hit lines over 1000 characters are marked truncated; file bytes and SHA256 bind the full content.', 'No production mutations, no capability certification, no frozen protocol claim.'],
  patterns: { candidate: pattern.source }, aliases, errors, records: sorted,
};
if (process.argv[2]) {
  fs.writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ output: process.argv[2], candidate_count: sorted.length, alias_count: aliases.length, errors, normative_inventory_complete: false }));
} else {
  console.log(JSON.stringify(report, null, 2));
}
