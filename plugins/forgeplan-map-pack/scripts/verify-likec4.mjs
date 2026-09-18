#!/usr/bin/env node
// ============================================================================
// verify-likec4.mjs -- end-to-end check for map-to-likec4.mjs
// ============================================================================
// Not "the file got created" -- a real cross-check with a real asymmetry
// between its two sides:
//
//   RECORDED side  -- the raw zones[]/nodes[]/edges[]/flows[] arrays read
//                     straight out of the ORIGINAL map.json, independently
//                     walked into FQN node ids / (from,to,kind,relation)
//                     edge triples. The id-sanitizing rule (identical
//                     characters -> `_`, digit/empty prefix -> `n`, reserved
//                     words suffixed, collisions disambiguated) is
//                     DUPLICATED here on purpose rather than imported from
//                     map-to-likec4.mjs -- see `makeSanitizer` below for why.
//   COMPUTED side  -- what actually landed in the LikeC4 model, read from
//                     `likec4 export json`'s OWN output: element ids (which
//                     LikeC4 renders as the dotted zone.node FQN), the
//                     relations dict (source.model / target.model / kind /
//                     title), and view ids of `_type: "dynamic"` for flows --
//                     all produced entirely by the `likec4` binary, a
//                     process this script does not control the internals of.
//
// Three, not two, exit codes -- the third one matters as much as the other
// two. Without it a broken tool (no `likec4` in PATH, a map.json that isn't
// even valid JSON, a generated .c4 that fails to parse) reads exactly like a
// live defect, which is worse than a defect: it hides whether the checker
// ran at all.
//
//   0  MATCH        -- recorded == computed structurally (sets, not counts)
//   1  MISMATCH     -- ran clean, structure disagrees -- a real gap
//   2  CANNOT RUN   -- missing input, missing `likec4`, or the generated
//                      model failed to parse -- the check never reached a
//                      verdict
//
// SCOPE OF THIS CHECK (F4): this script proves "did map-to-likec4.mjs
// translate map.json's own content faithfully" -- it does NOT prove
// "is map.json itself complete". A node/edge/flow missing from map.json is
// missing from BOTH sides of every comparison below and produces a clean
// MATCH -- correctly, because there is nothing to lose in translation.
// Input completeness is map-guardian.mjs's job, not this script's.
// A reference that map.json itself cannot resolve (a node naming a
// nonexistent zone, a flow naming <2 real nodes) is caught here as a loud
// MISMATCH, exactly like a translation bug would be -- see the sentinel-key
// note in `recordedModel` for how that stays distinguishable from a
// genuine generator defect.
//
// Dependency-free Node (node:fs / node:path / node:child_process /
// node:os only), matching map-emit.mjs / map-guardian.mjs / map-to-likec4.mjs.
// ============================================================================
import { existsSync, readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const GENERATOR = join(HERE, 'map-to-likec4.mjs');

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

// ---------------------------------------------------------------------------
// exit handling -- F5 fix. cannotRun() used to call process.exit(2) directly
// from inside computedCounts()'s try block; process.exit() does not run
// enclosing `finally` blocks, so the scratch work-dir's cleanup (in main's
// finally) never ran on that path. Measured: 6 -> 7 tmp dirs after one
// CANNOT RUN, unchanged after a clean run. Fix: cannotRun() THROWS instead of
// exiting; only the top-level wrapper at the bottom of this file turns a
// caught CliExit into an actual process.exit(), which happens AFTER every
// enclosing try/finally (including main's workDir cleanup) has already run.
// ---------------------------------------------------------------------------
class CliExit extends Error {
  constructor(code) {
    super(`exit ${code}`);
    this.code = code;
  }
}

// exit 2: "cannot run" -- never confuse this with a real mismatch (exit 1)
function cannotRun(msg) {
  console.error(`verify-likec4: CANNOT RUN -- ${msg}`);
  throw new CliExit(2);
}

// ---------------------------------------------------------------------------
// identifier sanitizing -- DUPLICATED from map-to-likec4.mjs on purpose.
// Importing the generator's own sanitizer would make this checker trust the
// exact function under test to build its own "expected" side -- if a future
// mutation broke the sanitizer itself (not just where it's applied), an
// imported copy would silently agree with the broken output (the self-
// confirmation trap F1 already flagged once, for counts). A second, small,
// independently-written implementation of the same documented rule means a
// sanitizer regression shows up as a structural mismatch instead of a clean
// MATCH. The rule itself is intentionally NOT re-derived or guessed here --
// it is transcribed from map-to-likec4.mjs's own comment (a public,
// documented contract), which is a different thing from calling its code.
// ---------------------------------------------------------------------------
const RESERVED = new Set([
  'model', 'specification', 'views', 'view', 'element', 'relationship',
  'deploymentnode', 'deployment', 'include', 'exclude', 'style', 'tag',
  'metadata', 'notes', 'title', 'description', 'technology', 'summary',
  'link', 'icon', 'navigateto', 'global', 'import', 'from', 'dynamic',
  'parallel', 'par', 'opt', 'loop', 'break', 'alt', 'when', 'if', 'else',
  'try', 'catch', 'finally', 'autolayout', 'extend', 'this', 'it', 'color',
  'zone',
]);

function makeSanitizer() {
  const seen = new Set();
  return function sanitize(raw) {
    let s = String(raw).replace(/[^A-Za-z0-9_-]/g, '_');
    if (s === '' || /^[0-9]/.test(s)) s = `n${s}`;
    if (RESERVED.has(s.toLowerCase())) s = `${s}_`;
    let candidate = s;
    let n = 2;
    while (seen.has(candidate)) candidate = `${s}_${n++}`;
    seen.add(candidate);
    return candidate;
  };
}

// ---------------------------------------------------------------------------
// recorded side -- independently walked straight out of the source document
// ---------------------------------------------------------------------------
function loadMap(mapPath) {
  if (!existsSync(mapPath)) cannotRun(`input file not found: ${mapPath}`);
  let doc;
  try {
    doc = JSON.parse(readFileSync(mapPath, 'utf8'));
  } catch (e) {
    cannotRun(`${mapPath} is not valid JSON: ${e.message}`);
  }
  if (!Array.isArray(doc.zones) || !Array.isArray(doc.nodes) || !Array.isArray(doc.edges)) {
    cannotRun(`${mapPath} is missing top-level zones[]/nodes[]/edges[] -- not a forgeplan.map/v1 document`);
  }
  return doc;
}

function recordedModel(doc) {
  const zoneSan = makeSanitizer();
  const nodeSan = makeSanitizer();

  const zones = doc.zones.filter(isObject);
  const nodes = doc.nodes.filter(isObject);
  const edges = doc.edges.filter(isObject);
  const flows = (Array.isArray(doc.flows) ? doc.flows : []).filter(isObject);

  const zoneId = new Map();
  for (const z of zones) {
    if (typeof z.id !== 'string' || !z.id) continue;
    if (zoneId.has(z.id)) continue; // a real duplicate; map-to-likec4.mjs itself now refuses this input (F3) -- CANNOT RUN happens before we get here
    zoneId.set(z.id, zoneSan(z.id));
  }

  const nodeId = new Map();
  const nodeZone = new Map();
  const unresolvedZoneNodes = [];
  for (const n of nodes) {
    if (typeof n.id !== 'string' || !n.id) continue;
    if (nodeId.has(n.id)) continue; // ditto -- duplicate node ids are refused by the generator (F3)
    if (typeof n.zone !== 'string' || !zoneId.has(n.zone)) {
      // map.json itself cannot place this node -- it has no valid FQN, so it
      // cannot legitimately appear in the LikeC4 model either. Recorded as a
      // sentinel key that can NEVER coincide with a real computed FQN, so it
      // always surfaces as "recorded-only" in the diff -- named, not just
      // counted -- rather than silently vanishing from the set comparison.
      unresolvedZoneNodes.push({ id: n.id, zone: n.zone });
      continue;
    }
    nodeId.set(n.id, nodeSan(n.id));
    nodeZone.set(n.id, n.zone);
  }

  const fqn = (origId) => `${zoneId.get(nodeZone.get(origId))}.${nodeId.get(origId)}`;

  const zoneFqns = new Set(zoneId.values());
  const nodeFqns = new Set([...nodeId.keys()].map(fqn));
  for (const { id, zone } of unresolvedZoneNodes) {
    nodeFqns.add(`<unresolved-zone:${zone}>.${id}`);
  }

  const edgeTriples = new Set();
  const danglingEdges = [];
  for (const e of edges) {
    if (typeof e.from !== 'string' || typeof e.to !== 'string') continue;
    if (!nodeId.has(e.from) || !nodeId.has(e.to)) {
      danglingEdges.push(e);
      continue;
    }
    const kind = e.namespace === 'code-dep' ? 'codeDep' : 'typedLink'; // same rule map-to-likec4.mjs documents (rule 3)
    const relation = typeof e.relation === 'string' ? e.relation : '';
    edgeTriples.add(`${fqn(e.from)}|${fqn(e.to)}|${kind}|${relation}`);
  }
  // dangling edges (endpoint not resolvable) get their own sentinel triple,
  // for the same reason as unresolvedZoneNodes above: named in the diff, not
  // silently absorbed into a count.
  for (const e of danglingEdges) {
    edgeTriples.add(`<dangling-edge>|from=${e.from}|to=${e.to}`);
  }

  let resolvableFlows = 0;
  for (const f of flows) {
    if (typeof f.id !== 'string' || !f.id) continue;
    const ids = (Array.isArray(f.node_ids) ? f.node_ids : []).filter((id) => nodeId.has(id));
    if (ids.length < 2) continue; // same drop rule map-to-likec4.mjs applies -- unresolvable input, not a translation defect
    resolvableFlows++;
  }

  return {
    zoneFqns,
    nodeFqns,
    edgeTriples,
    resolvableFlows,
    raw: { zones: zones.length, nodes: nodes.length, edges: edges.length, flows: flows.length },
  };
}

// ---------------------------------------------------------------------------
// computed side -- what likec4 itself parsed out of the generated .c4
// ---------------------------------------------------------------------------
function run(cmd, args, opts) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  if (r.error && r.error.code === 'ENOENT') {
    cannotRun(`'${cmd}' not found in PATH -- install the likec4 CLI first`);
  }
  return r;
}

function computedModel(mapPath, workDir) {
  const c4Path = join(workDir, 'model.c4');
  const gen = run('node', [GENERATOR, mapPath, '--out', c4Path]);
  if (gen.status !== 0) {
    cannotRun(`map-to-likec4.mjs failed (exit ${gen.status}):\n${gen.stderr || gen.stdout}`);
  }

  writeFileSync(join(workDir, 'likec4.config.json'), JSON.stringify({
    $schema: 'https://likec4.dev/schemas/config.json',
    name: `map-pack-verify-${Date.now().toString(36)}`,
    title: 'map-pack verify scratch project',
  }, null, 2));

  const validate = run('likec4', ['validate', '--json', '--no-layout', '--file', c4Path, workDir]);
  let validateJson;
  try {
    validateJson = JSON.parse(validate.stdout);
  } catch {
    cannotRun(`'likec4 validate' produced non-JSON output (is the CLI installed and working?):\n${validate.stdout}\n${validate.stderr}`);
  }
  if (validateJson.valid !== true || (validateJson.stats?.filteredErrors ?? 0) > 0) {
    cannotRun(`generated model did not parse -- likec4 validate reported errors:\n${JSON.stringify(validateJson.errors, null, 2)}`);
  }

  const modelJsonPath = join(workDir, 'model.json');
  const exportRes = run('likec4', ['export', 'json', '--skip-layout', '-o', modelJsonPath, workDir]);
  if (exportRes.status !== 0 || !existsSync(modelJsonPath)) {
    cannotRun(`'likec4 export json' failed (exit ${exportRes.status}):\n${exportRes.stderr || exportRes.stdout}`);
  }

  let exported;
  try {
    exported = JSON.parse(readFileSync(modelJsonPath, 'utf8'));
  } catch (e) {
    cannotRun(`could not parse likec4's own export ${modelJsonPath}: ${e.message}`);
  }
  const projects = Array.isArray(exported) ? exported : [exported];
  const proj = projects.find((p) => isObject(p) && isObject(p.elements)) ?? null;
  if (!proj) cannotRun(`'likec4 export json' produced no project with an elements{} map`);

  const elementEntries = Object.entries(proj.elements);
  const zoneFqns = new Set(elementEntries.filter(([, e]) => e.kind === 'zone').map(([id]) => id));
  const nodeFqns = new Set(elementEntries.filter(([, e]) => e.kind !== 'zone').map(([id]) => id));

  const edgeTriples = new Set();
  for (const rel of Object.values(proj.relations ?? {})) {
    const from = rel.source?.model;
    const to = rel.target?.model;
    if (typeof from !== 'string' || typeof to !== 'string') continue;
    const kind = rel.kind === 'codeDep' ? 'codeDep' : 'typedLink';
    const relation = String(rel.title ?? '');
    edgeTriples.add(`${from}|${to}|${kind}|${relation}`);
  }

  const dynamicViewCount = Object.values(proj.views ?? {}).filter((v) => v._type === 'dynamic').length;

  return { zoneFqns, nodeFqns, edgeTriples, dynamicViewCount };
}

// ---------------------------------------------------------------------------
// diff -- what's in one set and not the other, named, not just counted (F1)
// ---------------------------------------------------------------------------
function setDiff(recorded, computed) {
  const recordedOnly = [...recorded].filter((x) => !computed.has(x));
  const computedOnly = [...computed].filter((x) => !recorded.has(x));
  return { recordedOnly, computedOnly };
}

function printDiffList(items, cap = 20) {
  const shown = items.slice(0, cap);
  for (const item of shown) console.error(`    - ${item}`);
  if (items.length > cap) console.error(`    ... and ${items.length - cap} more`);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const a = { input: null, workDir: null, keep: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--work-dir') a.workDir = argv[++i];
    else if (k === '--keep') a.keep = true;
    else rest.push(k);
  }
  a.input = rest[0] ?? null;
  return a;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) {
    console.error('usage: verify-likec4.mjs <map.json path> [--work-dir <dir>] [--keep]');
    throw new CliExit(2);
  }
  if (!existsSync(GENERATOR)) cannotRun(`companion generator not found: ${GENERATOR}`);

  const doc = loadMap(args.input);
  const recorded = recordedModel(doc);

  // F7: an empty map.json (0 zones/nodes/edges) trivially matches an empty
  // output. That is a real, correct MATCH by this script's own definition --
  // but it is not the same claim as "a real map was verified", and reading
  // it as one is the exact failure this whole file exists to prevent.
  // Reported distinctly so a bare MATCH always means "there was something
  // to check, and it checked out".
  const isEmptyInput = recorded.raw.zones === 0 && recorded.raw.nodes === 0 && recorded.raw.edges === 0;

  const workDir = args.workDir ?? mkdtempSync(join(tmpdir(), 'map-to-likec4-verify-'));
  let computed;
  try {
    computed = computedModel(args.input, workDir);
  } finally {
    if (!args.keep && !args.workDir) {
      try { rmSync(workDir, { recursive: true, force: true }); } catch { /* best-effort cleanup */ }
    }
  }

  console.log('verify-likec4: recorded (from map.json)  ' +
    `zones=${recorded.zoneFqns.size} nodes=${recorded.nodeFqns.size} edges=${recorded.edgeTriples.size} resolvable_flows=${recorded.resolvableFlows}` +
    ` (raw: zones=${recorded.raw.zones} nodes=${recorded.raw.nodes} edges=${recorded.raw.edges} flows=${recorded.raw.flows})`);
  console.log('verify-likec4: computed (from likec4 export json) ' +
    `zones=${computed.zoneFqns.size} nodes=${computed.nodeFqns.size} edges=${computed.edgeTriples.size} dynamic_views=${computed.dynamicViewCount}`);
  console.log('verify-likec4: scope -- this checks translation fidelity (map.json content -> LikeC4 model), ' +
    'NOT input completeness; a reference map.json cannot resolve is flagged as MISMATCH here too, by design (see file header, F4)');

  const zoneDiff = setDiff(recorded.zoneFqns, computed.zoneFqns);
  const nodeDiff = setDiff(recorded.nodeFqns, computed.nodeFqns);
  const edgeDiff = setDiff(recorded.edgeTriples, computed.edgeTriples);
  const flowsMismatch = recorded.resolvableFlows !== computed.dynamicViewCount;

  const hasDiff = zoneDiff.recordedOnly.length > 0 || zoneDiff.computedOnly.length > 0 ||
    nodeDiff.recordedOnly.length > 0 || nodeDiff.computedOnly.length > 0 ||
    edgeDiff.recordedOnly.length > 0 || edgeDiff.computedOnly.length > 0 ||
    flowsMismatch;

  if (hasDiff) {
    console.error('verify-likec4: MISMATCH -- structure disagrees');
    if (zoneDiff.recordedOnly.length > 0) { console.error('  zones only in map.json (missing from output):'); printDiffList(zoneDiff.recordedOnly); }
    if (zoneDiff.computedOnly.length > 0) { console.error('  zones only in output (not in map.json):'); printDiffList(zoneDiff.computedOnly); }
    if (nodeDiff.recordedOnly.length > 0) { console.error('  nodes only in map.json (missing from output):'); printDiffList(nodeDiff.recordedOnly); }
    if (nodeDiff.computedOnly.length > 0) { console.error('  nodes only in output (not in map.json):'); printDiffList(nodeDiff.computedOnly); }
    if (edgeDiff.recordedOnly.length > 0) { console.error('  edges only in map.json (missing/altered in output) [from|to|kind|relation]:'); printDiffList(edgeDiff.recordedOnly); }
    if (edgeDiff.computedOnly.length > 0) { console.error('  edges only in output (not derivable from map.json) [from|to|kind|relation]:'); printDiffList(edgeDiff.computedOnly); }
    if (flowsMismatch) console.error(`  flows: map.json has ${recorded.resolvableFlows} resolvable flow(s), output has ${computed.dynamicViewCount} dynamic view(s)`);
    throw new CliExit(1);
  }

  if (isEmptyInput) {
    console.log('verify-likec4: EMPTY -- map.json declares zero zones/nodes/edges; ' +
      'both sides are trivially empty, which is not the same claim as "a real map was verified"');
  } else {
    console.log('verify-likec4: MATCH -- zones/nodes/edges/flows agree structurally ' +
      '(node identity, zone placement, edge direction+kind+relation, flow count -- ' +
      'NOT checked here: node/zone display labels, description text, mega-node/isolated-node cosmetics, see file header)');
  }
}

try {
  main();
  process.exit(0);
} catch (e) {
  if (e instanceof CliExit) process.exit(e.code);
  console.error(`verify-likec4: unexpected error -- ${e.stack || e.message}`);
  process.exit(2);
}
