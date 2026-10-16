#!/usr/bin/env node
// Проверочный Phase 0 spike; не runtime adapter и не сертификат host.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Mcp } from './mcp-client.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'evidencepack-core-probe-'));
const transcript = [];
const checks = [];
const limitations = [
  'Core probe only: no host-authenticated delegated principal, no adapter receipt.',
  'No production workspace mutations; generated artifacts exist only in isolated temporary workspace.',
  'Not the normative EvidencePack conformance suite; Phase 0 remains blocked without a protected host smoke.',
];
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sourceDigest = sha256(fs.readFileSync(new URL(import.meta.url)));
const resolvedBinary = fs.realpathSync(process.env.PATH.split(path.delimiter).map((dir) => path.join(dir, 'forgeplan')).find((file) => fs.existsSync(file)));
function cli(...args) {
  const result = spawnSync('forgeplan', args, { cwd: root, encoding: 'utf8', timeout: 30000, killSignal: 'SIGKILL', maxBuffer: 8 * 1024 * 1024 });
  transcript.push({ surface: 'cli', args, status: result.status, signal: result.signal, stdout: result.stdout, stderr: result.stderr, error: result.error?.message ?? null });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}
function check(name, fn) {
  const entry = { name, outcome: 'running' };
  checks.push(entry);
  try { fn(); entry.outcome = 'pass'; } catch (error) {
    entry.outcome = 'fail';
    entry.error = error.message;
    throw error;
  }
}
function validatedOne(result, id) {
  assert.equal(result.total_artifacts, 1);
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].artifact_id, id);
  assert.equal(result.results[0].passed, true);
  assert.equal(result.total_passed, 1);
  assert.equal(result.total_errors, 0);
}
function projection(id) {
  const dir = path.join(root, '.forgeplan', id.startsWith('EVID') ? 'evidence' : 'prds');
  const matches = fs.readdirSync(dir).filter((name) => name.startsWith(`${id}-`));
  assert.equal(matches.length, 1);
  return fs.readFileSync(path.join(dir, matches[0]), 'utf8');
}
function observedBody(record) {
  // Core вставляет generated identity frontmatter в body; он не часть observation.
  return record.body.replace(/^---\n(?:[^\n]*\n)*?---\n\n/, '');
}
const body = (verdict = 'supports', type = 'test', cl = 3) => `## Structured Fields\n\nverdict: ${verdict}\ncongruence_level: ${cl}\nevidence_type: ${type}\n\n## Observation\n\nReleased-binary Phase0 boundary probe; this is a synthetic isolated measurement of core semantics, not verification of Marketplace implementation.\n`;


let mcp;
let impostor;
let error = null;
let observations = {};
try {
  observations.binary_version = cli('--version').trim();
  assert.equal(observations.binary_version, 'forgeplan 0.38.0', 'Revisit this probe against new core semantics before asserting results.');
  cli('init', '-y');
  cli('new', 'prd', 'EvidencePack boundary probe parent');
  cli('new', 'evidence', 'CLI boundary probe supports');
  cli('update', 'EVID-001', '--body', body());
  cli('validate', 'EVID-001');
  const before = JSON.parse(cli('get', 'EVID-001', '--json'));
  check('CLI create/update/readback leaves unlinked draft', () => { assert.equal(before.status, 'draft'); assert.equal(before.kind, 'evidence'); assert.equal(observedBody(before), body()); });
  cli('link', 'EVID-001', 'PRD-001', '--relation', 'informs', '--auto-activate-complete');
  const after = JSON.parse(cli('get', 'EVID-001', '--json'));
  check('CLI own-source link activation postcondition', () => assert.equal(after.status, 'active'));

  mcp = new Mcp('phase0-script-not-a-host', { cwd: root, transcript });
  await mcp.initialize();
  const evidence = await mcp.tool('forgeplan_new', { kind: 'evidence', title: 'MCP boundary probe supports', workspace: root });
  const id = evidence.id;
  await mcp.tool('forgeplan_update', { id, body: body(), workspace: root });
  const healthyValidation = await mcp.tool('forgeplan_validate', { id, workspace: root });
  check('MCP validation executes one requested artifact', () => validatedOne(healthyValidation, id));
  const unlinked = await mcp.tool('forgeplan_get', { id, workspace: root });
  check('MCP validate/readback before link', () => { assert.equal(unlinked.status, 'draft'); assert.equal(observedBody(unlinked), body()); assert.equal(unlinked.links.outbound.length, 0); });
  await mcp.tool('forgeplan_link', { source: id, target: 'PRD-001', relation: 'informs', auto_activate_source_if_complete: true, workspace: root });
  const linked = await mcp.tool('forgeplan_get', { id, workspace: root });
  check('MCP activation edge and status readback', () => { assert.equal(linked.status, 'active'); assert.ok(linked.links.outbound.some((edge) => edge.target === 'PRD-001' && edge.relation === 'informs')); });
  check('CLI/MCP body/status semantic equivalence', () => { assert.equal(observedBody(linked), observedBody(after)); assert.equal(linked.status, after.status); });
  const score = await mcp.tool('forgeplan_score', { id: 'PRD-001', workspace: root });
  observations.supports_parent_score = score.r_eff;
  check('Supports CL3 exact parent score', () => assert.equal(score.r_eff, 1));

  impostor = new Mcp('guardian-forged-by-ordinary-client', { cwd: root, transcript });
  await impostor.initialize();
  await impostor.tool('forgeplan_update', { id, body: body(), workspace: root });
  const stamped = projection(id);
  check('Ordinary client can choose Guardian attribution without host proof', () => assert.ok(stamped.includes('last_modified_by: guardian-forged-by-ordinary-client/probe-1')));
  observations.forged_stamp = 'guardian-forged-by-ordinary-client/probe-1';
  const claim = await impostor.tool('forgeplan_claim', { id: 'PRD-001', agent: 'runtime-allowlisted-principal-forged-in-args', workspace: root });
  const claimPath = path.join(root, '.forgeplan', 'claims', 'PRD-001.yaml');
  const claimBytes = fs.readFileSync(claimPath, 'utf8');
  check('Ordinary arguments can choose claim principal', () => assert.ok(claimBytes.includes('runtime-allowlisted-principal-forged-in-args')));
  observations.claim_response = claim;
  await impostor.tool('forgeplan_release', { id: 'PRD-001', agent: 'runtime-allowlisted-principal-forged-in-args', workspace: root });

  const malformed = await mcp.tool('forgeplan_new', { kind: 'evidence', title: 'Unknown evidence type probe', workspace: root });
  await mcp.tool('forgeplan_update', { id: malformed.id, body: body('supports', 'unsupported_probe_type'), workspace: root });
  const unknownReadback = await mcp.tool('forgeplan_get', { id: malformed.id, workspace: root });
  check('Unknown evidence type persists exact malformed body', () => assert.equal(observedBody(unknownReadback), body('supports', 'unsupported_probe_type')));
  const validation = await mcp.tool('forgeplan_validate', { id: malformed.id, workspace: root });
  observations.unknown_type_validation = validation;
  check('Observed core unknown evidence_type acceptance', () => validatedOne(validation, malformed.id));
  await mcp.tool('forgeplan_update', { id: malformed.id, body: body() + '\nverdict: refutes\n', workspace: root });
  const duplicateReadback = await mcp.tool('forgeplan_get', { id: malformed.id, workspace: root });
  check('Duplicate verdict persists exact malformed body', () => assert.equal(observedBody(duplicateReadback), body() + '\nverdict: refutes\n'));
  const duplicateValidation = await mcp.tool('forgeplan_validate', { id: malformed.id, workspace: root });
  observations.duplicate_key_validation = duplicateValidation;
  check('Observed core duplicate structured verdict acceptance', () => validatedOne(duplicateValidation, malformed.id));

  for (const verdict of ['weakens', 'refutes']) {
    const item = await mcp.tool('forgeplan_new', { kind: 'evidence', title: `Core ${verdict} probe`, workspace: root });
    await mcp.tool('forgeplan_update', { id: item.id, body: body(verdict), workspace: root });
    await mcp.tool('forgeplan_link', { source: item.id, target: 'PRD-001', relation: 'informs', workspace: root });
    const current = await mcp.tool('forgeplan_score', { id: 'PRD-001', workspace: root });
    observations[`${verdict}_parent_score`] = current.r_eff;
    check(`${verdict} draft participates in exact parent R_eff`, () => assert.equal(current.r_eff, verdict === 'weakens' ? 0.5 : 0));
    await mcp.tool('forgeplan_activate', { id: item.id, workspace: root });
    const activated = await mcp.tool('forgeplan_get', { id: item.id, workspace: root });
    check(`${verdict} direct activation readback`, () => assert.equal(activated.status, 'active'));
    if (verdict === 'weakens') {
      await mcp.tool('forgeplan_supersede', { id: item.id, by: id, workspace: root });
    } else {
      await mcp.tool('forgeplan_deprecate', { id: item.id, reason: 'Synthetic probe complete; preserve observed refutation in isolated history', workspace: root });
    }
    const terminal = await mcp.tool('forgeplan_get', { id: item.id, workspace: root });
    check(`${verdict} terminal state readback`, () => assert.equal(terminal.status, verdict === 'weakens' ? 'superseded' : 'deprecated'));
    const restored = await mcp.tool('forgeplan_score', { id: 'PRD-001', workspace: root });
    check(`${verdict} terminal excluded from parent R_eff`, () => assert.equal(restored.r_eff, 1));
  }
  observations.active_get_hint = linked._next_action;
  const activeValidation = await mcp.tool('forgeplan_validate', { id, workspace: root });
  const activeReadback = await mcp.tool('forgeplan_get', { id, workspace: root });
  observations.active_validation_hint = activeValidation._next_action;
  check('Observed validation hint proposes activation for active Evidence', () => {
    assert.equal(activeReadback.status, 'active');
    assert.ok(activeValidation._next_action.includes('forgeplan_activate'));
  });
  observations.cli_new_supports_json = cli('new', '--help').includes('--json');
} catch (caught) { error = { name: caught.name, message: caught.message, stack: caught.stack }; }
finally {
  for (const client of [mcp, impostor]) {
    if (!client) continue;
    try { await client.close(); } catch (caught) {
      transcript.push({ surface: 'shutdown_error', error: caught.message });
      error ??= { name: caught.name, message: caught.message };
    }
  }
  const bytes = Buffer.from(JSON.stringify(transcript, null, 2) + '\n');
  const rawPath = path.join(root, 'transcript.json');
  fs.writeFileSync(rawPath, bytes, { mode: 0o600 });
  const report = {
    probe: 'evidencepack-phase0-core-trust-boundary', workspace: root,
    checked_at: new Date().toISOString(), checks_executed: checks.length, checks,
    checks_passed: checks.filter((item) => item.outcome === 'pass').length,
    checks_failed: checks.filter((item) => item.outcome === 'fail').length,
    probe_source_sha256: sourceDigest, resolved_binary: resolvedBinary,
    result: error ? 'probe_error' : 'core_checks_pass_trusted_host_gate_not_passed',
    phase0_verdict: 'BLOCKER', observations, limitations, error,
    raw: { path: rawPath, bytes: bytes.length, sha256: sha256(bytes), media_type: 'application/json' },
  };
  fs.writeFileSync(path.join(root, 'report.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = error ? 1 : 0;
}
