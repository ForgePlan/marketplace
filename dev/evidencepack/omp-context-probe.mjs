#!/usr/bin/env node
// Измеряет реальную host-owned extension surface без model run и ForgePlan mutations.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'evidencepack-omp-context-'));
const target = path.join(root, 'context.json');
const extension = path.join(root, 'probe.ts');
const sourceDigest = createHash('sha256').update(fs.readFileSync(new URL(import.meta.url))).digest('hex');
fs.writeFileSync(extension, `import fs from 'node:fs';
export default function(pi) {
  pi.on('session_start', (_event, ctx) => {
    const manager = ctx.sessionManager;
    const header = manager?.getHeader?.();
    fs.writeFileSync(${JSON.stringify(target)}, JSON.stringify({
      context_keys: Object.keys(ctx).sort(),
      agent: ctx.agent ?? null,
      agent_kind: ctx.agentKind ?? null,
      agent_id: ctx.agentId ?? null,
      agent_profile: ctx.artifactProfile ?? ctx.agentProfile ?? null,
      primary_responsibility: ctx.primaryResponsibility ?? null,
      session_id: manager?.getSessionId?.() ?? null,
      parent_session: header?.parentSession ?? null,
      header_keys: header ? Object.keys(header).sort() : [],
      has_register_tool: typeof pi.registerTool === 'function',
      has_event_bus: typeof pi.events?.on === 'function',
    }, null, 2));
  });
}
`);
const args = ['--mode', 'rpc', '--cwd', root, '--no-extensions', '--extension', extension, '--no-tools', '--no-skills', '--no-rules', '--no-session', '--no-title', '--no-lsp'];
let child;
let stdout = '';
let stderr = '';
let status = null;
let context = null;
let error = null;
let timedOut = false;
let captureComplete = false;
let escalated = false;
let timer;
let forceTimer;
let deadline;
let version = null;
let resolvedBinary = null;
try {
  const versionResult = spawnSync('omp', ['--version'], { encoding: 'utf8', timeout: 10000, killSignal: 'SIGKILL' });
  assert.equal(versionResult.status, 0, versionResult.error?.message ?? versionResult.stderr);
  version = versionResult.stdout.trim();
  resolvedBinary = fs.realpathSync(process.env.PATH.split(path.delimiter).map((dir) => path.join(dir, 'omp')).find((file) => fs.existsSync(file)));
  child = spawn('omp', args, { stdio: ['pipe', 'pipe', 'pipe'] });
  child.stdout.on('data', (data) => { stdout += data; });
  child.stderr.on('data', (data) => { stderr += data; });
  function stop() {
    child.stdin.end();
    child.kill('SIGTERM');
    if (!forceTimer) forceTimer = setTimeout(() => { escalated = true; child.kill('SIGKILL'); }, 1000);
  }
  const closed = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => resolve({ code, signal }));
  });
  child.stdin.on('error', (caught) => { error ??= { name: caught.name, message: caught.message }; stop(); });
  timer = setTimeout(() => { timedOut = true; stop(); }, 20000);
  child.stdout.on('data', () => {
    if (!captureComplete && fs.existsSync(target)) { captureComplete = true; stop(); }
  });
  child.stdin.write(JSON.stringify({ id: 'probe-state', type: 'get_state' }) + '\n');
  status = await Promise.race([closed, new Promise((_, reject) => {
    deadline = setTimeout(() => reject(new Error('OMP shutdown did not close after SIGKILL')), 25000);
  })]);
  assert.equal(timedOut, false, 'OMP host context capture timed out');
  assert.equal(captureComplete, true, 'OMP exited without capturing extension context');
  context = JSON.parse(fs.readFileSync(target, 'utf8'));
  assert.equal(context.agent.kind, 'main');
  assert.equal(context.agent.id, 'Main');
  assert.ok(typeof context.session_id === 'string' && context.session_id.length > 0);
} catch (caught) { error ??= { name: caught.name, message: caught.message }; }
finally {
  clearTimeout(timer); clearTimeout(forceTimer); clearTimeout(deadline);
  if (child) {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    child.stdin.destroy(); child.stdout.destroy(); child.stderr.destroy(); child.unref();
  }
  const report = {
    root, args, status, context, stdout, stderr, model_runs: 0, forgeplan_mutations: 0,
    timed_out: timedOut, capture_complete: captureComplete, shutdown_escalated: escalated,
    result: error ? 'probe_error' : 'main_context_observed_not_mutation_certified',
    error, runtime_version: version, resolved_binary: resolvedBinary, probe_source_sha256: sourceDigest,
    classification: 'uncertified_extension_context_only', checked_at: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(root, 'report.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = error ? 1 : 0;
}
