#!/usr/bin/env node
'use strict';

/**
 * Prevent shipping user-specific absolute home paths in public docs / plugins.
 *
 * Catches generic POSIX `/Users/<name>` (macOS) and Windows `C:\Users\<name>`
 * home paths, while allowing obvious placeholder usernames used in templates
 * and examples (example, me, user, username, you, yourname, your-username...).
 *
 * A real leak (a concrete developer username) exits 1 with the offending
 * path and file. Placeholders pass.
 *
 * Scan root override: CI_PERSONAL_PATH_SCAN_ROOT (defaults to repo root).
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.env.CI_PERSONAL_PATH_SCAN_ROOT
  ? path.resolve(process.env.CI_PERSONAL_PATH_SCAN_ROOT)
  : path.resolve(__dirname, '..', '..');

const TARGETS = [
  'README.md',
  'README-RU.md',
  'AGENTS.md',
  'CLAUDE.md',
  'plugins',
  'docs',
  'scripts',
];

const SCANNED_EXT = /\.(md|mdx|json|js|cjs|mjs|ts|tsx|jsx|sh|bash|zsh|toml|yml|yaml)$/i;

const IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  '.next',
  '.venv',
  'venv',
  'coverage',
  'dist',
  'build',
]);

// Placeholder usernames that are fine to ship in examples / templates.
const PLACEHOLDER_USERNAMES = new Set([
  'example',
  'me',
  'user',
  'username',
  'you',
  'yourname',
  'yourusername',
  'your-username',
]);

// Home-directory prefixes, assembled from parts so this validator never embeds
// a concrete `/Users/<name>` literal that its own scan would flag. The empty
// trailing element makes join() emit the trailing slash: "/Users/".
const USERS_PREFIX = ['', 'Users', ''].join('/'); // "/Users/"
const POSIX_USER_RE = new RegExp(`${USERS_PREFIX}([a-zA-Z][a-zA-Z0-9._-]*)`, 'g');
const WIN_USER_RE = /C:\\Users\\([a-zA-Z][a-zA-Z0-9._-]*)/gi;

function repoRelative(file) {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

function findLeaks(content) {
  const leaks = [];
  for (const pattern of [POSIX_USER_RE, WIN_USER_RE]) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (!PLACEHOLDER_USERNAMES.has(match[1].toLowerCase())) {
        leaks.push(match[0]);
      }
    }
  }
  return leaks;
}

function collectFiles(targetPath, out) {
  if (!fs.existsSync(targetPath)) return;
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    out.push(targetPath);
    return;
  }
  for (const entry of fs.readdirSync(targetPath)) {
    if (IGNORED_DIRS.has(entry)) continue;
    collectFiles(path.join(targetPath, entry), out);
  }
}

const files = [];
for (const target of TARGETS) {
  collectFiles(path.join(ROOT, target), files);
}

let failures = 0;
for (const file of files) {
  if (!SCANNED_EXT.test(file)) continue;

  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  for (const leak of findLeaks(content)) {
    console.error(`ERROR: personal path "${leak}" detected in ${repoRelative(file)}`);
    failures += 1;
  }
}

if (failures > 0) {
  console.error(`\n${failures} personal-path leak(s) found in shipped files.`);
  process.exit(1);
}

console.log('Validated: no personal absolute home paths in shipped docs / plugins / scripts.');
