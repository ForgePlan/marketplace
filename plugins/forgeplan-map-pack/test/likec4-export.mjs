// Поведенческие проверки: настоящий LikeC4 парсит результат, а независимые
// изменения DSL должны отвергаться verifier. Исходники конвертера не меняются.
// Запуск: node test/likec4-export.mjs; установленный likec4 обязателен, без загрузок.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CONVERTER = fileURLToPath(new URL('../scripts/map-to-likec4.mjs', import.meta.url));
const VERIFIER = fileURLToPath(new URL('../scripts/verify-likec4.mjs', import.meta.url));
const GUARDIAN = fileURLToPath(new URL('../scripts/map-guardian.mjs', import.meta.url));
const CHECKPOINT = fileURLToPath(new URL('../fixtures/checkpoint-map.json', import.meta.url));
const cli = (process.env.PATH ?? '').split(delimiter).map((dir) => resolve(dir, 'likec4')).find(existsSync);
assert.ok(cli, 'Установленный likec4 должен быть в PATH; тест не устанавливает зависимости');
const LIKEC4 = realpathSync(cli);
const root = mkdtempSync(join(tmpdir(), 'map-likec4-test-'));
let passed = 0, failed = 0, commands = 0, sequence = 0;

function run(command, args, env = {}) {
  commands++;
  const result = spawnSync(command, args, {
    encoding: 'utf8', timeout: 60_000, maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, ...env },
  });
  assert.ifError(result.error);
  return { ...result, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}
function expectExit(result, status) {
  assert.equal(result.status, status, result.output);
}
function scenario(name, fn) {
  try { fn(); passed++; console.log(`  ok  ${name}`); }
  catch (error) { failed++; console.error(`  FAIL ${name}\n${error.stack}`); }
}
function input(name, doc) {
  const dir = join(root, `${sequence++}-${name}`);
  mkdirSync(dir);
  const map = join(dir, 'map.json');
  writeFileSync(map, JSON.stringify(doc));
  return { dir, map };
}
function verify(name, doc, status = 0, env = {}) {
  const fixture = input(name, doc);
  const project = join(fixture.dir, 'project');
  mkdirSync(project);
  const result = run(process.execPath, [VERIFIER, fixture.map, '--work-dir', project], env);
  expectExit(result, status);
  if (status === 0) assert.match(result.output, /verify-likec4: (MATCH|EMPTY) --/);
  if (status === 1) assert.match(result.output, /verify-likec4: MISMATCH --/);
  return { ...fixture, project, result };
}
function exported(fixture) {
  const json = JSON.parse(readFileSync(join(fixture.project, 'model.json'), 'utf8'));
  return Array.isArray(json) ? json[0] : json;
}
function baseMap() {
  return {
    schema: 'forgeplan.map/v1',
    meta: { map_id: 'likec4-test', status: 'proposed', project_type: 'test', composition_id: 'test', source_fingerprint: 'fixture', version: 1 },
    canvas: { grid: { cols: 1, rows: 1 }, gap: { x: 88, y: 70 }, margin: 40, cell: { card_w: 190, card_h: 60, card_gap: 36, zpad: { top: 50, side: 24, bottom: 24 } } },
    composition: { template: 'test', arrangement: 'stack-ttb', entry_zone: 'z.core', placements: [{ zone: 'z.core', cell: { row: 0, col: 0 } }], zone_connectors: [] },
    zones: [{ id: 'z.core', label: 'Core', kind: 'core', accent: '--map-accent-emerald', treatment: 'neutral-dashed', rule_edge: 'off', layout_rule: 'grid', cols: 2 }],
    nodes: ['a', 'b'].map((id) => ({ id, label: id, kind: 'component', zone: 'z.core', found_at: '2026-01-01T00:00:00Z' })),
    edges: [{ id: 'e.ab', from: 'a', to: 'b', relation: 'imports', verified_by: 'grep:fixture-import' }],
    flows: [],
  };
}
function guardianAccepts(fixture) {
  const result = run(process.execPath, [GUARDIAN, fixture.map, '--smoke']);
  expectExit(result, 0);
  assert.match(result.output, /\[PASS\] GC-4/);
  assert.doesNotMatch(result.output, /\[WARN\]|\[BLOCKER\]/);
}

// Прокси меняет только выходной DSL в одноразовом каталоге ПЕРЕД настоящим
// парсером. И validate, и export исполняет установленный бинарник, не заглушка.
const bin = join(root, 'bin');
mkdirSync(bin);
writeFileSync(join(bin, 'likec4'), `#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const args = process.argv.slice(2);
if (args[0] === 'validate') {
  const file = args[args.indexOf('--file') + 1];
  const original = readFileSync(file, 'utf8');
  let changed = original;
  switch (process.env.LIKEC4_TEST_MUTATION) {
    case 'lost-kind': changed = original.replaceAll('-[typedLink]->', '->'); break;
    case 'unknown-kind': changed = original.replace('relationship typedLink {', 'relationship otherKind {').replaceAll('-[typedLink]->', '-[otherKind]->'); break;
    case 'wrong-semantic-kind': changed = original.replaceAll('-[codeDep]->', '-[typedLink]->'); break;
    case 'reverse-edge': changed = original.replace('  z_core.a -[typedLink]-> z_core.b', '  z_core.b -[typedLink]-> z_core.a'); break;
    case 'truncate-flow': changed = original.replace("    z_core.b -[codeDep]-> z_core.c 'finish'", ''); break;
  }
  if (changed === original) { console.error('Не выполнено независимое изменение DSL'); process.exit(2); }
  writeFileSync(file, changed);
}
const result = spawnSync(process.env.LIKEC4_REAL_BIN, args, { stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 2);
`, { mode: 0o755 });
const mutationEnv = (mutation) => ({
  PATH: `${bin}${delimiter}${process.env.PATH ?? ''}`,
  LIKEC4_REAL_BIN: LIKEC4,
  LIKEC4_TEST_MUTATION: mutation,
});

try {
  const version = run(LIKEC4, ['--version']);
  expectExit(version, 0);
  console.log(`Node ${process.version}; LikeC4 ${version.stdout.trim()}`);

  scenario('published checkpoint: native export, verifier and deterministic conversion', () => {
    const fixture = verify('checkpoint', JSON.parse(readFileSync(CHECKPOINT, 'utf8')));
    const model = exported(fixture);
    assert.equal(Object.keys(model.elements).length, 21);
    assert.equal(Object.keys(model.relations).length, 14);
    assert.equal(Object.values(model.elements).filter((e) => e.kind === 'zone').length, 5);
    assert.equal(Object.values(model.views).filter((v) => v._type === 'dynamic').length, 2);
    const again = join(fixture.dir, 'again.c4');
    expectExit(run(process.execPath, [CONVERTER, fixture.map, '--out', again]), 0);
    const first = readFileSync(join(fixture.project, 'model.c4'));
    assert.deepEqual(readFileSync(again), first);
    console.log(`    checkpoint SHA-256 ${createHash('sha256').update(first).digest('hex')}`);
  });

  scenario('omitted namespace: imports is codeDep; all 11 canonical relations are typedLink', () => {
    const doc = baseMap();
    const relations = ['informs', 'based_on', 'supersedes', 'contradicts', 'refines', 'supports', 'demonstrates', 'covers', 'triangulates', 'references', 'belongs_to'];
    doc.edges.push(...relations.map((relation, i) => ({ id: `e.typed-${i}`, from: 'a', to: 'b', relation })));
    doc.edges.push({ id: 'e.override', from: 'b', to: 'a', relation: 'informs', namespace: 'code-dep', verified_by: 'grep:explicit-namespace' });
    const fixture = verify('namespace', doc);
    guardianAccepts(fixture);
    const actual = Object.values(exported(fixture).relations);
    assert.equal(actual.find((r) => r.title === 'imports').kind, 'codeDep');
    for (const relation of relations) {
      assert.equal(actual.find((r) => r.title === relation && r.source.model === 'z_core.a').kind, 'typedLink');
    }
    assert.equal(actual.find((r) => r.source.model === 'z_core.b').kind, 'codeDep');
  });

  scenario('reverse edges and explicit edge_ids choose the intended labels and directions', () => {
    const doc = baseMap();
    doc.edges = [
      { id: 'e.ab', from: 'a', to: 'b', relation: 'request', verified_by: 'grep:request' },
      { id: 'e.ba', from: 'b', to: 'a', relation: 'response', verified_by: 'grep:response' },
      { id: 'e.alt', from: 'b', to: 'a', relation: 'alternate', verified_by: 'grep:alternate' },
    ];
    doc.flows = [
      { id: 'reverse', name: 'Reverse', node_ids: ['b', 'a'], edge_ids: ['e.ba'], steps: ['Ответ'] },
      { id: 'automatic', name: 'Automatic', node_ids: ['b', 'a'], steps: ['Ответ без edge_ids'] },
      { id: 'explicit', name: 'Explicit', node_ids: ['b', 'a'], edge_ids: ['e.alt'], steps: ['Выбранное ребро'] },
      { id: 'reverse-only', name: 'Reverse only', node_ids: ['b', 'a'], edge_ids: ['e.ab'], steps: ['Обратный обход выбранного ребра'] },
      { id: 'roundtrip', name: 'Roundtrip', node_ids: ['a', 'b', 'a'], edge_ids: ['e.ba', 'e.ab'], steps: ['Запрос', 'Ответ'] },
    ];
    const fixture = verify('direction', doc);
    const views = exported(fixture).views;
    assert.equal(views.flow_reverse.edges[0].label, 'response');
    assert.equal(views.flow_automatic.edges[0].label, 'response');
    assert.equal(views.flow_explicit.edges[0].label, 'alternate');
    assert.equal(views['flow_reverse-only'].edges[0].label, 'request');
    for (const id of ['flow_reverse', 'flow_explicit', 'flow_reverse-only']) {
      assert.equal(views[id].edges[0].source, 'z_core.b');
      assert.equal(views[id].edges[0].target, 'z_core.a');
    }
    assert.deepEqual(views.flow_roundtrip.edges.map((e) => e.label), ['request', 'response']);
    // Для GC-8 проверяем документ с явными edge_ids: отсутствие списка допустимо
    // в схеме, но канонический guardian честно предупреждает о полноте подсветки.
    doc.flows.splice(1, 1);
    const checked = input('direction-guardian', doc);
    guardianAccepts(checked);
  });

  scenario('hyphen prefixes, collisions, reserved words, underscore and string escaping', () => {
    const doc = baseMap();
    doc.zones = [
      { ...doc.zones[0], id: '-zone' },
      { ...doc.zones[0], id: 'n-zone', accent: '--map-accent-cyan' },
    ];
    const label = "Работник 'api' \\ путь";
    const description = "Строка 'один' \\ файл\nВторая строка";
    doc.nodes = [
      { id: '-worker', label, description_ru: description, kind: '-module', zone: '-zone' },
      { id: 'n-worker', label: 'Collision', kind: 'n-module', zone: '-zone' },
      { id: 'a.b', label: 'Dotted', kind: 'model', zone: '-zone' },
      { id: 'a_b', label: 'Underscored', kind: 'component', zone: '-zone' },
      { id: '_internal', label: 'Internal', kind: 'component', zone: '-zone' },
      { id: '1worker', label: 'Numeric', kind: 'component', zone: 'n-zone' },
    ];
    doc.edges = [{ from: '-worker', to: 'n-worker', relation: 'imports' }];
    const fixture = verify('identifiers', doc);
    const elements = exported(fixture).elements;
    assert.deepEqual(Object.keys(elements).sort(), ['n-zone', 'n-zone.n-worker', 'n-zone.n-worker_2', 'n-zone.a_b', 'n-zone.a_b_2', 'n-zone._internal', 'n-zone_2', 'n-zone_2.n1worker'].sort());
    assert.equal(elements['n-zone.n-worker'].kind, 'n-module');
    assert.equal(elements['n-zone.n-worker_2'].kind, 'n-module_2');
    assert.equal(elements['n-zone.a_b'].kind, 'model_');
    assert.equal(elements['n-zone.n-worker'].title, label);
    assert.equal(elements['n-zone.n-worker'].description.txt, description);
  });

  scenario('collapsed group retains children metadata without fabricating elements', () => {
    const doc = baseMap();
    doc.nodes.push({ id: 'group', label: 'Group', kind: 'mega', zone: 'z.core', is_mega: true, collapsed: true, children: ['a', 'b'], found_at: '2026-01-01T00:00:00Z' });
    const fixture = verify('collapsed', doc);
    guardianAccepts(fixture);
    const elements = exported(fixture).elements;
    assert.equal(Object.keys(elements).length, 4);
    assert.equal(elements['z_core.group'].style.multiple, true);
    assert.deepEqual(elements['z_core.group'].metadata.children, ['a', 'b']);
  });

  for (const mutation of ['lost-kind', 'unknown-kind', 'wrong-semantic-kind', 'reverse-edge']) {
    scenario(`independent native DSL alteration: ${mutation} is MISMATCH`, () => {
      const doc = baseMap();
      if (mutation !== 'wrong-semantic-kind') doc.edges[0] = { from: 'a', to: 'b', relation: 'informs' };
      const fixture = verify(mutation, doc, 1, mutationEnv(mutation));
      const relations = Object.values(exported(fixture).relations);
      assert.equal(relations.length, 1);
      if (mutation === 'lost-kind') assert.equal(relations[0].kind, undefined);
      if (mutation === 'unknown-kind') assert.equal(relations[0].kind, 'otherKind');
      if (mutation === 'wrong-semantic-kind') assert.equal(relations[0].kind, 'typedLink');
      if (mutation === 'reverse-edge') assert.equal(relations[0].source.model, 'z_core.b');
      assert.match(fixture.result.output, /edges only in map.json/);
    });
  }

  scenario('independent dynamic chain truncation is MISMATCH despite unchanged flow count', () => {
    const doc = baseMap();
    doc.nodes.push({ ...doc.nodes[1], id: 'c', label: 'c' });
    doc.edges.push({ id: 'e.bc', from: 'b', to: 'c', relation: 'finish', verified_by: 'grep:finish' });
    doc.flows = [{ id: 'chain', name: 'Chain', node_ids: ['a', 'b', 'c'], edge_ids: ['e.bc', 'e.ab'], steps: ['Вход', 'Завершение'] }];
    const good = verify('full-chain', doc);
    assert.equal(exported(good).views.flow_chain.edges.length, 2);
    const altered = verify('truncated-chain', doc, 1, mutationEnv('truncate-flow'));
    assert.equal(exported(altered).views.flow_chain.edges.length, 1);
    assert.match(altered.result.output, /flows only in map.json/);
  });

  const invalidFlows = [
    ['ghost-phantom', (doc) => { doc.flows = [{ id: 'ghost', name: 'Ghost', node_ids: ['ghost', 'phantom'] }]; }, /ghost.*phantom/],
    ['missing-middle', (doc) => { doc.flows = [{ id: 'middle', name: 'Middle', node_ids: ['a', 'missing', 'b'] }]; }, /missing/],
    ['missing-endpoint', (doc) => { doc.flows = [{ id: 'endpoint', name: 'Endpoint', node_ids: ['a', 'phantom'] }]; }, /phantom/],
    ['unknown-edge-id', (doc) => { doc.flows = [{ id: 'edge', name: 'Edge', node_ids: ['a', 'b'], edge_ids: ['missing-edge'] }]; }, /missing-edge/],
    ['dangling-flow-edge', (doc) => { doc.edges.push({ id: 'e.ghost', from: 'b', to: 'ghost', relation: 'imports' }); doc.flows = [{ id: 'edge', name: 'Edge', node_ids: ['a', 'b'], edge_ids: ['e.ghost'] }]; }, /e.ghost/],
    ['missing-flow-id', (doc) => { doc.flows = [{ name: 'Missing', node_ids: ['a', 'b'] }]; }, /id/],
    ['duplicate-flow-id', (doc) => { doc.flows = Array.from({ length: 2 }, () => ({ id: 'duplicate', name: 'Duplicate', node_ids: ['a', 'b'] })); }, /duplicate/],
    ['single-node-flow', (doc) => { doc.flows = [{ id: 'single', name: 'Single', node_ids: ['a'] }]; }, /single/],
  ];
  for (const [name, alter, diagnostic] of invalidFlows) {
    scenario(`${name}: converter refuses without overwriting; verifier returns MISMATCH`, () => {
      const doc = baseMap();
      alter(doc);
      const fixture = verify(name, doc, 1);
      const out = join(fixture.dir, 'protected.c4');
      writeFileSync(out, 'protected output\n');
      const result = run(process.execPath, [CONVERTER, fixture.map, '--out', out]);
      expectExit(result, 1);
      assert.match(result.output, diagnostic);
      assert.doesNotMatch(fixture.result.output, /verify-likec4: MATCH/);
      assert.equal(readFileSync(out, 'utf8'), 'protected output\n');
      assert.equal(existsSync(`${out}.tmp`), false);
    });
  }

  scenario('empty input is distinguished from a substantive MATCH', () => {
    const fixture = verify('empty', { zones: [], nodes: [], edges: [], flows: [] });
    assert.match(fixture.result.output, /verify-likec4: EMPTY --/);
    assert.doesNotMatch(fixture.result.output, /verify-likec4: MATCH/);
  });

  scenario('existing dangling-zone and duplicate-node failures remain visible', () => {
    const dangling = baseMap();
    dangling.nodes[0].zone = 'missing-zone';
    const fixture = verify('dangling-zone', dangling, 1);
    assert.match(fixture.result.output, /unresolved-zone:missing-zone/);
    const duplicate = baseMap();
    duplicate.nodes.push({ ...duplicate.nodes[0] });
    const cannotRun = verify('duplicate-node', duplicate, 2);
    assert.match(cannotRun.result.output, /CANNOT RUN/);
  });
} finally {
  rmSync(root, { recursive: true, force: true });
}
console.log(`\nLikeC4 regression scenarios: ${passed} passed, ${failed} failed; ${commands} direct CLI invocations`);
process.exit(failed > 0 ? 1 : 0);
