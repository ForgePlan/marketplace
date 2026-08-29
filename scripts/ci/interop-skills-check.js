#!/usr/bin/env node
'use strict';

/**
 * Assert every published skill is reachable through the .agents/skills interop path.
 *
 * WHY
 * ---
 * AGENTS.md states that plugins publish skills in two locations:
 *
 *   plugins/<name>/skills/           — Claude Code path
 *   plugins/<name>/.agents/skills/   — interop alias (agentskills.io standard)
 *
 * That second path is not decoration. Codex reads ONLY `.agents/skills`; OpenCode reads it
 * alongside its own. A skill missing from it is invisible in those runtimes, with no error
 * anywhere — the same silent-absence failure class as the MCP tool-name prefixes.
 *
 * The convention was drifting when this gate was written: 5 plugins had no interop
 * directory at all, and the flagship plugin had 22 aliases for 41 skills. 34 skills were
 * unreachable. Nothing caught it, because nothing was looking.
 *
 * WHAT IT CHECKS
 * --------------
 *   1. Every plugin with a skills/ directory has .agents/skills/
 *   2. Every skill in skills/ has an entry in .agents/skills/
 *   3. Every entry is a SYMLINK (a copied directory silently forks on the next edit)
 *   4. Every symlink RESOLVES (a dangling link is worse than a missing one — it reads as
 *      present to a human and as absent to the loader)
 *   5. No stale entries pointing at skills that no longer exist
 *
 * Read-only. The fixer is scripts/gen-interop-skills.js.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PLUGINS = path.join(REPO_ROOT, 'plugins');
const FIX = 'node scripts/gen-interop-skills.js';

const problems = [];
let pluginsChecked = 0;
let linksChecked = 0;

const dirsIn = (p) =>
  fs.existsSync(p)
    ? fs.readdirSync(p, { withFileTypes: true }).filter((e) => e.isDirectory() || e.isSymbolicLink())
    : [];

for (const plugin of fs.readdirSync(PLUGINS, { withFileTypes: true })) {
  if (!plugin.isDirectory()) continue;

  const pluginDir = path.join(PLUGINS, plugin.name);
  const skillsDir = path.join(pluginDir, 'skills');
  if (!fs.existsSync(skillsDir)) continue;

  pluginsChecked++;
  const interopDir = path.join(pluginDir, '.agents', 'skills');

  const skills = dirsIn(skillsDir).map((e) => e.name).sort();

  if (!fs.existsSync(interopDir)) {
    problems.push(
      `${plugin.name}: no .agents/skills/ at all — ${skills.length} skill(s) are invisible ` +
      `to runtimes that read only the interop path`
    );
    continue;
  }

  const entries = new Set(fs.readdirSync(interopDir));

  for (const skill of skills) {
    linksChecked++;
    const link = path.join(interopDir, skill);

    if (!entries.has(skill)) {
      problems.push(`${plugin.name}: skill "${skill}" has no .agents/skills alias`);
      continue;
    }
    if (!fs.lstatSync(link).isSymbolicLink()) {
      problems.push(
        `${plugin.name}: .agents/skills/${skill} is a real directory, not a symlink — ` +
        `it will silently fork from skills/${skill} on the next edit`
      );
      continue;
    }
    if (!fs.existsSync(link)) {
      problems.push(
        `${plugin.name}: .agents/skills/${skill} is a DANGLING symlink -> ` +
        `${fs.readlinkSync(link)} (reads as present, resolves to nothing)`
      );
    }
  }

  // stale aliases: an entry with no corresponding skill
  for (const entry of entries) {
    if (!skills.includes(entry)) {
      problems.push(
        `${plugin.name}: .agents/skills/${entry} has no matching skills/${entry} — stale alias`
      );
    }
  }
}

if (problems.length > 0) {
  console.error(`interop-skills-check FAILED: ${problems.length} problem(s)\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error(`\nFix: ${FIX}`);
  process.exit(1);
}

console.log(
  `Interop skills OK: ${pluginsChecked} plugins with skills, ${linksChecked} aliases — ` +
  `all present, all symlinks, all resolving, none stale.`
);
