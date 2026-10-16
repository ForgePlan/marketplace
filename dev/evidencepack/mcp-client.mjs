// Транспорт исследовательского Phase 0 probe; не production adapter.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

export class Mcp {
  constructor(name, { cwd, transcript, child = spawn('forgeplan', ['serve'], { cwd, stdio: ['pipe', 'pipe', 'pipe'] }) }) {
    this.name = name;
    this.transcript = transcript;
    this.next = 1;
    this.pending = new Map();
    this.stderr = '';
    this.failure = null;
    this.closing = false;
    this.child = child;
    this.closed = new Promise((resolve) => this.child.once('close', (code, signal) => resolve({ code, signal })));
    this.child.stderr.on('data', (data) => { this.stderr += data; });
    this.child.stdin.on('error', (error) => this.fail(error));
    this.child.on('error', (error) => this.fail(error));
    this.child.on('exit', (code, signal) => {
      if (!this.closing) this.fail(new Error(`MCP exited ${code}/${signal}: ${this.stderr}`));
    });
    this.lines = createInterface({ input: this.child.stdout });
    this.lines.on('line', (line) => {
      let value;
      try { value = JSON.parse(line); } catch { this.fail(new Error(`Non-JSON MCP stdout: ${line}`)); return; }
      const waiter = this.pending.get(value.id);
      if (!waiter) return;
      this.pending.delete(value.id);
      clearTimeout(waiter.timer);
      value.error ? waiter.reject(new Error(JSON.stringify(value.error))) : waiter.resolve(value.result);
    });
  }
  rejectPending(error) {
    for (const waiter of this.pending.values()) { clearTimeout(waiter.timer); waiter.reject(error); }
    this.pending.clear();
  }
  fail(error) {
    this.failure ??= error;
    this.rejectPending(this.failure);
  }
  request(method, params, { notification = false } = {}) {
    const id = notification ? undefined : this.next++;
    const key = id ?? Symbol(method);
    const entry = { surface: 'mcp', untrusted_client_info: this.name, rpc_id: id, method, params, state: 'pending' };
    this.transcript.push(entry);
    return new Promise((resolve, reject) => {
      if (this.failure || this.closing) { reject(this.failure ?? new Error('MCP client is closing')); return; }
      const timer = setTimeout(() => { this.pending.delete(key); reject(new Error(`MCP timeout: ${method}/${params?.name ?? ''}`)); }, 30000);
      this.pending.set(key, { resolve, reject, timer });
      try {
        this.child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`, (error) => {
          if (error) { this.fail(error); return; }
          if (notification && this.pending.delete(key)) { clearTimeout(timer); resolve(); }
        });
      } catch (error) { this.fail(error); }
    }).then((result) => {
      entry.state = notification ? 'sent' : 'response'; entry.result = result; return result;
    }, (error) => {
      entry.state = 'error'; entry.error = error.message; entry.stderr = this.stderr; throw error;
    });
  }
  async initialize() {
    await this.request('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: this.name, version: 'probe-1' } });
    await this.request('notifications/initialized', undefined, { notification: true });
  }
  async tool(name, args) {
    const result = await this.request('tools/call', { name, arguments: args });
    assert.notEqual(result.isError, true, JSON.stringify(result));
    const text = (result.content ?? []).filter((item) => item.type === 'text').map((item) => item.text).join('\n');
    return JSON.parse(text);
  }
  async close() {
    this.closing = true;
    this.rejectPending(this.failure ?? new Error('MCP client is closing'));
    try { this.child.stdin.end(); } catch (error) { this.fail(error); }
    this.child.kill('SIGTERM');
    let escalated = false;
    const force = setTimeout(() => { escalated = true; this.child.kill('SIGKILL'); }, 1000);
    let deadline;
    try {
      const status = await Promise.race([this.closed, new Promise((_, reject) => {
        deadline = setTimeout(() => reject(new Error('MCP shutdown did not close after SIGKILL')), 5000);
      })]);
      this.transcript.push({ surface: 'mcp_shutdown', untrusted_client_info: this.name, escalated, ...status });
      if (this.failure) throw this.failure;
    } finally {
      clearTimeout(force); clearTimeout(deadline);
      this.lines.close();
      this.child.stdin.destroy(); this.child.stdout.destroy(); this.child.stderr.destroy(); this.child.unref();
    }
  }
}
