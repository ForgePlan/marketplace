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
// This is the MASTER SWITCH: every privileged-trigger rule below is gated on it, so a form it
// fails to recognise turns those rules off entirely and the file reports clean.
//
// It used to be /^\s*(pull_request_target|workflow_run)\s*:/m — the nested block form only. YAML
// has at least four other spellings for the same trigger, and all four silently disabled the rules:
//     on: [pull_request_target]           on: pull_request_target
//     on: [issues, pull_request_target]   on:\n  - pull_request_target
// Adversarial probe over 7 spellings: 2 caught, 5 missed, zero HIGH on the missed ones — with the
// identical dangerous body underneath. Matching the bare word anywhere in the file is coarse (a
// workflow that merely *mentions* the trigger in a comment now counts as privileged) and that is
// the right trade: a false positive costs a comment, a false negative costs the repository.
const PRIVILEGED_EVENT = /\b(pull_request_target|workflow_run)\b/;

// `github.head_ref` is the single most-cited pull_request_target footgun and was not matched here:
// the old pattern demanded a `github.event.(pull_request|workflow_run).` prefix. It is already in
// UNTRUSTED_EXPR, so it fired inside a `run:` block but not on the `ref:` where it actually hands
// the attacker the token.
const PR_HEAD_REF = new RegExp(
  '\\$\\{\\{\\s*(?:' +
    'github\\.event\\.(?:pull_request|workflow_run)\\.[^}]*\\bhead[._]' +
    '|github\\.head_ref' +
  ')',
);
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

/**
 * Strip comments from a MULTI-LINE block, line by line.
 *
 * `stripComment` returns at the first unquoted `#`, which is correct for one line and catastrophic
 * for many: applied to a joined step body it throws away everything after the first comment. That
 * is how WF-PRT-CHECKOUT was silently dead — one `# fetch the contributor branch` inside a step
 * hid the `uses: actions/checkout@` below it, the rule's precondition failed, and it never fired.
 * Commenting inside steps is this repo's own house style, so the bypass was the default.
 *
 * Same failure class as trimming a whole `git status --porcelain` blob instead of each line: one
 * line's logic applied to many lines' data.
 */
function stripComments(text) {
  return splitLines(text).map(stripComment).join('\n');
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
    // `- run: cmd` is a step whose only key is run:, and it is the most compact form there is.
    // Matching bare `run:` alone missed it entirely, so WF-INJECT was blind to
    //     - run: echo "${{ github.event.issue.title }}"
    // while catching the identical command written under a `- name:` step (marketplace#249).
    // keyIndent counts the dash too, so a block scalar's body still has to sit deeper than `run:`.
    const m = code.match(/^(\s*(?:-\s+)?)run:\s*(\S.*)?$/);
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
    const code = stripComments(text);
    if (!/uses:\s*['"]?actions\/checkout@/m.test(code)) continue;

    // Form 1: checkout an explicit untrusted head ref expression.
    const headExpr = text.match(PR_HEAD_REF);
    // Form 2: checkout a refs/pull/<n>/{head,merge} ref (GitHub treats this
    // as equivalent — it fetches attacker code under the privileged token).
    const refPull = code.match(/^\s*ref:\s*.*?(refs\/(?:remotes\/)?pull\/[^\s'"]+)/m);

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

/**
 * `actions/checkout` is not the only way to fetch a PR's code, and under a privileged trigger the
 * others are just as fatal. A `run:` block can pull the branch with one line and carries no `uses:`
 * for the checkout rule to key on:
 *
 *     - env: { PR: '${{ github.event.number }}' }
 *       run: gh pr checkout "$PR" && npm ci && npm test
 *
 * That passes WF-PRT-CHECKOUT (no checkout step) and WF-INJECT (the expression sits in `env:`,
 * which that rule treats as safe by design) — a textbook pull_request_target RCE, clean on both.
 *
 * So this rule keys on the ACT of fetching PR code, not on which action performs it. It fires on
 * the fetch verb alone, without needing to prove where the PR number came from: under a privileged
 * trigger there is no benign reason to check out the contributor's branch.
 */
function findPrivilegedPrFetch(source, lines, runBlocks) {
  const findings = [];
  if (!PRIVILEGED_EVENT.test(source)) return findings;

  // The first version of this rule matched five tight regexes ONE PHYSICAL LINE AT A TIME. An
  // adversarial probe put 10 shapes straight through it, and every one is ordinary shell:
  //
  //   git -c protocol.version=2 fetch origin "pull/$PR/head"   flag between `git` and `fetch`
  //   git --no-pager fetch ...                                 same
  //   git pull origin "pull/$PR/head"                          `pull` is not `fetch`
  //   git fetch origin \  ⏎  "pull/$PR/head"                   backslash continuation
  //   REF="pull/$PR/head"; git fetch origin "$REF"             ref laundered through a variable
  //   gh pr \  ⏎  checkout "$PR"                               command split across lines
  //   gh pr diff "$PR" --patch | git apply                     fetches the code without checkout
  //   git remote add fork "$URL" && git fetch fork "$BR"       no `pull/` token anywhere
  //   curl codeload.github.com/$REPO/tar.gz/$SHA | tar xz      not git at all
  //
  // So this now reads the WHOLE block: comments stripped per line, continuations folded, newlines
  // collapsed. And it stops trying to recognise "a fetch of the PR specifically" — under a
  // privileged trigger there is no benign reason to pull remote code at all, so the rule fires on
  // the act of fetching. Broad on purpose: a false positive costs a comment on a PR, a false
  // negative costs the repository.
  const FETCHERS = [
    { re: /\bgh\s+pr\s+(?:checkout|diff|view)\b/, what: 'gh pr checkout/diff' },
    { re: /\bhub\s+pr\s+checkout\b/, what: 'hub pr checkout' },
    { re: /\bgit\b[^;&|]{0,120}?\b(?:fetch|pull|clone)\b/, what: 'git fetch/pull/clone' },
    { re: /\bgit\s+remote\s+add\b/, what: 'git remote add (a second remote to fetch from)' },
    { re: /\bgit\s+(?:checkout|switch)\b[^;&|]{0,120}?\brefs\/pull\//, what: 'checkout of a refs/pull/ ref' },
    { re: /\bpull\/[^\s'"]*\/(?:head|merge)\b/, what: 'a pull/<n>/head ref' },
    { re: /\bcodeload\.github\.com\b/, what: 'codeload.github.com tarball' },
  ];

  for (const block of runBlocks) {
    const text = lines
      .slice(block.startLine - 1, block.endLine)
      .map(stripComment)
      .join('\n')
      .replace(/\\\n/g, ' ')   // fold backslash continuations
      .replace(/\n/g, ' ');    // and folded/multi-line commands

    for (const f of FETCHERS) {
      if (!f.re.test(text)) continue;
      findings.push({
        line: block.startLine,
        rule: 'WF-PRT-FETCH',
        severity: HIGH,
        message:
          'pull_request_target/workflow_run trigger fetches remote code in a run block ' +
          `(${f.what}) — under this trigger that code runs with a write-scoped token and the ` +
          'secrets in scope',
      });
      break;
    }
  }
  return findings;
}

/**
 * `workflow_run` + downloading the PR's build artifact + running it is the canonical
 * artifact-poisoning RCE for that trigger, and it has neither a checkout step nor a fetch verb —
 * so both rules above fall straight through it while the file is correctly identified as
 * privileged. Downloading and executing a PR-built artifact is fetching PR code by another name.
 */
function findPrivilegedArtifactDownload(source, lines) {
  const findings = [];
  if (!PRIVILEGED_EVENT.test(source)) return findings;

  for (let i = 0; i < lines.length; i++) {
    const code = stripComment(lines[i]);
    if (!/uses:\s*['"]?(?:actions\/download-artifact@|dawidd6\/action-download-artifact@)/.test(code)) continue;
    findings.push({
      line: i + 1,
      rule: 'WF-PRT-ARTIFACT',
      severity: HIGH,
      message:
        'pull_request_target/workflow_run trigger downloads a build artifact — an artifact produced ' +
        'by the PR is attacker-controlled content; unpacking or executing it under this trigger is ' +
        'the artifact-poisoning path',
    });
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
    ...findPrivilegedPrFetch(source, lines, runBlocks),
    ...findPrivilegedArtifactDownload(source, lines),
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

/**
 * Directories that ship workflow YAML and therefore need scanning.
 *
 * `docs/templates/` was invisible to this linter for its whole life, which is backwards: those
 * files are written to be copied into OTHER repositories, so a mistake there propagates to people
 * who never read our review comments. The one artifact with the widest blast radius had zero
 * mechanical checking.
 */
function resolveScanDirs() {
  if (process.env.WORKFLOWS_DIR) return [process.env.WORKFLOWS_DIR];
  const root = path.resolve(__dirname, '..', '..');
  return [
    path.join(root, '.github', 'workflows'),
    path.join(root, 'docs', 'templates'),
  ].filter((d) => fs.existsSync(d));
}

/**
 * Prove the rules are alive before trusting them to say "no findings".
 *
 * A linter that reports clean is indistinguishable from a linter whose rules are broken — and this
 * one shipped with WF-PRT-CHECKOUT silently dead, defeated by a single `#` inside a step, for as
 * long as anyone had been relying on it. Silence was read as safety.
 *
 * So every run first scans `fixtures/workflow-security/`, where each file is built to trip exactly
 * one rule. If a fixture stops producing its finding, the rule is dead and the gate fails saying so
 * — instead of passing the real files and reporting a reassuring zero.
 */
const SELF_TEST_EXPECT = {
  'must-fire-prt-checkout.yml': 'WF-PRT-CHECKOUT',
  'must-fire-prt-checkout-commented.yml': 'WF-PRT-CHECKOUT',
  'must-fire-prt-trigger-flowseq.yml': 'WF-PRT-CHECKOUT',
  'must-fire-prt-head-ref.yml': 'WF-PRT-CHECKOUT',
  'must-fire-prt-run-fetch.yml': 'WF-PRT-FETCH',
  'must-fire-prt-fetch-flagged.yml': 'WF-PRT-FETCH',
  'must-fire-prt-artifact.yml': 'WF-PRT-ARTIFACT',
  'must-fire-inject.yml': 'WF-INJECT',
  'must-fire-permissions-writeall.yml': 'WF-PERMS-WRITEALL',
  'must-fire-templates-scanned.yml': 'WF-PERMS-WRITEALL',
  'must-fire-unpinned.yml': 'WF-UNPINNED',
};

function selfTest() {
  const dir = path.join(__dirname, 'fixtures', 'workflow-security');
  if (!fs.existsSync(dir)) {
    console.error(
      'validate-workflow-security FAILED: self-test fixtures are missing at ' +
      `${path.relative(path.resolve(__dirname, '..', '..'), dir)}.\n` +
      'Without them a clean report cannot be distinguished from dead rules — which is exactly how ' +
      'WF-PRT-CHECKOUT stayed broken. Restore the fixtures rather than deleting this check.',
    );
    return 1;
  }

  const dead = [];
  for (const [file, rule] of Object.entries(SELF_TEST_EXPECT)) {
    const p = path.join(dir, file);
    if (!fs.existsSync(p)) { dead.push(`${file}: fixture missing (rule ${rule} is now unproven)`); continue; }
    const fired = scanFile(p).some((f) => f.rule === rule);
    if (!fired) dead.push(`${file}: expected ${rule}, got nothing — the rule is DEAD`);
  }

  if (dead.length > 0) {
    console.error(`validate-workflow-security FAILED its own self-test — ${dead.length} rule(s) not firing:\n`);
    for (const d of dead) console.error(`  - ${d}`);
    console.error('\nA rule that cannot fire on its own trap file will not fire on a real attack.');
    return 1;
  }
  return 0;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const strict = args.includes('--strict');
  const dirArg = args.find((a) => !a.startsWith('--'));

  if (!dirArg && selfTest() !== 0) process.exit(1);

  const dirs = dirArg ? [dirArg] : resolveScanDirs();
  let code = 0;
  for (const d of dirs) code = run(d, { strict }) || code;
  process.exit(code);
}

module.exports = {
  scanFile,
  run,
  selfTest,
  findRunBlocks,
  findSteps,
  stripComments,
  resolveWorkflowsDir,
  resolveScanDirs,
};
