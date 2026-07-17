#!/usr/bin/env node
// ============================================================================
// map-emit.mjs -- the DETERMINISTIC emitter for forgeplan-map-pack
// ============================================================================
// WHY THIS EXISTS (the 2026-07-15 forgeplan-web dogfood, the headline blocker):
// map-emitter (an LLM agent) used to assemble AND type the whole
// forgeplan.map/v1 document into a single `Write`. On a real repo that is
// ~4,000 lines (274 nodes / 316 edges) and it blew the 64,000-token output cap
// three runs in a row -- reproducibly, and NOT because the agent was chatty:
// round 3 suppressed prose to 5 lines and still died, proving THE DOCUMENT is
// the cap-breaker. Round 1 only "barely fit" (553k tokens, 56 min), so even the
// FIRST write was already at the edge; any bigger repo fails outright.
//
// The fix is architectural, not a bigger budget: an LLM re-typing a mechanical
// JSON document is the wrong tool. Every content DECISION is already made
// upstream (.extract.json = zones/nodes, .edges.json = edges, the composed
// composition = layout inputs). What remained in the emitter was ~90% clerical:
// merge, lay out, guard, serialize. That is a script's job.
//
// So: the map-emitter AGENT now decides only what needs judgment -- the flows --
// and writes a tiny .emit-plan.json; THIS script does everything mechanical and
// writes map.json. No token cap, deterministic, instant, and it scales to any
// repo size.
//
// PRECEDENT / SAFETY: this mirrors map-guardian.mjs exactly -- a plain Node `fs`
// write from a Bash-invoked script, NOT a Write/Edit tool call, therefore
// invisible to hooks/scripts/map-emitter-gate.sh BY CONSTRUCTION (the same
// sanctioned shape ADR-017 already blesses for the guardian's status flip, and
// the same reason RFC-023 Invariant #1 is not violated). The guardian's GC-5 git
// audit remains the real single-writer backstop -- it cannot be dodged.
//
// Dependency-free Node, like map-guardian.mjs. The composition arrives as JSON
// (the orchestrator's SELECT stage writes the COMPOSED base+overlays object to
// .work/.composition.json) -- this script never parses YAML.
// ============================================================================
import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { createHash } from 'node:crypto';

const sha1 = (s) => createHash('sha1').update(s).digest('hex');
const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isArray = (v) => Array.isArray(v);

const ACCENTS = ['cyan', 'emerald', 'violet', 'amber', 'rose', 'orange', 'slate'].map(
  (a) => `--map-accent-${a}`,
);

// tier order is frozen: entry -> core -> data -> decisions (z.decisions always last)
const TIER_ORDER = ['entry', 'core', 'data', 'decisions'];
const KIND_TO_TIER = { surface: 'entry', core: 'core', store: 'data', data: 'data', truth: 'decisions' };

// ---------------------------------------------------------------------------
// inputs
// ---------------------------------------------------------------------------
function readJson(path, label) {
  if (!existsSync(path)) die(`${label} not found: ${path}`);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    die(`${label} is not valid JSON (${path}): ${e.message}`);
  }
}

function die(msg) {
  console.error(`map-emit: ${msg}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// input pre-flight -- REFUSE a wrong-shape scratch, never silently degrade
// ---------------------------------------------------------------------------
// The 2026-07-17 forgeplan-web re-run (finding A) resumed a PRE-v0.18 scratch
// under the v0.18 script: repo_head/project were nested under `meta.` (not top
// level) and edges were a flat { edges:[] } (no `id`/`namespace`, no
// typedLink/codeDep split). Fed raw, the script SILENTLY degraded -- emitted a
// "nogit:" fingerprint, dropped title/description_ru, and would have shipped 0
// edges. That contradicts the pack's honest-failure discipline (a missing/refused
// map is a clean G4 FAIL; a written-but-wrong one is the silent-pass risk the
// whole pipeline exists to avoid). This pre-flight makes the mismatch loud.
//
// THE INPUT CONTRACT this script requires (what the v0.18 upstream stages emit):
//   .extract.json     -> top-level { zones[], nodes[], repo_head?, project? }
//                        (repo_head/project are TOP-level, NOT under meta)
//   .edges.json       -> { typedLink[], codeDep[] }, each edge carrying id + namespace
//   .composition.json -> the composed base+overlays object (no YAML)
function preflightInputs(extract, edgesIn) {
  const problems = [];
  if (!isArray(extract.nodes)) problems.push('extract has no top-level `nodes[]` array');
  if (!isArray(extract.zones)) problems.push('extract has no top-level `zones[]` array');
  if (extract.repo_head === undefined && isObject(extract.meta) && extract.meta.repo_head !== undefined) {
    problems.push('extract.repo_head is nested under `meta.` -- a PRE-v0.18 scratch shape; the script reads repo_head at the TOP level. Re-run EXTRACT on this pipeline version (do not resume old scratch under a newer script).');
  }
  if (extract.project === undefined && isObject(extract.meta) && extract.meta.project !== undefined) {
    problems.push('extract.project is nested under `meta.` -- a PRE-v0.18 scratch shape; re-run EXTRACT.');
  }
  const hasTL = isArray(edgesIn.typedLink);
  const hasCD = isArray(edgesIn.codeDep);
  if (!hasTL && !hasCD) {
    if (isArray(edgesIn.edges)) {
      problems.push('edges scratch is a flat `{ edges:[] }` -- a PRE-v0.18 shape; the script needs `{ typedLink[], codeDep[] }` (each edge with `id` + `namespace`). Re-run VERIFY on this pipeline version.');
    } else {
      problems.push('edges scratch has neither `typedLink[]` nor `codeDep[]` -- not the shape edge-verifier emits.');
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
// meta
// ---------------------------------------------------------------------------
function buildMeta(args, extract, composition, prior) {
  const project = isObject(extract.project) ? extract.project : {};
  const repoHead = typeof extract.repo_head === 'string' ? extract.repo_head : '';

  // source_fingerprint: the B5 git build anchor. Robust across clone/checkout
  // (unlike mtimes) and exactly what /map-refresh diffs against. Fall back to a
  // deterministic content digest when the target is not a git repo -- refresh
  // then correctly declines and tells the user to /map-build.
  const sourceFingerprint = repoHead
    ? `git:${repoHead}`
    : `nogit:${sha1(JSON.stringify(extract.nodes ?? [])).slice(0, 16)}`;

  const template = composition.template ?? 'generic';
  const meta = {
    // append-stability: keep a prior map's identity, never re-mint it
    map_id: args.layer
      ? `${args.parentMapId}::${args.parentZone}` // GC-9 canonical, frozen "::" separator
      : (prior?.meta?.map_id ?? `map:${sha1(`${template}:${project.title ?? ''}`).slice(0, 12)}`),
    status: 'proposed', // ALWAYS -- only map-guardian.mjs exit 0 may flip to confirmed (ADR-017)
    project_type: composition.project_type ?? template,
    composition_id: template,
    source_fingerprint: sourceFingerprint,
    version: Number.isInteger(prior?.meta?.version) ? prior.meta.version + 1 : 1,
  };

  // CM-08: the human heading -- ONLY from a real docs source, never invented.
  if (typeof project.title === 'string' && project.title) meta.title = project.title;
  if (typeof project.description_ru === 'string' && project.description_ru) {
    meta.description_ru = project.description_ru;
  }

  // CM-07: the frozen canonical layer-meta struct GC-9 requires.
  if (args.layer) {
    meta.scope = 'layer';
    meta.parent_map_id = args.parentMapId;
    meta.parent_zone = args.parentZone;
    meta.seed_fingerprint = seedFingerprint(extract.nodes ?? []);
    // NB: never write needs_confirm -- GC-9 BLOCKERs on needs_confirm===true.
  }
  return meta;
}

// B5: a CONTENT fingerprint, not a membership one. Folding each member's
// content signature is what makes an EDITED-but-same-membership zone stale.
function seedFingerprint(nodes) {
  const pairs = nodes
    .filter(isObject)
    .map((n) => `${n.id}:${n._content_sig ?? ''}`)
    .sort();
  return `sha1:${sha1(pairs.join('|'))}`;
}

// ---------------------------------------------------------------------------
// layout: tier rows + accent de-collision
// ---------------------------------------------------------------------------
function tierOf(zone) {
  if (typeof zone.tier === 'string' && TIER_ORDER.includes(zone.tier)) return zone.tier;
  return KIND_TO_TIER[zone.kind] ?? 'core';
}

function layout(zones, composition) {
  // A plain base composition ships fixed placements + a matching grid -> pass
  // through untouched. Only a COMPOSED (base+overlays) map needs computing.
  const fixed = isArray(composition.placements) ? composition.placements : [];
  if (fixed.length > 0 && fixed.length === zones.length) {
    return { placements: fixed, grid: composition.canvas?.grid ?? { cols: 1, rows: 1 } };
  }

  const rows = TIER_ORDER.map((t) => zones.filter((z) => tierOf(z) === t)).filter((r) => r.length > 0);
  const placements = [];
  rows.forEach((row, rowIdx) => {
    row.forEach((z, colIdx) => {
      // no col_span in P1 -- one zone per cell keeps GC-2a overlap-free by construction
      placements.push({ zone: z.id, cell: { row: rowIdx, col: colIdx } });
    });
  });
  return {
    placements,
    grid: { cols: Math.max(1, ...rows.map((r) => r.length)), rows: Math.max(1, rows.length) },
  };
}

// CM-22: no two GRID-NEIGHBOUR zones share an accent (GC-11). Minimal: keep the
// authored accent wherever it doesn't collide; only a colliding zone is moved to
// the nearest free token. Row-major walk => deterministic + append-stable.
function deCollideAccents(zones, placements) {
  const cellOf = {};
  for (const p of placements) if (isObject(p) && isObject(p.cell)) cellOf[p.zone] = p.cell;
  const isNeighbour = (a, b) => {
    const ca = cellOf[a], cb = cellOf[b];
    if (!ca || !cb) return false;
    return (ca.row === cb.row && Math.abs(ca.col - cb.col) === 1)
      || (ca.col === cb.col && Math.abs(ca.row - cb.row) === 1);
  };
  const ordered = [...zones].sort((x, y) => {
    const cx = cellOf[x.id] ?? { row: 0, col: 0 }, cy = cellOf[y.id] ?? { row: 0, col: 0 };
    return cx.row - cy.row || cx.col - cy.col;
  });
  const assigned = {};
  for (const z of ordered) {
    const taken = new Set(
      ordered.filter((o) => assigned[o.id] && isNeighbour(z.id, o.id)).map((o) => assigned[o.id]),
    );
    assigned[z.id] = !taken.has(z.accent) ? z.accent : (ACCENTS.find((a) => !taken.has(a)) ?? z.accent);
  }
  for (const z of zones) z.accent = assigned[z.id] ?? z.accent;
  return zones;
}

// ---------------------------------------------------------------------------
// flows: the agent decided node_ids/name/steps; the MECHANICS are ours
// ---------------------------------------------------------------------------
function buildFlows(plan, nodes, edges) {
  const planned = isArray(plan?.flows) ? plan.flows : [];
  if (planned.length === 0) return [];

  // CM-01: a hidden collapsed-child renders as its containing mega -> a flow must
  // light the mega, not the child (which lights nothing).
  const childToMega = {};
  for (const n of nodes) {
    if (n.is_mega === true && n.collapsed === true && isArray(n.children)) {
      for (const c of n.children) childToMega[c] = n.id;
    }
  }
  const visible = (id) => childToMega[id] ?? id;
  const nodeIds = new Set(nodes.map((n) => n.id));

  // CM-05: an UNORDERED visible-endpoint pair -> edge id(s), so a flow lights arrows.
  const edgeByPair = {};
  for (const e of edges) {
    if (!isObject(e) || !e.id) continue;
    const a = visible(e.from), b = visible(e.to);
    if (a === b) continue; // both ends inside ONE mega -> no cross-card arrow
    const key = [a, b].sort().join('|');
    (edgeByPair[key] ||= []).push(e.id);
  }

  const out = [];
  for (const f of planned) {
    if (!isObject(f) || !f.id) continue;
    // visible() + drop consecutive duplicates (two reps collapsing into one mega)
    const ids = [];
    for (const raw of isArray(f.node_ids) ? f.node_ids : []) {
      const v = visible(raw);
      if (!nodeIds.has(v)) continue; // never emit a flow pointing at a non-node
      if (ids[ids.length - 1] !== v) ids.push(v);
    }
    if (ids.length === 0) continue; // skip an empty flow -- a chip that lights nothing

    const edgeIds = [];
    for (let i = 0; i + 1 < ids.length; i++) {
      const hits = edgeByPair[[ids[i], ids[i + 1]].sort().join('|')] ?? [];
      for (const id of hits) if (!edgeIds.includes(id)) edgeIds.push(id);
    }
    const flow = { id: f.id, name: f.name ?? f.id, node_ids: ids };
    if (edgeIds.length > 0) flow.edge_ids = edgeIds; // partial/absent is honest (GC-8 WARNs)
    if (isArray(f.steps) && f.steps.length > 0) flow.steps = f.steps;
    if (typeof f.description_ru === 'string' && f.description_ru) flow.description_ru = f.description_ru;
    out.push(flow);
  }
  return out;
}

// ---------------------------------------------------------------------------
// the pre-write assembly-guard trio (RFC-023; the guardian re-derives it as GC-2)
// ---------------------------------------------------------------------------
function assemblyGuards(doc) {
  const problems = [];
  const grid = doc.canvas?.grid ?? {};
  const seen = new Map();
  for (const p of doc.composition.placements ?? []) {
    const { row, col } = p.cell ?? {};
    const rs = p.cell?.row_span ?? 1, cs = p.cell?.col_span ?? 1;
    for (let r = row; r < row + rs; r++) {
      for (let c = col; c < col + cs; c++) {
        if (r >= grid.rows || c >= grid.cols) problems.push(`placement ${p.zone} cell (${r},${c}) outside grid ${grid.rows}x${grid.cols}`);
        const key = `${r},${c}`;
        if (seen.has(key)) problems.push(`zone-cell overlap at (${key}): ${seen.get(key)} vs ${p.zone}`);
        seen.set(key, p.zone);
      }
    }
  }
  const nodeIds = new Set(doc.nodes.map((n) => n.id));
  for (const e of doc.edges) {
    if (!nodeIds.has(e.from)) problems.push(`edge endpoint '${e.from}' not in nodes`);
    if (!nodeIds.has(e.to)) problems.push(`edge endpoint '${e.to}' not in nodes`);
  }
  const zoneIds = new Set(doc.zones.map((z) => z.id));
  for (const n of doc.nodes) if (!zoneIds.has(n.zone)) problems.push(`node ${n.id} zone '${n.zone}' not in zones`);
  return problems;
}

// ---------------------------------------------------------------------------
// assemble
// ---------------------------------------------------------------------------
function assemble(args) {
  const extract = readJson(args.extract, 'extract');
  const edgesIn = readJson(args.edges, 'edges');
  const composition = readJson(args.composition, 'composition');
  const plan = args.plan ? readJson(args.plan, 'emit-plan') : null;
  const prior = existsSync(args.out) ? (() => { try { return JSON.parse(readFileSync(args.out, 'utf8')); } catch { return null; } })() : null;

  // REFUSE a wrong-shape scratch BEFORE assembling anything (finding A). A
  // pre-v0.18 extract/edges would otherwise silently degrade the fingerprint,
  // drop the title, and ship 0 edges -- fail loud instead.
  const shape = preflightInputs(extract, edgesIn);
  if (shape.length > 0) {
    console.error('map-emit: input pre-flight FAILED -- nothing written:');
    for (const p of shape.slice(0, 10)) console.error(`  - ${p}`);
    process.exit(1);
  }

  const zones = (isArray(extract.zones) ? extract.zones : []).filter(isObject);
  if (zones.length === 0) die('extract carries no zones -- refusing to emit an empty map');

  const { placements, grid } = layout(zones, composition);
  deCollideAccents(zones, placements);

  const nodes = (isArray(extract.nodes) ? extract.nodes : []).filter(isObject).map((n) => {
    const out = { ...n };
    // the transient content signature is scratch-only -- NEVER ship it (CM-23)
    delete out._content_sig;
    // found_at is top-level on the emitted node; the extractor may carry it in
    // provenance -- hoist, don't lose it (GC-7 needs it top-level).
    if (!out.found_at && isObject(n.provenance) && n.provenance.found_at) out.found_at = n.provenance.found_at;
    return out;
  });

  const edges = [
    ...(isArray(edgesIn.typedLink) ? edgesIn.typedLink : []),
    ...(isArray(edgesIn.codeDep) ? edgesIn.codeDep : []),
  ].filter(isObject); // edge.id is carried through VERBATIM -- never re-minted here

  const canvas = { ...(composition.canvas ?? {}), grid };
  const doc = {
    schema: 'forgeplan.map/v1',
    meta: buildMeta(args, extract, composition, prior),
    canvas,
    composition: {
      template: composition.template ?? 'generic',
      arrangement: 'stack-ttb', // PINNED literal for P1
      entry_zone: composition.entry_zone ?? zones[0].id,
      placements,
      zone_connectors: isArray(composition.zone_connectors) ? composition.zone_connectors : [],
    },
    zones,
    nodes,
    edges,
    flows: buildFlows(plan, nodes, edges),
  };

  // REJECT OWN OUTPUT before writing: a missing map.json is an honest G4 FAIL;
  // a written-but-broken one is the silent-pass risk this pipeline exists to avoid.
  const problems = assemblyGuards(doc);
  if (problems.length > 0) {
    console.error('map-emit: assembly guards FAILED -- nothing written:');
    for (const p of problems.slice(0, 10)) console.error(`  - ${p}`);
    process.exit(1);
  }
  return doc;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const a = { extract: null, edges: null, composition: null, plan: null, out: null, layer: false, parentMapId: null, parentZone: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--extract') a.extract = argv[++i];
    else if (k === '--edges') a.edges = argv[++i];
    else if (k === '--composition') a.composition = argv[++i];
    else if (k === '--plan') a.plan = argv[++i];
    else if (k === '--out') a.out = argv[++i];
    else if (k === '--layer') a.layer = true;
    else if (k === '--parent-map-id') a.parentMapId = argv[++i];
    else if (k === '--parent-zone') a.parentZone = argv[++i];
  }
  return a;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.extract || !args.edges || !args.composition || !args.out) {
    console.error('usage: map-emit.mjs --extract <.extract.json> --edges <.edges.json> --composition <.composition.json> --out <map.json> [--plan <.emit-plan.json>] [--layer --parent-map-id <id> --parent-zone <zone>]');
    process.exit(2);
  }
  if (args.layer && (!args.parentMapId || !args.parentZone)) {
    die('--layer requires --parent-map-id and --parent-zone (GC-9 canonical layer meta)');
  }

  const doc = assemble(args);

  // Atomic tmp-rename, mirroring map-guardian.mjs's own write discipline: a
  // reader (the guardian, forgeplan-web's GET /api/map) never sees a torn file.
  const tmp = `${args.out}.emit-tmp`;
  writeFileSync(tmp, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
  renameSync(tmp, args.out);

  const grep = doc.edges.filter((e) => e.namespace === 'code-dep').length;
  console.log(`map-emit: wrote ${args.out} (status=proposed, version=${doc.meta.version})`);
  console.log(`<<NEEDS_CONFIRM: ${doc.zones.length} zones, ${doc.nodes.length} nodes, ${doc.edges.length} edges (${grep} grep-verified)>>`);
  process.exit(0);
}

main();
