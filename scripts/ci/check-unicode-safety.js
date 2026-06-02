#!/usr/bin/env node
'use strict';

/**
 * Flag dangerous invisible / smuggling Unicode codepoints in repo text files.
 *
 * This gate detects ONLY codepoints that have no legitimate use in source,
 * Markdown, or config and are the canonical vectors for "ASCII smuggling" /
 * prompt-injection (e.g. hidden instructions inside a PR body or SKILL.md
 * that the LLM consumes but a human reviewer never sees).
 *
 * It deliberately does NOT touch normal emoji. The marketplace uses status
 * emoji (PASS/note/wait/warn/fail icons) and the "Generated with" PR line as
 * intentional house style, so banning emoji would break our own docs. Only
 * the invisible/zero-width/bidi/tag codepoints below are violations.
 *
 * Exit 1 on any dangerous codepoint, reporting `file:line:col U+XXXX`.
 *
 * Scan root override: CI_UNICODE_SCAN_ROOT (defaults to repo root).
 */

const fs = require('fs');
const path = require('path');

const repoRoot = process.env.CI_UNICODE_SCAN_ROOT
  ? path.resolve(process.env.CI_UNICODE_SCAN_ROOT)
  : path.resolve(__dirname, '..', '..');

const ignoredDirs = new Set([
  '.git',
  'node_modules',
  '.next',
  '.venv',
  'venv',
  'coverage',
  'dist',
  'build',
]);

const textExtensions = new Set([
  '.md',
  '.mdx',
  '.txt',
  '.js',
  '.cjs',
  '.mjs',
  '.ts',
  '.tsx',
  '.jsx',
  '.json',
  '.toml',
  '.yml',
  '.yaml',
  '.sh',
  '.bash',
  '.zsh',
]);

function shouldSkip(entryPath) {
  return entryPath.split(path.sep).some(part => ignoredDirs.has(part));
}

function isTextFile(filePath) {
  return textExtensions.has(path.extname(filePath).toLowerCase());
}

function listFiles(dirPath) {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (shouldSkip(entryPath)) continue;
    if (entry.isDirectory()) {
      results.push(...listFiles(entryPath));
      continue;
    }
    if (entry.isFile() && isTextFile(entryPath)) {
      results.push(entryPath);
    }
  }
  return results;
}

function lineAndColumn(text, index) {
  const line = text.slice(0, index).split('\n').length;
  const lastNewline = text.lastIndexOf('\n', index - 1);
  const column = index - lastNewline;
  return { line, column };
}

/**
 * Dangerous invisible / smuggling codepoints. Each range is non-printing and
 * has no legitimate use in source/Markdown/config (see comments for the
 * specific abuse vector).
 */
function isDangerousInvisibleCodePoint(codePoint) {
  return (
    // Zero-width space / non-joiner / joiner.
    (codePoint >= 0x200b && codePoint <= 0x200d) ||
    // WORD JOINER (zero-width no-break behaviour).
    codePoint === 0x2060 ||
    // ZERO WIDTH NO-BREAK SPACE / BOM — invisible mid-text.
    codePoint === 0xfeff ||
    // Bidi embedding/override controls (LRE/RLE/PDF/LRO/RLO). Used to
    // visually reorder text so the rendered string differs from the bytes.
    (codePoint >= 0x202a && codePoint <= 0x202e) ||
    // Bidi isolates (LRI/RLI/FSI/PDI) — same reordering abuse.
    (codePoint >= 0x2066 && codePoint <= 0x2069) ||
    // Variation selectors VS1–VS15 (U+FE00–U+FE0E). Zero-width; abused to
    // encode hidden payloads piggy-backing on a visible base character.
    // VS16 (U+FE0F) is deliberately EXCLUDED: it is the emoji-presentation
    // selector that legitimately follows status emoji like the warn/arrow
    // icons in our house style, so banning it would break our own docs.
    (codePoint >= 0xfe00 && codePoint <= 0xfe0e) ||
    // Variation selectors supplement VS17–VS256 — same abuse, larger space.
    (codePoint >= 0xe0100 && codePoint <= 0xe01ef) ||
    // Unicode Tag block (U+E0000–U+E007F). Deprecated since Unicode 5.1, no
    // legitimate text uses them. Canonical "Tag smuggling" prompt-injection
    // vector: instructions hidden inside ASCII-looking strings that the LLM
    // consumes while the human reviewer sees nothing.
    (codePoint >= 0xe0000 && codePoint <= 0xe007f) ||
    // MONGOLIAN VOWEL SEPARATOR — reclassified as format control in Unicode
    // 6.3, renders zero-width, abused for homograph / smuggling.
    codePoint === 0x180e ||
    // HANGUL CHOSEONG / JUNGSEONG FILLER — zero-width fillers abused as
    // invisible characters outside Korean text shaping.
    codePoint === 0x115f ||
    codePoint === 0x1160 ||
    // Invisible math operators (FUNCTION APPLICATION, INVISIBLE TIMES,
    // INVISIBLE SEPARATOR, INVISIBLE PLUS). Zero-width; not used outside
    // math typesetting, so absent from legitimate Markdown / source.
    (codePoint >= 0x2061 && codePoint <= 0x2064) ||
    // HANGUL FILLER — zero-width filler abused in Discord / Twitter
    // smuggling attacks; not used in legitimate Korean text.
    codePoint === 0x3164
  );
}

function collectDangerousInvisibleMatches(text) {
  const matches = [];
  let index = 0;

  for (const char of text) {
    const codePoint = char.codePointAt(0);
    if (isDangerousInvisibleCodePoint(codePoint)) {
      const { line, column } = lineAndColumn(text, index);
      matches.push({
        codePoint: `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`,
        line,
        column,
      });
    }
    index += char.length;
  }

  return matches;
}

const violations = [];

for (const filePath of listFiles(repoRoot)) {
  const relativePath = path.relative(repoRoot, filePath);
  let text;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch {
    continue;
  }

  for (const violation of collectDangerousInvisibleMatches(text)) {
    violations.push({ file: relativePath, ...violation });
  }
}

if (violations.length > 0) {
  console.error('Unicode safety violations detected (dangerous invisible / smuggling codepoints):');
  for (const v of violations) {
    console.error(`${v.file}:${v.line}:${v.column} ${v.codePoint}`);
  }
  process.exit(1);
}

console.log('Unicode safety check passed: no dangerous invisible / smuggling codepoints.');
