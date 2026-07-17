// ============================================================================
// test/emit-script.mjs -- regression test for the DETERMINISTIC scripts/map-emit.mjs
// ============================================================================
// The 2026-07-15 forgeplan-web dogfood proved the LLM-typed emit cannot scale:
// a 274-node / 316-edge document (~4,000 lines) blew the 64k output cap three
// runs running (round 3 with prose suppressed to 5 lines STILL died -> the
// DOCUMENT is the cap-breaker, not the agent). map-emit.mjs moves everything
// mechanical into a script; the agent now only decides flows.
//
// The strongest assertion here is the END-TO-END one: emit a document, then run
// the REAL map-guardian.mjs over it and require exit 0. That proves the emitter
// and the gates actually agree -- the class of bug no unit assertion catches.
// Zero deps, plain `node test/emit-script.mjs` from the plugin root.
// ============================================================================
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const EMIT = fileURLToPath(new URL('../scripts/map-emit.mjs', import.meta.url));
const GUARDIAN = fileURLToPath(new URL('../scripts/map-guardian.mjs', import.meta.url));
const h = (kind, slug) => createHash('sha1').update(`${kind}:${slug}`).digest('hex').slice(0, 12);

let pass = 0, failn = 0;
const check = (name, cond, detail) => {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { failn++; console.log(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); }
};

// --- synthetic inputs -------------------------------------------------------
const nFoo = h('module', 'src/foo.js');
const nBar = h('module', 'src/bar.js');
const nPrd = h('prd', 'PRD-001');
const nRfc = h('rfc', 'RFC-001');
const nMega = h('mega', 'z.decisions:prd');

const extract = () => ({
  project: { title: 'Test Project', description_ru: 'Тестовый проект — описание из README.' },
  repo_head: 'd014f508f92fcfcbdf448debbe76a33dffa4465f',
  manifests: [],
  zones: [
    { id: 'z.surfaces', label: 'Routes', kind: 'surface', accent: '--map-accent-cyan', treatment: 'neutral-dashed', rule_edge: 'off', layout_rule: 'grid', cols: 2 },
    { id: 'z.core', label: 'Core', kind: 'core', accent: '--map-accent-emerald', treatment: 'neutral-dashed', rule_edge: 'off', layout_rule: 'grid', cols: 2 },
    { id: 'z.decisions', label: 'Decisions', kind: 'truth', accent: '--map-accent-slate', treatment: 'neutral-dashed', rule_edge: 'off', layout_rule: 'grid', cols: 4 },
  ],
  layers: [],
  nodes: [
    { id: nFoo, label: 'foo', kind: 'module', zone: 'z.surfaces', provenance: { source: 'code', ref: 'src/foo.js', confidence: 1 }, found_at: '2026-01-01T00:00:00Z', _content_sig: 'blobfoo' },
    // found_at ONLY in provenance -> the script must hoist it (the dogfood's "two false alarms" note)
    { id: nBar, label: 'bar', kind: 'module', zone: 'z.core', provenance: { source: 'code', ref: 'src/bar.js', confidence: 1, found_at: '2026-01-02T00:00:00Z' }, _content_sig: 'blobbar' },
    { id: nPrd, label: 'PRD-001 — Title', kind: 'prd', zone: 'z.decisions', provenance: { source: 'forgeplan', ref: 'PRD-001', confidence: 1 }, found_at: '2026-01-03T00:00:00Z', _content_sig: '2026-01-03' },
    { id: nRfc, label: 'RFC-001 — Title', kind: 'rfc', zone: 'z.decisions', provenance: { source: 'forgeplan', ref: 'RFC-001', confidence: 1 }, found_at: '2026-01-04T00:00:00Z', _content_sig: '2026-01-04' },
    { id: nMega, label: 'PRDs (2)', kind: 'mega', zone: 'z.decisions', is_mega: true, collapsed: true, children: [nPrd, nRfc], provenance: { source: 'zone-extractor', ref: 'mega:z.decisions:prd', confidence: 1 }, found_at: '2026-01-03T00:00:00Z' },
  ],
  megaNodes: [],
});

const edges = () => ({
  typedLink: [{ id: 'e1', from: nRfc, to: nPrd, relation: 'based_on', namespace: 'typed-link', trust: 'high' }],
  codeDep: [{ id: 'e2', from: nFoo, to: nBar, relation: 'imports', namespace: 'code-dep', trust: 'medium', verified_by: 'grep:BARMARK' }],
});

// no fixed placements -> forces the tier-row layout path
const composition = () => ({
  template: 'web-fullstack',
  project_type: 'web-fullstack',
  entry_zone: 'z.surfaces',
  canvas: { gap: { x: 88, y: 70 }, margin: 40, cell: { card_w: 190, card_h: 60, card_gap: 36, zpad: { top: 50, side: 24, bottom: 24 } } },
  zone_connectors: [],
});

// the agent's ONLY judgment: which nodes tell the story. nPrd is a hidden
// collapsed child -> the script must rewrite it to its mega (CM-01).
const plan = () => ({ flows: [{ id: 'f.request', name: 'Request', node_ids: [nFoo, nBar], steps: ['Шаг 1', 'Шаг 2'] }, { id: 'f.decisions', name: 'Decide', node_ids: [nPrd], steps: ['Решение'] }] });

function setup(overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'mapemit-'));
  mkdirSync(join(dir, 'work'), { recursive: true });
  const p = {
    extract: join(dir, 'work/.extract.json'),
    edges: join(dir, 'work/.edges.json'),
    composition: join(dir, 'work/.composition.json'),
    plan: join(dir, 'work/.emit-plan.json'),
    out: join(dir, 'map.json'),
    dir,
  };
  writeFileSync(p.extract, JSON.stringify(overrides.extract ?? extract()));
  writeFileSync(p.edges, JSON.stringify(overrides.edges ?? edges()));
  writeFileSync(p.composition, JSON.stringify(overrides.composition ?? composition()));
  writeFileSync(p.plan, JSON.stringify(overrides.plan ?? plan()));
  return p;
}

function emit(p, extraArgs = []) {
  const argv = [EMIT, '--extract', p.extract, '--edges', p.edges, '--composition', p.composition, '--plan', p.plan, '--out', p.out, ...extraArgs];
  try { return { code: 0, out: execFileSync('node', argv, { encoding: 'utf8' }) }; }
  catch (e) { return { code: e.status ?? 1, out: (e.stdout || '') + (e.stderr || '') }; }
}

// --- Scenario 1: a clean emit, and the GUARDIAN accepts it (end-to-end) -----
{
  console.log('Scenario 1: emit -> map.json + guardian --smoke PASS (emitter and gates agree)');
  const p = setup();
  const { code, out } = emit(p);
  check('emit exit 0', code === 0, `exit=${code}\n${out}`);
  check('NEEDS_CONFIRM sentinel printed', /<<NEEDS_CONFIRM: 3 zones, 5 nodes, 2 edges \(1 grep-verified\)>>/.test(out), out);
  check('map.json written', existsSync(p.out), 'missing');

  const doc = JSON.parse(readFileSync(p.out, 'utf8'));
  check('status is proposed (never confirmed by the emitter)', doc.meta.status === 'proposed', doc.meta.status);
  check('source_fingerprint is the git anchor', doc.meta.source_fingerprint === 'git:d014f508f92fcfcbdf448debbe76a33dffa4465f', doc.meta.source_fingerprint);
  check('meta.title from real docs (CM-08)', doc.meta.title === 'Test Project', doc.meta.title);
  check('_content_sig NOT shipped on any node (CM-23)', doc.nodes.every((n) => n._content_sig === undefined), 'leaked');
  check('found_at hoisted from provenance', doc.nodes.find((n) => n.id === nBar).found_at === '2026-01-02T00:00:00Z', 'not hoisted');
  check('no node carries x/y (INV-3)', doc.nodes.every((n) => n.x === undefined && n.y === undefined), 'geometry leaked');

  // THE end-to-end assertion: the real guardian must accept what the emitter wrote.
  let gout, gcode;
  try { gout = execFileSync('node', [GUARDIAN, p.out, '--smoke'], { encoding: 'utf8' }); gcode = 0; }
  catch (e) { gout = (e.stdout || '') + (e.stderr || ''); gcode = e.status ?? 1; }
  check('guardian --smoke exit 0 on the emitted doc', gcode === 0, `exit=${gcode}\n${gout}`);
  check('guardian GC-2 PASS (assembly guards agree)', /\[PASS\] GC-2/.test(gout), gout);
  check('guardian GC-7 PASS (every node has found_at)', /\[PASS\] GC-7/.test(gout), gout);
  check('guardian GC-10 PASS (is_mega <=> kind=="mega")', /\[PASS\] GC-10/.test(gout), gout);
  check('guardian GC-11 PASS (no neighbour accent collision)', /\[PASS\] GC-11/.test(gout), gout);
  rmSync(p.dir, { recursive: true, force: true });
}

// --- Scenario 2: flows -- CM-01 visible() rewrite + CM-05 edge_ids ----------
{
  console.log('Scenario 2: flows resolve to RENDERED nodes + light real arrows');
  const p = setup();
  emit(p);
  const doc = JSON.parse(readFileSync(p.out, 'utf8'));
  const req = doc.flows.find((f) => f.id === 'f.request');
  const dec = doc.flows.find((f) => f.id === 'f.decisions');
  check('f.request carries edge_ids (CM-05)', JSON.stringify(req.edge_ids) === JSON.stringify(['e2']), JSON.stringify(req.edge_ids));
  check('f.request keeps RU steps (CM-11)', req.steps.length === 2, JSON.stringify(req.steps));
  check('f.decisions hidden child rewritten to its mega (CM-01)', JSON.stringify(dec.node_ids) === JSON.stringify([nMega]), JSON.stringify(dec.node_ids));
  rmSync(p.dir, { recursive: true, force: true });
}

// --- Scenario 3: tier-row layout + accent de-collision (CM-22) --------------
{
  console.log('Scenario 3: tier-row layout (entry->core->decisions) + accent de-collision');
  const p = setup();
  emit(p);
  const doc = JSON.parse(readFileSync(p.out, 'utf8'));
  const cell = (z) => doc.composition.placements.find((x) => x.zone === z).cell;
  check('surfaces on the entry row (0)', cell('z.surfaces').row === 0, JSON.stringify(cell('z.surfaces')));
  check('core on the next row (1)', cell('z.core').row === 1, JSON.stringify(cell('z.core')));
  check('decisions last (2)', cell('z.decisions').row === 2, JSON.stringify(cell('z.decisions')));
  check('grid rows computed', doc.canvas.grid.rows === 3, JSON.stringify(doc.canvas.grid));

  // force a collision: give two vertically-adjacent zones the same accent
  const ex = extract();
  ex.zones[1].accent = '--map-accent-cyan'; // z.core == z.surfaces, and they are neighbours
  const p2 = setup({ extract: ex });
  emit(p2);
  const doc2 = JSON.parse(readFileSync(p2.out, 'utf8'));
  const a = doc2.zones.find((z) => z.id === 'z.surfaces').accent;
  const b = doc2.zones.find((z) => z.id === 'z.core').accent;
  check('neighbour accent collision resolved (CM-22)', a !== b, `${a} vs ${b}`);
  rmSync(p.dir, { recursive: true, force: true });
  rmSync(p2.dir, { recursive: true, force: true });
}

// --- Scenario 4: layer mode -- canonical GC-9 meta + content seed_fingerprint
{
  console.log('Scenario 4: --layer -> canonical layer meta (GC-9) + CONTENT seed_fingerprint');
  const p = setup();
  const { code, out } = emit(p, ['--layer', '--parent-map-id', 'map:parent', '--parent-zone', 'z.core']);
  check('layer emit exit 0', code === 0, `exit=${code}\n${out}`);
  const doc = JSON.parse(readFileSync(p.out, 'utf8'));
  check('scope is "layer"', doc.meta.scope === 'layer', doc.meta.scope);
  check('map_id is <parent>::<zone> (frozen :: separator)', doc.meta.map_id === 'map:parent::z.core', doc.meta.map_id);
  check('parent_map_id + parent_zone present', doc.meta.parent_map_id === 'map:parent' && doc.meta.parent_zone === 'z.core', JSON.stringify(doc.meta));
  check('no needs_confirm floor', doc.meta.needs_confirm === undefined, 'present');
  check('seed_fingerprint present', typeof doc.meta.seed_fingerprint === 'string' && doc.meta.seed_fingerprint.startsWith('sha1:'), doc.meta.seed_fingerprint);

  // CONTENT-awareness: same membership, one member's content edited -> fingerprint MOVES
  const ex2 = extract();
  ex2.nodes[0]._content_sig = 'blobfoo-EDITED';
  const p2 = setup({ extract: ex2 });
  emit(p2, ['--layer', '--parent-map-id', 'map:parent', '--parent-zone', 'z.core']);
  const doc2 = JSON.parse(readFileSync(p2.out, 'utf8'));
  check('edited member content MOVES seed_fingerprint (B5, not membership-only)', doc.meta.seed_fingerprint !== doc2.meta.seed_fingerprint, 'fingerprint blind to content edit');

  // guardian must accept the layer doc too (GC-9 armed by scope:"layer")
  let gout, gcode;
  try { gout = execFileSync('node', [GUARDIAN, p.out, '--smoke'], { encoding: 'utf8' }); gcode = 0; }
  catch (e) { gout = (e.stdout || '') + (e.stderr || ''); gcode = e.status ?? 1; }
  check('guardian GC-9 PASS on the emitted layer', gcode === 0 && /\[PASS\] GC-9: layer meta canonical/.test(gout), `exit=${gcode}\n${gout}`);
  rmSync(p.dir, { recursive: true, force: true });
  rmSync(p2.dir, { recursive: true, force: true });
}

// --- Scenario 5: reject own output -- a dangling edge writes NOTHING --------
{
  console.log('Scenario 5: assembly guards reject own output (nothing written)');
  const bad = edges();
  bad.typedLink.push({ id: 'e9', from: 'deadbeefdead', to: nPrd, relation: 'informs', namespace: 'typed-link', trust: 'high' });
  const p = setup({ edges: bad });
  const { code, out } = emit(p);
  check('exit != 0 on a dangling edge endpoint', code !== 0, `exit=${code}`);
  check('guards named the problem', /assembly guards FAILED/.test(out) && /not in nodes/.test(out), out);
  check('map.json NOT written (missing file is the honest G4 FAIL)', !existsSync(p.out), 'a broken map was written');
  rmSync(p.dir, { recursive: true, force: true });
}

// --- Scenario 6: version increments, map_id is stable (append-stability) ----
{
  console.log('Scenario 6: re-emit -> version+1, map_id stable');
  const p = setup();
  emit(p);
  const v1 = JSON.parse(readFileSync(p.out, 'utf8'));
  emit(p);
  const v2 = JSON.parse(readFileSync(p.out, 'utf8'));
  check('version increments 1 -> 2', v1.meta.version === 1 && v2.meta.version === 2, `${v1.meta.version} -> ${v2.meta.version}`);
  check('map_id stable across re-emit', v1.meta.map_id === v2.meta.map_id, `${v1.meta.map_id} vs ${v2.meta.map_id}`);
  rmSync(p.dir, { recursive: true, force: true });
}

// --- Scenario 7: pre-flight REFUSES a pre-v0.18 flat { edges:[] } scratch -----
//     (finding A: silent degradation to 0 edges must become a loud failure)
{
  console.log('Scenario 7: pre-flight rejects a pre-v0.18 flat {edges:[]} shape (finding A)');
  const p = setup({ edges: { edges: [{ from: nFoo, to: nBar, relation: 'imports' }] } }); // no typedLink/codeDep, no id/namespace
  const { code, out } = emit(p);
  check('exit != 0 on flat edges shape', code !== 0, `exit=${code}`);
  check('names the pre-v0.18 edges shape + Re-run VERIFY', /pre-v0.18 shape/i.test(out) && /Re-run VERIFY/.test(out), out);
  check('nothing written', !existsSync(p.out), 'a degraded map was written');
  rmSync(p.dir, { recursive: true, force: true });
}

// --- Scenario 8: pre-flight REFUSES an extract with repo_head/project nested ---
{
  console.log('Scenario 8: pre-flight rejects repo_head nested under meta (finding A)');
  const ex = extract();
  const rh = ex.repo_head; delete ex.repo_head; delete ex.project;
  ex.meta = { repo_head: rh, project: { title: 'X' } }; // the pre-v0.18 nested location
  const p = setup({ extract: ex });
  const { code, out } = emit(p);
  check('exit != 0 on nested repo_head', code !== 0, `exit=${code}`);
  check('names the nested repo_head + Re-run EXTRACT', /nested under `meta/.test(out) && /Re-run EXTRACT/.test(out), out);
  check('nothing written', !existsSync(p.out), 'a degraded map was written');
  rmSync(p.dir, { recursive: true, force: true });
}

console.log(`\n${pass} passed, ${failn} failed`);
process.exit(failn === 0 ? 0 : 1);
