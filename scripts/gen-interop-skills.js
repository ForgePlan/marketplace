#!/usr/bin/env node
'use strict';

/**
 * Create the .agents/skills interop aliases for every published skill.
 *
 * Companion fixer for scripts/ci/interop-skills-check.js. Run it after adding a skill,
 * or after adding a plugin that has any.
 *
 *   node scripts/gen-interop-skills.js
 *
 * Codex reads ONLY `.agents/skills`; OpenCode reads it alongside its own path. A skill
 * without an alias there is invisible in those runtimes and nothing reports it.
 *
 * Idempotent: existing correct symlinks are left alone. Dangling or wrong-target symlinks
 * are repointed. A real directory where a symlink belongs is reported and NOT deleted —
 * that case needs a human, because the directory may hold edits that were never in
 * skills/.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const PLUGINS = path.join(REPO_ROOT, 'plugins');

let created = 0;
let repointed = 0;
const blocked = [];

for (const plugin of fs.readdirSync(PLUGINS, { withFileTypes: true })) {
  if (!plugin.isDirectory()) continue;

  const pluginDir = path.join(PLUGINS, plugin.name);
  const skillsDir = path.join(pluginDir, 'skills');
  if (!fs.existsSync(skillsDir)) continue;

  const interopDir = path.join(pluginDir, '.agents', 'skills');
  fs.mkdirSync(interopDir, { recursive: true });

  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const link = path.join(interopDir, entry.name);
    const target = `../../skills/${entry.name}`;   // matches the form already in the tree

    if (fs.existsSync(link) || fs.lstatSync(link, { throwIfNoEntry: false })) {
      const st = fs.lstatSync(link, { throwIfNoEntry: false });
      if (!st) { /* fall through to create */ }
      else if (st.isSymbolicLink()) {
        if (fs.readlinkSync(link) === target && fs.existsSync(link)) continue;  // already right
        fs.unlinkSync(link);
        fs.symlinkSync(target, link);
        repointed++;
        console.log(`  ~ repointed ${plugin.name}/.agents/skills/${entry.name}`);
        continue;
      } else {
        blocked.push(
          `${plugin.name}/.agents/skills/${entry.name} is a real directory, not a symlink — ` +
          `left alone; it may contain edits that never reached skills/. Resolve by hand.`
        );
        continue;
      }
    }

    fs.symlinkSync(target, link);
    created++;
    console.log(`  + ${plugin.name}/.agents/skills/${entry.name}`);
  }
}

console.log(`\nCreated ${created}, repointed ${repointed}.`);
if (blocked.length > 0) {
  console.log(`\n${blocked.length} case(s) need a human:`);
  for (const b of blocked) console.log(`  - ${b}`);
  process.exit(1);
}
