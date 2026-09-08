#!/usr/bin/env node
'use strict';

/**
 * Assert that the Profile letter each agent carries in smith's Agent index is a claim the agent's
 * own frontmatter can actually honour (NOTE-013 DEFER-033).
 *
 * THE GAP THIS CLOSES
 * -------------------
 * The routing map tells smith which agents to dispatch and what evidence each row must produce. A
 * row can demand an EVIDENCE artifact from an agent labelled "B" — and nothing checked that the
 * agent could physically create one. Trim an allowlist back and every other gate stays green while
 * the row silently demands the impossible. That exact defect shipped once: three B-labelled
 * reviewers carried allowlists containing zero `forgeplan_*` tools (marketplace#236, EVID-231),
 * and it was caught by a person reading files, not by CI.
 *
 * READ-ONLY by construction. It never writes and has no `--write` mode: a tool that both asserts a
 * value and repairs it can disagree with itself, and then the repair becomes the drift.
 *
 * WHAT IT ASSERTS, per row of the Agent index
 *   1. ROW-UNRESOLVED   the row names an agent file that exists (exactly one match)
 *   2. FRONTMATTER      that file has parseable frontmatter carrying `name`
 *   3. NAME-MISMATCH    the frontmatter `name` equals the name the row advertises
 *   4. UNKNOWN-PROFILE  the profile label is one this gate understands — an unrecognised label is a
 *                       LOUD failure, never a silent skip. A checker that quietly skips what it does
 *                       not understand reports success for work it never did.
 *   5. PROFILE-SURFACE  the tools the profile REQUIRES are reachable, and the tools it FORBIDS are
 *                       not. Reachability accounts for both declaration styles: a `tools:` allowlist
 *                       (which constrains harder — anything unlisted is unreachable) and a
 *                       `disallowedTools:` denylist (everything not denied is inherited).
 *
 * WHAT IT DELIBERATELY DOES NOT ASSERT
 *   Rows marked with a dagger. The Agent index states in its own footnote that for those the letter
 *   is ADVISORY and the body, not the frontmatter, carries the shape (code-analyzer, debugger,
 *   platform-engineer, ddd-domain-expert). Enforcing a label that the document itself calls advisory
 *   would manufacture findings against a recorded decision. They still get checks 1-3.
 *
 * Fixture override (self-test only): CI_ROUTING_MAP_PATH + CI_ROUTING_PLUGINS_ROOT.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const MAP_PATH = process.env.CI_ROUTING_MAP_PATH
  ? path.resolve(process.env.CI_ROUTING_MAP_PATH)
  : path.join(REPO_ROOT, 'plugins', 'fpl-skills', 'skills', 'smith', 'routing-map.md');
const PLUGINS_ROOT = process.env.CI_ROUTING_PLUGINS_ROOT
  ? path.resolve(process.env.CI_ROUTING_PLUGINS_ROOT)
  : path.join(REPO_ROOT, 'plugins');

/**
 * Per profile: what the letter promises about the tool surface.
 * Measured against every indexed agent on disk before being written down — every rule below holds
 * for every non-dagger row today, so a failure here is a regression, not a backlog item.
 */
const PROFILES = {
  'A': {
    label: 'creator',
    requires: ['forgeplan_new', 'forgeplan_update', 'forgeplan_link'],
    forbids: ['forgeplan_activate', 'Write', 'Edit'],
    why: 'a creator that cannot create is a row demanding the impossible; activation is the orchestrator\'s',
  },
  'B': {
    label: 'reviewer + EVID recorder',
    requires: ['forgeplan_new', 'forgeplan_update', 'forgeplan_link', 'forgeplan_claim'],
    forbids: ['forgeplan_activate', 'forgeplan_claims', 'Write', 'Edit'],
    why: 'rows demand an EVIDENCE artifact from B; it must also claim its artifact and release it, ' +
         'while the plural claims sweep is Profile A / orchestrator territory',
  },
  'B-gate': {
    label: 'pre-activation gate',
    requires: ['forgeplan_new', 'forgeplan_update', 'forgeplan_link', 'forgeplan_claim'],
    forbids: ['forgeplan_activate', 'forgeplan_claims', 'Write', 'Edit'],
    why: 'the gate records a verdict as EVIDENCE and must not be able to act on its own verdict',
  },
  'B-orchestrator': {
    label: 'router',
    requires: ['forgeplan_claims'],
    forbids: ['forgeplan_new', 'forgeplan_update', 'forgeplan_link', 'forgeplan_activate',
              'forgeplan_claim', 'Write', 'Edit'],
    why: 'a router reads broad state and recommends; it owns no work item and mutates nothing',
  },
  'C': {
    label: 'read-only researcher',
    requires: [],
    forbids: ['forgeplan_new', 'forgeplan_update', 'forgeplan_link', 'forgeplan_activate',
              'Write', 'Edit'],
    why: 'C returns a synthesis to the orchestrator and never persists it',
  },
  'C-coder': {
    label: 'source mutator',
    requires: ['Write', 'Edit'],
    forbids: ['forgeplan_new', 'forgeplan_update', 'forgeplan_link', 'forgeplan_activate'],
    why: 'the one profile that writes source files, and the one that never authors artifacts',
  },
  'D': {
    label: 'maintainer',
    requires: ['forgeplan_update', 'forgeplan_link'],
    forbids: ['forgeplan_new', 'forgeplan_activate', 'Write', 'Edit'],
    why: 'D fixes what exists; creation is Profile A\'s',
  },
};

const problems = [];
let rowsSeen = 0;
let rowsChecked = 0;   // rows whose profile surface was actually asserted
let rowsAdvisory = 0;  // dagger rows: structural checks only

function problem(code, where, message) {
  problems.push({ code, where, message });
}

/** Minimal frontmatter reader: `name`, plus `tools` / `disallowedTools` in inline or block form. */
function readFrontmatter(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return null;
  const lines = text.slice(4, end).split('\n');

  const out = { name: null, tools: null, disallowedTools: null };
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let value = m[2].trim();
    if (key === 'name') {
      out.name = value.replace(/^["']|["']$/g, '');
      continue;
    }
    if (key !== 'tools' && key !== 'disallowedTools') continue;

    if (value && value !== '|' && value !== '>' && value !== '>-' && value !== '|-') {
      // inline: `tools: A, B, C`  (also tolerates a flow list `[A, B]`)
      out[key] = value.replace(/^\[|\]$/g, '').split(',')
        .map((x) => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
      continue;
    }
    // block form: subsequent `  - item` lines, or a folded scalar of comma-separated names
    const items = [];
    let folded = '';
    for (let j = i + 1; j < lines.length; j++) {
      const raw = lines[j];
      if (!raw.trim()) continue;
      if (!/^\s/.test(raw)) break;              // dedented to a new key
      const li = raw.trim().match(/^-\s*(.+)$/);
      if (li) { items.push(li[1].trim().replace(/^["']|["']$/g, '')); continue; }
      if (/^\s*[A-Za-z][A-Za-z0-9_-]*:\s/.test(raw)) break;
      folded += ' ' + raw.trim();
    }
    out[key] = items.length
      ? items
      : folded.split(',').map((x) => x.trim()).filter(Boolean);
  }
  return out;
}

/**
 * Can this agent reach `tool`?
 * An allowlist is authoritative and constrains harder than a denylist: anything unlisted is
 * unreachable. Without an allowlist, a denylist subtracts from an inherited-everything surface.
 * Names are matched bare-or-prefixed, because the `mcp__server__tool` prefix is runtime-specific
 * (Claude Code doubles the underscore, OMP does not) — matching only the prefixed spelling would
 * make this gate wrong in the next runtime.
 */
function reaches(fm, tool) {
  const hit = (entry) => {
    const e = String(entry).trim();
    return e === tool || e.endsWith('__' + tool) || e.endsWith('_' + tool);
  };
  if (fm.tools && !fm.tools.some((x) => x.trim() === '*')) {
    return fm.tools.some(hit);
  }
  if (fm.disallowedTools) {
    return !fm.disallowedTools.some(hit);
  }
  return true; // no restriction declared: inherits the parent session
}

/** `**name**` -> name; `` `plugin` `` -> plugin; `C†` -> {profile:'C', advisory:true}. */
function parseRow(line) {
  const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  if (cells.length < 3) return null;
  const name = cells[0].replace(/\*/g, '').replace(/`/g, '').trim();
  const plugin = cells[1].replace(/`/g, '').trim();
  const rawProfile = cells[2].trim();
  const advisory = rawProfile.includes('†');
  const profile = rawProfile
    .replace(/\*/g, '').replace(/†/g, '')
    .replace(/\s*\(.*\)\s*$/, '')
    .trim();
  return { name, plugin, profile, rawProfile, advisory };
}

function main() {
  let map;
  try {
    map = fs.readFileSync(MAP_PATH, 'utf8');
  } catch (err) {
    console.error(`routing-profile-check: cannot read the routing map ${MAP_PATH}: ${err.message}`);
    process.exit(1);
  }

  const marker = '## Agent index';
  const at = map.indexOf(marker);
  if (at === -1) {
    console.error(`routing-profile-check: no "${marker}" section in ${MAP_PATH} — refusing to pass ` +
                  'vacuously. If the section was renamed, update this gate with it.');
    process.exit(1);
  }
  const section = map.slice(at + marker.length).split('\n## ')[0];
  const rows = section.split('\n').filter((l) => l.trim().startsWith('| **'));

  if (!rows.length) {
    console.error('routing-profile-check: the Agent index has no rows — refusing to pass vacuously');
    process.exit(1);
  }

  for (const line of rows) {
    const row = parseRow(line);
    if (!row) continue;
    rowsSeen++;

    // A row can legitimately declare itself not-an-agent (the c4-diagram skill does).
    if (/^N\/A/i.test(row.profile)) continue;

    const agentsDir = path.join(PLUGINS_ROOT, row.plugin, 'agents');
    const matches = [];
    (function walk(dir) {
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.isFile() && e.name === row.name + '.md') matches.push(full);
      }
    })(agentsDir);

    if (matches.length !== 1) {
      problem('ROW-UNRESOLVED', `${row.plugin}:${row.name}`,
        matches.length === 0
          ? `the index names an agent with no file under ${path.relative(REPO_ROOT, agentsDir)} — ` +
            'a renamed or moved agent leaves the row pointing at nothing'
          : `${matches.length} files match; the row is ambiguous`);
      continue;
    }

    const rel = path.relative(REPO_ROOT, matches[0]);
    const fm = readFrontmatter(matches[0]);
    if (!fm || !fm.name) {
      problem('FRONTMATTER', rel,
        'no parseable frontmatter with a `name` — the agent loads with empty metadata and its ' +
        'declared constraints silently do not apply');
      continue;
    }
    if (fm.name !== row.name) {
      problem('NAME-MISMATCH', rel,
        `frontmatter name "${fm.name}" != the name the index advertises "${row.name}"`);
      continue;
    }

    if (row.advisory) { rowsAdvisory++; continue; }

    const spec = PROFILES[row.profile];
    if (!spec) {
      problem('UNKNOWN-PROFILE', rel,
        `profile ${JSON.stringify(row.rawProfile)} is not one this gate understands ` +
        `(${Object.keys(PROFILES).join(', ')}). An unrecognised label is failed loudly on purpose: ` +
        'skipping it would report success for a row nothing checked.');
      continue;
    }

    rowsChecked++;
    for (const tool of spec.requires) {
      if (!reaches(fm, tool)) {
        problem('PROFILE-SURFACE', rel,
          `labelled ${row.rawProfile} (${spec.label}) but cannot reach ${tool} — ${spec.why}`);
      }
    }
    for (const tool of spec.forbids) {
      if (reaches(fm, tool)) {
        problem('PROFILE-SURFACE', rel,
          `labelled ${row.rawProfile} (${spec.label}) but can reach ${tool}, which that profile ` +
          `must not — ${spec.why}`);
      }
    }
  }

  if (problems.length) {
    const byCode = {};
    for (const p of problems) byCode[p.code] = (byCode[p.code] || 0) + 1;
    console.error('routing-profile-check FAILED\n');
    for (const p of problems) console.error(`  [${p.code}] ${p.where}\n      ${p.message}`);
    console.error(`\n  rows seen: ${rowsSeen}, profile-surface checked: ${rowsChecked}, ` +
                  `advisory (dagger, structural checks only): ${rowsAdvisory}`);
    console.error(`  problems: ${Object.entries(byCode).map(([c, n]) => `${c}=${n}`).join(', ')}`);
    console.error('\n  The routing map tells smith what to dispatch and what evidence to expect.');
    console.error('  A profile letter the agent cannot honour makes that instruction unfollowable.');
    process.exit(1);
  }

  console.log(
    `Routing profiles OK: ${rowsSeen} index row(s); ${rowsChecked} profile surface(s) verified ` +
    `against agent frontmatter, ${rowsAdvisory} advisory (dagger) row(s) structurally checked only.`);
}

// Exported so the self-test can drive the REAL parser rather than a copy of it. A hand-written
// frontmatter reader that silently mis-parses an allowlist would make this gate pass while checking
// nothing, so `routing-profile-check.selftest.sh` cross-checks these two functions against a real
// YAML parser over every indexed agent. Running the file directly still executes main() unchanged.
module.exports = { readFrontmatter, reaches, parseRow, PROFILES };

if (require.main === module) main();
