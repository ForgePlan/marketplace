import assert from 'node:assert/strict';
import test from 'node:test';
import palych from '../omp/palych.mjs';

const STATE = 'slopocop-palych-mode';

function session(file = '/tmp/session.jsonl', { active = [], all = [] } = {}) {
  const entries = [...active, ...all];
  const branchEntries = [...active];
  const ctx = {
    sessionManager: {
      getEntries: () => entries,
      getBranch: () => branchEntries,
      getSessionFile: () => file,
    },
  };
  let before;
  const appended = [];
  const api = {
    on: (name, handler) => { if (name === 'before_agent_start') before = handler; },
    appendEntry: (customType, data) => {
      appended.push({ customType, data });
      const entry = { type: 'custom', customType, data };
      entries.push(entry);
      branchEntries.push(entry);
    },
  };
  const reload = () => palych(api);
  reload();
  const run = (prompt, systemPrompt = ['Preserve the user project instructions.']) => {
    const result = before({ prompt, systemPrompt }, ctx);
    const policy = result?.systemPrompt.at(-1);
    const line = policy?.split('\n').find(value => value.startsWith('{'));
    return { result, mode: line ? JSON.parse(line) : undefined };
  };
  return { run, reload, entries, branchEntries, appended, ctx, api };
}

test('explicit OFF survives extension reload; quoted and embedded controls do not change it', () => {
  const state = session();
  assert.equal(state.run('Explain the change').mode.enabled, true);
  const off = state.run('Отключи Палыча').mode;
  assert.equal(off.enabled, false);
  assert.equal(off.mode, 'off');
  assert.equal(off.applied, true);
  assert.deepEqual(state.appended, [{ customType: STATE, data: { enabled: false } }]);
  state.reload();
  assert.equal(state.run('Status after context boundary').mode.enabled, false);
  state.run('«Включи Палыча»');
  state.run('Explain the command: Enable palych');
  assert.equal(state.appended.length, 1, 'quoted/embedded controls must not append');
  assert.equal(state.run('Enable palych.').mode.enabled, true);
  assert.deepEqual(
    state.appended.map(value => value.data),
    [{ enabled: false }, { enabled: true }],
  );
});

test('explicit ON is recorded without claiming durable disk save, even when a session file is configured and append only changes memory', () => {
  const state = session('/disk/session.jsonl');
  const on = state.run('Включи Палыча').mode;
  assert.equal(on.enabled, true);
  assert.equal(on.mode, 'on');
  assert.equal(on.applied, true);
  assert.equal(on.entry, 'appended');
  // Truthful limit: getSessionFile() reports the configured path only and
  // pi.appendEntry may not throw on journal failures. No supported API
  // exposes host disk persistence — saved:true is never a contract truth.
  assert.equal(on.persistence, 'unconfirmed');
  assert.equal('saved' in on, false, 'metadata must not claim disk save');
  assert.equal('durable' in on, false, 'metadata must not claim a durability flag');
  const ephemeral = session(null);
  const off = ephemeral.run('Turn off palych').mode;
  assert.equal(off.persistence, 'in-memory');
  assert.deepEqual(ephemeral.appended, [{ customType: STATE, data: { enabled: false } }]);
});

test('overrides on sibling branches do not leak into the active branch', () => {
  // Active branch contains an explicit OFF override; a more recent sibling-branch
  // ON override exists in the journal but lives on a different ancestry chain.
  // Parent reproduction showed old getEntries() code resolving enabled=true in
  // exactly this shape; getBranch() must keep the active identity intact.
  const active = [{ type: 'custom', customType: STATE, data: { enabled: false } }];
  const sibling = [{ type: 'custom', customType: STATE, data: { enabled: true } }];
  const state = session('/disk/session.jsonl', { active, all: sibling });
  assert.equal(state.run('Status').mode.enabled, false);
  state.reload();
  assert.equal(state.run('Status again').mode.enabled, false);
  // Non-command turns must not append; the override stays as seeded.
  assert.equal(state.appended.length, 0);
  // Explicit ON on the active chain still flips the active branch in place.
  const flipped = state.run('Включи Палыча').mode;
  assert.equal(flipped.enabled, true);
  assert.equal(state.appended.length, 1);
  assert.deepEqual(state.appended[0], { customType: STATE, data: { enabled: true } });
});

test('other system instructions survive turns and the profile does not accumulate', () => {
  const state = session();
  const base = ['Never deploy without approval.', 'Keep all requested API constraints.'];
  const first = state.run('Explain a new term', base).result;
  const second = state.run('Turn off palych', first.systemPrompt).result;
  assert.deepEqual(second.systemPrompt.slice(0, -1), base);
  assert.equal(state.run('Status', second.systemPrompt).mode.enabled, false);
});

test('managed startup instructions are an alternative activation route, not a duplicate', () => {
  const state = session();
  const result = state.run('Explain a new term', ['<!-- palych:start -->\nManaged project profile.']);
  assert.equal(result.result, undefined);
  assert.equal(state.appended.length, 0);
  const nativePolicy = state.run('Explain a new term').result.systemPrompt;
  const managed = '<!-- palych:start -->\nManaged project profile.';
  const switched = state.run('Status', [...nativePolicy, managed]).result;
  assert.deepEqual(switched.systemPrompt, ['Preserve the user project instructions.', managed]);
});
