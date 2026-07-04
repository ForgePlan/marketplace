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
// GC-5 -- single-write, gitignore-aware (SPEC-003 SS C4). map/map.json is
// itself gitignored, so a bare `git status --porcelain` can never show it as
// dirty -- this check therefore asserts BOTH that tracked paths under
// .forgeplan/ are untouched AND that no ignored path outside .forgeplan/map/
// changed. Layer B -- needs a real repo, skipped in --smoke mode.
// ---------------------------------------------------------------------------
function checkGC5SingleWrite(repoRoot, checks) {
  if (!repoRoot) {
    warn(checks, 'GC-5', 'skipped -- no --repo-root given (this line is unreachable under --smoke, which never calls this check at all; it fires only on a non-smoke run missing --repo-root)');
    return;
  }
  let trackedPorcelain;
  try {
    trackedPorcelain = execFileSync('git', ['status', '--porcelain', '.forgeplan/'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  } catch (e) {
    fail(checks, 'GC-5', `git status --porcelain .forgeplan/ failed: ${e.message}`);
    return;
  }
  if (trackedPorcelain.length > 0) {
    const sample = trackedPorcelain.split('\n').slice(0, 5).join('; ');
    fail(checks, 'GC-5', `tracked file(s) under .forgeplan/ changed (must be empty -- only gitignored map/ paths may change): ${sample}`);
    return;
  }
  let ignoredPorcelain;
  try {
    ignoredPorcelain = execFileSync('git', ['status', '--porcelain', '--ignored', '.forgeplan/'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  } catch (e) {
    fail(checks, 'GC-5', `git status --porcelain --ignored .forgeplan/ failed: ${e.message}`);
    return;
  }
  const badIgnored = ignoredPorcelain
    .split('\n')
    .filter(Boolean)
    .filter((line) => !line.slice(3).trim().startsWith('.forgeplan/map/'));
  if (badIgnored.length > 0) {
    fail(checks, 'GC-5', `ignored path(s) outside .forgeplan/map/ changed: ${badIgnored.slice(0, 5).join('; ')}`);
    return;
  }
  pass(checks, 'GC-5', 'single-write holds: no tracked change under .forgeplan/, no ignored change outside .forgeplan/map/');
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
      const scanEdgeKeys = new Set((isArray(scanFpl.edges) ? scanFpl.edges : []).map((e) => `${e.from}|${e.to}|${e.relation}`));
      const before = checks.length;
      typedLinkEdges.forEach((e) => {
        const key = `${e.from}|${e.to}|${e.relation}`;
        if (!scanEdgeKeys.has(key)) {
          fail(checks, 'XC-1', `typed-link edge ${e.from}->${e.to} (${e.relation}) not found in .scan.fpl.json / forgeplan_graph`);
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
  codeDepEdges.forEach((e) => {
    if (typeof e.verified_by !== 'string' || !e.verified_by.startsWith('grep:')) return;
    checked++;
    const pattern = e.verified_by.slice('grep:'.length);
    try {
      // execFileSync with an argv array -- no shell involved, so a hostile
      // `pattern` (this string comes from the map.json document, which the
      // guardian must never trust) cannot inject shell commands regardless
      // of its content. -F treats it as a literal fixed string, not a regex.
      execFileSync('grep', ['-rlF', '--', pattern, '.'], { cwd: repoRoot, stdio: ['ignore', 'ignore', 'ignore'] });
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
  const args = { mapPath: null, repoRoot: null, scanFpl: null, smoke: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--repo-root') args.repoRoot = argv[++i];
    else if (a === '--scan-fpl') args.scanFpl = argv[++i];
    else if (a === '--smoke') args.smoke = true;
    else rest.push(a);
  }
  args.mapPath = rest[0] ?? null;
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.mapPath) {
    console.error('usage: map-guardian.mjs <map.json path> [--repo-root <dir>] [--scan-fpl <path>] [--smoke]');
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
