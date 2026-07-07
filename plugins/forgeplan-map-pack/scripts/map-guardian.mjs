#!/usr/bin/env node
// ============================================================================
// map-guardian.mjs -- the deterministic gate for forgeplan-map-pack
// (SPEC-003 SS C4, ADR-017, RFC-023 SS "Test Strategy Hooks")
// ============================================================================
// VERIFIED 2026-07-04 against fixtures/checkpoint-map.json (--smoke mode):
// GC-1/GC-2/GC-3 pass cleanly on the vendored fixture as-is. GC-4 correctly
// flags the fixture's 4 pre-existing code-dep edges (n.init->n.dist-stable,
// n.init->n.dist-nightly, n.start->n.api-proxy, n.start->n.graph-views) as
// missing verified_by -- this is EXPECTED, not a guardian bug: the fixture
// predates the map-pack emission contract (it was hand-authored solely to
// prove the P0 renderer, before GC-4's verified_by requirement existed). A
// clean baseline (verified_by added to those 4 edges) plus 8 single-mutation
// copies (inject x/y, duplicate id, dangling mega-node child, unknown
// relation, stripped verified_by, zone-cell overlap, dangling edge endpoint,
// unpinned cols) were run through this script and each produced exactly its
// targeted BLOCKER with zero false positives/negatives -- see the session
// that authored this file for the full transcript.
// ============================================================================
// A plain Node script, NOT an LLM call. Mirrors adr_003_invariant.rs's shape:
// re-derives every check independently, never trusts the emitter's own claim.
// `exit 0` -- and ONLY exit 0 from this script -- is what flips a map's
// `meta.status` from "proposed" to "confirmed" (ADR-017). That flip is
// performed by THIS SCRIPT's own fs write below, not by a Write/Edit/
// MultiEdit tool call, so it sits outside map-emitter-gate.sh's PreToolUse
// matcher by construction (RFC-023 Invariant #1) -- bounded instead by GC-5
// (this file) + the fact that it only ever touches the single `meta.status`
// field.
//
// Two layers (SPEC-003 SS C4 "Layer A vs Layer B", introduced during review
// to keep the guardian smoke-testable against forgeplan-web's checkpoint
// fixture BEFORE any pipeline agent exists):
//   Layer A (GC-1..GC-4) -- structural + cross-reference checks that need
//     only the map.json document itself. Runs on ANY map.json, including a
//     hand-authored fixture that predates content-hash ids.
//   Layer B (GC-5, GC-6, XC-1, XC-2) -- pipeline-run-only checks that need
//     real repo/git state (a source_fingerprint to compare against, a git
//     working tree to audit, a .scan.fpl.json to cross-check). Skipped in
//     --smoke mode.
//
// No external npm dependencies (node:fs / node:crypto / node:child_process
// only) -- matches this marketplace's zero-new-deps convention for scripts
// shipped inside a plugin.
// ============================================================================

import { readFileSync, existsSync, writeFileSync, renameSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const VALID_RELATIONS = new Set([
  'informs', 'based_on', 'supersedes', 'contradicts', 'refines',
  'supports', 'demonstrates', 'covers', 'triangulates', 'references', 'belongs_to',
]);

const ACCENT_RE = /^--map-accent-(cyan|emerald|violet|amber|rose|orange|slate)$/;

// Directories XC-2's re-grep MUST skip. `grep -rlF -- pattern .` with no
// exclusions walks the whole repo (node_modules/, .git/, build output) and
// hangs on any real repo with dependencies -- the first-dogfood F6 blocker.
// This set MUST stay identical to the edge-verifier's own grep
// (skills/edge-verifier/SKILL.md Algorithm 3): XC-2 re-runs that search and
// must produce the SAME match, else a valid edge is spuriously flagged stale.
// Mirrors code-scanner's module-scan exclusions (agents/code-scanner.md).
const GREP_EXCLUDE_DIRS = [
  'node_modules', '.git', 'vendor', 'dist', 'build', 'target',
  '.svelte-kit', '.next', 'coverage', '.forgeplan',
];

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}
function isArray(v) {
  return Array.isArray(v);
}
function fail(checks, id, message) {
  checks.push({ id, ok: false, message });
}
function pass(checks, id, message) {
  checks.push({ id, ok: true, warning: false, message });
}
function warn(checks, id, message) {
  checks.push({ id, ok: true, warning: true, message });
}

// ---------------------------------------------------------------------------
// GC-1 -- schema (structural; hand-rolled mirror of schemas/map.schema.json
// and of forgeplan-web's entities/map/lib/validate.ts rules 1/2/9/12/14/15).
// Never throws; collects every finding rather than failing fast, matching
// validate.ts's own "never-throwing" contract.
// ---------------------------------------------------------------------------
function checkGC1Schema(doc, checks) {
  const before = checks.length;

  const required = [
    ['schema', 'string'], ['meta', 'object'], ['canvas', 'object'],
    ['composition', 'object'], ['zones', 'array'], ['nodes', 'array'], ['edges', 'array'],
  ];
  for (const [key, kind] of required) {
    const val = doc[key];
    if (kind === 'object' && !isObject(val)) fail(checks, 'GC-1', `required object '${key}' missing or wrong type`);
    else if (kind === 'array' && !isArray(val)) fail(checks, 'GC-1', `required array '${key}' missing`);
    else if (kind === 'string' && typeof val !== 'string') fail(checks, 'GC-1', `required string '${key}' missing`);
  }

  if (doc.schema !== 'forgeplan.map/v1') {
    fail(checks, 'GC-1', `schema must be exactly 'forgeplan.map/v1', got ${JSON.stringify(doc.schema ?? null)}`);
  }

  const meta = isObject(doc.meta) ? doc.meta : {};
  if (!['proposed', 'confirmed'].includes(meta.status)) {
    fail(checks, 'GC-1', `meta.status must be 'proposed' or 'confirmed', got ${JSON.stringify(meta.status ?? null)}`);
  }

  const zones = isArray(doc.zones) ? doc.zones : [];
  zones.forEach((z, i) => {
    if (!isObject(z)) return;
    if (typeof z.cols !== 'number' || z.cols < 1) {
      fail(checks, 'GC-1', `zones[${i}].cols missing or < 1 (must be pinned, never derived from node count)`);
    }
    if (z.treatment !== undefined && z.treatment !== 'neutral-dashed') {
      fail(checks, 'GC-1', `zones[${i}].treatment must be 'neutral-dashed' in P1, got ${JSON.stringify(z.treatment)}`);
    }
    if (z.rule_edge !== undefined && z.rule_edge !== 'off') {
      fail(checks, 'GC-1', `zones[${i}].rule_edge must be 'off' in P1, got ${JSON.stringify(z.rule_edge)}`);
    }
    if (z.layout_rule !== undefined && z.layout_rule !== 'grid') {
      fail(checks, 'GC-1', `zones[${i}].layout_rule must be 'grid' in P1, got ${JSON.stringify(z.layout_rule)}`);
    }
    if (typeof z.accent === 'string' && !ACCENT_RE.test(z.accent)) {
      warn(checks, 'GC-1', `zones[${i}].accent '${z.accent}' is not one of the 7 --map-accent-* tokens (degrades to neutral, non-blocking)`);
    }
  });

  const nodes = isArray(doc.nodes) ? doc.nodes : [];
  nodes.forEach((n, i) => {
    if (!isObject(n)) return;
    if ('x' in n) fail(checks, 'GC-1', `nodes[${i}].x present -- nodes must never carry x/y (INV-3); geometry is layout-owned`);
    if ('y' in n) fail(checks, 'GC-1', `nodes[${i}].y present -- nodes must never carry x/y (INV-3); geometry is layout-owned`);
  });

  const composition = isObject(doc.composition) ? doc.composition : {};
  if (composition.arrangement !== undefined && composition.arrangement !== 'stack-ttb') {
    fail(checks, 'GC-1', `composition.arrangement must be 'stack-ttb' in P1, got ${JSON.stringify(composition.arrangement)}`);
  }

  // Rule 8 parity: no duplicate zone/node/flow ids.
  const seenZ = new Set();
  zones.forEach((z, i) => {
    if (!isObject(z) || typeof z.id !== 'string') return;
    if (seenZ.has(z.id)) fail(checks, 'GC-1', `duplicate zone id '${z.id}' at zones[${i}]`);
    seenZ.add(z.id);
  });
  const seenN = new Set();
  nodes.forEach((n, i) => {
    if (!isObject(n) || typeof n.id !== 'string') return;
    if (seenN.has(n.id)) fail(checks, 'GC-1', `duplicate node id '${n.id}' at nodes[${i}]`);
    seenN.add(n.id);
  });

  if (checks.length === before) pass(checks, 'GC-1', 'schema-valid (structural rules hold)');
}

// ---------------------------------------------------------------------------
// GC-2 -- 3 assembly guards, re-derived independently. A DIFFERENT trio from
// C1's INV-1/2/3 despite the numeric collision (SPEC-003 SS C4 note): (a) no
// zone-cell overlap, (b) every edge endpoint in nodes, (c) every node.zone
// in zones.
// ---------------------------------------------------------------------------
function checkGC2AssemblyGuards(doc, checks) {
  const zones = isArray(doc.zones) ? doc.zones : [];
  const nodes = isArray(doc.nodes) ? doc.nodes : [];
  const edges = isArray(doc.edges) ? doc.edges : [];
  const composition = isObject(doc.composition) ? doc.composition : {};
  const canvas = isObject(doc.canvas) ? doc.canvas : {};

  const zoneIds = new Set(zones.filter(isObject).map((z) => z.id).filter((x) => typeof x === 'string'));
  const nodeIds = new Set(nodes.filter(isObject).map((n) => n.id).filter((x) => typeof x === 'string'));

  const before = checks.length;

  // (a) no zone-cell overlap (bounds + overlap, span-aware)
  if (isArray(composition.placements)) {
    const grid = isObject(canvas.grid) ? canvas.grid : null;
    const maxRow = typeof grid?.rows === 'number' ? grid.rows : null;
    const maxCol = typeof grid?.cols === 'number' ? grid.cols : null;
    const occupied = new Map();
    composition.placements.forEach((p, i) => {
      if (!isObject(p) || !isObject(p.cell)) return;
      const zoneId = typeof p.zone === 'string' ? p.zone : `?${i}`;
      const row = typeof p.cell.row === 'number' ? p.cell.row : null;
      const col = typeof p.cell.col === 'number' ? p.cell.col : null;
      if (row === null || col === null) return;
      const colSpan = typeof p.cell.col_span === 'number' ? p.cell.col_span : 1;
      const rowSpan = typeof p.cell.row_span === 'number' ? p.cell.row_span : 1;
      if (maxRow !== null && row + rowSpan - 1 >= maxRow) {
        fail(checks, 'GC-2a', `placements[${i}] (zone '${zoneId}') row ${row} outside canvas.grid.rows=${maxRow}`);
      }
      if (maxCol !== null && col + colSpan - 1 >= maxCol) {
        fail(checks, 'GC-2a', `placements[${i}] (zone '${zoneId}') col ${col} outside canvas.grid.cols=${maxCol}`);
      }
      for (let r = row; r < row + rowSpan; r++) {
        for (let c = col; c < col + colSpan; c++) {
          const key = `${r}:${c}`;
          const prev = occupied.get(key);
          if (prev !== undefined) {
            fail(checks, 'GC-2a', `zone '${zoneId}' cell overlaps '${prev}' at row ${r} col ${c}`);
          } else {
            occupied.set(key, zoneId);
          }
        }
      }
    });
  }

  // (b) every edge endpoint in nodes
  edges.forEach((e, i) => {
    if (!isObject(e)) return;
    if (typeof e.from === 'string' && !nodeIds.has(e.from)) {
      fail(checks, 'GC-2b', `edges[${i}].from '${e.from}' not in nodes`);
    }
    if (typeof e.to === 'string' && !nodeIds.has(e.to)) {
      fail(checks, 'GC-2b', `edges[${i}].to '${e.to}' not in nodes`);
    }
  });

  // (c) every node.zone in zones
  nodes.forEach((n, i) => {
    if (!isObject(n)) return;
    if (typeof n.zone === 'string' && !zoneIds.has(n.zone)) {
      fail(checks, 'GC-2c', `nodes[${i}].zone '${n.zone}' not in zones`);
    }
  });

  if (checks.length === before) pass(checks, 'GC-2', 'no zone-cell overlap; every edge endpoint in nodes; every node.zone in zones');
}

// ---------------------------------------------------------------------------
// GC-3 -- mega-node integrity: every children id in nodes; no DFS cycle.
// ---------------------------------------------------------------------------
function checkGC3MegaNodes(doc, checks) {
  const nodes = isArray(doc.nodes) ? doc.nodes : [];
  const nodeIds = new Set(nodes.filter(isObject).map((n) => n.id).filter((x) => typeof x === 'string'));
  const megaChildren = new Map();
  const before = checks.length;

  nodes.forEach((n, i) => {
    if (!isObject(n) || !n.is_mega || !isArray(n.children)) return;
    const id = typeof n.id === 'string' ? n.id : `?${i}`;
    const kids = [];
    n.children.forEach((cid, j) => {
      if (typeof cid !== 'string') return;
      if (!nodeIds.has(cid)) {
        fail(checks, 'GC-3', `nodes[${i}].children[${j}] '${cid}' not in nodes`);
      }
      kids.push(cid);
    });
    megaChildren.set(id, kids);
  });

  for (const [start] of megaChildren) {
    const visited = new Set();
    const stack = [start];
    while (stack.length) {
      const cur = stack.pop();
      if (visited.has(cur)) {
        fail(checks, 'GC-3', `mega-node nesting cycle detected involving '${start}'`);
        break;
      }
      visited.add(cur);
      const kids = megaChildren.get(cur);
      if (kids) stack.push(...kids);
    }
  }

  if (checks.length === before) pass(checks, 'GC-3', 'mega-node children resolve to real nodes; no nesting cycles');
}

// ---------------------------------------------------------------------------
// GC-4 -- typed-link relation in the 11 VALID_RELATIONS; code-dep has a
// non-empty verified_by. Namespace defaults per SPEC-003 SS D3 when absent.
// ---------------------------------------------------------------------------
function checkGC4RelationsAndVerification(doc, checks) {
  const edges = isArray(doc.edges) ? doc.edges : [];
  const before = checks.length;
  edges.forEach((e, i) => {
    if (!isObject(e)) return;
    const relation = e.relation;
    const namespace = e.namespace ?? (typeof relation === 'string' && VALID_RELATIONS.has(relation) ? 'typed-link' : 'code-dep');
    if (namespace === 'typed-link') {
      if (typeof relation !== 'string' || !VALID_RELATIONS.has(relation)) {
        fail(checks, 'GC-4', `edges[${i}] typed-link relation '${relation}' not in the 11 VALID_RELATIONS`);
      }
    } else if (namespace === 'code-dep') {
      if (typeof e.verified_by !== 'string' || e.verified_by.length === 0) {
        fail(checks, 'GC-4', `edges[${i}] code-dep edge has empty/missing verified_by -- must be DROPPED before emit, never present here`);
      }
    }
  });
  if (checks.length === before) pass(checks, 'GC-4', 'typed-link relations valid; every code-dep carries verified_by');
}

// ---------------------------------------------------------------------------
// GC-5 -- single-write (write-SCOPE, not gitignore-status). SPEC-003 SS C4.
// GC-5's job is "the pipeline wrote ONLY .forgeplan/map/map.json (+ .work/**),
// nothing else". The v0.2.0 implementation conflated that with "map.json is
// gitignored" and BLOCKER-ed on any target that COMMITS map.json (forgeplan-web
// ships it as the tracked P0 render-proof) -- and false-tripped on pre-existing
// .forgeplan/ dirt (a modified config.yaml, an untracked journal). A single
// `--ignored` porcelain call surfaces tracked-modified, untracked AND gitignored
// changes together, so it works for both the committed-map and gitignored-map
// conventions. Classification per changed path under .forgeplan/:
//   * map/map.json, map/.work/**, or the map/ dir itself -> SANCTIONED (ok)
//   * anything else UNDER map/  -> BLOCKER (a stray write into the pipeline's
//                                  own output dir -- e.g. map/other.json)
//   * anything else under .forgeplan/ -> WARN, not BLOCKER (pre-existing repo
//                                  dirt; the PreToolUse hook + the EMITTER
//                                  denylist STRUCTURALLY prevent a pipeline agent
//                                  from writing there, so a change here is not a
//                                  pipeline escape -- surfaced, never silently
//                                  passed, but not a gate failure).
// Layer B -- needs a real repo, skipped in --smoke mode.
// ---------------------------------------------------------------------------
function gc5Sanctioned(p) {
  return (
    p === '.forgeplan/map/map.json' ||
    p === '.forgeplan/map' || p === '.forgeplan/map/' ||         // whole map/ dir (gitignored-dir case)
    p === '.forgeplan/map/.work' || p === '.forgeplan/map/.work/' ||
    p.startsWith('.forgeplan/map/.work/') ||
    // E3/E4 per-zone generated layer files (.forgeplan/map/layers/**)
    p === '.forgeplan/map/layers' || p === '.forgeplan/map/layers/' ||
    p.startsWith('.forgeplan/map/layers/')
  );
}

function checkGC5SingleWrite(repoRoot, checks) {
  if (!repoRoot) {
    warn(checks, 'GC-5', 'skipped -- no --repo-root given (non-smoke run missing --repo-root; unreachable under --smoke, which never calls this check)');
    return;
  }
  let porcelain;
  try {
    // NOTE: do NOT .trim() the whole blob. Porcelain v1 status is a FIXED-WIDTH
    // 2-char XY field, and for a modified-not-staged file X is a literal space
    // (" M path"). Trimming the blob eats the leading space of the FIRST line,
    // shifting its path parse by one char (".forgeplan" -> "forgeplan") and
    // mis-binning map.json as outside-map dirt. filter(Boolean) already drops
    // the trailing empty line, so no blob-level trim is needed.
    porcelain = execFileSync('git', ['status', '--porcelain', '--ignored', '.forgeplan/'], { cwd: repoRoot, encoding: 'utf8' });
  } catch (e) {
    fail(checks, 'GC-5', `git status --porcelain --ignored .forgeplan/ failed: ${e.message}`);
    return;
  }
  const strayInMap = [];
  const otherDirt = [];
  for (const line of porcelain.split('\n').filter(Boolean)) {
    // porcelain line: "XY <path>" (rename: "XY <old> -> <new>" -- take the new
    // path). The XY status is fixed-width 2 chars + 1 space, so the path starts
    // at index 3; slice(3) preserves a leading "." (do NOT left-trim the line).
    let p = line.slice(3).trim();
    const arrow = p.indexOf(' -> ');
    if (arrow !== -1) p = p.slice(arrow + 4).trim();
    p = p.replace(/^"(.*)"$/, '$1'); // unquote paths git quotes for odd chars
    if (gc5Sanctioned(p)) continue;
    if (p.startsWith('.forgeplan/map/')) strayInMap.push(p);
    else otherDirt.push(p);
  }
  if (strayInMap.length > 0) {
    fail(checks, 'GC-5', `stray write inside .forgeplan/map/ (only map.json + .work/** are sanctioned): ${strayInMap.slice(0, 5).join('; ')}`);
    return;
  }
  if (otherDirt.length > 0) {
    warn(checks, 'GC-5', `changes under .forgeplan/ outside map/ (likely pre-existing repo dirt, NOT a pipeline write -- the hook + denylist prevent pipeline writes here): ${otherDirt.slice(0, 5).join('; ')}`);
    return;
  }
  pass(checks, 'GC-5', 'single-write holds: only .forgeplan/map/map.json (+ .work/**) changed');
}

// ---------------------------------------------------------------------------
// GC-6 -- determinism: re-derive a sample of node ids from (kind, path); if
// the derivation disagrees with the stored id, that is a BLOCKER (the core
// SS1 bet breaking). Layer B semantically (needs real provenance.ref values
// from a real scan), but runs harmlessly (warns, does not fail) on documents
// that carry no provenance.ref -- e.g. the hand-authored checkpoint fixture,
// which predates the content-hash convention.
// ---------------------------------------------------------------------------
function contentHashId(kind, pathOrSlug) {
  return createHash('sha1').update(`${kind}:${pathOrSlug}`).digest('hex').slice(0, 12);
}

function checkGC6Determinism(doc, checks) {
  const nodes = isArray(doc.nodes) ? doc.nodes : [];
  const before = checks.length;
  let sampled = 0;
  nodes.forEach((n, i) => {
    if (!isObject(n) || n.is_mega) return;
    const prov = isObject(n.provenance) ? n.provenance : null;
    if (!prov || typeof prov.ref !== 'string' || typeof n.kind !== 'string') return;
    sampled++;
    const expected = contentHashId(n.kind, prov.ref);
    if (n.id !== expected) {
      fail(
        checks,
        'GC-6',
        `nodes[${i}] id '${n.id}' does not match content-hash sha1(${n.kind}:${prov.ref})[:12]='${expected}' -- with source_fingerprint unchanged this is a BLOCKER`,
      );
    }
  });
  if (sampled === 0) {
    warn(checks, 'GC-6', 'no node carries (kind, provenance.ref) to sample -- cannot verify determinism on this document');
    return;
  }
  if (checks.length === before) pass(checks, 'GC-6', `determinism holds across ${sampled} sampled node id(s)`);
}

// ---------------------------------------------------------------------------
// GC-7..GC-11 -- content-completeness + canonicalization gates (CM-13, v0.11.0).
// All Layer A (need only the document), so they run in --smoke too. Severity
// split: STRUCTURAL invariants BLOCK (GC-7/GC-9/GC-10); CONTENT-quality signals
// WARN (GC-8/GC-11). The vendored fixture satisfies all BLOCKER-level checks
// (found_at 16/16, no megas, not a layer, distinct accents).
// ---------------------------------------------------------------------------

// GC-7 -- every node carries a valid ISO found_at (the §19 append-stability sort
// key). Catches CM-06 (constant/missing found_at, esp. layer leaf nodes).
function checkGC7FoundAt(doc, checks) {
  const nodes = isArray(doc.nodes) ? doc.nodes : [];
  const missing = [];
  nodes.forEach((n, i) => {
    if (!isObject(n)) return;
    if (typeof n.found_at !== 'string' || Number.isNaN(Date.parse(n.found_at))) missing.push(n.id ?? `#${i}`);
  });
  if (missing.length > 0) {
    fail(checks, 'GC-7', `${missing.length} node(s) lack a valid ISO found_at (append-stability sort key): ${missing.slice(0, 5).join(', ')}`);
    return;
  }
  pass(checks, 'GC-7', 'every node carries a valid found_at');
}

// GC-8 (WARN) -- flow completeness. A multi-node flow that lights no arrow
// (empty edge_ids) or has no RU steps is a dead chip. Catches CM-05 + CM-11.
function checkGC8FlowCompleteness(doc, checks) {
  const flows = isArray(doc.flows) ? doc.flows : [];
  if (flows.length === 0) { pass(checks, 'GC-8', 'no flows to check'); return; }
  const edgeIds = new Set((isArray(doc.edges) ? doc.edges : []).map((e) => (isObject(e) ? e.id : undefined)).filter(Boolean));
  const issues = [];
  flows.forEach((f) => {
    if (!isObject(f)) return;
    const nids = isArray(f.node_ids) ? f.node_ids : [];
    const eids = isArray(f.edge_ids) ? f.edge_ids : [];
    const steps = isArray(f.steps) ? f.steps : [];
    const tag = f.id ?? f.name ?? '?';
    if (nids.length > 1) {
      if (eids.length === 0) issues.push(`${tag}: no edge_ids (lights no arrow)`);
      else if (edgeIds.size > 0 && !eids.every((id) => edgeIds.has(id))) issues.push(`${tag}: edge_ids reference unknown edge(s)`);
      if (steps.length === 0) issues.push(`${tag}: no RU steps`);
    }
  });
  if (issues.length > 0) { warn(checks, 'GC-8', `flow completeness (CM-05/CM-11): ${issues.slice(0, 5).join('; ')}`); return; }
  pass(checks, 'GC-8', 'all multi-node flows carry edge_ids + steps');
}

// GC-9 -- layer-meta canonicalization (only fires when meta.scope === "layer").
// Frozen keys + "<parent>::<zone>" map_id + no auto-confirm of a needs_confirm
// floor. Catches CM-07. (Status flip is the guardian's own job, so this does NOT
// require status==confirmed at check time; it refuses to LET a needs_confirm
// layer pass the confirm gate.)
function checkGC9LayerMeta(doc, checks) {
  const meta = isObject(doc.meta) ? doc.meta : {};
  if (meta.scope !== 'layer') { pass(checks, 'GC-9', 'not a layer document (meta.scope != "layer")'); return; }
  const problems = [];
  for (const k of ['parent_map_id', 'parent_zone']) {
    if (typeof meta[k] !== 'string' || !meta[k]) problems.push(`missing ${k}`);
  }
  if (typeof meta.map_id === 'string' && meta.parent_map_id && meta.parent_zone) {
    const want = `${meta.parent_map_id}::${meta.parent_zone}`;
    if (meta.map_id !== want) problems.push(`map_id '${meta.map_id}' != '${want}' (fixed :: separator)`);
  }
  if (meta.needs_confirm === true) problems.push('needs_confirm:true -- a floor/low-confidence layer must not auto-confirm (CM-07)');
  if (problems.length > 0) { fail(checks, 'GC-9', `layer meta not canonical (CM-07): ${problems.slice(0, 5).join('; ')}`); return; }
  pass(checks, 'GC-9', 'layer meta canonical (parent keys, :: map_id, no needs_confirm floor)');
}

// GC-10 -- is_mega <=> kind=="mega", and every mega has non-empty children.
// Catches CM-18 (layer megas mislabeled with the leaf kind -> inflated counts +
// id-hash misses).
function checkGC10MegaKind(doc, checks) {
  const nodes = isArray(doc.nodes) ? doc.nodes : [];
  const problems = [];
  nodes.forEach((n, i) => {
    if (!isObject(n)) return;
    const isMega = n.is_mega === true;
    const kindMega = n.kind === 'mega';
    if (isMega !== kindMega) problems.push(`${n.id ?? `#${i}`}: is_mega=${isMega} but kind='${n.kind}'`);
    if (isMega && !(isArray(n.children) && n.children.length > 0)) problems.push(`${n.id ?? `#${i}`}: mega with empty children`);
  });
  if (problems.length > 0) { fail(checks, 'GC-10', `mega-kind mismatch (CM-18): ${problems.slice(0, 5).join('; ')}`); return; }
  pass(checks, 'GC-10', 'is_mega <=> kind=="mega"; every mega has children');
}

// GC-11 (WARN) -- no two grid-NEIGHBOUR zones share an accent. Catches CM-22
// (8 arc-zones, 7 tokens -> two adjacent zones both slate). Advisory: a
// non-neighbour repeat is fine when >7 zones are legitimate.
function checkGC11AccentNeighbours(doc, checks) {
  const zones = isArray(doc.zones) ? doc.zones : [];
  const comp = isObject(doc.composition) ? doc.composition : {};
  const placements = isArray(comp.placements) ? comp.placements : [];
  const cell = {};
  placements.forEach((p) => { if (isObject(p) && typeof p.zone === 'string' && isObject(p.cell)) cell[p.zone] = p.cell; });
  const accent = {};
  zones.forEach((z) => { if (isObject(z) && typeof z.id === 'string') accent[z.id] = z.accent; });
  const ids = Object.keys(cell);
  const clashes = [];
  for (let a = 0; a < ids.length; a++) {
    for (let b = a + 1; b < ids.length; b++) {
      const za = ids[a]; const zb = ids[b];
      if (!accent[za] || accent[za] !== accent[zb]) continue;
      const ca = cell[za]; const cb = cell[zb];
      const adj = (ca.row === cb.row && Math.abs((ca.col ?? 0) - (cb.col ?? 0)) === 1) ||
                  (ca.col === cb.col && Math.abs((ca.row ?? 0) - (cb.row ?? 0)) === 1);
      if (adj) clashes.push(`${za} & ${zb} both ${accent[za]}`);
    }
  }
  if (clashes.length > 0) { warn(checks, 'GC-11', `adjacent zones share an accent (CM-22): ${clashes.slice(0, 5).join('; ')}`); return; }
  pass(checks, 'GC-11', 'no grid-neighbour accent collisions');
}

// ---------------------------------------------------------------------------
// XC-1 / XC-2 -- cross-source checks a self-check structurally cannot do
// alone. Layer B -- skipped in --smoke mode (no scan/repo context).
// ---------------------------------------------------------------------------
function checkCrossSource(doc, scanFplPath, repoRoot, checks) {
  const edges = isArray(doc.edges) ? doc.edges : [];
  const typedLinkEdges = edges.filter(
    (e) => isObject(e) && (e.namespace === 'typed-link' || (!e.namespace && typeof e.relation === 'string' && VALID_RELATIONS.has(e.relation))),
  );
  const codeDepEdges = edges.filter((e) => isObject(e) && e.namespace === 'code-dep');

  if (!scanFplPath || !existsSync(scanFplPath)) {
    warn(checks, 'XC-1', 'skipped -- no --scan-fpl given or file missing (this line is unreachable under --smoke, which never calls this check at all; it fires only on a non-smoke run missing --scan-fpl)');
  } else {
    let scanFpl = null;
    try {
      scanFpl = JSON.parse(readFileSync(scanFplPath, 'utf8'));
    } catch (e) {
      fail(checks, 'XC-1', `could not parse --scan-fpl ${scanFplPath}: ${e.message}`);
    }
    if (scanFpl) {
      // The scan (.scan.fpl.json) is keyed by ARTIFACT id ("PRD-036" -> "RFC-030"),
      // the raw forgeplan_graph form. The EMITTED map.json typed-link edges are keyed
      // by CONTENT-HASH node id, because edge-verifier remaps endpoints to the node
      // ids the extractor minted (required by GC-2b: every edge endpoint in nodes).
      // Comparing the two id-spaces directly fails EVERY typed-link edge (the v0.2.0
      // bug this fixes). So first re-derive each scan artifact's content-hash id --
      // the SAME formula the extractor uses, sha1(kind + ":" + artifact_id)[:12] --
      // and lift the scan edges into content-hash space before comparing. This keeps
      // XC-1 a genuine independent cross-check: the guardian re-derives the id itself,
      // it does not trust the emitter's mapping.
      const artifacts = isArray(scanFpl.artifacts) ? scanFpl.artifacts : [];
      const aid2hash = new Map();
      for (const a of artifacts) {
        if (isObject(a) && typeof a.artifact_id === 'string' && typeof a.kind === 'string') {
          aid2hash.set(a.artifact_id, contentHashId(a.kind, a.artifact_id));
        }
      }
      const lift = (endpoint) => aid2hash.get(endpoint) ?? endpoint;
      const scanEdgeKeys = new Set(
        (isArray(scanFpl.edges) ? scanFpl.edges : []).map((e) => `${lift(e.from)}|${lift(e.to)}|${e.relation}`),
      );
      const before = checks.length;
      typedLinkEdges.forEach((e) => {
        const key = `${e.from}|${e.to}|${e.relation}`;
        if (!scanEdgeKeys.has(key)) {
          fail(checks, 'XC-1', `typed-link edge ${e.from}->${e.to} (${e.relation}) not found in .scan.fpl.json / forgeplan_graph (compared in content-hash id space)`);
        }
      });
      if (checks.length === before) pass(checks, 'XC-1', `all ${typedLinkEdges.length} typed-link edge(s) independently confirmed in the scan`);
    }
  }

  if (!repoRoot) {
    warn(checks, 'XC-2', 'skipped -- no --repo-root given (this line is unreachable under --smoke, which never calls this check at all; it fires only on a non-smoke run missing --repo-root)');
    return;
  }
  const before = checks.length;
  let checked = 0;
  // Scope every re-grep to source only. `grep -rlF -- pattern .` with NO
  // exclusions walks the ENTIRE repo -- including node_modules/, .git/,
  // .svelte-kit/, build output -- so on any real repo with dependencies
  // installed it is O(hundreds of MB) PER edge and the guardian never
  // finishes (the first forgeplan-web dogfood run: killed after 2 min, F6).
  // These exclusions MUST stay identical to the edge-verifier's own grep
  // (skills/edge-verifier/SKILL.md Algorithm 3) -- XC-2 re-runs the verifier's
  // search and must produce the SAME match, or a genuinely-valid edge is
  // spuriously flagged stale. This set also mirrors code-scanner's own
  // module-scan exclusions (agents/code-scanner.md Step 2).
  const grepExcludes = GREP_EXCLUDE_DIRS.map((d) => `--exclude-dir=${d}`);
  codeDepEdges.forEach((e) => {
    if (typeof e.verified_by !== 'string' || !e.verified_by.startsWith('grep:')) return;
    checked++;
    const pattern = e.verified_by.slice('grep:'.length);
    try {
      // execFileSync with an argv array -- no shell involved, so a hostile
      // `pattern` (this string comes from the map.json document, which the
      // guardian must never trust) cannot inject shell commands regardless
      // of its content. -F treats it as a literal fixed string, not a regex.
      execFileSync('grep', ['-rlF', ...grepExcludes, '--', pattern, '.'], { cwd: repoRoot, stdio: ['ignore', 'ignore', 'ignore'] });
    } catch {
      fail(checks, 'XC-2', `code-dep edge ${e.from}->${e.to} verified_by pattern is now stale (no re-grep match): ${pattern}`);
    }
  });
  if (checked === 0) {
    warn(checks, 'XC-2', 'no grep:-prefixed verified_by pattern to re-check');
  } else if (checks.length === before) {
    pass(checks, 'XC-2', `all ${checked} verified_by grep pattern(s) still match`);
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = { mapPath: null, repoRoot: null, scanFpl: null, smoke: false, checkOnly: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--repo-root') args.repoRoot = argv[++i];
    else if (a === '--scan-fpl') args.scanFpl = argv[++i];
    else if (a === '--smoke') args.smoke = true;
    else if (a === '--check-only') args.checkOnly = true;
    else rest.push(a);
  }
  args.mapPath = rest[0] ?? null;
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.mapPath) {
    console.error('usage: map-guardian.mjs <map.json path> [--repo-root <dir>] [--scan-fpl <path>] [--smoke] [--check-only]');
    process.exit(2);
  }
  if (!existsSync(args.mapPath)) {
    console.error(`map-guardian: file not found: ${args.mapPath}`);
    process.exit(1);
  }
  let doc;
  try {
    doc = JSON.parse(readFileSync(args.mapPath, 'utf8'));
  } catch (e) {
    console.error(`map-guardian: could not parse ${args.mapPath} as JSON: ${e.message}`);
    process.exit(1);
  }

  const checks = [];
  checkGC1Schema(doc, checks);
  checkGC2AssemblyGuards(doc, checks);
  checkGC3MegaNodes(doc, checks);
  checkGC4RelationsAndVerification(doc, checks);
  checkGC7FoundAt(doc, checks);
  checkGC8FlowCompleteness(doc, checks);
  checkGC9LayerMeta(doc, checks);
  checkGC10MegaKind(doc, checks);
  checkGC11AccentNeighbours(doc, checks);

  if (!args.smoke) {
    checkGC5SingleWrite(args.repoRoot, checks);
    checkGC6Determinism(doc, checks);
    checkCrossSource(doc, args.scanFpl, args.repoRoot, checks);
  }

  const blockers = checks.filter((c) => !c.ok);
  const warnings = checks.filter((c) => c.warning);

  for (const c of checks) {
    const tag = !c.ok ? 'BLOCKER' : c.warning ? 'WARN' : 'PASS';
    console.log(`[${tag}] ${c.id}: ${c.message}`);
  }

  if (blockers.length > 0) {
    console.error(`\nmap-guardian: ${blockers.length} BLOCKER(s) -- map stays 'proposed'.`);
    process.exit(1);
  }

  if (args.smoke) {
    console.log(`\nmap-guardian: PASS (${warnings.length} warning(s)) [smoke mode -- GC-5/GC-6/XC-1/XC-2 skipped, no write performed]`);
    process.exit(0);
  }

  // --check-only: full Layer A+B ran (same as a normal non-smoke pass), but
  // NO write is performed -- the status flip is deliberately skipped. This is
  // the read-only deep pass /map-doctor uses so it can exercise GC-5/GC-6/
  // XC-1/XC-2 without ever mutating map.json (the confirm write below is the
  // ONLY write path, and doctor must never trigger it).
  if (args.checkOnly) {
    console.log(`\nmap-guardian: PASS (${warnings.length} warning(s)) [check-only -- full Layer A+B, no write performed]`);
    process.exit(0);
  }

  // The sanctioned second write path (ADR-017 / RFC-023 Invariant #1): a
  // plain fs write, not a Write/Edit/MultiEdit tool call, flips ONLY
  // meta.status. Atomic tmp-rename, matching map-emitter's own write
  // discipline.
  doc.meta.status = 'confirmed';
  const tmpPath = `${args.mapPath}.guardian-tmp`;
  writeFileSync(tmpPath, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
  renameSync(tmpPath, args.mapPath);
  console.log(`\nmap-guardian: PASS (${warnings.length} warning(s)) -- status flipped proposed -> confirmed (atomic tmp-rename write to ${args.mapPath})`);
  process.exit(0);
}

main();
