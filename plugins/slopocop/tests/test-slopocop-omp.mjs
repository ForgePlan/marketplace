import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import slopocop from '../omp/slopocop.mjs';

const CORE_BODY = readFileSync(new URL('../skills/slopocop/SKILL.md', import.meta.url), 'utf8')
  .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const CORE_SENTINEL = CORE_BODY.split('## Optional examples', 1)[0].trim().slice(0, 120);
const STATE = 'slopocop-mode';
const LEGACY_STATE = 'slopocop-palych-mode';
const LEGACY_MARKER = '<!-- slopocop:palych-profile -->';
const MANAGED = '<!-- slopocop:start -->\nManaged project profile.';
const LEGACY_MANAGED = '<!-- palych:start -->\nManaged project profile.';

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
  const reload = () => slopocop(api);
  reload();
  const run = (prompt, systemPrompt = ['Preserve the user project instructions.']) => {
    const result = before({ prompt, systemPrompt }, ctx);
    const policy = result?.systemPrompt.at(-1);
    const line = policy?.split('\n').find(value => value.startsWith('{'));
    return { result, policy, mode: line ? JSON.parse(line) : undefined };
  };
  return { run, reload, entries, branchEntries, appended, ctx, api };
}

test('explicit OFF survives extension reload; quoted and embedded controls do not change it', () => {
  const state = session();
  assert.equal(state.run('Explain the change').mode.enabled, true);
  const off = state.run('Отключи Slopocop').mode;
  assert.equal(off.enabled, false);
  assert.equal(off.mode, 'off');
  assert.equal(off.applied, true);
  assert.deepEqual(state.appended, [{ customType: STATE, data: { enabled: false } }]);
  state.reload();
  assert.equal(state.run('Status after context boundary').mode.enabled, false);
  state.run('«Включи Slopocop»');
  state.run('Explain the command: Enable Slopocop');
  assert.equal(state.appended.length, 1, 'quoted/embedded controls must not append');
  assert.equal(state.run('Enable Slopocop.').mode.enabled, true);
  assert.deepEqual(
    state.appended.map(value => value.data),
    [{ enabled: false }, { enabled: true }],
  );
});

test('legacy public commands are not Slopocop aliases', () => {
  const state = session();
  assert.equal(state.run('Enable Slopocop').mode.enabled, true);
  assert.equal(state.appended.length, 1);
  for (const prompt of [
    'Enable palych',
    'Включи Палыча',
    'включи palych для этого разговора',
    'Отключи Палыча',
    'Turn off palych',
    'Disable palych always-on',
  ]) {
    const mode = state.run(prompt).mode;
    assert.equal('mode' in mode, false, `${prompt} must not be honoured`);
    assert.equal(mode.enabled, true, `${prompt} must not change the active mode`);
  }
  assert.equal(state.appended.length, 1);
});

test('explicit ON is recorded without claiming durable disk save, even when a session file is configured and append only changes memory', () => {
  const state = session('/disk/session.jsonl');
  const on = state.run('Включи Slopocop').mode;
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
  const off = ephemeral.run('Turn off Slopocop').mode;
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
  const flipped = state.run('Включи Slopocop').mode;
  assert.equal(flipped.enabled, true);
  assert.equal(state.appended.length, 1);
  assert.deepEqual(state.appended[0], { customType: STATE, data: { enabled: true } });
});

test('other system instructions survive turns and the profile does not accumulate', () => {
  const state = session();
  const base = ['Never deploy without approval.', 'Keep all requested API constraints.'];
  const first = state.run('Explain a new term', base).result;
  const second = state.run('Turn off Slopocop', first.systemPrompt).result;
  assert.deepEqual(second.systemPrompt.slice(0, -1), base);
  assert.equal(state.run('Status', second.systemPrompt).mode.enabled, false);
});

test('a previous own prompt marker is removed instead of accumulating', () => {
  const state = session();
  const legacy = `${LEGACY_MARKER}\nPalych OMP conversation mode: OFF.\nDo not reactivate Palych from old context.`;
  const out = state.run('Status', ['Preserve the user project instructions.', legacy]).result;
  assert.deepEqual(out.systemPrompt.slice(0, -1), ['Preserve the user project instructions.']);
  assert.ok(!out.systemPrompt.at(-1).includes(LEGACY_MARKER));
});

test('a legacy branch-local mode migrates once into the Slopocop entry', () => {
  const active = [{ type: 'custom', customType: LEGACY_STATE, data: { enabled: false } }];
  const state = session('/disk/session.jsonl', { active });
  const migrated = state.run('Status').mode;
  assert.equal(migrated.enabled, false);
  assert.deepEqual(state.appended, [{ customType: STATE, data: { enabled: false } }]);
  state.reload();
  assert.equal(state.run('Status again').mode.enabled, false);
  assert.equal(state.appended.length, 1, 'legacy mode must migrate only once');
  // The migrated OFF mode still survives an explicit ON/OFF round trip.
  assert.equal(state.run('Включи Slopocop').mode.enabled, true);
  assert.equal(state.run('Status').mode.enabled, true);
});

test('managed startup instructions are an alternative activation route, not a duplicate', () => {
  const state = session();
  const result = state.run('Explain a new term', [MANAGED]);
  assert.equal(result.result, undefined);
  assert.equal(state.appended.length, 0);
  const nativePolicy = state.run('Explain a new term').result.systemPrompt;
  const switched = state.run('Status', [...nativePolicy, MANAGED]).result;
  assert.deepEqual(switched.systemPrompt, ['Preserve the user project instructions.', MANAGED]);
});

test('legacy managed instructions get a Slopocop identity override without a second core', () => {
  const state = session();
  const base = ['Preserve the user project instructions.', LEGACY_MANAGED];
  const on = state.run('Explain a new term', base);
  assert.notEqual(on.result, undefined, 'legacy instructions must not silently keep the old identity');
  // The installed legacy block stays untouched (it still carries the rules); the
  // identity/mode override is appended after it, so 2 base chunks + 1 policy.
  assert.equal(on.result.systemPrompt.length, 3);
  assert.deepEqual(on.result.systemPrompt.slice(0, -1), base);
  assert.ok(on.result.systemPrompt.at(-1).startsWith('<!-- slopocop:profile -->'));
  assert.equal(on.mode.enabled, true);
  // Core sentinel taken from the shipped core itself: a duplicate injection of
  // the whole ruleset must fail even if its wording changes.
  assert.ok(session().run('Explain a new term').policy.includes(CORE_SENTINEL),
    'sentinel must be present in a core-carrying policy');
  assert.ok(!on.policy.includes(CORE_SENTINEL), 'the whole core must not be injected twice');
  // No state change just for overriding the identity of installed instructions.
  assert.equal(state.appended.length, 0);
  // An explicit mode still works and is preserved alongside the legacy block.
  state.run('Отключи Slopocop', on.result.systemPrompt);
  assert.deepEqual(state.appended, [{ customType: STATE, data: { enabled: false } }]);
  const off = state.run('Status', base);
  assert.equal(off.mode.enabled, false);
  assert.ok(!off.policy.includes(CORE_SENTINEL));
});
