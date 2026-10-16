import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const census = fileURLToPath(new URL('../surface-census.mjs', import.meta.url));
const sentinel = 'SYNTHETIC_PRIVATE_SENTINEL=fixture-only';
const excluded = ['.git', 'node_modules', '.forgeplan', 'lance', '.tgrep', '.chunkhound', 'dev'];

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'evidencepack-census-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const root = path.join(directory, 'repo');
  fs.mkdirSync(path.join(root, 'plugins'), { recursive: true });
  return { directory, root };
}
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
function scan(root, output) {
  const result = spawnSync(process.execPath, [census, ...(output ? [output] : [])], {
    cwd: root, encoding: 'utf8', timeout: 5000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(output ? fs.readFileSync(output, 'utf8') : result.stdout);
  assert.deepEqual(report.errors, []);
  assert.equal(report.normative_inventory_complete, false);
  assert.ok(!JSON.stringify(report).includes(sentinel), 'excluded content must not reach snippets or metadata');
  return report;
}

test('canonical exclusions block directory, file and nested aliases without losing alias metadata', (t) => {
  const { directory, root } = fixture(t);
  write(path.join(root, 'plugins/public/note.md'), 'EVID-002 public fixture\n');
  for (const component of excluded) {
    write(path.join(root, component, 'evidence/private.md'), `EVID-001 ${sentinel}\n`);
    write(path.join(root, 'plugins/private', component, 'private.md'), `EvidencePack ${sentinel}\n`);
  }
  const baseline = scan(root);
  assert.equal(baseline.candidate_count, 1);
  assert.deepEqual(baseline.aliases, []);

  for (const [index, component] of excluded.entries()) {
    fs.symlinkSync(path.join('..', component), path.join(root, 'plugins', `directory-${index}`));
    fs.symlinkSync(path.join('..', component, 'evidence/private.md'), path.join(root, 'plugins', `file-${index}.md`));
    fs.symlinkSync(path.join('private', component), path.join(root, 'plugins', `nested-${index}`));
  }
  // Вторичное чтение версии также не должно обходить canonical exclusions.
  write(path.join(root, '.forgeplan/private-manifest.json'), JSON.stringify({ version: sentinel }));
  fs.mkdirSync(path.join(root, 'plugins/public/.claude-plugin'), { recursive: true });
  fs.symlinkSync('../../../.forgeplan/private-manifest.json', path.join(root, 'plugins/public/.claude-plugin/plugin.json'));
  const report = scan(root, path.join(directory, 'aliased-report.json'));
  assert.deepEqual(report.records, baseline.records);
  assert.equal(report.alias_count, excluded.length * 3 + 1);
  for (const [index, component] of excluded.entries()) {
    assert.deepEqual(report.aliases.find((alias) => alias.path === `plugins/directory-${index}`), {
      path: `plugins/directory-${index}`, canonical_path: component, outside_root: false,
    });
    assert.ok(report.aliases.some((alias) => alias.canonical_path === `plugins/private/${component}`));
  }
});

test('context filename exclusions apply to canonical file targets and secondary manifests', (t) => {
  const { root } = fixture(t);
  for (const [index, name] of ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', '.cursorrules'].entries()) {
    write(path.join(root, name), JSON.stringify({ version: sentinel, note: 'EvidencePack fixture' }));
    const plugin = path.join(root, 'plugins', `public-${index}`);
    write(path.join(plugin, 'note.md'), `EVID-00${index} public fixture\n`);
    fs.mkdirSync(path.join(plugin, '.claude-plugin'));
    fs.symlinkSync(`../../${name}`, path.join(plugin, 'context-copy.md'));
    fs.symlinkSync(`../../../${name}`, path.join(plugin, '.claude-plugin/plugin.json'));
  }
  const report = scan(root);
  assert.deepEqual(report.records.map((record) => record.canonical_path).sort(),
    [0, 1, 2, 3].map((index) => `plugins/public-${index}/note.md`));
  assert.deepEqual(report.records.map((record) => record.plugin_version), [null, null, null, null]);
});

test('allowed internal aliases retain one canonical record; outside-root aliases are never read', (t) => {
  const { directory, root } = fixture(t);
  write(path.join(root, 'docs/allowed/note.md'), 'EVID-003 allowed internal fixture\n');
  write(path.join(directory, 'repo-neighbor/private.md'), `EVID-004 ${sentinel}\n`);
  fs.symlinkSync('../docs/allowed', path.join(root, 'plugins/internal'));
  fs.symlinkSync('../docs/allowed/note.md', path.join(root, 'plugins/internal-file.md'));
  fs.symlinkSync('../../repo-neighbor', path.join(root, 'plugins/outside'));
  fs.symlinkSync('../../repo-neighbor/private.md', path.join(root, 'plugins/outside-file.md'));
  const report = scan(root);
  assert.equal(report.candidate_count, 1);
  const [record] = report.records;
  assert.equal(record.canonical_path, 'docs/allowed/note.md');
  assert.deepEqual(record.alias_paths.sort(), ['plugins/internal-file.md', 'plugins/internal/note.md']);
  assert.equal(record.hits[0].text, 'EVID-003 allowed internal fixture');
  assert.deepEqual(report.aliases.filter((alias) => alias.outside_root).map((alias) => alias.canonical_path), [null, null]);
  assert.equal(report.alias_count, 4);
});
