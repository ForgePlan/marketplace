#!/usr/bin/env node
// ============================================================================
// map-to-likec4.mjs -- deterministic map.json -> LikeC4 (.c4) translator
// ============================================================================
// forgeplan-map-pack renders .forgeplan/map/map.json with its own bespoke
// renderer only -- there is no export to a standard format. This script gives
// a second output: a .c4 file that `likec4` turns into mermaid/d2/dot/
// plantuml/png/an interactive viewer for free (see `likec4-dsl` skill).
//
// This is a script, not model work: every content DECISION already happened
// upstream in the map-pack pipeline (zone-extractor / edge-verifier /
// map-emitter). What is left here is pure, mechanical re-encoding -- exactly
// the kind of job map-emit.mjs exists for (an LLM re-typing a ~4,000-line
// mechanical document blew the 64k output cap 3/3 runs on a real repo).
// Dependency-free Node, mirroring map-emit.mjs / map-guardian.mjs.
//
// TRANSLATION RULES (verified live against a throwaway LikeC4 probe before
// this script was written -- see dev/likec4-probe/ for the worked example):
//
//  1. zone -> container element; node -> element nested inside its zone.
//  2. Identifiers must be latin, no dots (a dot is LikeC4's FQN separator).
//     Our ids are already latin content-hashes but carry dots (`n.init`,
//     `z.surfaces`) -- every disallowed character is replaced with `_`.
//     Cyrillic lives on freely in `title` / `description` / metadata.
//  3. edge.relation -> the relationship's LABEL; edge.namespace -> its KIND.
//     `typed-link` (from the artifact graph) vs `code-dep` (grep-verified)
//     is a load-bearing distinction -- codeDep renders with a dashed line,
//     matching the probe.
//     При отсутствии namespace действует канон edge-verifier/GC-4:
//     11 артефактных relation -> typed-link, остальные -> code-dep.
//  4. flow -> `dynamic view`; flow.steps -> the view's `description`.
//  5. zone drill-down -> `view <id> of <zone>` (NOT `navigateTo`: verified on
//     the probe that `navigateTo` from a dynamic view only reaches another
//     dynamic view, never a structural view).
//  6. Реальные сохранённые children у collapsed mega вкладываются в него,
//     чтобы нативный view мог проецировать их связи на общую карточку.
//     Отсутствующие children остаются только metadata — узлы не выдумываются.
//     Сырые ID и исходные рёбра сохраняются; меняется только их нативный FQN.
//     Выбор подмножества параллельных связей между теми же участниками
//     LikeC4 1.59.3 не поддерживает: такой поток отклоняется до записи.
//
// Нативные bindings проверяются отдельно от подписи и оформления шага.
//
// THE TRAP THIS SCRIPT MUST NOT FALL INTO: `include *` in a LikeC4 view only
// pulls in elements that participate in at least one relationship. Verified
// live on the probe -- a fully valid element with zero edges was silently
// absent from both the top-level view and its own zone's drill-down view.
// So: every node with zero incident edges gets an explicit `include` line
// (both in the overview and in its own zone's drill-down view) -- nothing is
// silently dropped, and the count is reported on stdout.
//
// F8 (reviewed, accepted trade-off, not a defect): an explicit
// `include z.n_isolated` line in the OVERVIEW forces that node's zone open in
// the top-level rendering, even while sibling zones stay collapsed -- the
// overview can read as "this zone holds exactly one thing" when it holds
// more. Nothing is lost (see rule above and Заявление 3 in EVID-270): the
// alternative is silently dropping the isolated node from the overview,
// which is strictly worse under this script's own no-silent-drop discipline.
// Left as-is; a future fix would need LikeC4 support for "include this node
// without forcing its parent open", which does not exist today.
// ============================================================================
import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { dirname, basename, extname, join } from 'node:path';

function die(msg) {
  console.error(`map-to-likec4: ${msg}`);
  process.exit(1);
}

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}
function isArray(v) {
  return Array.isArray(v);
}

// ---------------------------------------------------------------------------
// identifier sanitizing -- LikeC4 identifiers: [A-Za-z_][A-Za-z0-9_-]*,
// no dots (dots are the FQN separator).
// ---------------------------------------------------------------------------
// A conservative reserved-word list: DSL keywords that would otherwise parse
// as something other than an identifier if a raw id/kind happened to collide.
const RESERVED = new Set([
  'model', 'specification', 'views', 'view', 'element', 'relationship',
  'deploymentnode', 'deployment', 'include', 'exclude', 'style', 'tag',
  'metadata', 'notes', 'title', 'description', 'technology', 'summary',
  'link', 'icon', 'navigateto', 'global', 'import', 'from', 'dynamic',
  'parallel', 'par', 'opt', 'loop', 'break', 'alt', 'when', 'if', 'else',
  'try', 'catch', 'finally', 'autolayout', 'extend', 'this', 'it', 'color',
  'zone', // reserved by THIS script for the zone-container element kind
]);

// SPEC-003 D2/D3; тот же список использует map-guardian.mjs (GC-4).
const VALID_RELATIONS = new Set([
  'informs', 'based_on', 'supersedes', 'contradicts', 'refines',
  'supports', 'demonstrates', 'covers', 'triangulates', 'references', 'belongs_to',
]);

function makeSanitizer() {
  const seen = new Set();
  return function sanitize(raw) {
    let s = String(raw).replace(/[^A-Za-z0-9_-]/g, '_');
    // Префикс буквой, НЕ подчёркиванием: в составном пути `zone._name`
    // парсер слипает `.` и `_` в один знак (предикат подстановки) и
    // остаток имени остаётся необъяснённым. Замерено на живой карте
    // AeroNuts: 9 идентификаторов, 25 синтаксических ошибок.
    if (!/^[A-Za-z_]/.test(s)) s = `n${s}`;
    if (RESERVED.has(s.toLowerCase())) s = `${s}_`;
    let candidate = s;
    let n = 2;
    while (seen.has(candidate)) candidate = `${s}_${n++}`;
    seen.add(candidate);
    return candidate;
  };
}

function qs(v) {
  const s = String(v ?? '');
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

// ---------------------------------------------------------------------------
// load + shape check
// ---------------------------------------------------------------------------
function readMap(path) {
  if (!existsSync(path)) die(`file not found: ${path}`);
  let doc;
  try {
    doc = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    die(`could not parse ${path} as JSON: ${e.message}`);
  }
  for (const key of ['zones', 'nodes', 'edges']) {
    if (!isArray(doc[key])) die(`input has no top-level '${key}[]' array -- not a forgeplan.map/v1 document`);
  }
  return doc;
}

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------
function build(mapDoc) {
  const zoneSan = makeSanitizer();
  const nodeSan = makeSanitizer(); // separate namespace: nodes live NESTED in zones
  const kindSan = makeSanitizer();
  const viewSan = makeSanitizer();

  const zones = mapDoc.zones.filter(isObject);
  const nodes = mapDoc.nodes.filter(isObject);
  const edges = mapDoc.edges.filter(isObject);
  const flows = isArray(mapDoc.flows) ? mapDoc.flows : [];

  const zoneId = new Map(); // original zone.id -> sanitized id
  for (const z of zones) {
    if (typeof z.id !== 'string' || !z.id) continue;
    // F3: zoneId is a Map keyed by the RAW id. A second zone object sharing
    // that id would silently overwrite the first entry, and both zones would
    // render under whichever sanitized id the LAST duplicate produced --
    // exactly the node-side bug measured below, one early die() away.
    if (zoneId.has(z.id)) die(`map.json содержит дубликат id зоны ${JSON.stringify(z.id)} -- второй объект с этим id молча затёр бы первый`);
    zoneId.set(z.id, zoneSan(z.id));
  }

  const nodeId = new Map(); // original node.id -> sanitized id
  const nodeZone = new Map(); // original node.id -> original zone.id (for FQN building)
  const nodeKindOriginal = new Map();
  const skippedNodesDanglingZone = [];
  for (const n of nodes) {
    if (typeof n.id !== 'string' || !n.id) continue;
    if (typeof n.zone !== 'string' || !zoneId.has(n.zone)) {
      skippedNodesDanglingZone.push(n.id);
      continue;
    }
    // F3 (reviewed, reproduced): nodeId is a Map keyed by the RAW node id.
    // Two node objects sharing one id both reach this `.set()` call -- the
    // second silently overwrites the first entry. The sanitizer's own
    // collision suffix (`n_dup` -> `n_dup_2`) still runs on EACH call, but
    // since only the LAST write survives in the Map, every later lookup of
    // this raw id (by either original object) resolves to the same
    // last-written sanitized id -- measured: two distinct node bodies both
    // emitted under `n_dup_2`, and the generator's own `nodes: 1/2` stat
    // silently lied about it. Refuse with a named reason instead of handing
    // likec4's own opaque "Duplicate element name" parser error downstream.
    if (nodeId.has(n.id)) die(`map.json содержит дубликат id узла ${JSON.stringify(n.id)} -- второй объект с этим id молча затёр бы первый и оба узла эмитировались бы под одним именем`);
    nodeId.set(n.id, nodeSan(n.id));
    nodeZone.set(n.id, n.zone);
    nodeKindOriginal.set(n.id, typeof n.kind === 'string' && n.kind ? n.kind : 'node');
  }

  // one specification `element` kind per distinct node.kind actually present
  const kindId = new Map(); // original kind string -> sanitized kind identifier
  for (const k of new Set(nodeKindOriginal.values())) kindId.set(k, kindSan(k));

  const childToMega = new Map();
  for (const n of nodes) {
    if (!nodeId.has(n.id) || n.is_mega !== true || n.collapsed !== true || !isArray(n.children)) continue;
    for (const child of n.children) {
      if (!nodeId.has(child)) continue;
      if (nodeZone.get(child) !== nodeZone.get(n.id)) die(`mega ${JSON.stringify(n.id)}: ребёнок ${JSON.stringify(child)} принадлежит другой зоне`);
      childToMega.set(child, n.id);
    }
  }
  const visible = (id) => childToMega.get(id) ?? id;
  const nodeFqn = new Map();
  function resolveFqn(id, ancestors = new Set()) {
    if (nodeFqn.has(id)) return nodeFqn.get(id);
    if (ancestors.has(id)) die(`цикл children у mega ${JSON.stringify(id)}`);
    ancestors.add(id);
    const parent = childToMega.get(id);
    const prefix = parent === undefined ? zoneId.get(nodeZone.get(id)) : resolveFqn(parent, ancestors);
    const result = `${prefix}.${nodeId.get(id)}`;
    ancestors.delete(id);
    nodeFqn.set(id, result);
    return result;
  }
  for (const id of nodeId.keys()) resolveFqn(id);
  const fqn = (id) => nodeFqn.get(id);

  // -------------------------------------------------------------------------
  // specification
  // -------------------------------------------------------------------------
  const specLines = [];
  specLines.push('specification {');
  specLines.push('');
  specLines.push('  // zone (composed-map zone) -> container element');
  specLines.push('  element zone {');
  specLines.push('    style { shape rectangle; opacity 10% }');
  specLines.push('  }');
  specLines.push('');
  specLines.push('  // one element kind per distinct node.kind found in the map');
  for (const [orig, kid] of kindId) {
    specLines.push(`  element ${kid} { // source kind: ${orig}`);
    specLines.push('    style { shape rectangle }');
    specLines.push('  }');
  }
  specLines.push('');
  specLines.push('  // edge.namespace: typed-link (artifact graph) vs code-dep (grep-verified)');
  specLines.push('  relationship typedLink {');
  specLines.push("    technology 'граф артефактов'");
  specLines.push('  }');
  specLines.push('  relationship codeDep {');
  specLines.push("    technology 'подтверждено grep'");
  specLines.push('    line dashed');
  specLines.push('  }');
  specLines.push('}');

  // -------------------------------------------------------------------------
  // model
  // -------------------------------------------------------------------------
  const modelLines = [];
  modelLines.push('model {');
  modelLines.push('');

  const nodesByZone = new Map();
  const childrenByMega = new Map();
  for (const n of nodes) {
    if (!nodeId.has(n.id)) continue;
    if (childToMega.has(n.id)) {
      const parent = childToMega.get(n.id);
      if (!childrenByMega.has(parent)) childrenByMega.set(parent, []);
      childrenByMega.get(parent).push(n);
      continue;
    }
    const z = nodeZone.get(n.id);
    if (!nodesByZone.has(z)) nodesByZone.set(z, []);
    nodesByZone.get(z).push(n);
  }

  let megaCount = 0;
  function emitNode(n, indent) {
    const nid = nodeId.get(n.id);
    const kid = kindId.get(nodeKindOriginal.get(n.id));
    const isMega = n.is_mega === true;
    if (isMega) megaCount++;
    modelLines.push(`${indent}${kid} ${nid} ${qs(n.label ?? n.id)} {`);
    if (typeof n.description_ru === 'string' && n.description_ru) {
      modelLines.push(`${indent}  description ${qs(n.description_ru)}`);
    }
    if (isMega) modelLines.push(`${indent}  style { multiple true }`);
    const nmeta = [];
    if (typeof n.meta === 'string' && n.meta) nmeta.push(['meta', n.meta]);
    if (typeof n.found_at === 'string' && n.found_at) nmeta.push(['found_at', n.found_at]);
    if (typeof n.artifact_id === 'string' && n.artifact_id) nmeta.push(['artifact_id', n.artifact_id]);
    if (isMega && isArray(n.children) && n.children.length > 0) {
      nmeta.push(['children', n.children.map((c) => String(c))]);
    }
    if (nmeta.length > 0) {
      modelLines.push(`${indent}  metadata {`);
      for (const [key, value] of nmeta) {
        modelLines.push(`${indent}    ${key} ${isArray(value) ? `[${value.map(qs).join(', ')}]` : qs(value)}`);
      }
      modelLines.push(`${indent}  }`);
    }
    for (const child of childrenByMega.get(n.id) ?? []) emitNode(child, `${indent}  `);
    modelLines.push(`${indent}}`);
  }
  for (const z of zones) {
    const zid = zoneId.get(z.id);
    if (!zid) continue;
    modelLines.push(`  zone ${zid} ${qs(z.label ?? z.id)} {`);
    if (typeof z.description_ru === 'string' && z.description_ru) {
      modelLines.push(`    description ${qs(z.description_ru)}`);
    }
    const metaEntries = [];
    // NB: metadata key `kind` is a reserved DSL token (verified live -- likec4
    // parses `metadata { kind '...' }` as a syntax error, "Expecting token of
    // type '}' but found `kind`"). Use `source_kind` instead.
    if (typeof z.kind === 'string' && z.kind) metaEntries.push(['source_kind', z.kind]);
    if (typeof z.sub === 'string' && z.sub) metaEntries.push(['sub', z.sub]);
    if (metaEntries.length > 0) {
      modelLines.push('    metadata {');
      for (const [k, v] of metaEntries) modelLines.push(`      ${k} ${qs(v)}`);
      modelLines.push('    }');
    }
    modelLines.push('');

    for (const n of nodesByZone.get(z.id) ?? []) emitNode(n, '    ');
    modelLines.push('  }');
    modelLines.push('');
  }

  // -------------------------------------------------------------------------
  // edges (top-level relationships, dotted FQN both sides)
  // -------------------------------------------------------------------------
  const incident = new Set(); // original node ids touched by >=1 edge
  const emittedEdges = [];
  const edgesById = new Map();
  let edgesSkipped = 0;
  modelLines.push('  // edges');
  for (const e of edges) {
    if (typeof e.from !== 'string' || typeof e.to !== 'string') { edgesSkipped++; continue; }
    if (!nodeId.has(e.from) || !nodeId.has(e.to)) { edgesSkipped++; continue; }
    if (fqn(e.from).startsWith(`${fqn(e.to)}.`) || fqn(e.to).startsWith(`${fqn(e.from)}.`)) {
      die(`LikeC4 1.59.3: связь ${JSON.stringify(e.id ?? e.relation)} между mega и его ребёнком не представима без изменения модели`);
    }
    const namespace = e.namespace ?? (VALID_RELATIONS.has(e.relation) ? 'typed-link' : 'code-dep');
    const kind = namespace === 'code-dep' ? 'codeDep' : 'typedLink';
    const label = typeof e.relation === 'string' && e.relation ? e.relation : '';
    modelLines.push(`  ${fqn(e.from)} -[${kind}]-> ${fqn(e.to)}${label ? ` ${qs(label)}` : ''}`);
    incident.add(e.from);
    incident.add(e.to);
    const emitted = { id: e.id, from: e.from, to: e.to, relation: label, kind };
    emittedEdges.push(emitted);
    if (typeof e.id === 'string' && e.id) {
      if (!edgesById.has(e.id)) edgesById.set(e.id, []);
      edgesById.get(e.id).push(emitted);
    }
  }
  modelLines.push('}');

  const isolated = [...nodeId.keys()].filter((id) => !incident.has(id));

  // -------------------------------------------------------------------------
  // views
  // -------------------------------------------------------------------------
  const viewLines = [];
  viewLines.push('views {');
  viewLines.push('');

  const overviewId = viewSan('overview');
  viewLines.push(`  view ${overviewId} {`);
  viewLines.push(`    title ${qs('Карта проекта — верхний уровень')}`);
  viewLines.push('    include *');
  for (const origId of isolated) viewLines.push(`    include ${fqn(origId)} // zero incident edges, would be dropped by include *`);
  viewLines.push('    autoLayout TopBottom');
  viewLines.push('  }');
  viewLines.push('');

  for (const z of zones) {
    const zid = zoneId.get(z.id);
    if (!zid) continue;
    const vid = viewSan(`layer_${zid}`);
    viewLines.push(`  view ${vid} of ${zid} {`);
    viewLines.push(`    title ${qs(`${z.label ?? z.id} — что внутри`)}`);
    viewLines.push('    include *');
    viewLines.push(`    include -> ${zid}`);
    viewLines.push(`    include ${zid} -> *`);
    const isolatedHere = isolated.filter((origId) => nodeZone.get(origId) === z.id);
    for (const origId of isolatedHere) viewLines.push(`    include ${fqn(origId)} // zero incident edges`);
    viewLines.push('  }');
    viewLines.push('');
  }

  let flowsEmitted = 0;
  const flowIds = new Set();
  for (const [index, f] of flows.entries()) {
    if (!isObject(f) || typeof f.id !== 'string' || !f.id) die(`flows[${index}]: отсутствует непустой id потока`);
    if (flowIds.has(f.id)) die(`поток ${JSON.stringify(f.id)}: дубликат id`);
    flowIds.add(f.id);
    if (!isArray(f.node_ids)) die(`поток ${JSON.stringify(f.id)}: отсутствует node_ids[]`);
    const ids = f.node_ids;
    const missingNodes = ids.filter((id) => !nodeId.has(id));
    if (missingNodes.length > 0) die(`поток ${JSON.stringify(f.id)}: неразрешимые node_ids ${JSON.stringify(missingNodes)}; цепочка не сокращена`);
    if (ids.length < 2) die(`поток ${JSON.stringify(f.id)}: для dynamic view нужны минимум два узла`);
    if (f.edge_ids !== undefined && !isArray(f.edge_ids)) die(`поток ${JSON.stringify(f.id)}: edge_ids должен быть массивом`);
    const selectedEdges = [];
    for (const id of f.edge_ids ?? []) {
      const matches = edgesById.get(id) ?? [];
      if (matches.length !== 1) die(`поток ${JSON.stringify(f.id)}: edge_id ${JSON.stringify(id)} неразрешим или неоднозначен`);
      selectedEdges.push(matches[0]);
    }
    // edge_ids — набор рёбер всего пути, не позиционный список по одному на шаг.
    // Пустой/отсутствующий набор допустим по схеме; тогда ищем среди всех рёбер.
    const candidates = selectedEdges.length > 0 ? selectedEdges : emittedEdges;
    const pairs = ids.slice(0, -1).map((id, i) => [id, ids[i + 1]]);
    for (const e of selectedEdges) {
      if (!pairs.some(([a, b]) => (visible(e.from) === a && visible(e.to) === b) || (visible(e.from) === b && visible(e.to) === a))) {
        die(`поток ${JSON.stringify(f.id)}: edge_id ${JSON.stringify(e.id)} не принадлежит пути`);
      }
    }
    const vid = viewSan(`flow_${f.id}`);
    viewLines.push(`  dynamic view ${vid} {`);
    viewLines.push(`    title ${qs(f.name ?? f.id)}`);
    if (isArray(f.steps) && f.steps.length > 0) {
      const stepsText = f.steps.map((s) => String(s)).join('\n      ');
      viewLines.push(`    description ${qs(stepsText)}`);
    }
    for (let i = 0; i + 1 < ids.length; i++) {
      const a = ids[i], b = ids[i + 1];
      let bindings = candidates.filter((e) => visible(e.from) === a && visible(e.to) === b);
      const reverse = bindings.length === 0 && candidates.some((e) => visible(e.from) === b && visible(e.to) === a);
      if (reverse) bindings = candidates.filter((e) => visible(e.from) === b && visible(e.to) === a);
      const hit = bindings[0];
      const source = reverse ? b : a, target = reverse ? a : b;
      const within = (node, actor) => fqn(node) === fqn(actor) || fqn(node).startsWith(`${fqn(actor)}.`);
      const nativeBindings = emittedEdges.filter((e) => within(e.from, source) && within(e.to, target));
      const keys = (relations) => [...new Set(relations.map((e) => JSON.stringify([e.from, e.to, e.kind, e.relation])))].sort();
      if (JSON.stringify(keys(bindings)) !== JSON.stringify(keys(nativeBindings))) {
        die(`поток ${JSON.stringify(f.id)}: LikeC4 1.59.3 не может точно выбрать связи шага ${JSON.stringify(a)} -> ${JSON.stringify(b)}; неоднозначные/неподдерживаемые edge_ids, модель сохранена без записи`);
      }
      const arrow = hit ? `-[${hit.kind}]->` : '->';
      const label = hit?.relation ? ` ${qs(hit.relation)}` : '';
      // Логическая связь остаётся в исходном направлении; обратный обход
      // задаётся настоящими head/tail, а не подменой model relationship.
      const style = reverse ? ' { head none; tail normal }' : '';
      viewLines.push(`    ${fqn(source)} ${arrow} ${fqn(target)}${label}${style}`);
    }
    viewLines.push('  }');
    viewLines.push('');
    flowsEmitted++;
  }

  viewLines.push('}');

  const outputText = [specLines.join('\n'), '', modelLines.join('\n'), '', viewLines.join('\n'), ''].join('\n');

  return {
    doc: outputText,
    stats: {
      zones: zones.length,
      zonesEmitted: zoneId.size,
      nodes: nodes.length,
      nodesEmitted: nodeId.size,
      nodesSkippedDanglingZone: skippedNodesDanglingZone,
      edges: edges.length,
      edgesEmitted: edges.length - edgesSkipped,
      edgesSkipped,
      isolatedNodes: isolated.length,
      megaNodes: megaCount,
      flows: flows.length,
      flowsEmitted,
    },
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const a = { input: null, out: null };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--out') a.out = argv[++i];
    else rest.push(k);
  }
  a.input = rest[0] ?? null;
  return a;
}

function defaultOutPath(inputPath) {
  const dir = dirname(inputPath);
  const base = basename(inputPath, extname(inputPath));
  return join(dir, `${base}.c4`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) {
    console.error('usage: map-to-likec4.mjs <map.json path> [--out <file.c4>]');
    process.exit(2);
  }
  const doc = readMap(args.input);
  const { doc: c4, stats } = build(doc);

  const outPath = args.out ?? defaultOutPath(args.input);
  const tmp = `${outPath}.tmp`;
  writeFileSync(tmp, c4, 'utf8');
  renameSync(tmp, outPath);

  console.log(`map-to-likec4: wrote ${outPath}`);
  console.log(`  zones:  ${stats.zonesEmitted}/${stats.zones}`);
  console.log(`  nodes:  ${stats.nodesEmitted}/${stats.nodes}` + (stats.nodesSkippedDanglingZone.length > 0 ? ` (skipped, dangling zone: ${stats.nodesSkippedDanglingZone.join(', ')})` : ''));
  console.log(`  edges:  ${stats.edgesEmitted}/${stats.edges}` + (stats.edgesSkipped > 0 ? ` (${stats.edgesSkipped} skipped -- missing endpoint)` : ''));
  console.log(`  flows:  ${stats.flowsEmitted}/${stats.flows}`);
  console.log(`  mega nodes: ${stats.megaNodes}`);
  console.log(`  isolated nodes (explicit include added, would else be dropped by 'include *'): ${stats.isolatedNodes}`);
  process.exit(0);
}

main();
