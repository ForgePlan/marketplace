#!/usr/bin/env node
'use strict';

/**
 * Assert every shipped SKILL.md / command / agent has frontmatter a runtime can actually parse.
 *
 * WHY
 * ---
 * Claude Code does not fail loudly on a broken frontmatter block. It drops the whole thing:
 *
 *   "YAML frontmatter failed to parse ... At runtime this skill loads with empty metadata
 *    (all frontmatter fields silently dropped)."
 *
 * Every field goes at once — `description` (how the model decides the skill applies),
 * `allowed-tools` (the tool restriction), `disable-model-invocation` (explicit-only). The file
 * still ships, still validates as a file, and silently does nothing it advertises.
 *
 * When this gate was written, 16 of 213 shipped files were in that state, including 9 skills of
 * the flagship plugin — `/riper`, `/team`, `/do`, `/setup`, `/spec-author`. Four of them carried
 * `disable-model-invocation: true`, which was being dropped, so skills meant to be explicit-only
 * were model-invocable. Nothing reported it: the existing checks assert SKILL.md *exists*, and
 * never open it.
 *
 * WHAT IT CHECKS
 * --------------
 *   1. Frontmatter is present and closed (`---` ... `---`)
 *   2. No tab characters (YAML forbids tabs in indentation — a silent killer)
 *   3. Plain (unquoted) values contain no `": "` — that is a nested mapping to YAML, not text
 *   4. Double-quoted values contain no unescaped `"` before the close
 *   5. Single-quoted values have balanced `''` escapes
 *   6. `name` and `description` are present and non-empty
 *   7. `name` matches the directory (skills) or the file (commands/agents)
 *
 * NOT A YAML PARSER — deliberately. It detects the failure classes that actually bite and stays
 * dependency-free, matching the other gates in this directory. It was cross-checked against a
 * real YAML parser over all 213 shipped files: same verdict on every one. If that ever diverges,
 * the parser is right and this file is wrong.
 *
 * The corollary is a rule, not a limitation: frontmatter that needs a full YAML engine to read is
 * frontmatter that is too clever. Keep it flat.
 *
 * Read-only. No --write. A fixer that shares no resolver with its assertion becomes a drift source.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PLUGINS = path.join(REPO_ROOT, 'plugins');

/** Files that legitimately carry no frontmatter — prose docs that happen to live in agents/. */
const NO_FRONTMATTER_OK = new Set([
  'forgeplan-brownfield-pack/agents/discover/README.md',
  'forgeplan-brownfield-pack/agents/discover/SCAFFOLDING.md',
]);

const problems = [];
let checked = 0;

/** Collect every shipped markdown file that is supposed to carry frontmatter. */
function targets() {
  const out = [];
  for (const plugin of fs.readdirSync(PLUGINS, { withFileTypes: true })) {
    if (!plugin.isDirectory()) continue;
    const root = path.join(PLUGINS, plugin.name);

    // skills/<name>/SKILL.md  — `name` must match <name>
    const skills = path.join(root, 'skills');
    if (fs.existsSync(skills)) {
      for (const s of fs.readdirSync(skills, { withFileTypes: true })) {
        if (!s.isDirectory() && !s.isSymbolicLink()) continue;
        const f = path.join(skills, s.name, 'SKILL.md');
        if (fs.existsSync(f)) out.push({ file: f, kind: 'skill', expect: s.name });
      }
    }

    // commands/*.md and agents/*.md (+ one nested level) — `name` must match the basename
    for (const [dir, kind] of [['commands', 'command'], ['agents', 'agent']]) {
      const d = path.join(root, dir);
      if (!fs.existsSync(d)) continue;
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.isFile() && e.name.endsWith('.md')) {
          out.push({ file: path.join(d, e.name), kind, expect: e.name.replace(/\.md$/, '') });
        } else if (e.isDirectory()) {
          for (const n of fs.readdirSync(path.join(d, e.name), { withFileTypes: true })) {
            if (n.isFile() && n.name.endsWith('.md')) {
              out.push({
                file: path.join(d, e.name, n.name),
                kind,
                expect: n.name.replace(/\.md$/, ''),
              });
            }
          }
        }
      }
    }
  }
  return out.sort((a, b) => a.file.localeCompare(b.file));
}

/**
 * Split a frontmatter block into logical entries.
 *
 * A key starts at indent 0 (`key:`); deeper-indented lines continue the value it opened, which is
 * how a plain scalar wraps across lines. Getting this wrong is how a checker misses a hazard
 * sitting on a continuation line rather than the first one.
 */
function entries(block) {
  const out = [];
  let cur = null;
  for (const raw of block.split('\n')) {
    const m = /^([A-Za-z_][A-Za-z0-9_-]*):(.*)$/.exec(raw);
    if (m) {
      if (cur) out.push(cur);
      const inline = m[2].replace(/^ /, '');
      // Nothing on the key's own line means what follows is a nested mapping or a block sequence,
      // not a wrapped scalar. Those are structure, and structure carries none of the hazards below.
      cur = { key: m[1], value: inline, block: inline.trim() === '' };
    } else if (cur && !cur.block && raw.trim() !== '') {
      cur.value += '\n' + raw.trim();
    }
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * Find where a quoted scalar closes, honouring that quote type's escape.
 * Returns the index of the closing quote, or -1 if it never closes.
 */
function closingQuote(v) {
  const q = v[0];
  for (let i = 1; i < v.length; i++) {
    if (q === '"' && v[i] === '\\') { i++; continue; }        // \" escapes in double quotes
    if (v[i] !== q) continue;
    if (q === "'" && v[i + 1] === "'") { i++; continue; }     // '' escapes in single quotes
    return i;
  }
  return -1;
}

/** Strip a trailing YAML comment from a plain scalar (` #` and everything after). */
function stripComment(v) {
  const i = v.search(/(^|\s)#/);
  return i === -1 ? v : v.slice(0, i);
}

function checkFile({ file, kind, expect }) {
  const rel = path.relative(PLUGINS, file);
  const text = fs.readFileSync(file, 'utf8');
  const add = (msg) => problems.push(`${rel}: ${msg}`);

  if (!text.startsWith('---')) {
    if (!NO_FRONTMATTER_OK.has(rel)) add('no frontmatter block — the runtime loads it with no metadata at all');
    return;
  }

  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?(\n|$)/.exec(text);
  if (!m) {
    add('frontmatter opens with `---` but never closes — everything below is swallowed');
    return;
  }
  checked++;
  const block = m[1];

  if (block.includes('\t')) {
    add('tab character in frontmatter — YAML forbids tabs, the block will not parse');
  }

  const seen = new Map();
  for (const e of entries(block)) {
    seen.set(e.key, e.value);
    const v = e.value.trim();
    if (v === '' || v.startsWith('|') || v.startsWith('>')) continue; // block scalar: text is literal, no hazard
    if (v.startsWith('[') || v.startsWith('{')) continue;             // flow collection: out of scope

    if (v.startsWith('"') || v.startsWith("'")) {
      // A quoted scalar ends at its first unescaped quote. Text after that point is a parse error:
      // the string closed early and YAML is now looking at a bare token it cannot place.
      const q = v[0];
      const closed = closingQuote(v);
      if (closed === -1) {
        add(`${e.key}: ${q === '"' ? 'double' : 'single'}-quoted value never closes`);
      } else if (v.slice(closed + 1).trim() !== '') {
        add(
          `${e.key}: unescaped ${q === '"' ? `'"'` : '"\'"'} inside a ` +
          `${q === '"' ? 'double' : 'single'}-quoted value — the string ends early at ` +
          `...${v.slice(Math.max(0, closed - 28), closed + 1)}`
        );
      }
    } else {
      // Plain scalar: `: ` is not text, it is a nested mapping — the single most common break here.
      const bare = stripComment(v);
      const hit = /:\s/.exec(bare);
      if (hit) {
        const at = hit.index;
        add(
          `${e.key}: unquoted value contains ": " so YAML reads a nested mapping, not text ` +
          `— near "...${bare.slice(Math.max(0, at - 30), at + 12)}..." — wrap the value in single quotes`
        );
      }
    }
  }

  const name = (seen.get('name') || '').trim().replace(/^['"]|['"]$/g, '');
  const desc = (seen.get('description') || '').trim();
  if (!name) add('missing `name`');
  if (!desc) add('missing `description` — without it the model has no basis to select this file');
  if (name && name !== expect) {
    add(`name "${name}" does not match its ${kind === 'skill' ? 'directory' : 'filename'} "${expect}"`);
  }
}

const list = targets();
for (const t of list) checkFile(t);

if (problems.length > 0) {
  console.error(`frontmatter-check FAILED: ${problems.length} problem(s) in ${list.length} shipped file(s)\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error(
    '\nA file that fails here still ships and still looks fine. The runtime drops every field —' +
    '\ndescription, allowed-tools, disable-model-invocation — and the file silently does nothing.'
  );
  process.exit(1);
}

console.log(
  `Frontmatter OK: ${checked} of ${list.length} shipped skill/command/agent files parse, ` +
  `all carry name + description, all names match their path.`
);
