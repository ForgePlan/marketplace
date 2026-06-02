#!/usr/bin/env node
/**
 * validate-workflow-security.js — GitHub Actions workflow security linter.
 *
 * Zero external dependencies (Node >= 18 builtins only). The workflow files are
 * scanned as text with a small line-aware scanner — we deliberately do NOT pull
 * in a YAML parser. The rules below only need structural anchors (which `run:`
 * block an expression sits in, which step a `uses:` belongs to), and those are
 * recoverable from indentation without a full parse.
 *
 * Rules implemented:
 *   WF-INJECT     HIGH  Untrusted ${{ github.event.* / github.head_ref / ... }}
 *                       interpolated directly into a `run:` shell block — the
 *                       classic GitHub Actions script-injection RCE.
 *   WF-PRT-CHECKOUT HIGH `pull_request_target` (or `workflow_run`) trigger that
 *                       checks out the PR head ref — attacker code runs with a
 *                       write-scoped token.
 *   WF-UNPINNED   WARN  Third-party `uses:` pinned to a tag/branch (@v3, @main,
 *                       @master) instead of a full 40-hex commit SHA.
 *   WF-PERMS-WRITEALL HIGH `permissions: write-all` grants every scope write.
 *   WF-PERMS-MISSING  WARN No top-level `permissions:` block (defaults are broad).
 *
 * Exit code: 1 if any HIGH finding (or WARN promoted via --strict); else 0.
 * Output:    `file:line  rule-id  SEVERITY  message` per finding.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const HIGH = 'HIGH';
const WARN = 'WARN';

// Untrusted GitHub Actions expression contexts. These resolve to
// attacker-controllable strings (PR title/body, branch name, commit message,
// fork repo name, ...). Interpolating any of them straight into a shell `run:`
// block lets the attacker break out of the string and execute commands.
//
// `github.event.*` is the broad catch-all (covers issue/PR/comment/review
// bodies and titles). The explicit head_ref / *_ref / commit-message contexts
// are listed separately because they are the most commonly weaponised and we
// want them matched even outside an `event.` prefix.
const UNTRUSTED_EXPR = new RegExp(
  '\\$\\{\\{\\s*(?:' +
    // github.event.<anything> — issue/PR/comment payloads
    'github\\.event\\.[A-Za-z0-9_.\\[\\]\'"-]+' +
    '|github\\.head_ref' +
    '|github\\.base_ref' +
    // any *.head_ref / *.body / *.title / *.email / *.name / *.label tail —
    // these are the attacker-controlled leaves of the event payload even when
    // referenced via a steps.<id>.outputs.* indirection of a prior raw read.
    '|[A-Za-z0-9_.]*\\.(?:head_ref|body|title|message|email|authors?)' +
  ')\\s*\\}\\}',
);

// A pinned-by-SHA `uses:` ends in @<40 hex>. Anything else (tag, branch,
// short SHA, version range) is "unpinned" for supply-chain purposes.
const USES_LINE = /^\s*-?\s*uses:\s*['"]?([^'"#\s]+)['"]?/;
const FULL_SHA = /^[0-9a-f]{40}$/i;

// Local/first-party action references that are not subject to the SHA-pin rule:
//   ./path                  — action defined in this repo
//   docker://image          — container action (pinned by digest separately)
//   <single-segment>        — a reusable workflow / composite in-repo ref
const LOCAL_USES = /^(?:\.\/|\.\\|docker:\/\/)/;

const WRITE_ALL = /^\s*permissions:\s*['"]?write-all['"]?\s*$/m;
const PERMISSIONS_KEY = /^\s*permissions:\s*(\S.*)?$/m;

// Dangerous trigger events: a workflow that runs on these gets a write-scoped
// token (or runs in the base-repo context) even for fork PRs, so checking out
// the PR head is the classic privilege-escalation footgun.
const PRIVILEGED_EVENT = /^\s*(pull_request_target|workflow_run)\s*:/m;
const PR_HEAD_REF =
  /\$\{\{\s*github\.event\.(?:pull_request|workflow_run)\.[^}]*\bhead[._]/;
const REFS_PULL = /\brefs\/(?:remotes\/)?pull\/[^\s'"]+/;

function listWorkflowFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.ya?ml$/i.test(f))
    .map((f) => path.join(dir, f))
    .sort();
}

function splitLines(source) {
  return source.split(/\r?\n/);
}

/**
 * Strip a trailing `# comment` from a YAML line without tripping on a `#` that
 * sits inside a quoted string. Good enough for the structural checks here.
 */
function stripComment(line) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === '"' && !inSingle) inDouble = !inDouble;
    else if (c === '#' && !inSingle && !inDouble) return line.slice(0, i);
  }
  return line;
}

const indentOf = (line) => line.length - line.replace(/^\s*/, '').length;

/**
 * Collect the line ranges that belong to `run:` blocks. Handles both the inline
 * form (`run: echo hi`) and the block-scalar form (`run: |` / `run: >` followed
 * by an indented body). Returns [{startLine, endLine}] (1-based, inclusive).
 *
 * We need this so WF-INJECT only fires on expressions that actually land in a
 * shell, not on `with:`/`env:` values (where `${{ ... }}` is safe).
 */
function findRunBlocks(lines) {
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const code = stripComment(raw);
    const m = code.match(/^(\s*)run:\s*(\S.*)?$/);
    if (!m) continue;

    const keyIndent = m[1].length;
    const inlineValue = (m[2] || '').trim();

    // Inline `run: cmd` — single line, unless it opens a block scalar.
    if (inlineValue && inlineValue !== '|' && inlineValue !== '>' &&
        !/^[|>][+-]?\d*\s*$/.test(inlineValue)) {
      blocks.push({ startLine: i + 1, endLine: i + 1 });
      continue;
    }

    // Block scalar: body is every following line indented deeper than the key,
    // up to the first line at-or-below the key indent (ignoring blanks).
    let end = i;
    for (let j = i + 1; j < lines.length; j++) {
      const bodyRaw = lines[j];
      if (bodyRaw.trim() === '') {
        end = j;
        continue;
      }
      if (indentOf(bodyRaw) > keyIndent) {
        end = j;
      } else {
        break;
      }
    }
    blocks.push({ startLine: i + 1, endLine: end + 1 });
  }
  return blocks;
}

/** True if 1-based lineNo falls inside any run block. */
function inRunBlock(blocks, lineNo) {
  return blocks.some((b) => lineNo >= b.startLine && lineNo <= b.endLine);
}

/**
 * Group physical lines into step blocks so a `uses:` + checkout `ref:` can be
 * correlated. A step starts at a `- ` list item; its body runs until the next
 * list item at the same-or-shallower indent.
 */
function findSteps(lines) {
  const steps = [];
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const code = stripComment(lines[i]);
    const start = code.match(/^(\s*)-\s+/);
    if (start) {
      if (current) steps.push(current);
      current = { indent: start[1].length, startLine: i + 1, lines: [lines[i]] };
    } else if (current) {
      // A line shallower than the step's `- ` indent closes the step.
      if (lines[i].trim() !== '' && indentOf(lines[i]) <= current.indent) {
        steps.push(current);
        current = null;
      } else {
        current.lines.push(lines[i]);
      }
    }
  }
  if (current) steps.push(current);
  return steps;
}

function findInjection(lines, runBlocks) {
  const findings = [];
  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    if (!inRunBlock(runBlocks, lineNo)) continue;
    const code = stripComment(lines[i]);
    const m = code.match(UNTRUSTED_EXPR);
    if (m) {
      findings.push({
        line: lineNo,
        rule: 'WF-INJECT',
        severity: HIGH,
        message:
          `untrusted expression ${m[0]} interpolated into a run: shell block ` +
          '(script-injection RCE — read it via an env: var and reference "$VAR" instead)',
      });
    }
  }
  return findings;
}

function findUnpinned(lines) {
  const findings = [];
  for (let i = 0; i < lines.length; i++) {
    const code = stripComment(lines[i]);
    const m = code.match(USES_LINE);
    if (!m) continue;
    const ref = m[1];
    if (LOCAL_USES.test(ref) || !ref.includes('@')) continue; // local / reusable
    const pin = ref.slice(ref.lastIndexOf('@') + 1);
    if (FULL_SHA.test(pin)) continue;
    findings.push({
      line: i + 1,
      rule: 'WF-UNPINNED',
      severity: WARN,
      message:
        `action "${ref}" is pinned to "${pin}", not a full 40-hex commit SHA ` +
        '(a moved tag/branch can ship malicious code)',
    });
  }
  return findings;
}

function findPermissionIssues(source, lines) {
  const findings = [];

  // write-all anywhere (top-level or job-level) is a HIGH over-grant.
  const wa = source.match(WRITE_ALL);
  if (wa) {
    findings.push({
      line: lineNumberAt(source, wa.index),
      rule: 'WF-PERMS-WRITEALL',
      severity: HIGH,
      message:
        'permissions: write-all grants every scope write access ' +
        '(declare the minimal explicit scopes the workflow needs)',
    });
  }

  // Missing top-level permissions → broad default token. Only flag if there is
  // no `permissions:` key before the first top-level `jobs:` line.
  const jobsIdx = source.search(/^jobs:\s*$/m);
  const header = jobsIdx >= 0 ? source.slice(0, jobsIdx) : source;
  if (!PERMISSIONS_KEY.test(header)) {
    findings.push({
      line: 1,
      rule: 'WF-PERMS-MISSING',
      severity: WARN,
      message:
        'no top-level permissions: block — the workflow token defaults to a ' +
        'broad scope; add an explicit minimal permissions: block',
    });
  }
  return findings;
}

function findDangerousCheckout(source, lines) {
  const findings = [];
  if (!PRIVILEGED_EVENT.test(source)) return findings;

  for (const step of findSteps(lines)) {
    const text = step.lines.join('\n');
    if (!/uses:\s*['"]?actions\/checkout@/m.test(stripComment(text))) continue;

    // Form 1: checkout an explicit untrusted head ref expression.
    const headExpr = text.match(PR_HEAD_REF);
    // Form 2: checkout a refs/pull/<n>/{head,merge} ref (GitHub treats this
    // as equivalent — it fetches attacker code under the privileged token).
    const refPull = stripComment(text).match(/^\s*ref:\s*.*?(refs\/(?:remotes\/)?pull\/[^\s'"]+)/m);

    if (headExpr || refPull) {
      const evidence = headExpr ? headExpr[0] : refPull[1];
      findings.push({
        line: step.startLine,
        rule: 'WF-PRT-CHECKOUT',
        severity: HIGH,
        message:
          'pull_request_target/workflow_run trigger checks out the PR head ' +
          `(${evidence.trim()}) — attacker code runs with a write-scoped token`,
      });
    }
  }
  return findings;
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function scanFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const lines = splitLines(source);
  const runBlocks = findRunBlocks(lines);

  const findings = [
    ...findInjection(lines, runBlocks),
    ...findDangerousCheckout(source, lines),
    ...findUnpinned(lines),
    ...findPermissionIssues(source, lines),
  ];

  return findings
    .map((f) => ({ ...f, filePath }))
    .sort((a, b) => a.line - b.line || a.rule.localeCompare(b.rule));
}

function run(workflowsDir, opts = {}) {
  const strict = !!opts.strict;
  const files = listWorkflowFiles(workflowsDir);
  const all = [];
  for (const file of files) all.push(...scanFile(file));

  let highCount = 0;
  let warnCount = 0;
  for (const f of all) {
    const rel = path.basename(f.filePath);
    const sink = f.severity === HIGH ? console.error : console.log;
    sink(`${rel}:${f.line}  ${f.rule}  ${f.severity}  ${f.message}`);
    if (f.severity === HIGH) highCount++;
    else warnCount++;
  }

  if (all.length === 0) {
    console.log(`Workflow security: ${files.length} file(s) scanned, no findings.`);
  } else {
    console.log(
      `Workflow security: ${files.length} file(s) scanned, ` +
        `${highCount} HIGH, ${warnCount} WARN.`,
    );
  }

  // HIGH always fails; WARN fails only under --strict.
  return highCount > 0 || (strict && warnCount > 0) ? 1 : 0;
}

function resolveWorkflowsDir() {
  if (process.env.WORKFLOWS_DIR) return process.env.WORKFLOWS_DIR;
  // Repo layout: <repo>/scripts/ci/this-file → <repo>/.github/workflows
  return path.resolve(__dirname, '..', '..', '.github', 'workflows');
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const strict = args.includes('--strict');
  const dirArg = args.find((a) => !a.startsWith('--'));
  const workflowsDir = dirArg || resolveWorkflowsDir();
  process.exit(run(workflowsDir, { strict }));
}

module.exports = {
  scanFile,
  run,
  findRunBlocks,
  findSteps,
  resolveWorkflowsDir,
};
