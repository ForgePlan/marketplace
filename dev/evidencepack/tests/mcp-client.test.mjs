import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough, Writable } from 'node:stream';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { Mcp } from '../mcp-client.mjs';

const pipeError = () => Object.assign(new Error('SYNTHETIC_EPIPE'), { code: 'EPIPE' });
function clientFixture(t, { write = (_message, callback) => callback(), final = (callback) => callback() } = {}) {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.stdin = new Writable({
    write(chunk, _encoding, callback) { write(JSON.parse(chunk), callback, child); },
    final,
  });
  child.signals = [];
  child.kill = (signal) => {
    child.signals.push(signal);
    setImmediate(() => { child.emit('exit', null, signal); child.emit('close', null, signal); });
    return true;
  };
  child.unref = () => { child.unreferenced = true; };
  const transcript = [];
  const client = new Mcp('in-memory-fixture', { child, transcript });
  t.after(async () => { if (!client.closing) await client.close().catch(() => {}); });
  return { client, child, transcript };
}
function assertClean(client, child) {
  assert.equal(client.pending.size, 0);
  assert.equal(child.stdin.destroyed, true);
  assert.equal(child.stdout.destroyed, true);
  assert.equal(child.stderr.destroyed, true);
  assert.equal(child.unreferenced, true);
  assert.deepEqual(child.signals, ['SIGTERM']);
}

test('stdin write callback plus EPIPE event reject all pending requests and future writes', async (t) => {
  let failWrite;
  let writes = 0;
  const failure = pipeError();
  const { client, child, transcript } = clientFixture(t, {
    write(_message, callback) { writes++; failWrite = callback; },
  });
  const settled = Promise.allSettled([client.request('first', {}), client.request('second', {})]);
  assert.equal(client.pending.size, 2);
  failWrite(failure);
  const results = await settled;
  assert.ok(results.every((result) => result.status === 'rejected' && result.reason === failure));
  assert.equal(client.pending.size, 0);
  await assert.rejects(client.request('after-failure', {}), (error) => error === failure);
  assert.equal(writes, 1);
  assert.ok(transcript.every((entry) => entry.state === 'error' && entry.error === failure.message));
  await assert.rejects(client.close(), (error) => error === failure);
  assert.equal(transcript.at(-1).surface, 'mcp_shutdown');
  assertClean(client, child);
});

test('an stdin error event settles pending requests even without a failed write callback', async (t) => {
  const failure = pipeError();
  const { client, child, transcript } = clientFixture(t);
  const rejected = assert.rejects(client.request('waiting-for-response', {}), (error) => error === failure);
  child.stdin.emit('error', failure);
  await rejected;
  assert.equal(client.pending.size, 0);
  assert.equal(transcript[0].state, 'error');
  await assert.rejects(client.close(), (error) => error === failure);
  assertClean(client, child);
});

test('initialization notification EPIPE rejects initialization instead of reporting success', async (t) => {
  const failure = pipeError();
  const messages = [];
  const { client, child, transcript } = clientFixture(t, {
    write(message, callback, process) {
      messages.push(message);
      if (message.method === 'notifications/initialized') { callback(failure); return; }
      callback();
      queueMicrotask(() => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: message.id, result: {} }) + '\n'));
    },
  });
  await assert.rejects(client.initialize(), (error) => error === failure);
  assert.equal(Object.hasOwn(messages[1], 'id'), false);
  assert.deepEqual(transcript.map((entry) => entry.state), ['response', 'error']);
  assert.equal(client.pending.size, 0);
  await assert.rejects(client.close(), (error) => error === failure);
  assertClean(client, child);
});

test('shutdown EPIPE is reported after controlled cleanup and pending requests are settled', async (t) => {
  const failure = pipeError();
  const { client, child, transcript } = clientFixture(t, { final(callback) { callback(failure); } });
  const rejected = assert.rejects(client.request('waiting-during-shutdown', {}), /MCP client is closing/);
  await assert.rejects(client.close(), (error) => error === failure);
  await rejected;
  assert.equal(transcript[0].state, 'error');
  assert.equal(transcript.at(-1).surface, 'mcp_shutdown');
  assert.equal(transcript.at(-1).escalated, false);
  assertClean(client, child);
});

test('an idle transport failure is retained until cleanup rather than becoming a successful probe', async (t) => {
  const failure = pipeError();
  const { client, child } = clientFixture(t);
  child.stdin.emit('error', failure);
  await assert.rejects(client.close(), (error) => error === failure);
  assertClean(client, child);
});

test('healthy initialization, JSON tool response and intentional shutdown keep their semantics', async (t) => {
  const { client, child, transcript } = clientFixture(t, {
    write(message, callback, process) {
      callback();
      if (message.id === undefined) return;
      const result = message.method === 'tools/call' ? { content: [{ type: 'text', text: '{"fixture":true}' }] } : {};
      queueMicrotask(() => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: message.id, result }) + '\n'));
    },
  });
  await client.initialize();
  assert.deepEqual(await client.tool('fixture-only', {}), { fixture: true });
  await client.close();
  assert.deepEqual(transcript.map((entry) => entry.state), ['response', 'sent', 'response', undefined]);
  assert.equal(client.failure, null);
  assertClean(client, child);
});

for (const event of ['error', 'exit']) {
  test(`child ${event} still rejects pending requests and is preserved during cleanup`, async (t) => {
    const { client, child } = clientFixture(t);
    const rejected = assert.rejects(client.request('waiting-for-child', {}), /SYNTHETIC_CHILD_ERROR|MCP exited 2\/null/);
    if (event === 'error') child.emit('error', new Error('SYNTHETIC_CHILD_ERROR'));
    else child.emit('exit', 2, null);
    await rejected;
    await assert.rejects(client.close(), /SYNTHETIC_CHILD_ERROR|MCP exited 2\/null/);
    assertClean(client, child);
  });
}

// Подмена встроенных child_process действует только в одноразовом дочернем Node-процессе.
const preload = `
import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import path from 'node:path';
import { PassThrough, Writable } from 'node:stream';
const failingMethod = process.env.EVIDENCEPACK_FAIL_METHOD;
assert.ok(['initialize', 'notifications/initialized'].includes(failingMethod));
let body;
let linked = false;
childProcess.spawnSync = (command, args) => {
  assert.equal(command, 'forgeplan');
  let stdout = '';
  switch (args[0]) {
    case '--version': stdout = 'forgeplan 0.38.0\\n'; break;
    case 'init': case 'new': case 'validate': break;
    case 'update': body = args.at(-1); break;
    case 'link': linked = true; break;
    case 'get': stdout = JSON.stringify({ status: linked ? 'active' : 'draft', kind: 'evidence', body }); break;
    default: throw new Error('Unexpected synthetic CLI operation: ' + args[0]);
  }
  return { status: 0, signal: null, stdout, stderr: '' };
};
childProcess.spawn = (command, args, options) => {
  assert.equal(command, 'forgeplan');
  assert.deepEqual(args, ['serve']);
  assert.ok(options.cwd.startsWith(process.env.TMPDIR + path.sep));
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.stdin = new Writable({ write(chunk, _encoding, callback) {
    const message = JSON.parse(chunk);
    if (message.method === failingMethod) {
      callback(Object.assign(new Error('SYNTHETIC_EPIPE'), { code: 'EPIPE' }));
      return;
    }
    assert.equal(message.method, 'initialize');
    callback();
    queueMicrotask(() => child.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: message.id, result: {} }) + '\\n'));
  } });
  child.kill = (signal) => {
    setImmediate(() => { child.emit('exit', null, signal); child.emit('close', null, signal); });
    return true;
  };
  child.unref = () => fs.writeFileSync(path.join(options.cwd, 'synthetic-cleanup.json'), JSON.stringify({
    stdin: child.stdin.destroyed, stdout: child.stdout.destroyed, stderr: child.stderr.destroyed,
  }));
  return child;
};
syncBuiltinESMExports();
`;

for (const method of ['initialize', 'notifications/initialized']) {
  test(`core CLI emits a structured failing report and exits 1 on ${method} EPIPE without live binaries`, (t) => {
    const sandbox = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'evidencepack-process-test-')));
    t.after(() => fs.rmSync(sandbox, { recursive: true, force: true }));
    const bin = path.join(sandbox, 'bin');
    fs.mkdirSync(bin);
    // Неисполняемый placeholder удовлетворяет только поиску binary path; запуск всегда mocked.
    fs.writeFileSync(path.join(bin, 'forgeplan'), '', { mode: 0o600 });
    const preloadPath = path.join(sandbox, 'preload.mjs');
    fs.writeFileSync(preloadPath, preload);
    const result = spawnSync(process.execPath, ['--import', preloadPath, fileURLToPath(new URL('../identity-core-probe.mjs', import.meta.url))], {
      cwd: sandbox, encoding: 'utf8', timeout: 5000,
      env: { ...process.env, NODE_OPTIONS: '', PATH: bin, TMPDIR: sandbox, EVIDENCEPACK_FAIL_METHOD: method },
    });
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.equal(result.status, 1, result.stderr);
    assert.equal(result.stderr, '', 'stream errors must not escape as uncaught exceptions');
    const report = JSON.parse(result.stdout);
    assert.equal(report.result, 'probe_error');
    assert.equal(report.error.message, 'SYNTHETIC_EPIPE');
    assert.equal(report.phase0_verdict, 'BLOCKER');
    assert.equal(report.checks_executed, 2, 'only synthetic CLI setup checks ran before the failing transport');
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(report.workspace, 'report.json'), 'utf8')), report);
    const transcript = JSON.parse(fs.readFileSync(report.raw.path, 'utf8'));
    assert.ok(transcript.some((entry) => entry.method === method && entry.state === 'error' && entry.error === 'SYNTHETIC_EPIPE'));
    assert.ok(!transcript.some((entry) => entry.state === 'pending'));
    assert.ok(transcript.some((entry) => entry.surface === 'mcp_shutdown' && entry.signal === 'SIGTERM' && !entry.escalated));
    assert.ok(transcript.some((entry) => entry.surface === 'shutdown_error' && entry.error === 'SYNTHETIC_EPIPE'));
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(report.workspace, 'synthetic-cleanup.json'), 'utf8')), {
      stdin: true, stdout: true, stderr: true,
    });
  });
}
