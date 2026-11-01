import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const cli = fileURLToPath(new URL('../inventory-reconcile.mjs', import.meta.url));
const sha = 'a'.repeat(64);
const candidate = (path = 'plugins/a.md') => ({ canonical_path: path, sha256: sha, alias_paths: ['aliases/a.md'], classification_state: 'requires_manual_reconciliation', hits: [{ text: 'SECRET_SOURCE_SNIPPET' }] });
const classification = (path = 'plugins/a.md') => ({ canonical_path: path, sha256: sha, alias_paths: ['aliases/a.md'], role: 'both', rationale: 'Reviewed the implementation.', artifact_profile: 'review', primary_responsibility: 'Review artifacts', operations: ['forgeplan_new'], capability: 'writes evidence', plugin: 'example', plugin_version: '1.0', protocol: 'example protocol', protocol_version: '1.0' });
const census = () => ({ census: 'evidencepack-independent-content-v1', root: '/example', checked_at: '2026-01-01T00:00:00Z', normative_inventory_complete: false, candidate_count: 1, errors: [], records: [candidate()] });
const manual = () => ({ schema: 'evidencepack-manual-inventory-v1', classifications: [classification()] });
function run(c, m, raw = false) {
  const dir = mkdtempSync(join(tmpdir(), 'inventory-test-'));
  try {
    const a = join(dir, 'census.json'); const b = join(dir, 'manual.json');
    writeFileSync(a, raw ? c : JSON.stringify(c)); writeFileSync(b, JSON.stringify(m));
    const result = spawnSync(process.execPath, [cli, a, b], { encoding: 'utf8' });
    return { ...result, report: result.stdout ? JSON.parse(result.stdout) : null };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
const codes = (result) => result.report.issues.map((issue) => issue.code);

test('complete inventory retains aliases and omits raw source hits', () => {
  const result = run(census(), manual());
  assert.equal(result.status, 0); assert.equal(result.report.structurally_complete, true);
  assert.equal(result.report.normative_inventory_complete, false);
  assert.deepEqual(result.report.records[0].alias_paths, ['aliases/a.md']);
  assert.equal(result.stdout.includes('SECRET_SOURCE_SNIPPET'), false);
});
test('zero candidates and missing classifications fail closed', () => {
  const c = census(); c.records = []; c.candidate_count = 0;
  let result = run(c, { schema: 'evidencepack-manual-inventory-v1', classifications: [] });
  assert.equal(result.status, 1); assert.ok(codes(result).includes('no_candidates'));
  result = run(census(), { schema: 'evidencepack-manual-inventory-v1', classifications: [] });
  assert.equal(result.status, 1); assert.ok(codes(result).includes('missing_classification'));
});
test('stale, duplicate, unknown and unresolved entries fail', () => {
  const m = manual(); m.classifications[0].sha256 = 'b'.repeat(64); m.classifications[0].capability = 'unknown';
  m.classifications.push(classification(), classification('unknown.md'));
  const result = run(census(), m);
  assert.equal(result.status, 1);
  for (const code of ['stale_hash', 'duplicate_classification', 'unknown_path', 'invalid_field']) assert.ok(codes(result).includes(code), code);
});
test('scan errors and inconsistent aliases fail', () => {
  const c = census(); c.errors = [{ error: 'sensitive error' }];
  const m = manual(); m.classifications[0].alias_paths = [];
  const result = run(c, m); assert.equal(result.status, 1);
  assert.ok(codes(result).includes('census_scan_errors')); assert.ok(codes(result).includes('alias_mismatch'));
  assert.equal(result.stdout.includes('sensitive error'), false);
});
test('false positives can coexist with actors but cannot form coverage', () => {
  const c = census(); c.records.push({ ...candidate('other.md'), alias_paths: ['aliases/other.md'] }); c.candidate_count++;
  const m = manual(); m.classifications.push({ canonical_path: 'other.md', sha256: sha, alias_paths: ['aliases/other.md'], role: 'false_positive', rationale: 'Documentation only.' });
  assert.equal(run(c, m).status, 0);
  c.records.shift(); c.candidate_count--; m.classifications.shift();
  const result = run(c, m); assert.equal(result.status, 1);
  assert.ok(codes(result).includes('missing_producer')); assert.ok(codes(result).includes('missing_consumer'));
});

test('aliases cannot identify two distinct canonical candidates', () => {
  const c = census();
  c.records.push({ ...candidate('other.md'), alias_paths: ['aliases/a.md'] });
  c.candidate_count++;
  const m = manual();
  m.classifications.push(classification('other.md'));
  const sharedAlias = run(c, m);
  assert.equal(sharedAlias.status, 1);
  assert.ok(codes(sharedAlias).includes('path_collision'));
  c.records[1].alias_paths = ['plugins/a.md'];
  m.classifications[1].alias_paths = ['plugins/a.md'];
  const canonicalCollision = run(c, m);
  assert.equal(canonicalCollision.status, 1);
  assert.ok(codes(canonicalCollision).includes('path_collision'));
});
test('producer and consumer categories are independently required', () => {
  const m = manual(); m.classifications[0].role = 'producer';
  const result = run(census(), m); assert.equal(result.status, 1); assert.ok(codes(result).includes('missing_consumer'));
});

test('reviewed absence is distinct from unknown plugin or protocol metadata', () => {
  const m = manual();
  Object.assign(m.classifications[0], {
    plugin: null, plugin_version: null, plugin_absence_reason: 'Standalone repository script.',
    protocol: null, protocol_version: null, protocol_absence_reason: 'No versioned protocol implemented.',
  });
  const complete = run(census(), m);
  assert.equal(complete.status, 0);
  assert.equal(complete.report.records[0].protocol, null);
  assert.equal(complete.report.records[0].protocol_absence_reason, 'No versioned protocol implemented.');
  delete m.classifications[0].protocol_absence_reason;
  const unresolved = run(census(), m);
  assert.equal(unresolved.status, 1);
  assert.ok(unresolved.report.issues.some((issue) => issue.field === 'protocol'));
});
test('output is deterministic for identical inputs', () => {
  assert.equal(run(census(), manual()).stdout, run(census(), manual()).stdout);
});
test('malformed inputs and invalid schemas fail', () => {
  const badJson = run('{', manual(), true); assert.equal(badJson.status, 2); assert.equal(badJson.stdout, '');
  const badSchema = run({ records: [null] }, { classifications: [null] });
  assert.equal(badSchema.status, 1); assert.ok(codes(badSchema).includes('invalid_census'));
  const usage = spawnSync(process.execPath, [cli], { encoding: 'utf8' }); assert.equal(usage.status, 2);
});
