// ============================================================================
// test/guardian-content-gates.mjs -- regression test for GC-7..GC-11 (CM-13).
// ============================================================================
// The v0.7.1 dogfood shipped defects the 6+2 checks didn't catch: nodes without
// found_at (CM-06), flows lighting no arrow (CM-05), drifted/self-contradictory
// layer meta (CM-07), layer megas mislabeled with the leaf kind (CM-18), and
// adjacent zones sharing an accent (CM-22). v0.11.0 adds five Layer-A gates:
//   GC-7  found_at completeness           BLOCKER
//   GC-8  flow completeness               WARN
//   GC-9  layer-meta canonicalization     BLOCKER (only when meta.scope=="layer")
//   GC-10 is_mega <=> kind=="mega"        BLOCKER
//   GC-11 accent neighbour collision      WARN
// Each runs under --smoke (doc-only). This test mutates a clean doc to trip each
// and asserts the exact verdict, so these gates can't regress silently.
// ============================================================================
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GUARDIAN = fileURLToPath(new URL('../scripts/map-guardian.mjs', import.meta.url));
const DIR = mkdtempSync(join(tmpdir(), 'mapg-cg-'));

// A minimal schema-valid doc that passes GC-1..GC-4 + GC-7..GC-11 cleanly.
function cleanDoc() {
  return {
    schema: 'forgeplan.map/v1',
    meta: { map_id: 'test', status: 'proposed', project_type: 'test', composition_id: 'test', source_fingerprint: 'sha1:test', version: 1 },
    canvas: { grid: { cols: 2, rows: 1 }, gap: { x: 88, y: 70 }, margin: 40, cell: { card_w: 190, card_h: 60, card_gap: 36, zpad: { top: 50, side: 24, bottom: 24 } } },
    composition: {
      template: 'test', arrangement: 'stack-ttb', entry_zone: 'z.a',
      placements: [{ zone: 'z.a', cell: { row: 0, col: 0 } }, { zone: 'z.b', cell: { row: 0, col: 1 } }],
      zone_connectors: [],
    },
    zones: [
      { id: 'z.a', label: 'A', kind: 'core', accent: '--map-accent-emerald', treatment: 'neutral-dashed', rule_edge: 'off', layout_rule: 'grid', cols: 2 },
      { id: 'z.b', label: 'B', kind: 'truth', accent: '--map-accent-slate', treatment: 'neutral-dashed', rule_edge: 'off', layout_rule: 'grid', cols: 4 },
    ],
    nodes: [
      { id: 'aaaaaaaaaaaa', label: 'n1', kind: 'component', zone: 'z.a', provenance: { source: 'code', ref: 'src/a.js', confidence: 1 }, found_at: '2026-07-06T00:00:00Z' },
      { id: 'bbbbbbbbbbbb', label: 'n2', kind: 'component', zone: 'z.a', provenance: { source: 'code', ref: 'src/b.js', confidence: 1 }, found_at: '2026-07-06T00:00:01Z' },
    ],
    edges: [{ from: 'aaaaaaaaaaaa', to: 'bbbbbbbbbbbb', relation: 'imports', namespace: 'code-dep', trust: 'medium', verified_by: 'grep:x', id: 'e1' }],
    flows: [],
  };
}

let pass = 0, failn = 0;
function run(doc) {
  const f = join(DIR, 'm.json');
  writeFileSync(f, JSON.stringify(doc, null, 2));
  try { return execFileSync('node', [GUARDIAN, f, '--smoke'], { encoding: 'utf8' }); }
  catch (e) { return (e.stdout || '') + (e.stderr || ''); }
}
function check(name, cond, out) { if (cond) { pass++; console.log(`  ok  ${name}`); } else { failn++; console.log(`  FAIL ${name}\n${out}`); } }

// 0 — clean doc: all five PASS
{
  const out = run(cleanDoc());
  check('clean: GC-7 PASS', /\[PASS\] GC-7/.test(out), out);
  check('clean: GC-8 PASS', /\[PASS\] GC-8/.test(out), out);
  check('clean: GC-9 PASS', /\[PASS\] GC-9/.test(out), out);
  check('clean: GC-10 PASS', /\[PASS\] GC-10/.test(out), out);
  check('clean: GC-11 PASS', /\[PASS\] GC-11/.test(out), out);
}

// GC-7 — a node without found_at -> BLOCKER
{
  const d = cleanDoc(); delete d.nodes[1].found_at;
  const out = run(d);
  check('GC-7 BLOCKER on missing found_at', /\[BLOCKER\] GC-7/.test(out), out);
}

// GC-8 — a multi-node flow with no edge_ids -> WARN (not BLOCKER)
{
  const d = cleanDoc();
  d.flows = [{ id: 'f.x', name: 'X', node_ids: ['aaaaaaaaaaaa', 'bbbbbbbbbbbb'], edge_ids: [], steps: ['шаг'] }];
  const out = run(d);
  check('GC-8 WARN on empty edge_ids', /\[WARN\] GC-8/.test(out), out);
  check('GC-8 is not a BLOCKER', !/\[BLOCKER\] GC-8/.test(out), out);
}

// GC-9 — a layer doc with needs_confirm:true -> BLOCKER
{
  const d = cleanDoc();
  d.meta = { ...d.meta, map_id: 'parent::z.a', scope: 'layer', parent_map_id: 'parent', parent_zone: 'z.a', needs_confirm: true };
  const out = run(d);
  check('GC-9 BLOCKER on needs_confirm layer', /\[BLOCKER\] GC-9/.test(out), out);
}

// GC-9 — a layer doc with wrong map_id separator -> BLOCKER
{
  const d = cleanDoc();
  d.meta = { ...d.meta, map_id: 'parent-z.a', scope: 'layer', parent_map_id: 'parent', parent_zone: 'z.a' };
  const out = run(d);
  check('GC-9 BLOCKER on non-canonical map_id', /\[BLOCKER\] GC-9/.test(out), out);
}

// GC-9 — a canonical layer doc -> PASS
{
  const d = cleanDoc();
  d.meta = { ...d.meta, map_id: 'parent::z.a', scope: 'layer', parent_map_id: 'parent', parent_zone: 'z.a' };
  const out = run(d);
  check('GC-9 PASS on canonical layer', /\[PASS\] GC-9/.test(out), out);
}

// GC-10 — is_mega:true but kind != "mega" -> BLOCKER
{
  const d = cleanDoc();
  d.nodes.push({ id: 'cccccccccccc', label: 'EVID (5)', kind: 'evidence', is_mega: true, children: ['aaaaaaaaaaaa'], zone: 'z.a', provenance: { source: 'zone-extractor', ref: 'x', confidence: 1 }, found_at: '2026-07-06T00:00:02Z' });
  const out = run(d);
  check('GC-10 BLOCKER on mega with leaf kind', /\[BLOCKER\] GC-10/.test(out), out);
}

// GC-11 — two adjacent zones share an accent -> WARN
{
  const d = cleanDoc();
  d.zones[1].accent = '--map-accent-emerald'; // same as z.a, and they're adjacent (0,0)&(0,1)
  const out = run(d);
  check('GC-11 WARN on adjacent accent clash', /\[WARN\] GC-11/.test(out), out);
}

rmSync(DIR, { recursive: true, force: true });
console.log(`\n${pass} passed, ${failn} failed`);
process.exit(failn === 0 ? 0 : 1);
