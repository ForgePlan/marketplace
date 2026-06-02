#!/usr/bin/env node
/**
 * cross-ref-check.js - detect DANGLING cross-references across the marketplace.
 *
 * Zero external dependencies (Node builtins only). CommonJS, Node >= 18.
 *
 * Three classes of dangling reference are reported:
 *
 *   1. AGENT - command / skill / agent / README bodies that dispatch an agent by
 *      its `pack:agent-name` namespace token (via `subagent_type=` or a
 *      `Task(subagent_type=...)` call) where the target does not exist on disk.
 *      A `pack:name` token resolves to one of the dispatchable artifacts a
 *      plugin can expose under that single namespace:
 *        plugins/<pack>/agents/<name>.md     (the canonical agent file)
 *        plugins/<pack>/agents/<name>/       (a packaged agent directory)
 *        plugins/<pack>/skills/<name>/       (a skill dispatched via subagent_type)
 *        plugins/<pack>/commands/<name>.md   (a slash command dispatched via subagent_type)
 *      If none of those exist, the reference is dangling.
 *
 *   2. CATALOG - bidirectional consistency between .claude-plugin/marketplace.json
 *      and the plugins/ tree:
 *        a) a marketplace `source` dir that is missing on disk;
 *        b) a plugins/<name>/ dir that is absent from marketplace.json.
 *
 *   3. DOC-TABLE - README.md / README-RU.md / CLAUDE.md plugin-table rows that
 *      name a plugin (markdown link `](plugins/<name>` or bold cell `**<name>**`
 *      matching a known plugin token) with no plugins/<name>/ dir on disk.
 *
 * Output: each dangling ref as `file:line -> missing-target`. Exit 1 if any are
 * found, exit 0 on a clean tree.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Repo root = two levels up from scripts/ci/.
const ROOT = path.resolve(__dirname, '..', '..');
const PLUGINS_DIR = path.join(ROOT, 'plugins');
const MARKETPLACE_JSON = path.join(ROOT, '.claude-plugin', 'marketplace.json');

// Literal placeholders used in authoring docs/templates - never real targets.
const PLACEHOLDER_TOKENS = new Set(['pack:name', 'pack:agent', 'pack:agent-name']);

// Plugin-table doc files to scan for class 3.
const DOC_FILES = ['README.md', 'README-RU.md', 'CLAUDE.md'];

/** Collected findings: { file, line, target } (file is repo-relative). */
const findings = [];

function rel(absPath) {
  return path.relative(ROOT, absPath) || absPath;
}

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

/** All immediate subdirectories of plugins/ that look like plugin roots. */
function listPluginDirs() {
  if (!isDir(PLUGINS_DIR)) {
    return [];
  }
  return fs
    .readdirSync(PLUGINS_DIR)
    .filter((name) => isDir(path.join(PLUGINS_DIR, name)))
    .sort();
}

/**
 * Recursively walk a directory, yielding absolute paths of files matching the
 * predicate. Skips node_modules and .git to stay fast and deterministic.
 */
function walkFiles(dir, predicate, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') {
        continue;
      }
      walkFiles(full, predicate, out);
    } else if (entry.isFile() && predicate(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Resolve a `pack:name` dispatch token against the plugins/ tree. The namespace
 * is shared across a plugin's dispatchable artifacts, so `subagent_type` may
 * point at an agent, a skill, or a slash command. Returns true if any exists.
 */
function agentTokenResolves(pack, name) {
  const pluginRoot = path.join(PLUGINS_DIR, pack);
  if (!isDir(pluginRoot)) {
    return false;
  }
  return (
    isFile(path.join(pluginRoot, 'agents', `${name}.md`)) ||
    isDir(path.join(pluginRoot, 'agents', name)) ||
    isDir(path.join(pluginRoot, 'skills', name)) ||
    isFile(path.join(pluginRoot, 'commands', `${name}.md`))
  );
}

/**
 * Class 1 - scan markdown bodies for executable agent-dispatch tokens whose
 * target is missing on disk.
 *
 * Only EXECUTABLE dispatch forms are treated as references:
 *   - subagent_type = "pack:name"  /  subagent_type: 'pack:name'  /  bare
 *   - Task(subagent_type=...) inherits the same pattern (it embeds subagent_type)
 *
 * Free-prose mentions like "dispatch the architect agent" are intentionally NOT
 * flagged: they are recommendations to a human/orchestrator, often deliberate
 * short names, and matching them produces noise rather than real dangling refs.
 */
function checkAgentReferences() {
  const mdFiles = walkFiles(PLUGINS_DIR, (n) => n.endsWith('.md'), []);

  // subagent_type, optional ws, [:=], optional ws, optional quote, pack:name.
  // The `pack:name` shape is [a-z0-9-]+:[a-z0-9-]+ (kebab on both sides).
  const dispatchRe =
    /subagent_type\s*[:=]\s*["']?([a-z][a-z0-9-]*):([a-z][a-z0-9-]*)/g;

  for (const file of mdFiles) {
    let content;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    if (content.indexOf('subagent_type') === -1) {
      continue;
    }

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      dispatchRe.lastIndex = 0;
      let m;
      while ((m = dispatchRe.exec(line)) !== null) {
        const pack = m[1];
        const name = m[2];
        const token = `${pack}:${name}`;
        if (PLACEHOLDER_TOKENS.has(token)) {
          continue;
        }
        if (!agentTokenResolves(pack, name)) {
          findings.push({
            file: rel(file),
            line: i + 1,
            target: `${token} (no plugins/${pack}/agents/${name}.md | agents/${name}/ | skills/${name}/ | commands/${name}.md)`,
          });
        }
      }
    }
  }
}

/**
 * Class 2 - marketplace.json <-> plugins/ tree, both directions.
 */
function checkCatalogConsistency(pluginDirs) {
  let raw;
  try {
    raw = fs.readFileSync(MARKETPLACE_JSON, 'utf8');
  } catch (err) {
    findings.push({
      file: rel(MARKETPLACE_JSON),
      line: 1,
      target: `unreadable marketplace catalog (${err.message})`,
    });
    return;
  }

  let catalog;
  try {
    catalog = JSON.parse(raw);
  } catch (err) {
    findings.push({
      file: rel(MARKETPLACE_JSON),
      line: 1,
      target: `invalid JSON in marketplace catalog (${err.message})`,
    });
    return;
  }

  const entries = Array.isArray(catalog.plugins) ? catalog.plugins : [];
  const catalogDirs = new Set();

  // 2a) catalog source -> must exist on disk.
  // Line numbers are recovered by locating the "source": "<value>" text in raw.
  const rawLines = raw.split('\n');
  for (const entry of entries) {
    const source = entry && typeof entry.source === 'string' ? entry.source : null;
    if (!source) {
      continue;
    }
    const normalized = source.replace(/^\.\//, '').replace(/\/$/, '');
    catalogDirs.add(normalized);

    const abs = path.join(ROOT, normalized);
    if (!isDir(abs)) {
      let lineNo = 1;
      for (let i = 0; i < rawLines.length; i += 1) {
        if (rawLines[i].includes(`"${source}"`)) {
          lineNo = i + 1;
          break;
        }
      }
      findings.push({
        file: rel(MARKETPLACE_JSON),
        line: lineNo,
        target: `${entry.name || normalized} source dir missing on disk: ${normalized}/`,
      });
    }
  }

  // 2b) every plugins/<name>/ dir must be present in the catalog.
  for (const name of pluginDirs) {
    if (!catalogDirs.has(`plugins/${name}`)) {
      findings.push({
        file: rel(MARKETPLACE_JSON),
        line: 1,
        target: `plugins/${name}/ on disk but absent from marketplace.json`,
      });
    }
  }
}

/**
 * Class 3 - README/CLAUDE plugin-table rows naming a plugin with no dir on disk.
 *
 * Two row shapes are recognized:
 *   - markdown link to the plugin dir:  ](plugins/<name>   or  ](./plugins/<name>
 *   - bold table cell naming a known plugin token:  | **<name>** |
 * The bold-cell form is only checked against tokens that look like plugin names
 * already seen in the catalog/disk, to avoid flagging generic bold prose.
 */
function checkDocTables(knownPluginNames) {
  const linkRe = /\]\(\.?\/?plugins\/([a-z0-9][a-z0-9-]*)/g;
  const boldCellRe = /^\|\s*\*\*([a-z0-9][a-z0-9-]*)\*\*\s*[|]/;

  for (const docName of DOC_FILES) {
    const docPath = path.join(ROOT, docName);
    if (!isFile(docPath)) {
      continue;
    }
    let content;
    try {
      content = fs.readFileSync(docPath, 'utf8');
    } catch {
      continue;
    }

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];

      // Markdown link form - any plugins/<name> path that does not exist.
      linkRe.lastIndex = 0;
      let lm;
      while ((lm = linkRe.exec(line)) !== null) {
        const name = lm[1];
        if (!isDir(path.join(PLUGINS_DIR, name))) {
          findings.push({
            file: docName,
            line: i + 1,
            target: `plugin-table link to plugins/${name}/ (dir missing)`,
          });
        }
      }

      // Bold table-cell form - only for tokens that look like a plugin name
      // (present in the known set) yet have no dir, i.e. a renamed/removed plugin.
      const bm = boldCellRe.exec(line);
      if (bm) {
        const name = bm[1];
        if (knownPluginNames.has(name) && !isDir(path.join(PLUGINS_DIR, name))) {
          findings.push({
            file: docName,
            line: i + 1,
            target: `plugin-table row names "${name}" (no plugins/${name}/ dir)`,
          });
        }
      }
    }
  }
}

function main() {
  if (!isDir(PLUGINS_DIR)) {
    console.error(`ERROR: plugins/ directory not found at ${rel(PLUGINS_DIR)}`);
    process.exit(1);
  }

  const pluginDirs = listPluginDirs();

  // Known plugin-name set: disk dirs + any name declared in the catalog. Used by
  // the bold-cell doc check so it only fires on real plugin tokens.
  const knownPluginNames = new Set(pluginDirs);
  try {
    const catalog = JSON.parse(fs.readFileSync(MARKETPLACE_JSON, 'utf8'));
    for (const entry of catalog.plugins || []) {
      if (entry && typeof entry.name === 'string') {
        knownPluginNames.add(entry.name);
      }
      if (entry && typeof entry.source === 'string') {
        const n = entry.source.replace(/^\.\//, '').replace(/\/$/, '').split('/').pop();
        if (n) knownPluginNames.add(n);
      }
    }
  } catch {
    // Catalog problems are reported by checkCatalogConsistency; ignore here.
  }

  checkAgentReferences();
  checkCatalogConsistency(pluginDirs);
  checkDocTables(knownPluginNames);

  if (findings.length === 0) {
    console.log(
      `cross-ref-check: clean - scanned ${pluginDirs.length} plugins, no dangling references.`,
    );
    process.exit(0);
  }

  // Deterministic order: by file, then line, then target.
  findings.sort(
    (a, b) =>
      a.file.localeCompare(b.file) || a.line - b.line || a.target.localeCompare(b.target),
  );

  console.error(`cross-ref-check: ${findings.length} dangling reference(s) found:\n`);
  for (const f of findings) {
    console.error(`${f.file}:${f.line} -> ${f.target}`);
  }
  process.exit(1);
}

main();
