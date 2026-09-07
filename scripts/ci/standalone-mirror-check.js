#!/usr/bin/env node
'use strict';

/**
 * Assert that every skill published as a standalone mirror is fit to be mirrored,
 * and that the sync workflow's three hand-typed lists agree with the manifest (#282).
 *
 * READ-ONLY by construction. It never writes, never clones, never touches the network.
 * The fixer is the existing `.github/workflows/sync-standalone-skills.yml` (rsync), not this file.
 *
 * WHY IT DOES NOT COMPARE AGAINST THE MIRRORS THEMSELVES
 * -----------------------------------------------------
 * The standalone clones live OUTSIDE this repository — they are sibling directories of the
 * marketplace checkout, and separate GitHub repos. A CI runner checks out one repo and can never
 * see them. A gate that printed OK for eight mirrors it never opened would be a green check
 * asserting nothing, so no such check exists here: every assertion below runs from the marketplace
 * checkout alone, and there is no state in which this gate passes without having checked something.
 *
 * WHAT IT ASSERTS
 *   1. SOURCE-MISSING     every manifest source exists and is a directory
 *   2. NAME-MISMATCH      installedName equals the source SKILL.md frontmatter `name`
 *   3. SYMLINK            no symlink anywhere under a source (rsync would copy it as a link,
 *                         and a link into the plugin tree is meaningless in a single-skill repo)
 *   4. PLUGIN-ROOT-RESIDUE   no `CLAUDE_PLUGIN_ROOT` under a source. The variable is expanded by
 *                         the plugin runtime; in a standalone install nothing sets it, so it
 *                         expands to the empty string and the path silently points at the
 *                         filesystem root. A broken path that looks fine is the failure this
 *                         whole gate exists for.
 *   5. VOCABULARY-LEAK    per-mirror forbiddenTokens — for a skill published as ecosystem-free,
 *                         this is the property that decides whether the split was worth doing.
 *   6. WORKFLOW-PARITY    the manifest agrees with all THREE hand-typed lists in the sync
 *                         workflow: paths:, workflow_dispatch options, and matrix include.
 *                         A mirror missing from paths: never fires — the standalone silently
 *                         stops updating while CI stays green.
 *
 * Fixture override (self-test only): CI_STANDALONE_MIRRORS_PATH and CI_STANDALONE_WORKFLOW_PATH,
 * mirroring the CI_INSTALL_MANIFEST_PATH escape hatch in validate-install-manifests.js.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const MANIFEST_PATH = process.env.CI_STANDALONE_MIRRORS_PATH
  ? path.resolve(process.env.CI_STANDALONE_MIRRORS_PATH)
  : path.join(REPO_ROOT, 'scripts', 'standalone-mirrors.json');
const WORKFLOW_PATH = process.env.CI_STANDALONE_WORKFLOW_PATH
  ? path.resolve(process.env.CI_STANDALONE_WORKFLOW_PATH)
  : path.join(REPO_ROOT, '.github', 'workflows', 'sync-standalone-skills.yml');
// A fixture manifest addresses its sources relative to itself, not to the repo.
const SOURCE_ROOT = process.env.CI_STANDALONE_MIRRORS_PATH
  ? path.dirname(MANIFEST_PATH)
  : REPO_ROOT;

const IGNORED_DIRS = new Set(['.git', '__pycache__', 'node_modules']);
const IGNORED_FILES = new Set(['.DS_Store']);

const problems = [];
let sourcesScanned = 0;
let filesScanned = 0;

function problem(code, where, message) {
  problems.push({ code, where, message });
}

/** Every file under `dir`, depth-first, with symlinks reported rather than followed. */
function walk(dir, onFile, onSymlink) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      onSymlink(full);
      continue;
    }
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      walk(full, onFile, onSymlink);
      continue;
    }
    if (IGNORED_FILES.has(entry.name)) continue;
    onFile(full);
  }
}

/** `name:` out of a SKILL.md frontmatter block, or null. */
function frontmatterName(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return null;
  const m = text.slice(0, end).match(/^name:\s*(.+)$/m);
  return m ? m[1].trim() : null;
}

/** A YAML list block: every `- value` line under `header` until the indentation drops. */
function yamlListUnder(text, header) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.trim() === header);
  if (start === -1) return null;
  const headerIndent = lines[start].search(/\S/);
  const out = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const indent = line.search(/\S/);
    if (indent <= headerIndent) break;
    const m = line.trim().match(/^-\s*'?"?([^'"#]+?)'?"?$/);
    if (m) out.push(m[1].trim());
  }
  return out;
}

function main() {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch (err) {
    console.error(`standalone-mirror-check: cannot read manifest ${MANIFEST_PATH}: ${err.message}`);
    process.exit(1);
  }
  const mirrors = manifest.mirrors || [];
  if (!mirrors.length) {
    console.error('standalone-mirror-check: manifest lists no mirrors — refusing to pass vacuously');
    process.exit(1);
  }

  for (const m of mirrors) {
    const abs = path.join(SOURCE_ROOT, m.source);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
      problem('SOURCE-MISSING', m.source, `manifest source for "${m.id}" is not a directory`);
      continue;
    }
    sourcesScanned++;

    const declaredName = frontmatterName(path.join(abs, 'SKILL.md'));
    if (declaredName === null) {
      problem('NAME-MISMATCH', `${m.source}/SKILL.md`, 'no frontmatter `name:` found');
    } else if (declaredName !== m.installedName) {
      problem('NAME-MISMATCH', `${m.source}/SKILL.md`,
        `frontmatter name "${declaredName}" != manifest installedName "${m.installedName}" — ` +
        'the skill would install under a different name than the repo advertises');
    }

    const tokens = m.forbiddenTokens || [];
    walk(abs,
      (file) => {
        filesScanned++;
        let text;
        try {
          text = fs.readFileSync(file, 'utf8');
        } catch {
          return; // binary or unreadable: nothing to scan for text tokens
        }
        const rel = path.relative(SOURCE_ROOT, file);
        const lines = text.split('\n');
        lines.forEach((line, i) => {
          if (line.includes('CLAUDE_PLUGIN_ROOT')) {
            problem('PLUGIN-ROOT-RESIDUE', `${rel}:${i + 1}`, line.trim());
          }
          for (const t of tokens) {
            if (line.includes(t)) {
              problem('VOCABULARY-LEAK', `${rel}:${i + 1}`, `forbidden token ${JSON.stringify(t)}: ${line.trim()}`);
            }
          }
        });
      },
      (link) => {
        problem('SYMLINK', path.relative(SOURCE_ROOT, link),
          'symlink inside a mirrored source — rsync copies the link, which dangles in a single-skill repo');
      });
  }

  // --- three-way workflow parity -------------------------------------------------
  let wf;
  try {
    wf = fs.readFileSync(WORKFLOW_PATH, 'utf8');
  } catch (err) {
    problem('WORKFLOW-PARITY', path.relative(REPO_ROOT, WORKFLOW_PATH), `cannot read sync workflow: ${err.message}`);
    wf = null;
  }

  if (wf !== null) {
    const paths = yamlListUnder(wf, 'paths:') || [];
    const options = yamlListUnder(wf, 'options:') || [];
    const matrixPaths = [...wf.matchAll(/^\s*skill_path:\s*(\S+)\s*$/gm)].map((x) => x[1]);
    const matrixIds = [...wf.matchAll(/^\s*-\s*plugin:\s*(\S+)\s*$/gm)].map((x) => x[1]);

    for (const m of mirrors) {
      // `mirrored: false` means the content rules apply but the workflow is not expected to
      // carry a row yet. Flipping it to true is the same edit that adds the three workflow lines.
      if (m.mirrored === false) continue;
      if (!paths.some((p) => p === `${m.source}/**` || p === m.source)) {
        problem('WORKFLOW-PARITY', m.source,
          `"${m.id}" is missing from the workflow paths: filter — the mirror would silently stop updating`);
      }
      if (!options.includes(m.id)) {
        problem('WORKFLOW-PARITY', m.id, `"${m.id}" is missing from workflow_dispatch options`);
      }
      if (!matrixPaths.includes(m.source)) {
        problem('WORKFLOW-PARITY', m.source, `"${m.id}" has no matrix row — it is never synced`);
      }
    }
    for (const p of matrixPaths) {
      if (!mirrors.some((m) => m.source === p)) {
        problem('WORKFLOW-PARITY', p, 'matrix row has no manifest entry');
      }
    }
    for (const id of matrixIds) {
      if (!mirrors.some((m) => m.id === id)) {
        problem('WORKFLOW-PARITY', id, 'matrix plugin id has no manifest entry');
      }
    }
  }

  // --- report ---------------------------------------------------------------------
  const byCode = {};
  for (const p of problems) byCode[p.code] = (byCode[p.code] || 0) + 1;

  if (problems.length) {
    console.error('standalone-mirror-check FAILED\n');
    for (const p of problems) console.error(`  [${p.code}] ${p.where}\n      ${p.message}`);
    console.error(`\n  sources scanned: ${sourcesScanned}, files scanned: ${filesScanned}`);
    console.error(`  problems: ${Object.entries(byCode).map(([c, n]) => `${c}=${n}`).join(', ')}`);
    console.error('\n  A mirrored skill must stand alone: no plugin-runtime variables, no symlinks,');
    console.error('  no vocabulary it promised not to carry, and a workflow that actually syncs it.');
    process.exit(1);
  }

  console.log(
    `Standalone mirrors OK: ${sourcesScanned} source(s), ${filesScanned} file(s) scanned; ` +
    'no plugin-root residue, no symlinks, no vocabulary leaks, workflow lists agree with the manifest.');
}

main();
