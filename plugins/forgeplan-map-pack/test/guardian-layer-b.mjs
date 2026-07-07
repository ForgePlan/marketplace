// ============================================================================
// test/guardian-layer-b.mjs -- non-smoke regression test for map-guardian.mjs
// ============================================================================
// The shipped `--smoke` path exercises ONLY Layer A (GC-1..GC-4); it never runs
// the Layer-B cross-source checks (GC-5 single-write, GC-6 determinism, XC-1
// typed-link cross-check, XC-2 grep re-verify). So the very FIRST real
// (non-smoke) run against a repo was the first time those four checks ever
// executed -- and the first forgeplan-web dogfood surfaced three defects at
// once (dogfood report v0.2.0, findings 1+2 + a parse regression they exposed):
//
//   * XC-1 compared content-hash-keyed EMITTED edges against artifact-id-keyed
//     SCAN edges -> every typed-link edge failed (id-space mismatch).
//   * GC-5 conflated "single-write" with "map.json is gitignored" -> it
//     BLOCKER-ed any repo that COMMITS map.json (forgeplan-web ships it tracked)
//     and false-tripped on pre-existing .forgeplan/ dirt.
//   * The GC-5 rewrite then hit a porcelain-parse bug: `.trim()` on the whole
//     `git status --porcelain` blob ate the leading space of a " M" status,
//     shifting the first line's path parse by one char (".forgeplan" ->
//     "forgeplan") so map.json mis-classified as outside-map dirt.
//
// This test builds a synthetic scan.fpl.json (artifact-id edge space) + map.json
// (content-hash edge space) inside a REAL temp git repo -- with map.json
// COMMITTED, the forgeplan-web convention -- and asserts all four Layer-B checks
// behave, so none of the three defects can regress silently again. Zero deps,
// runs under plain `node test/guardian-layer-b.mjs` from the plugin root.
// ============================================================================
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve the guardian relative to THIS file so the test works from the repo,
// from the plugin cache, and from anywhere else the plugin is installed.
const GUARDIAN = fileURLToPath(new URL('../scripts/map-guardian.mjs', import.meta.url));
const h = (kind, slug) => createHash('sha1').update(`${kind}:${slug}`).digest('hex').slice(0, 12);

// artifacts + their content-hash node ids
const A = { id: 'PRD-001', kind: 'prd' };
const B = { id: 'RFC-001', kind: 'rfc' };
const C = { kind: 'component', ref: 'src/foo.js' };
const D = { kind: 'component', ref: 'src/bar.js' };
const hA = h(A.kind, A.id), hB = h(B.kind, B.id), hC = h(C.kind, C.ref), hD = h(D.kind, D.ref);

const scanFpl = {
  artifacts: [
    { artifact_id: A.id, kind: A.kind, status: 'active', title: 'A', r_eff: 0.8 },
    { artifact_id: B.id, kind: B.kind, status: 'active', title: 'B', r_eff: 0.5 },
  ],
  // artifact-id space (raw forgeplan_graph form)
  edges: [{ from: B.id, to: A.id, relation: 'based_on' }],
};

function baseMap() {
  return {
    schema: 'forgeplan.map/v1',
    meta: { map_id: 'test', status: 'proposed', project_type: 'test', composition_id: 'test', source_fingerprint: 'sha1:test', version: 1 },
    canvas: { grid: { cols: 1, rows: 2 }, gap: { x: 88, y: 70 }, margin: 40, cell: { card_w: 190, card_h: 60, card_gap: 36, zpad: { top: 50, side: 24, bottom: 24 } } },
    composition: {
      template: 'test', arrangement: 'stack-ttb', entry_zone: 'z.core',
      placements: [{ zone: 'z.core', cell: { row: 0, col: 0 } }, { zone: 'z.decisions', cell: { row: 1, col: 0 } }],
      zone_connectors: [],
    },
    zones: [
      { id: 'z.core', label: 'Core', kind: 'core', accent: '--map-accent-emerald', treatment: 'neutral-dashed', rule_edge: 'off', layout_rule: 'grid', cols: 2 },
      { id: 'z.decisions', label: 'Decisions', kind: 'truth', accent: '--map-accent-slate', treatment: 'neutral-dashed', rule_edge: 'off', layout_rule: 'grid', cols: 4 },
    ],
    nodes: [
      { id: hA, label: 'PRD-001', kind: A.kind, zone: 'z.decisions', artifact_id: A.id, provenance: { source: 'forgeplan', ref: A.id, confidence: 1 }, found_at: '2026-07-04T00:00:00Z' },
      { id: hB, label: 'RFC-001', kind: B.kind, zone: 'z.decisions', artifact_id: B.id, provenance: { source: 'forgeplan', ref: B.id, confidence: 1 }, found_at: '2026-07-04T00:00:01Z' },
      { id: hC, label: 'foo.js', kind: C.kind, zone: 'z.core', provenance: { source: 'code', ref: C.ref, confidence: 0.9 }, found_at: '2026-07-04T00:00:02Z' },
      { id: hD, label: 'bar.js', kind: D.kind, zone: 'z.core', provenance: { source: 'code', ref: D.ref, confidence: 0.9 }, found_at: '2026-07-04T00:00:03Z' },
    ],
    edges: [
      // typed-link in content-hash space -> must be confirmed by XC-1 against the artifact-id scan
      { from: hB, to: hA, relation: 'based_on', namespace: 'typed-link', trust: 'high' },
      // code-dep with a grep pattern that exists in the repo -> XC-2 re-greps it
      { from: hC, to: hD, relation: 'imports', namespace: 'code-dep', trust: 'medium', verified_by: 'grep:FOOMARKER_XYZ' },
    ],
  };
}

function git(repo, ...args) { return execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { cwd: repo, encoding: 'utf8' }); }
function runGuardian(mapPath, repo, scanPath) {
  try {
    const out = execFileSync('node', [GUARDIAN, mapPath, '--repo-root', repo, '--scan-fpl', scanPath], { cwd: repo, encoding: 'utf8' });
    return { code: 0, out };
  } catch (e) { return { code: e.status ?? 1, out: (e.stdout || '') + (e.stderr || '') }; }
}

let pass = 0, failn = 0;
function check(name, cond, detail) { if (cond) { pass++; console.log(`  ok  ${name}`); } else { failn++; console.log(`  FAIL ${name} -- ${detail}`); } }

function setup() {
  const repo = mkdtempSync(join(tmpdir(), 'mapg-'));
  git(repo, 'init', '-q');
  mkdirSync(join(repo, '.forgeplan/map/.work'), { recursive: true });
  mkdirSync(join(repo, 'src'), { recursive: true });
  writeFileSync(join(repo, 'src/foo.js'), '// FOOMARKER_XYZ marker line\n');
  writeFileSync(join(repo, 'src/bar.js'), 'export const bar = 1;\n');
  writeFileSync(join(repo, '.forgeplan/config.yaml'), 'k: v\n');
  writeFileSync(join(repo, '.forgeplan/map/.work/.scan.fpl.json'), JSON.stringify(scanFpl));
  // forgeplan-web case: map.json is COMMITTED (tracked)
  writeFileSync(join(repo, '.forgeplan/map/map.json'), JSON.stringify(baseMap(), null, 2));
  git(repo, 'add', '-A'); git(repo, 'commit', '-qm', 'init');
  return repo;
}

// --- Scenario 1: committed map.json modified -> all Layer-B checks pass, flips confirmed
{
  console.log('Scenario 1: committed map.json modified (forgeplan-web case) -> PASS + confirmed');
  const repo = setup();
  const mapPath = join(repo, '.forgeplan/map/map.json');
  const scanPath = join(repo, '.forgeplan/map/.work/.scan.fpl.json');
  writeFileSync(mapPath, JSON.stringify(baseMap(), null, 2) + '\n'); // re-write (tracked change)
  const { code, out } = runGuardian(mapPath, repo, scanPath);
  check('exit 0 (no blockers)', code === 0, `exit=${code}\n${out}`);
  check('XC-1 PASS (content-hash edges confirmed vs artifact-id scan)', /\[PASS\] XC-1/.test(out), out);
  check('GC-5 PASS (committed map.json change allowed)', /\[PASS\] GC-5/.test(out), out);
  check('GC-6 PASS (determinism)', /\[PASS\] GC-6/.test(out), out);
  check('XC-2 PASS (grep re-match)', /\[PASS\] XC-2/.test(out), out);
  check('status flipped to confirmed', /proposed -> confirmed/.test(out), out);
  rmSync(repo, { recursive: true, force: true });
}

// --- Scenario 2: stray write inside map/ -> GC-5 BLOCKER
{
  console.log('Scenario 2: stray file under .forgeplan/map/ -> GC-5 BLOCKER');
  const repo = setup();
  const mapPath = join(repo, '.forgeplan/map/map.json');
  const scanPath = join(repo, '.forgeplan/map/.work/.scan.fpl.json');
  writeFileSync(join(repo, '.forgeplan/map/stray.json'), '{}'); // stray write into pipeline output dir
  const { code, out } = runGuardian(mapPath, repo, scanPath);
  check('exit != 0', code !== 0, `exit=${code}`);
  check('GC-5 BLOCKER on stray map/ write', /\[BLOCKER\] GC-5: stray write inside/.test(out), out);
  rmSync(repo, { recursive: true, force: true });
}

// --- Scenario 3: pre-existing dirt outside map/ -> GC-5 WARN, not BLOCKER
{
  console.log('Scenario 3: pre-existing .forgeplan/config.yaml dirt -> GC-5 WARN (not blocker)');
  const repo = setup();
  const mapPath = join(repo, '.forgeplan/map/map.json');
  const scanPath = join(repo, '.forgeplan/map/.work/.scan.fpl.json');
  writeFileSync(join(repo, '.forgeplan/config.yaml'), 'k: v2\n'); // tracked dirt OUTSIDE map/
  writeFileSync(mapPath, JSON.stringify(baseMap(), null, 2) + '\n');
  const { code, out } = runGuardian(mapPath, repo, scanPath);
  check('exit 0 (dirt is only a WARN)', code === 0, `exit=${code}\n${out}`);
  check('GC-5 WARN on outside-map dirt', /\[WARN\] GC-5: changes under .forgeplan\/ outside map\//.test(out), out);
  rmSync(repo, { recursive: true, force: true });
}

// --- Scenario 4: fabricated typed-link edge not in scan -> XC-1 BLOCKER
{
  console.log('Scenario 4: fabricated typed-link edge -> XC-1 BLOCKER');
  const repo = setup();
  const mapPath = join(repo, '.forgeplan/map/map.json');
  const scanPath = join(repo, '.forgeplan/map/.work/.scan.fpl.json');
  const m = baseMap();
  m.edges.push({ from: hA, to: hB, relation: 'supersedes', namespace: 'typed-link', trust: 'high' }); // not in scan
  writeFileSync(mapPath, JSON.stringify(m, null, 2) + '\n');
  const { code, out } = runGuardian(mapPath, repo, scanPath);
  check('exit != 0', code !== 0, `exit=${code}`);
  check('XC-1 BLOCKER on fabricated edge', /\[BLOCKER\] XC-1/.test(out), out);
  rmSync(repo, { recursive: true, force: true });
}

// --- Scenario 5: XC-2 re-grep excludes node_modules (F6 — guardian must not
//     "find" a pattern that lives ONLY in node_modules; if the exclusion were
//     missing, grep would match it there and wrongly PASS the stale edge)
{
  console.log('Scenario 5: XC-2 re-grep excludes node_modules (F6)');
  const repo = setup();
  const mapPath = join(repo, '.forgeplan/map/map.json');
  const scanPath = join(repo, '.forgeplan/map/.work/.scan.fpl.json');
  // a marker that exists ONLY inside node_modules/, nowhere in real source
  mkdirSync(join(repo, 'node_modules/leftpad'), { recursive: true });
  writeFileSync(join(repo, 'node_modules/leftpad/index.js'), '// NODEMODULES_ONLY_MARKER should be skipped\n');
  const m = baseMap();
  // point the code-dep edge's verified_by at the node_modules-only marker
  m.edges[1].verified_by = 'grep:NODEMODULES_ONLY_MARKER';
  writeFileSync(mapPath, JSON.stringify(m, null, 2) + '\n');
  const { code, out } = runGuardian(mapPath, repo, scanPath);
  check('exit != 0 (edge is stale once node_modules is excluded)', code !== 0, `exit=${code}\n${out}`);
  check('XC-2 BLOCKER — pattern only in node_modules is NOT matched (exclusion active)', /\[BLOCKER\] XC-2/.test(out), out);
  rmSync(repo, { recursive: true, force: true });
}

// --- Scenario 6: a per-zone layer write under map/layers/ is sanctioned (E3/E4),
//     NOT a stray-in-map BLOCKER (contrast scenario 2's map/stray.json)
{
  console.log('Scenario 6: map/layers/<zone>.json write is sanctioned (E3/E4)');
  const repo = setup();
  const mapPath = join(repo, '.forgeplan/map/map.json');
  const scanPath = join(repo, '.forgeplan/map/.work/.scan.fpl.json');
  mkdirSync(join(repo, '.forgeplan/map/layers'), { recursive: true });
  writeFileSync(join(repo, '.forgeplan/map/layers/z.core.json'), '{}'); // a generated layer file
  writeFileSync(mapPath, JSON.stringify(baseMap(), null, 2) + '\n');
  const { code, out } = runGuardian(mapPath, repo, scanPath);
  check('exit 0 (layer write allowed)', code === 0, `exit=${code}\n${out}`);
  check('GC-5 PASS (map/layers/ sanctioned, not stray)', /\[PASS\] GC-5/.test(out), out);
  rmSync(repo, { recursive: true, force: true });
}

// --- Scenario 7: --check-only runs full Layer A+B but performs NO write. This is
//     the read-only deep pass /map-doctor --deep uses (audit H2): the plain
//     non-smoke path flips proposed->confirmed (Scenario 1), which would break
//     doctor's read-only contract; --check-only must reach Layer B yet never write.
{
  console.log('Scenario 7: --check-only -> full Layer B, NO status flip (read-only deep pass, H2)');
  const repo = setup();
  const mapPath = join(repo, '.forgeplan/map/map.json');
  const scanPath = join(repo, '.forgeplan/map/.work/.scan.fpl.json');
  writeFileSync(mapPath, JSON.stringify(baseMap(), null, 2) + '\n');
  let out, code;
  try { out = execFileSync('node', [GUARDIAN, mapPath, '--check-only', '--repo-root', repo, '--scan-fpl', scanPath], { cwd: repo, encoding: 'utf8' }); code = 0; }
  catch (e) { out = (e.stdout || '') + (e.stderr || ''); code = e.status ?? 1; }
  check('exit 0 (checks pass)', code === 0, `exit=${code}\n${out}`);
  check('XC-1 ran under --check-only (Layer B reached, not smoke-skipped)', /\[PASS\] XC-1/.test(out), out);
  check('GC-6 ran under --check-only', /\[PASS\] GC-6/.test(out), out);
  check('--check-only did NOT flip status + says no write performed', !/proposed -> confirmed/.test(out) && /no write performed/.test(out), out);
  const onDisk = JSON.parse(readFileSync(mapPath, 'utf8'));
  check('map.json status still "proposed" on disk (read-only)', onDisk.meta.status === 'proposed', `status=${onDisk.meta.status}`);
  rmSync(repo, { recursive: true, force: true });
}

console.log(`\n${pass} passed, ${failn} failed`);
process.exit(failn === 0 ? 0 : 1);
