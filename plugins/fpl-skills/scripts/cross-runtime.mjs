#!/usr/bin/env node
// cross-runtime.mjs — wire this project's Claude Code assets into every other AI runtime.
//
// Run from the root of a project that consumes the ForgePlan marketplace:
//
//   node cross-runtime.mjs              report what each detected runtime can and cannot see
//   node cross-runtime.mjs --fix        create the missing links
//   node cross-runtime.mjs --all        check every known runtime, not just detected ones
//   node cross-runtime.mjs --json       machine-readable output
//   node cross-runtime.mjs --strict     exit 1 on any gap (for CI)
//
// WHY THIS EXISTS
// ---------------
// The assets are portable Markdown; only the paths differ. Codex reads .agents/skills and
// nothing else. OpenCode reads .opencode/skills and .opencode/commands. Claude Code reads
// .claude/. Same files, four discovery conventions.
//
// The failure mode is silence: a runtime that cannot find a skill does not say "wrong
// path", it behaves as though the skill does not exist. Three separate times that turned
// into "why does this plugin do nothing here" before anyone checked the path. This tool
// turns that into one line of output.
//
// Zero dependencies, Node builtins only. Creates symlinks and directories; never deletes,
// never overwrites an existing file, never writes a config file that may be shared.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const argv = new Set(process.argv.slice(2));
const FIX = argv.has('--fix');
const ALL = argv.has('--all');
const JSON_OUT = argv.has('--json');
const STRICT = argv.has('--strict');

if (argv.has('--help') || argv.has('-h')) {
  console.log(fs.readFileSync(new URL(import.meta.url), 'utf8')
    .split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
  process.exit(0);
}

const exists = (p) => fs.existsSync(path.join(ROOT, p));
const onPath = (bin) =>
  (process.env.PATH || '').split(path.delimiter)
    .some((d) => d && fs.existsSync(path.join(d, bin)));

/**
 * Each runtime declares only the surfaces it actually reads.
 *
 * `link`  — a symlink we can safely create: source must exist, target is inside the project.
 * `note`  — something we report but never write, because it lives outside the project or is
 *           shared configuration. Printing the command is the correct depth of help there.
 */
const RUNTIMES = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    detect: () => exists('.claude') || !!process.env.CLAUDECODE || onPath('claude'),
    surfaces: [
      { kind: 'source', label: 'skills',   path: '.claude/skills' },
      { kind: 'source', label: 'commands', path: '.claude/commands' },
    ],
  },
  {
    id: 'codex',
    name: 'Codex CLI',
    detect: () => !!process.env.CODEX_HOME || exists('.codex') || onPath('codex'),
    surfaces: [
      { kind: 'link', label: 'skills', from: '.claude/skills', to: '.agents/skills' },
      {
        kind: 'note', label: 'commands',
        text: 'Codex has no command directory — it deprecated custom prompts in favour of skills. ' +
              'A plugin whose entry point is a slash command needs a pointer skill to be reachable here.',
      },
    ],
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    detect: () => exists('.opencode') || !!process.env.OPENCODE || onPath('opencode'),
    surfaces: [
      { kind: 'link', label: 'skills',      from: '.claude/skills',   to: '.opencode/skills' },
      { kind: 'link', label: 'commands',    from: '.claude/commands', to: '.opencode/commands' },
      { kind: 'link', label: 'skills (neutral)', from: '.claude/skills', to: '.agents/skills' },
    ],
  },
  {
    id: 'omp',
    name: 'OMP (oh-my-pi)',
    detect: () => !!process.env.OMPCODE || exists('.omp') || onPath('omp'),
    surfaces: [
      { kind: 'link', label: 'skills', from: '.claude/skills', to: '.agents/skills' },
      {
        kind: 'note', label: 'tool names',
        text: 'OMP spells MCP tools with ONE underscore (mcp__srv_tool). If an agent reports a ' +
              'connected server as missing, that is the spelling, not an outage — check `omp /mcp list`.',
      },
    ],
  },
  {
    id: 'generic-agents-md',
    name: 'Any agents.md-compatible client',
    detect: () => exists('AGENTS.md'),
    surfaces: [
      { kind: 'link', label: 'skills', from: '.claude/skills', to: '.agents/skills' },
    ],
  },
];

/** Relative symlink target, so it survives a clone on another machine. */
function relTarget(from, to) {
  return path.relative(path.dirname(path.join(ROOT, to)), path.join(ROOT, from));
}

function inspect(surface) {
  if (surface.kind !== 'link') return { state: surface.kind, ...surface };

  const abs = path.join(ROOT, surface.to);
  const src = path.join(ROOT, surface.from);
  const want = relTarget(surface.from, surface.to);

  if (!fs.existsSync(src)) return { state: 'no-source', ...surface };

  const st = fs.lstatSync(abs, { throwIfNoEntry: false });
  if (!st) return { state: 'missing', want, ...surface };
  if (st.isSymbolicLink()) {
    const actual = fs.readlinkSync(abs);
    if (!fs.existsSync(abs)) return { state: 'dangling', actual, want, ...surface };
    return { state: 'ok', actual, want, ...surface };
  }
  return { state: 'occupied', want, ...surface };  // real dir/file — never touch
}

function applyFix(s) {
  const abs = path.join(ROOT, s.to);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  if (s.state === 'dangling') fs.unlinkSync(abs);
  fs.symlinkSync(s.want, abs);
}

const report = [];
let fixed = 0;

// Several runtimes read the SAME path — .agents/skills is the neutral one, wanted by
// Codex, OMP and any agents.md client alike. Count distinct paths, not surface entries,
// or the summary reports three gaps where one link closes all three.
const gapPaths = new Set();

for (const rt of RUNTIMES) {
  const detected = rt.detect();
  if (!detected && !ALL) continue;

  const surfaces = rt.surfaces.map(inspect);

  for (const s of surfaces) {
    if (s.state === 'missing' || s.state === 'dangling') {
      if (FIX) { applyFix(s); s.state = 'fixed'; fixed++; }
      else gapPaths.add(s.to);
    } else if (s.state === 'occupied' || s.state === 'no-source') {
      gapPaths.add(s.to || s.from);
    }
  }
  report.push({ id: rt.id, name: rt.name, detected, surfaces });
}

const gaps = gapPaths.size;

if (JSON_OUT) {
  console.log(JSON.stringify({ root: ROOT, gaps, fixed, runtimes: report }, null, 2));
  process.exit(STRICT && gaps > 0 ? 1 : 0);
}

const ICON = {
  ok: '  ok    ', fixed: '  fixed ', missing: '  MISSING', dangling: '  BROKEN',
  occupied: '  BLOCKED', 'no-source': '  n/a   ', note: '  note  ', source: '  source',
};

if (report.length === 0) {
  console.log('No AI runtime detected in this project. Use --all to see every known runtime.');
  process.exit(0);
}

console.log(`Cross-runtime wiring for ${ROOT}\n`);

for (const rt of report) {
  console.log(`${rt.name}${rt.detected ? '' : '   (not detected)'}`);
  for (const s of rt.surfaces) {
    const icon = ICON[s.state] || `  ${s.state}`;
    if (s.state === 'note')       console.log(`${icon} ${s.label.padEnd(18)} ${s.text}`);
    else if (s.state === 'source') console.log(`${icon} ${s.label.padEnd(18)} ${s.path}${exists(s.path) ? '' : '   (absent)'}`);
    else if (s.state === 'no-source') console.log(`${icon} ${s.label.padEnd(18)} nothing to link — ${s.from} does not exist`);
    else if (s.state === 'occupied') console.log(`${icon} ${s.label.padEnd(18)} ${s.to} is a real file/dir, not a symlink — resolve by hand, it may hold edits`);
    else if (s.state === 'dangling') console.log(`${icon} ${s.label.padEnd(18)} ${s.to} -> ${s.actual} (resolves to nothing)`);
    else console.log(`${icon} ${s.label.padEnd(18)} ${s.to} -> ${s.want}`);
  }
  console.log('');
}

if (fixed > 0) console.log(`Created ${fixed} link(s).`);

if (gaps > 0) {
  console.log(`${gaps} gap(s) remain.`);
  if (!FIX) console.log('Run with --fix to create the missing links.');
  console.log('\nNot handled here on purpose:');
  console.log('  - MCP server wiring — that config can be user-scoped or shared.');
  console.log('    Run: forgeplan mcp install --client <claude-code|cursor|codex>');
  console.log('  - "BLOCKED" entries — a real directory where a link belongs may contain');
  console.log('    edits that were never in the source. Deleting it would lose them.');
} else {
  console.log('Every surface each detected runtime reads is wired.');
}

process.exit(STRICT && gaps > 0 ? 1 : 0);
